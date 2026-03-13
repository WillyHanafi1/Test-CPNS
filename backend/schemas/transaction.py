from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

class DonationRequest(BaseModel):
    amount: int
    message: Optional[str] = None
    is_anonymous: bool = False

class DonationResponse(BaseModel):
    token: str
    redirect_url: str
    order_id: str

class SupporterResponse(BaseModel):
    full_name: str
    amount: int
    message: Optional[str]
    created_at: datetime
    is_anonymous: bool

class TopSupporter(BaseModel):
    full_name: str
    total_amount: int
