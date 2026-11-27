from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, BackgroundTasks, Body
from typing import Optional
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select, update
from datetime import datetime, timedelta, timezone
import uuid
from pydantic import BaseModel, EmailStr, field_validator
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import hashlib
import logging
import asyncio
import secrets
from functools import partial
from google.auth.exceptions import TransportError


from backend.db.session import get_async_session
from backend.models.models import User, UserProfile
from backend.schemas.user import UserCreate, User as UserSchema, UserWithProfile
from sqlalchemy.orm import selectinload
from backend.core.redis_service import redis_service
from backend.core.security import (
    verify_password_constant_time,
    get_password_hash, 
    create_access_token, 
    create_reset_token,
    decode_reset_token,
    ACCESS_TOKEN_EXPIRE_MINUTES, 
    ALGORITHM, 
    SECRET_KEY
)
from backend.config import settings as app_settings
from backend.core.email import send_reset_password_email
from backend.core.rate_limiter import limiter
import jwt
from jwt import InvalidTokenError as JWTError

logger = logging.getLogger("backend.api.v1.endpoints.auth")
GOOGLE_VERIFY_TIMEOUT_SECONDS = 10


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def _extract_auth_token(request: Request) -> Optional[str]:
    """Extract raw JWT strictly before hashing/blocklist checks so prefix smuggling cannot bypass revocation."""
    cookie_token = request.cookies.get("access_token")
    if cookie_token is not None:
        raw = cookie_token.strip()
        # Cookies must hold only the raw JWT — reject any whitespace or 'Bearer ' prefix smuggling.
        if not raw or any(ch.isspace() for ch in raw) or raw.lower().startswith("bearer"):
            return None
        return raw

    auth_header = request.headers.get("Authorization")
    if auth_header:
        parts = auth_header.strip().split(" ")
        if len(parts) == 2 and parts[0] == "Bearer" and parts[1] and not any(ch.isspace() for ch in parts[1]):
            return parts[1]
    return None


def _session_expire_minutes(user: User) -> int:
    if user.role == "admin":
        return app_settings.ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES
    return ACCESS_TOKEN_EXPIRE_MINUTES


def _set_auth_cookie(response: Response, access_token: str, expire_minutes: int) -> None:
    max_age = expire_minutes * 60
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=max_age,
        expires=max_age,
        samesite="lax",
        secure=app_settings.COOKIE_SECURE,
        path="/",
    )


def _login_fail_key(email: str) -> str:
    digest = hashlib.sha256(_normalize_email(email).encode("utf-8")).hexdigest()
    return f"auth:login_fail:{digest}"


async def _is_login_locked(email: str) -> bool:
    try:
        raw = await redis_service.redis.get(_login_fail_key(email))
        return int(raw or 0) >= app_settings.LOGIN_MAX_FAILED_ATTEMPTS
    except Exception as exc:
        logger.warning("Redis unavailable during login lockout check: %s", type(exc).__name__)
        return False


async def _record_login_failure(email: str) -> None:
    try:
        key = _login_fail_key(email)
        count = await redis_service.redis.incr(key)
        if count == 1:
            await redis_service.redis.expire(key, app_settings.LOGIN_LOCKOUT_SECONDS)
    except Exception as exc:
        logger.warning("Redis unavailable while recording login failure: %s", type(exc).__name__)


async def _clear_login_failures(email: str) -> None:
    try:
        await redis_service.redis.delete(_login_fail_key(email))
    except Exception as exc:
        logger.warning("Redis unavailable while clearing login failures: %s", type(exc).__name__)


def verify_google_claims(token):
    if app_settings.ENV == "production" and not app_settings.GOOGLE_CLIENT_ID:
        raise ValueError("Google login belum dikonfigurasi.")
    transport = google_requests.Request()
    try:
        return id_token.verify_oauth2_token(token, partial(transport, timeout=(3, 5)), app_settings.GOOGLE_CLIENT_ID)
    finally:
        transport.session.close()

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        return _normalize_email(value) if isinstance(value, str) else value

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def usable_password(cls, value):
        if len(value) < 8 or len(value.encode('utf-8')) > 72:
            raise ValueError('Gunakan minimal 8 karakter dan maksimal 72 byte.')
        return value

