from pydantic import BaseModel, ConfigDict
from typing import Optional
import uuid
from datetime import datetime

class FeedbackBase(BaseModel):
    category: str = "suggestion" # suggestion, bug, other
    content: str

class FeedbackCreate(FeedbackBase):
    path_context: Optional[str] = None

class FeedbackUser(BaseModel):
    email: str
    model_config = ConfigDict(from_attributes=True)

class FeedbackUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    admin_notes: Optional[str] = None

class FeedbackResponse(FeedbackBase):
    id: uuid.UUID
    user_id: uuid.UUID
    status: str
    priority: str
    admin_notes: Optional[str] = None
    path_context: Optional[str] = None
    created_at: datetime
    user: Optional[FeedbackUser] = None
    
    model_config = ConfigDict(from_attributes=True)
