from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DonationRequest(BaseModel):
    amount: int
    message: Optional[str] = None
    is_anonymous: bool = False
    callback_url: Optional[str] = None

class DonationResponse(BaseModel):
    token: str
    redirect_url: str
    order_id: str

class SupporterResponse(BaseModel):
    full_name: str
    amount: int
    message: Optional[str]
    created_at: datetime
    paid_at: Optional[datetime] = None
    is_anonymous: bool

class TopSupporter(BaseModel):
    full_name: str
    total_amount: int

class DonationStats(BaseModel):
    total_amount: int
    target_amount: int
    percentage: float
    supporter_count: int
