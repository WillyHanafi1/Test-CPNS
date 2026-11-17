from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_async_session
from backend.models.models import ExamSession, User
from backend.api.v1.endpoints.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/readiness")
@router.get("/summary")
async def summary(db: AsyncSession = Depends(get_async_session), user: User = Depends(get_current_user)):
    sessions = (await db.scalars(select(ExamSession).where(
        ExamSession.user_id == user.id, ExamSession.status == "finished", ExamSession.is_preview.is_(False))
        .order_by(ExamSession.start_time.desc()).limit(20))).all()
    return {"is_locked": False, "sample_size": len(sessions),
            "notice": "Ringkasan latihan, bukan prediksi kelulusan seleksi.",
            "recent_sessions": [{"id": s.id, "date": s.start_time, "total_score": s.total_score,
                "twk": s.score_twk, "tiu": s.score_tiu, "tkp": s.score_tkp} for s in sessions]}
