from fastapi import APIRouter, Depends
from backend.config import settings
from backend.models.models import User
from backend.api.v1.endpoints.auth import get_current_user

router = APIRouter(prefix="/membership", tags=["membership"])


@router.get("/offer")
async def offer():
    is_early_bird = settings.PRO_NORMAL_PRICE > settings.PRO_PRICE
    methods = settings.doku_payment_methods
    preferred_method = "QRIS" if "QRIS" in methods else (methods[0] if methods else None)
    return {
        "id": f"pro-{settings.PRO_DURATION_DAYS}",
        "name": "Pro",
        "price": settings.PRO_PRICE,
        "normal_price": settings.PRO_NORMAL_PRICE if is_early_bird else None,
        "is_early_bird": is_early_bird,
        "price_label": settings.PRO_PRICE_LABEL if is_early_bird else None,
        "target_packages": settings.PRO_TARGET_PACKAGES,
        "currency": "IDR",
        "duration_days": settings.PRO_DURATION_DAYS,
        "auto_renew": False,
        "environment": settings.DOKU_ENVIRONMENT,
        "checkout_available": settings.doku_checkout_available,
        "payment_methods": methods,
        "preferred_payment_method": preferred_method,
    }


@router.get("/me")
async def membership(user: User = Depends(get_current_user)):
    return {"is_pro": user.is_pro_active, "expires_at": user.pro_expires_at,
            "includes_all_packages": user.is_pro_active, "participant_ai": False}
