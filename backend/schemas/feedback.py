from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Optional, List, Dict, Literal
import uuid
from datetime import datetime

class FeedbackBase(BaseModel):
    category: Literal["suggestion", "bug", "correction", "other"] = "suggestion"
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def clean_content(cls, value: str) -> str:
        cleaned = (value or "").strip()
        if not cleaned:
            raise ValueError("Isi masukan tidak boleh kosong.")
        return cleaned

class FeedbackCreate(FeedbackBase):
    path_context: Optional[str] = Field(default=None, max_length=255)

class FeedbackUser(BaseModel):
    email: str
    model_config = ConfigDict(from_attributes=True)

class FeedbackUpdate(BaseModel):
    status: Optional[Literal["pending", "reviewed", "in_progress", "resolved"]] = None
    priority: Optional[Literal["low", "medium", "high", "urgent"]] = None
    admin_notes: Optional[str] = Field(default=None, max_length=2000)

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

class FeedbackListResponse(BaseModel):
    items: List[FeedbackResponse]
    total: int
    page: int
    size: int
    counts_by_status: Dict[str, int] = {}

