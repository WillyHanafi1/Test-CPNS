from datetime import datetime, timedelta, timezone
from typing import Union
import jwt
import bcrypt
import uuid
from backend.config import settings

# JWT Settings
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        # bcrypt.checkpw expects bytes
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception as e:
        print(f"Error verifying password: {e}")
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None) -> str:
    to_encode = data.copy()
    to_encode.setdefault('type', 'access')
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_reset_token(email: str, auth_version: int = 0) -> str:
    """Generate a short-lived token (15 mins) for password reset."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode = {"sub": email, "type": "reset", "version": auth_version, "jti": uuid.uuid4().hex, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_reset_token(token: str) -> dict | None:
    """Verify the reset token and return the email if valid."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "reset" or not isinstance(payload.get("version"), int):
            return None
        return payload if payload.get("sub") else None
    except Exception:
        return None


def verify_reset_token(token: str) -> Union[str, None]:
    payload = decode_reset_token(token)
    return payload['sub'] if payload else None