class GoogleLoginRequest(BaseModel):
    token: str

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> User:
    token = _extract_auth_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # [SECURITY] Hash the strictly normalized raw JWT BEFORE decoding so prefix smuggling cannot bypass revocation.
    hashed_token = hashlib.sha256(token.encode()).hexdigest()
    if await redis_service.redis.exists(f"blocklist:{hashed_token}"):
        raise HTTPException(status_code=401, detail="Token has been revoked. Please login again.")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get('type') not in (None, 'access'):
            raise HTTPException(401, 'Token tidak berlaku untuk sesi masuk.')
        email: str = _normalize_email(payload.get("sub") or "")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    result = await db.execute(
        select(User)
        .options(selectinload(User.profile))
        .where(func.lower(User.email) == email)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found or deleted")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    if payload.get('version', 0) != user.auth_version:
        raise HTTPException(401, "Sesi berakhir. Silakan masuk kembali.")
    request.state.authenticated_user_id = str(user.id)
    return user

async def get_optional_user(
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> Optional[User]:
    try:
        return await get_current_user(request, db)
    except HTTPException:
        return None

async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges"
        )
    return current_user

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def register(request: Request, response: Response, user_in: UserCreate, db: AsyncSession = Depends(get_async_session)):
    normalized_email = _normalize_email(str(user_in.email))
    # Check if user already exists (case-insensitive)
    result = await db.execute(select(User).where(func.lower(User.email) == normalized_email))
    user = result.scalar_one_or_none()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    # Create new user
    new_user = User(
        email=normalized_email,
        hashed_password=get_password_hash(user_in.password),
        auth_provider="local"
    )
    db.add(new_user)
    await db.flush() # Get the user id
    
    # Create profile
    new_profile = UserProfile(
        user_id=new_user.id,
        full_name=user_in.full_name
    )
    db.add(new_profile)
    
    await db.commit()
    await db.refresh(new_user)

    # Auto-login newly registered user with the same HttpOnly cookie policy as /login
    expire_minutes = _session_expire_minutes(new_user)
    access_token = create_access_token(
        data={"sub": new_user.email, "version": new_user.auth_version},
        expires_delta=timedelta(minutes=expire_minutes),
    )
    _set_auth_cookie(response, access_token, expire_minutes)
    return new_user

@router.post("/login")
@limiter.limit("5/minute")
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_async_session)
):
    normalized_email = _normalize_email(form_data.username)
    if await _is_login_locked(normalized_email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Terlalu banyak percobaan masuk gagal untuk akun ini. Silakan coba lagi nanti.",
            headers={"Retry-After": str(app_settings.LOGIN_LOCKOUT_SECONDS)},
        )

    result = await db.execute(select(User).where(func.lower(User.email) == normalized_email))
    user = result.scalar_one_or_none()
    
    if not verify_password_constant_time(form_data.password, user.hashed_password if user else None):
        await _record_login_failure(normalized_email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    await _clear_login_failures(normalized_email)
    expire_minutes = _session_expire_minutes(user)
    access_token = create_access_token(
        data={"sub": user.email, "version": user.auth_version},
        expires_delta=timedelta(minutes=expire_minutes),
    )

    _set_auth_cookie(response, access_token, expire_minutes)
    
    return {
        "message": "Successfully logged in", 
        "user_id": str(user.id), 
        "email": user.email, 
        "role": user.role,
        "is_pro": user.is_pro_active,
        "pro_expires_at": user.pro_expires_at
    }

@router.post("/logout")
async def logout(request: Request, response: Response):
    token = _extract_auth_token(request)
    if token:
        hashed_token = hashlib.sha256(token.encode()).hexdigest()
        ttl_seconds = ACCESS_TOKEN_EXPIRE_MINUTES * 60
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            exp = payload.get("exp")
            if isinstance(exp, (int, float)):
                remaining = int(exp - datetime.now(timezone.utc).timestamp())
                ttl_seconds = max(1, min(remaining, ACCESS_TOKEN_EXPIRE_MINUTES * 60))
        except JWTError:
            pass
        await redis_service.redis.setex(
            f"blocklist:{hashed_token}",
            ttl_seconds,
            "1"
        )
    response.delete_cookie(
        "access_token",
        path="/",
        httponly=True,
        samesite="lax",
        secure=app_settings.COOKIE_SECURE,
    )
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserWithProfile)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# --- New Endpoints ---

@router.post("/forgot-password", response_model=None)
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    payload: ForgotPasswordRequest = Body(...),
    db: AsyncSession = Depends(get_async_session)
):
    """Initiate password reset. Sends a link to the user's email."""
    normalized_email = _normalize_email(str(payload.email))
    result = await db.execute(select(User).where(func.lower(User.email) == normalized_email))
    user = result.scalar_one_or_none()
    
    if user:
        reset_token = create_reset_token(user.email, user.auth_version)
        frontend_url = app_settings.FRONTEND_URL
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        
        # Fire-and-forget email sending
        background_tasks.add_task(send_reset_password_email, user.email, reset_link)
        
    # Always return success to prevent email enumeration
    return {"message": "If your email is registered, you will receive a password reset link."}

