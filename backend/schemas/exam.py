from pydantic import BaseModel, ConfigDict
import uuid
from datetime import datetime
from typing import Optional, List

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
