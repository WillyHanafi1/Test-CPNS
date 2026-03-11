from pydantic import BaseModel, Field
from typing import List, Optional
import uuid

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
    category: str  # TWK, TIU, TKP, Mix

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
# These are used by catalog endpoints visible to participants.
# =====================================================================

class OptionPublic(BaseModel):
    """Option schema exposed to participants. Score and any hint fields are EXCLUDED."""
    id: uuid.UUID
    label: str
    content: str
    # score intentionally omitted — prevents answer key leakage via Network tab

    class Config:
        from_attributes = True

class QuestionPublic(BaseModel):
    """Question schema exposed to participants. Discussion and score are EXCLUDED."""
    id: uuid.UUID
    content: str
    image_url: Optional[str] = None
    segment: str
    number: int
    options: List[OptionPublic]
    # discussion intentionally omitted

    class Config:
        from_attributes = True

class PackagePublic(BaseModel):
    """Package detail safe for participants — no internal scoring data."""
    id: uuid.UUID
    title: str
    description: str
    price: int = 0
    is_premium: bool = False
    category: str

    class Config:
        from_attributes = True
