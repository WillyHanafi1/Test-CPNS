"""Public metadata only. Personal state is never served from shared cache."""
import re
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.api.v1.endpoints.auth import get_current_user, get_optional_user
from backend.core.redis_service import redis_service
from backend.db.session import get_async_session
from backend.models.models import ExamSession, Package, PackageRevision, Question, User
from backend.schemas.package import Package as PackageSchema, PackagePublic
from backend.services.exams import access_decision, snapshot, validation_errors

router = APIRouter(prefix="/packages", tags=["packages"])

PACKAGE_META_REVISION_TTL = 3600
PACKAGE_META_LIVE_TTL = 60


def package_query():
    """Fetch only lightweight Package rows; never eager-load all questions/options on catalog listings."""
    return select(Package).where(Package.is_published.is_(True), Package.is_active.is_(True))


def _meta_cache_key(package: Package) -> str:
    rev = str(package.published_revision_id) if package.published_revision_id else "live"
    return f"packages:meta:v1:{package.id}:{rev}"


async def _resolve_content_summaries(
    db: AsyncSession, packages: list[Package]
) -> dict[uuid.UUID, dict]:
    """Resolve (question_count, is_ready) via Redis cache first, falling back to batched DB reads."""
    summaries: dict[uuid.UUID, dict] = {}
    revision_misses: list[Package] = []
    live_misses: list[Package] = []

    for pkg in packages:
        cached = await redis_service.get_cache(_meta_cache_key(pkg))
        if (
            isinstance(cached, dict)
            and isinstance(cached.get("question_count"), int)
            and isinstance(cached.get("is_ready"), bool)
        ):
            summaries[pkg.id] = cached
        elif pkg.published_revision_id:
            revision_misses.append(pkg)
        else:
            live_misses.append(pkg)

    if revision_misses:
        rev_ids = {pkg.published_revision_id for pkg in revision_misses if pkg.published_revision_id}
        rows = (
            await db.scalars(select(PackageRevision).where(PackageRevision.id.in_(rev_ids)))
        ).all()
        rev_map = {row.id: row for row in rows}
        for pkg in revision_misses:
            revision = rev_map.get(pkg.published_revision_id)
            if revision:
                content = revision.payload
                summary = {
                    "question_count": len(content["questions"]),
                    "is_ready": not validation_errors(content),
                }
                summaries[pkg.id] = summary
                await redis_service.set_cache(
                    _meta_cache_key(pkg), summary, expire=PACKAGE_META_REVISION_TTL
                )
            else:
                live_misses.append(pkg)

    if live_misses:
        live_ids = [pkg.id for pkg in live_misses]
        loaded = (
            await db.scalars(
                select(Package)
                .where(Package.id.in_(live_ids))
                .options(selectinload(Package.questions).selectinload(Question.options))
            )
        ).all()
        loaded_map = {row.id: row for row in loaded}
        for pkg in live_misses:
            full_pkg = loaded_map.get(pkg.id, pkg)
            content = snapshot(full_pkg)
            summary = {
                "question_count": len(content["questions"]),
                "is_ready": not validation_errors(content),
            }
            summaries[pkg.id] = summary
            await redis_service.set_cache(
                _meta_cache_key(pkg), summary, expire=PACKAGE_META_LIVE_TTL
            )

    return summaries


async def _user_sessions_by_package(
    db: AsyncSession, package_ids: list[uuid.UUID], user: Optional[User]
) -> dict[uuid.UUID, ExamSession]:
    """Batch-load each package's most relevant non-preview session for the current user."""
    if not user or not package_ids:
        return {}
    rows = (
        await db.scalars(
            select(ExamSession)
            .where(
                ExamSession.user_id == user.id,
                ExamSession.package_id.in_(package_ids),
                ExamSession.is_preview.is_(False),
            )
            .order_by(ExamSession.start_time.desc())
        )
    ).all()
    best: dict[uuid.UUID, ExamSession] = {}
    for session in rows:
        existing = best.get(session.package_id)
        if existing is None or (existing.status != "ongoing" and session.status == "ongoing"):
            best[session.package_id] = session
    return best


