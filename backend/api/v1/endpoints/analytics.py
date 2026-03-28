import re
import uuid
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from sqlalchemy.orm import selectinload

from backend.db.session import get_async_session
from backend.models.models import ExamSession, Package, User
from backend.api.v1.endpoints.auth import get_current_user
from backend.core.redis_service import redis_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])

# ==============================================================
# CONSTANTS
# ==============================================================
PASSING_GRADES = {"TWK": 65, "TIU": 80, "TKP": 166}
MIN_SESSIONS_FOR_PREDICTION = 3
DIFFICULTY_MULTIPLIERS = {"easy": 0.90, "medium": 1.00, "hard": 1.15, "extreme": 1.30}
DIFFICULTY_REGEX = re.compile(r"Tingkat Kesulitan:\s*(Easy|Medium|Hard|\?\?\?)", re.IGNORECASE)
DIFFICULTY_LABELS = {"easy": "Easy", "medium": "Medium", "hard": "Hard", "extreme": "???", "???": "???"}


def _parse_difficulty(description: str) -> str:
    """Extract difficulty level from package description text.
    Handles: Easy, Medium, Hard, ??? (extreme/above hard).
    """
    if not description:
        return "medium"
    match = DIFFICULTY_REGEX.search(description)
    if match:
        raw = match.group(1).strip()
        if raw == "???":
            return "extreme"
        return raw.lower()
    return "medium"


def _calculate_readiness_level(
    avg_total: float,
    avg_twk: float,
    avg_tiu: float,
    avg_tkp: float,
    pg_consistency: float,
    total_finished: int,
) -> dict:
    """
    Determine readiness level based on weighted averages, PG consistency, and total exams finished.
    Returns dict with level key, label, color, and description.
    """
    all_pg_pass = (
        avg_twk >= PASSING_GRADES["TWK"]
        and avg_tiu >= PASSING_GRADES["TIU"]
        and avg_tkp >= PASSING_GRADES["TKP"]
    )

    if not all_pg_pass or avg_total < 311:
        return {
            "level": "not_ready",
            "label": "Belum Siap",
            "emoji": "🔴",
            "color": "red",
            "description": "Rata-rata skor Anda masih di bawah Passing Grade BKN. Perlu latihan lebih intensif.",
        }
    elif avg_total > 450 and total_finished >= 20 and pg_consistency >= 90:
        return {
            "level": "legendary",
            "label": "Legenda (Veteran)",
            "emoji": "✨",
            "color": "cyan",
            "description": "Pengalaman dan skor Anda berada di level tertinggi. Insting menjawab soal Anda hampir sempurna!",
        }
    elif avg_total > 430 and total_finished >= 10 and pg_consistency >= 80:
        return {
            "level": "master",
            "label": "Master (Siap Tempur)",
            "emoji": "💎",
            "color": "blue",
            "description": "Jam terbang tinggi dengan skor luar biasa. Anda sudah masuk jajaran top kompetitor!",
        }
    elif avg_total > 430:
        return {
            "level": "very_ready",
            "label": "Sangat Siap",
            "emoji": "🟢",
            "color": "green",
            "description": "Performa Anda sangat kompetitif. Anda siap bersaing di instansi mana pun!",
        }
    else:
        return {
            "level": "ready",
            "label": "Cukup Siap",
            "emoji": "🟡",
            "color": "yellow",
            "description": "Anda sudah melewati Passing Grade secara konsisten. Peluang lolos sangat baik.",
        }

def _calculate_confidence_score(total_finished: int) -> int:
    """
    Calculate confidence score (0-100) based on how many exams user has finished.
    """
    if total_finished >= 20:
        return 100
    if total_finished >= 10:
        return 80 + (total_finished - 10) * 2
    if total_finished >= 3:
        return 30 + int((total_finished - 3) * 7.14)
    return 0


def _calculate_trend(scores: list[float]) -> dict:
    """
    Determine score trend from chronological session scores.
    scores should be ordered oldest -> newest.
    """
    if len(scores) < 2:
        return {"direction": "stable", "label": "Stabil", "emoji": "➡️"}

    # Compare average of first half vs second half for smoothed trend
    mid = len(scores) // 2
    first_half_avg = sum(scores[:mid]) / mid
    second_half_avg = sum(scores[mid:]) / (len(scores) - mid)
    diff = second_half_avg - first_half_avg

    if diff > 15:
        return {"direction": "up", "label": "Naik", "emoji": "📈"}
    elif diff < -15:
        return {"direction": "down", "label": "Turun", "emoji": "📉"}
    else:
        return {"direction": "stable", "label": "Stabil", "emoji": "➡️"}


