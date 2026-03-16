from fastapi import APIRouter, Depends, HTTPException, status, Response, Request, BackgroundTasks, Body
from typing import Optional, List
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta, datetime, timezone
import uuid
from pydantic import BaseModel, EmailStr
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from backend.db.session import get_async_session
from backend.models.models import User, UserProfile
from backend.schemas.user import UserCreate, User as UserSchema, UserWithProfile
from backend.schemas.token import Token
from sqlalchemy.orm import selectinload
from backend.core.redis_service import redis_service
from backend.core.security import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    create_reset_token,
    verify_reset_token,
    ACCESS_TOKEN_EXPIRE_MINUTES, 
    ALGORITHM, 
    SECRET_KEY
)
from backend.config import settings as app_settings
from backend.core.email import send_reset_password_email
from backend.core.rate_limiter import limiter
from jose import JWTError, jwt

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class GoogleLoginRequest(BaseModel):
    token: str

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_async_session)
) -> User:
    # 1. Try to get token from HttpOnly Cookie
    token = request.cookies.get("access_token")
    
    # 2. If not in cookie, try Header (for flexibility/Postman)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # [SECURITY] Check Redis Blocklist
    if await redis_service.redis.exists(f"blocklist:{token}"):
        raise HTTPException(status_code=401, detail="Token has been revoked. Please login again.")

    # Clean "Bearer " if it came from cookie (unlikely but safe)
    if token.startswith("Bearer "):
        token = token.replace("Bearer ", "")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    result = await db.execute(
        select(User)
        .options(selectinload(User.profile))
        .where(User.email == email)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found or deleted")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
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
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    user = result.scalar_one_or_none()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    # Create new user
    new_user = User(
        email=user_in.email,
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
    return new_user

@router.post("/login")
@limiter.limit("5/minute")
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_async_session)
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )

    # Set HttpOnly Cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=app_settings.COOKIE_SECURE,
    )
    
    return {"message": "Successfully logged in", "user_id": str(user.id), "email": user.email, "role": user.role}

@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("access_token")
    if token:
        # Blocklist token until its original expiry (default 1 week in minutes * 60)
        # We use a safe margin if exact expiry isn't known
        await redis_service.redis.setex(
            f"blocklist:{token}",
            ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "1"
        )
    response.delete_cookie("access_token")
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
    payload: ForgotPasswordRequest = Body(...),
    db: AsyncSession = Depends(get_async_session)
):
    """Initiate password reset. Sends a link to the user's email."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    
    if user:
        reset_token = create_reset_token(user.email)
        frontend_url = app_settings.cors_origins_list[0]
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        
        # MOCK EMAIL SENDING
        print(f"DEBUG: Password reset link for {user.email}: {reset_link}")

        # Fire-and-forget email sending (avoids BackgroundTasks/slowapi conflict)
        import asyncio
        asyncio.create_task(send_reset_password_email(user.email, reset_link))
        
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
    email = verify_reset_token(payload.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(payload.new_password)
    await db.commit()
    
    return {"message": "Password has been reset successfully."}

@router.post("/google")
@limiter.limit("10/minute")
async def google_login(
    request: Request,
    payload: GoogleLoginRequest = Body(...),
    response: Response = None,
    db: AsyncSession = Depends(get_async_session)
):
    """Authenticate with Google ID Token."""
    try:
        # Verify Google Token
        idinfo = id_token.verify_oauth2_token(
            payload.token, 
            google_requests.Request(), 
            app_settings.GOOGLE_CLIENT_ID
        )
        
        # [CLEANUP] Redundant audience check removed as it's already verified in verify_oauth2_token above.

        # ✅ WAJIB: Pastikan email benar-benar milik user
        if not idinfo.get('email_verified'):
            raise ValueError("Email belum diverifikasi oleh Google.")

        email = idinfo['email']
        full_name = idinfo.get('name', 'Google User')
        
        # Check if user exists
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        # Auto-register if not found
        if not user:
            # Random password for SSO users
            random_pw = str(uuid.uuid4())
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
            
        # Create session
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            expires=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            samesite="lax",
            secure=app_settings.COOKIE_SECURE,
        )
        
        return {
            "message": "Successfully logged in via Google", 
            "user_id": str(user.id), 
            "email": user.email, 
            "role": user.role
        }

    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
