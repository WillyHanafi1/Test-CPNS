from pydantic import BaseModel, Field
from typing import Literal, Optional
from datetime import datetime

class DonationRequest(BaseModel):
    amount: int = Field(ge=1000, le=2147483647, strict=True)
    message: Optional[str] = Field(default=None, max_length=150)
    is_anonymous: bool = True
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
    donation_count: int = 1
    rank: int = 0

class DonationStats(BaseModel):
    total_amount: int
    target_amount: int
    percentage: float
    supporter_count: int
    donation_count: int = 0


class DonationOverview(BaseModel):
    period: Literal['month', 'all']
    period_label: str
    stats: DonationStats
    top_supporters: list[TopSupporter]
    recent_supporters: list[SupporterResponse]
    updated_at: datetime


class DonationVisibility(BaseModel):
    is_anonymous: bool = Field(strict=True)