def _build_package_metadata(
    package: Package,
    summary: dict,
    user: Optional[User] = None,
    session: Optional[ExamSession] = None,
) -> PackageSchema:
    result = PackageSchema.model_validate(package)
    result.question_count = summary["question_count"]
    result.is_ready = summary["is_ready"]
    result.access_reason = access_decision(package, user)["reason"]
    if not result.is_ready:
        result.access_reason = "package_not_ready"
    if user and session:
        result.user_status, result.session_id = session.status, session.id
        if session.status == "ongoing":
            result.access_reason = "resume"
        elif package.is_weekly and session.status in ("finished", "processing"):
            result.access_reason = "already_completed"
    return result


async def metadata(db: AsyncSession, package: Package, user: Optional[User] = None) -> PackageSchema:
    summaries = await _resolve_content_summaries(db, [package])
    sessions = await _user_sessions_by_package(db, [package.id], user)
    return _build_package_metadata(
        package, summaries[package.id], user=user, session=sessions.get(package.id)
    )


async def metadata_many(
    db: AsyncSession, packages: list[Package], user: Optional[User] = None
) -> list[PackageSchema]:
    if not packages:
        return []
    summaries = await _resolve_content_summaries(db, packages)
    sessions = await _user_sessions_by_package(db, [p.id for p in packages], user)
    return [
        _build_package_metadata(pkg, summaries[pkg.id], user=user, session=sessions.get(pkg.id))
        for pkg in packages
    ]


def _natural_title_key(pkg: Package):
    parts = re.split(r"(\d+)", pkg.title or "")
    return ([(0, int(p)) if p.isdigit() else (1, p.lower()) for p in parts], str(pkg.id))


@router.get("", response_model=list[PackageSchema])
async def get_packages(
    skip: int = Query(0, ge=0),
    limit: int = Query(12, ge=1, le=100),
    category: Optional[str] = None,
    search: Optional[str] = None,
    progress: Optional[Literal["finished", "unattempted"]] = None,
    db: AsyncSession = Depends(get_async_session),
    current_user: Optional[User] = Depends(get_optional_user),
):
    # Scheduled packages remain discoverable in the same simple catalog.
    query = package_query()
    if progress:
        if not current_user:
            raise HTTPException(401, "Masuk untuk memfilter riwayat latihan.")
        attempts = select(ExamSession.id).where(
            ExamSession.package_id == Package.id,
            ExamSession.user_id == current_user.id,
            ExamSession.is_preview.is_(False),
        )
        query = query.where(
            attempts.where(ExamSession.status == "finished").exists()
            if progress == "finished"
            else ~attempts.exists()
        )
    if category:
        query = query.where(Package.category == category)
    if search:
        term = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")[:150]
        query = query.where(
            or_(
                Package.title.ilike(f"%{term}%", escape="\\"),
                Package.description.ilike(f"%{term}%", escape="\\"),
            )
        )
    all_packages = sorted((await db.scalars(query)).all(), key=_natural_title_key)
    packages = all_packages[skip : skip + limit]
    return await metadata_many(db, packages, current_user)


@router.get("/weekly-active", response_model=Optional[PackageSchema])
async def weekly(
    db: AsyncSession = Depends(get_async_session),
    current_user: Optional[User] = Depends(get_optional_user),
):
    now = datetime.now(timezone.utc)
    package = await db.scalar(
        package_query()
        .where(Package.is_weekly.is_(True), Package.start_at <= now, Package.end_at >= now)
        .order_by(Package.start_at.desc())
        .limit(1)
    )
    return await metadata(db, package, current_user) if package else None


@router.get("/{package_id}", response_model=PackagePublic)
async def get_package(
    package_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: Optional[User] = Depends(get_optional_user),
):
    package = await db.scalar(package_query().where(Package.id == package_id))
    if not package:
        raise HTTPException(404, "Paket tidak ditemukan.")
    return await metadata(db, package, current_user)


@router.get("/{package_id}/access")
async def access(
    package_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    package = await db.scalar(package_query().where(Package.id == package_id))
    if not package:
        raise HTTPException(404, "Paket tidak ditemukan.")
    info = await metadata(db, package, current_user)
    decision = {"has_access": info.access_reason in ("included", "resume"), "reason": info.access_reason}
    return {**decision, "session_id": info.session_id, "user_status": info.user_status}
