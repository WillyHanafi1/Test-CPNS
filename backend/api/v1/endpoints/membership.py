from fastapi import APIRouter, Depends
from backend.config import settings
from backend.models.models import User
from backend.api.v1.endpoints.auth import get_current_user

router = APIRouter(prefix="/membership", tags=["membership"])


@router.get("/offer")
async def offer():
    return {"id": "pro-365", "name": "Pro", "price": settings.PRO_PRICE, "currency": "IDR",
            "duration_days": 365, "environment": settings.DOKU_ENVIRONMENT,
            "checkout_available": bool(settings.DOKU_CLIENT_ID and settings.DOKU_SECRET_KEY)}


@router.get("/me")
async def membership(user: User = Depends(get_current_user)):
    return {"is_pro": user.is_pro_active, "expires_at": user.pro_expires_at,
            "includes_all_packages": user.is_pro_active, "participant_ai": False}