@router.post("/reset-password")
@limiter.limit("3/hour")
async def reset_password(
    request: Request, 
    payload: ResetPasswordRequest = Body(...), 
    db: AsyncSession = Depends(get_async_session)
):
    """Reset password using a valid reset token."""
    claims = decode_reset_token(payload.token)
    if not claims:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    normalized_email = _normalize_email(claims['sub'])
    result = await db.execute(select(User).where(func.lower(User.email) == normalized_email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    changed = await db.execute(update(User).where(User.id == user.id, User.auth_version == claims['version'])
        .values(hashed_password=get_password_hash(payload.new_password), auth_version=User.auth_version + 1)
        .execution_options(synchronize_session=False))
    if changed.rowcount != 1:
        await db.rollback()
        raise HTTPException(400, "Tautan reset sudah digunakan atau kedaluwarsa. Silakan minta tautan baru.")
    await db.commit()
    await _clear_login_failures(user.email)
    
    return {"message": "Password has been reset successfully."}

@router.post("/google")
@limiter.limit("10/minute")
async def google_login(
    request: Request,
    response: Response,
    payload: GoogleLoginRequest = Body(...),
    db: AsyncSession = Depends(get_async_session)
):
    """Authenticate with Google ID Token."""
    try:
        # Verify Google Token
        try:
            idinfo = await asyncio.wait_for(asyncio.to_thread(verify_google_claims, payload.token),
                                           timeout=GOOGLE_VERIFY_TIMEOUT_SECONDS)
        except (TimeoutError, asyncio.TimeoutError, TransportError):
            raise HTTPException(503, 'Google sedang lambat atau belum tersedia. Silakan coba masuk kembali.')
        
        # [CLEANUP] Redundant audience check removed as it's already verified in verify_oauth2_token above.

        # ✅ WAJIB: Pastikan email benar-benar milik user
        if not idinfo.get('email_verified'):
            raise ValueError("Email belum diverifikasi oleh Google.")

        email = _normalize_email(idinfo['email'])
        full_name = (idinfo.get('name') or 'Google User').strip()[:100] or 'Google User'
        
        # Check if user exists (case-insensitive)
        result = await db.execute(select(User).where(func.lower(User.email) == email))
        user = result.scalar_one_or_none()
        
        # Auto-register if not found
        if not user:
            # Cryptographically strong random password for SSO users
            random_pw = secrets.token_urlsafe(32)
            user = User(
                email=email,
                hashed_password=get_password_hash(random_pw),
                is_active=True,
                role="participant",
                auth_provider="google"
            )
            db.add(user)
            await db.flush()
            
            profile = UserProfile(user_id=user.id, full_name=full_name)
            db.add(profile)
            await db.commit()
            await db.refresh(user)
        else:
            # 🚨 MITIGASI PRE-HIJACKING
            # Jika user sudah punya akun 'local' (email/password), jangan biarkan Google 
            # menge-takeover provider tersebut secara otomatis tanpa verifikasi.
            if user.auth_provider == "local":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email ini sudah terdaftar dengan password. Silakan login menggunakan email dan password."
                )
            
            # Jika user mendaftar via Google, atau ingin update provider (opsional)
            if user.auth_provider != "google":
                user.auth_provider = "google"
                await db.commit()
            
        if not user.is_active:
            raise HTTPException(403, 'Akun belum aktif. Hubungi bantuan untuk pemeriksaan.')
        # Create session
        expire_minutes = _session_expire_minutes(user)
        access_token = create_access_token(
            data={"sub": user.email, "version": user.auth_version},
            expires_delta=timedelta(minutes=expire_minutes),
        )

        _set_auth_cookie(response, access_token, expire_minutes)
        
        return {
            "message": "Successfully logged in via Google", 
            "user_id": str(user.id), 
            "email": user.email, 
            "role": user.role,
            "is_pro": user.is_pro_active,
            "pro_expires_at": user.pro_expires_at
        }

    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(ve))
    except Exception as e:
        # [SECURITY] Log full error internally, but return generic message to client
        # to prevent leaking internal stack traces, library versions, or DB connection strings.
        logger.error(f"Google login internal error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Terjadi kesalahan saat memproses login Google. Silakan coba lagi."
        )
