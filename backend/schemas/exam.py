from pydantic import BaseModel, ConfigDict, Field
import uuid
from datetime import datetime
from typing import Literal, Optional, List


class ExamSubmission(BaseModel):
    mode: Literal["manual", "deadline"] = "manual"
    writer_id: str | None = Field(default=None, min_length=1, max_length=100)
    writer_epoch: int = Field(default=1, ge=1)

class ExamSessionBase(BaseModel):
    id: uuid.UUID
    package_id: uuid.UUID
    start_time: datetime
    end_time: Optional[datetime] = None
    total_score: int = 0
    score_twk: int = 0
    score_tiu: int = 0
    score_tkp: int = 0
    status: str
    is_passed: bool = False
    model_config = ConfigDict(from_attributes=True)

class ExamSessionListItem(ExamSessionBase):
    package_title: str

class ExamSessionList(BaseModel):
    sessions: List[ExamSessionListItem]
