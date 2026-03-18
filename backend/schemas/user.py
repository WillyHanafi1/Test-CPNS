from pydantic import BaseModel, EmailStr, model_validator
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
    is_pro: bool = False
    pro_expires_at: Optional[datetime] = None
    created_at: datetime

    @model_validator(mode='before')
    @classmethod
    def map_pro_status(cls, data):
        if hasattr(data, 'is_pro_active'):
            data_dict = {
                k: v for k, v in data.__dict__.items()
                if not k.startswith('_')
            } if hasattr(data, '__dict__') else dict(data)
            data_dict['is_pro'] = data.is_pro_active
            return data_dict
        return data

    class Config:
        from_attributes = True

class UserProfile(BaseModel):
    full_name: str
    phone_number: Optional[str] = None
    target_instansi: Optional[str] = None

    class Config:
        from_attributes = True

class UserWithProfile(User):
    profile: Optional[UserProfile] = None
