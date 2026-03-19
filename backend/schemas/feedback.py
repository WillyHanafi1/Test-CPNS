from pydantic import BaseModel, ConfigDict
from typing import Optional
import uuid
from datetime import datetime

class FeedbackBase(BaseModel):
    category: str = "suggestion" # suggestion, bug, other
    content: str

class FeedbackCreate(FeedbackBase):
    pass

class FeedbackUser(BaseModel):
    email: str
    model_config = ConfigDict(from_attributes=True)

class FeedbackResponse(FeedbackBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    user: Optional[FeedbackUser] = None
    
    model_config = ConfigDict(from_attributes=True)
