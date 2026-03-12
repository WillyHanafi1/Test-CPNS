from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime

# =====================================================================
# INTERNAL schemas (admin only — contain score/discussion)
# =====================================================================

class OptionBase(BaseModel):
    label: str  # A, B, C, D, E
    content: str
    score: int = 0

class OptionCreate(OptionBase):
    pass

class Option(OptionBase):
    id: uuid.UUID
    question_id: uuid.UUID

    class Config:
        from_attributes = True

class QuestionBase(BaseModel):
    content: str
    image_url: Optional[str] = None
    discussion: Optional[str] = None
    segment: str  # TWK, TIU, TKP
    number: int

class QuestionCreate(QuestionBase):
    options: List[OptionCreate]

class Question(QuestionBase):
    id: uuid.UUID
    package_id: uuid.UUID
    options: List[Option]

    class Config:
        from_attributes = True

class PackageBase(BaseModel):
    title: str
    description: str
    price: int = 0
    is_premium: bool = False
    category: str
    is_published: bool = False
    is_weekly: bool = False
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None

class PackageCreate(PackageBase):
    pass

class Package(PackageBase):
    id: uuid.UUID

    class Config:
        from_attributes = True

class PackageWithQuestions(Package):
    questions: List[Question] = []


# =====================================================================
# PUBLIC schemas (safe for end users — NO score, NO discussion)
# =====================================================================

class OptionPublic(BaseModel):
    id: uuid.UUID
    label: str
    content: str

    class Config:
        from_attributes = True

class QuestionPublic(BaseModel):
    id: uuid.UUID
    content: str
    image_url: Optional[str] = None
    segment: str
    number: int
    options: List[OptionPublic]

    class Config:
        from_attributes = True

class PackagePublic(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    price: int
    is_premium: bool
    category: str
    is_published: bool = False
    is_weekly: bool = False
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None

    class Config:
        from_attributes = True
