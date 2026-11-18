from pydantic import BaseModel, EmailStr, model_validator, field_validator, ConfigDict
from typing import Optional
import uuid
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    full_name: str

    @field_validator('password')
    @classmethod
    def usable_password(cls, value):
        if len(value) < 8 or len(value.encode('utf-8')) > 72:
            raise ValueError('Gunakan minimal 8 karakter dan maksimal 72 byte.')
        return value

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

    model_config = ConfigDict(from_attributes=True)

class UserProfile(BaseModel):
    full_name: str
    phone_number: Optional[str] = None
    target_instansi: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserWithProfile(User):
    profile: Optional[UserProfile] = None
