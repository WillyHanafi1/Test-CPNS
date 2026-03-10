from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid

class QuestionBase(BaseModel):
    content: str
    options: Dict[str, str]
    correct_answer: str
    points: int = 5
    segment: str # TWK, TIU, TKP

class QuestionCreate(QuestionBase):
    pass

class Question(QuestionBase):
    id: uuid.UUID
    package_id: uuid.UUID

    class Config:
        from_attributes = True

class PackageBase(BaseModel):
    title: str
    description: str
    price: int = 0
    is_premium: bool = False
    category: str # TWK, TIU, TKP, Mix

class PackageCreate(PackageBase):
    pass

class Package(PackageBase):
    id: uuid.UUID
    
    class Config:
        from_attributes = True

class PackageWithQuestions(Package):
    questions: List[Question] = []
