"""Public metadata only. Personal state is never served from shared cache."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_async_session
from backend.models.models import Package, Question, PackageRevision, ExamSession, User
from backend.schemas.package import Package as PackageSchema, PackagePublic
from backend.api.v1.endpoints.auth import get_current_user, get_optional_user
from backend.services.exams import snapshot, validation_errors, access_decision

router = APIRouter(prefix="/packages", tags=["packages"])


def package_query():
    return select(Package).where(Package.is_published.is_(True), Package.is_active.is_(True)).options(
        selectinload(Package.questions).selectinload(Question.options))


async def metadata(db, package, user=None):
    revision = await db.get(PackageRevision, package.published_revision_id) if package.published_revision_id else None
    content = revision.payload if revision else snapshot(package)
    result = PackageSchema.model_validate(package)
    result.question_count = len(content["questions"])
    result.is_ready = not validation_errors(content)
    result.access_reason = access_decision(package, user)["reason"]
    if not result.is_ready:
        result.access_reason = "package_not_ready"
    if user:
        sessions = (await db.scalars(select(ExamSession).where(
            ExamSession.user_id == user.id, ExamSession.package_id == package.id,
            ExamSession.is_preview.is_(False)).order_by(ExamSession.start_time.desc()))).all()
        ongoing = next((s for s in sessions if s.status == "ongoing"), None)
        session = ongoing or next(iter(sessions), None)
        if session:
            result.user_status, result.session_id = session.status, session.id
            if session.status == "ongoing":
                result.access_reason = "resume"
            elif package.is_weekly and session.status in ("finished", "processing"):
                result.access_reason = "already_completed"
    return result


@router.get("", response_model=list[PackageSchema])
async def get_packages(skip: int = Query(0, ge=0), limit: int = Query(12, ge=1, le=100),
                       category: Optional[str] = None, search: Optional[str] = None,
                       progress: Optional[Literal["finished", "unattempted"]] = None,
                       db: AsyncSession = Depends(get_async_session),
                       current_user: Optional[User] = Depends(get_optional_user)):
    # Scheduled packages remain discoverable in the same simple catalog.
    query = package_query()
    if progress:
        if not current_user:
            raise HTTPException(401, "Masuk untuk memfilter riwayat latihan.")
        attempts = select(ExamSession.id).where(ExamSession.package_id == Package.id,
            ExamSession.user_id == current_user.id, ExamSession.is_preview.is_(False))
        query = query.where(attempts.where(ExamSession.status == "finished").exists()
                            if progress == "finished" else ~attempts.exists())
    if category:
        query = query.where(Package.category == category)
    if search:
        term = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")[:150]
        query = query.where(or_(Package.title.ilike(f"%{term}%", escape="\\"),
                                Package.description.ilike(f"%{term}%", escape="\\")))
    packages = (await db.scalars(query.order_by(Package.title, Package.id).offset(skip).limit(limit))).all()
    return [await metadata(db, p, current_user) for p in packages]


@router.get("/weekly-active", response_model=Optional[PackageSchema])
async def weekly(db: AsyncSession = Depends(get_async_session),
                 current_user: Optional[User] = Depends(get_optional_user)):
    now = datetime.now(timezone.utc)
    package = await db.scalar(package_query().where(Package.is_weekly.is_(True),
        Package.start_at <= now, Package.end_at >= now).order_by(Package.start_at.desc()).limit(1))
    return await metadata(db, package, current_user) if package else None


@router.get("/{package_id}", response_model=PackagePublic)
async def get_package(package_id: uuid.UUID, db: AsyncSession = Depends(get_async_session),
                      current_user: Optional[User] = Depends(get_optional_user)):
    package = await db.scalar(package_query().where(Package.id == package_id))
    if not package:
        raise HTTPException(404, "Paket tidak ditemukan.")
    return await metadata(db, package, current_user)


@router.get("/{package_id}/access")
async def access(package_id: uuid.UUID, db: AsyncSession = Depends(get_async_session),
                 current_user: User = Depends(get_current_user)):
    package = await db.scalar(package_query().where(Package.id == package_id))
    if not package:
        raise HTTPException(404, "Paket tidak ditemukan.")
    info = await metadata(db, package, current_user)
    decision = {"has_access": info.access_reason in ("included", "resume"), "reason": info.access_reason}
    return {**decision, "session_id": info.session_id, "user_status": info.user_status}
