from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    full_name: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None

class User(UserBase):
    id: uuid.UUID
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserProfile(BaseModel):
    full_name: str
    phone_number: Optional[str] = None
    target_agency: Optional[str] = None

    class Config:
        from_attributes = True

class UserWithProfile(User):
    profile: Optional[UserProfile] = None