@router.get("/readiness")
async def get_readiness(
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    """
    Calculate CPNS readiness prediction based on user's exam history.
    Requires minimum 3 finished sessions for prediction to unlock.
    Uses difficulty-weighted scoring for more accurate assessment.
    """
    cache_key = f"readiness:{current_user.id}"
    cached = await redis_service.get_cache(cache_key)
    if cached:
        return cached

    # 1. Count total finished sessions
    count_result = await db.execute(
        select(func.count(ExamSession.id)).where(
            ExamSession.user_id == current_user.id,
            ExamSession.status == "finished",
            ExamSession.is_preview.is_(False),
        )
    )
    total_finished = count_result.scalar() or 0

    # 2. If not enough sessions, return locked state
    if total_finished < MIN_SESSIONS_FOR_PREDICTION:
        response = {
            "is_locked": True,
            "total_finished_sessions": total_finished,
            "required_sessions": MIN_SESSIONS_FOR_PREDICTION,
            "sessions_remaining": MIN_SESSIONS_FOR_PREDICTION - total_finished,
        }
        # Short cache for locked state (1 min) so it updates quickly after new exam
        await redis_service.set_cache(cache_key, response, expire=60)
        return response

    # 3. Fetch last 5 finished sessions with package info (for difficulty)
    result = await db.execute(
        select(ExamSession)
        .options(selectinload(ExamSession.package))
        .where(
            ExamSession.user_id == current_user.id,
            ExamSession.status == "finished",
            ExamSession.is_preview.is_(False),
        )
        .order_by(ExamSession.start_time.desc())
        .limit(5)
    )
    recent_sessions = result.scalars().all()

    # 4. Calculate weighted scores
    weighted_totals = []
    weighted_twk = []
    weighted_tiu = []
    weighted_tkp = []
    session_history = []
    pg_pass_count = 0

    for session in reversed(recent_sessions):  # chronological order (oldest first)
        difficulty = _parse_difficulty(
            session.package.description if session.package else ""
        )
        multiplier = DIFFICULTY_MULTIPLIERS.get(difficulty, 1.0)

        raw_total = session.total_score or 0
        raw_twk = session.score_twk or 0
        raw_tiu = session.score_tiu or 0
        raw_tkp = session.score_tkp or 0

        w_total = round(raw_total * multiplier, 1)
        w_twk = round(raw_twk * multiplier, 1)
        w_tiu = round(raw_tiu * multiplier, 1)
        w_tkp = round(raw_tkp * multiplier, 1)

        weighted_totals.append(w_total)
        weighted_twk.append(w_twk)
        weighted_tiu.append(w_tiu)
        weighted_tkp.append(w_tkp)

        # Check if this session passed all PG thresholds
        is_session_passed = (
            raw_twk >= PASSING_GRADES["TWK"]
            and raw_tiu >= PASSING_GRADES["TIU"]
            and raw_tkp >= PASSING_GRADES["TKP"]
        )
        if is_session_passed:
            pg_pass_count += 1

        session_history.append(
            {
                "session_id": str(session.id),
                "date": session.start_time.strftime("%Y-%m-%d")
                if session.start_time
                else "Unknown",
                "package_title": session.package.title if session.package else "Unknown",
                "difficulty": difficulty,
                "multiplier": multiplier,
                "raw_score": {
                    "total": raw_total,
                    "twk": raw_twk,
                    "tiu": raw_tiu,
                    "tkp": raw_tkp,
                },
                "weighted_score": {
                    "total": w_total,
                    "twk": w_twk,
                    "tiu": w_tiu,
                    "tkp": w_tkp,
                },
                "is_passed": session.is_passed,
            }
        )

    # 5. Calculate averages
    n = len(weighted_totals)
    avg_total = round(sum(weighted_totals) / n, 1)
    avg_twk = round(sum(weighted_twk) / n, 1)
    avg_tiu = round(sum(weighted_tiu) / n, 1)
    avg_tkp = round(sum(weighted_tkp) / n, 1)

    # 6. PG consistency percentage
    pg_consistency = round((pg_pass_count / n) * 100, 1)

    # 7. Determine readiness level
    readiness = _calculate_readiness_level(
        avg_total, avg_twk, avg_tiu, avg_tkp, pg_consistency, total_finished
    )

    # 7.5 Calculate confidence score
    confidence_score = _calculate_confidence_score(total_finished)

    # 8. Calculate trend
    trend = _calculate_trend(weighted_totals)

    # 9. Identify weak categories (raw averages below PG)
    raw_avg_twk = round(sum(s["raw_score"]["twk"] for s in session_history) / n, 1)
    raw_avg_tiu = round(sum(s["raw_score"]["tiu"] for s in session_history) / n, 1)
    raw_avg_tkp = round(sum(s["raw_score"]["tkp"] for s in session_history) / n, 1)

    weak_categories = []
    if raw_avg_twk < PASSING_GRADES["TWK"]:
        weak_categories.append(
            {
                "category": "TWK",
                "avg_score": raw_avg_twk,
                "passing_grade": PASSING_GRADES["TWK"],
                "gap": round(PASSING_GRADES["TWK"] - raw_avg_twk, 1),
            }
        )
    if raw_avg_tiu < PASSING_GRADES["TIU"]:
        weak_categories.append(
            {
                "category": "TIU",
                "avg_score": raw_avg_tiu,
                "passing_grade": PASSING_GRADES["TIU"],
                "gap": round(PASSING_GRADES["TIU"] - raw_avg_tiu, 1),
            }
        )
    if raw_avg_tkp < PASSING_GRADES["TKP"]:
        weak_categories.append(
            {
                "category": "TKP",
                "avg_score": raw_avg_tkp,
                "passing_grade": PASSING_GRADES["TKP"],
                "gap": round(PASSING_GRADES["TKP"] - raw_avg_tkp, 1),
            }
        )

    response = {
        "is_locked": False,
        "total_finished_sessions": total_finished,
        "confidence_score": confidence_score,
        "readiness": readiness,
        "trend": trend,
        "avg_scores": {
            "total": avg_total,
            "twk": avg_twk,
            "tiu": avg_tiu,
            "tkp": avg_tkp,
        },
        "raw_avg_scores": {
            "total": round(raw_avg_twk + raw_avg_tiu + raw_avg_tkp, 1),
            "twk": raw_avg_twk,
            "tiu": raw_avg_tiu,
            "tkp": raw_avg_tkp,
        },
        "pg_consistency": pg_consistency,
        "session_history": session_history,
        "weak_categories": weak_categories,
        "passing_grades": PASSING_GRADES,
    }

    # Cache for 5 minutes
    await redis_service.set_cache(cache_key, response, expire=300)
    return response
