from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, case
from sqlalchemy.orm import selectinload
import uuid
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime, timezone

from backend.db.session import get_async_session
from backend.models.models import Package, Question, User, QuestionOption, ExamSession, Answer, ExamResponse
from backend.api.v1.endpoints.auth import get_current_admin
from backend.core.redis_service import redis_service
from backend.core.utils import sanitize_search
from backend.services.exams import snapshot, validation_errors, publish_revision, freeze_revision

router = APIRouter(prefix="/admin/packages", tags=["admin-packages"])

class PackageCreate(BaseModel):
    title: str
    description: str
    price: int = 0
    is_premium: bool = False
    category: str
    is_published: bool = False
    is_weekly: bool = False
    is_active: bool = True
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None

class PackageUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    is_premium: Optional[bool] = None
    category: Optional[str] = None
    is_published: Optional[bool] = None
    is_weekly: Optional[bool] = None
    is_active: Optional[bool] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None

class PackageResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    price: int
    is_premium: bool
    category: str
    is_published: bool
    is_weekly: bool
    is_active: bool
    published_revision_id: Optional[uuid.UUID] = None
    start_at: Optional[datetime]
    end_at: Optional[datetime]
    question_count: int = 0
    twk_count: int = 0
    tiu_count: int = 0
    tkp_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)

class PackageListResponse(BaseModel):
    items: List[PackageResponse]
    total: int
    page: int
    size: int

async def _attach_segment_counts(db: AsyncSession, pkg: Package) -> None:
    row = (
        await db.execute(
            select(
                func.count(Question.id),
                func.count(case((Question.segment == "TWK", 1))),
                func.count(case((Question.segment == "TIU", 1))),
                func.count(case((Question.segment == "TKP", 1))),
            ).where(Question.package_id == pkg.id)
        )
    ).one()
    pkg.question_count = int(row[0] or 0)
    pkg.twk_count = int(row[1] or 0)
    pkg.tiu_count = int(row[2] or 0)
    pkg.tkp_count = int(row[3] or 0)

@router.get("", response_model=PackageListResponse)
async def list_packages_admin(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    include_archived: bool = Query(False),
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    # Base query with question & segment counts per package
    q_count_sub = select(
        Question.package_id,
        func.count(Question.id).label("q_count"),
        func.count(case((Question.segment == "TWK", 1))).label("twk_count"),
        func.count(case((Question.segment == "TIU", 1))).label("tiu_count"),
        func.count(case((Question.segment == "TKP", 1))).label("tkp_count"),
    ).group_by(Question.package_id).subquery()

    stmt = select(
        Package,
        func.coalesce(q_count_sub.c.q_count, 0),
        func.coalesce(q_count_sub.c.twk_count, 0),
        func.coalesce(q_count_sub.c.tiu_count, 0),
        func.coalesce(q_count_sub.c.tkp_count, 0),
    ).outerjoin(
        q_count_sub, Package.id == q_count_sub.c.package_id
    )

    # Filters
    if search:
        safe_search = sanitize_search(search)
        stmt = stmt.where(or_(
            Package.title.ilike(f"%{safe_search}%"),
            Package.description.ilike(f"%{safe_search}%")
        ))
    if category:
        stmt = stmt.where(Package.category == category)

    if status_filter == "archived":
        stmt = stmt.where(Package.is_active.is_(False))
    else:
        if not include_archived:
            stmt = stmt.where(Package.is_active.is_(True))
        if status_filter == "published":
            stmt = stmt.where(Package.is_published.is_(True))
        elif status_filter == "draft":
            stmt = stmt.where(Package.is_published.is_(False))

    # Total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Pagination and Order
    stmt = stmt.order_by(Package.title).offset((page - 1) * size).limit(size)
    result = await db.execute(stmt)
    
    items = []
    for row in result.all():
        pkg = row[0]
        pkg.question_count = int(row[1] or 0)
        pkg.twk_count = int(row[2] or 0)
        pkg.tiu_count = int(row[3] or 0)
        pkg.tkp_count = int(row[4] or 0)
        items.append(pkg)

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size
    }

@router.post("", response_model=PackageResponse, status_code=status.HTTP_201_CREATED)
async def create_package_admin(
    package_in: PackageCreate,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    if package_in.is_published:
        raise HTTPException(422, "Buat sebagai draft, lengkapi soal, lalu terbitkan setelah validasi.")
    new_package = Package(**package_in.model_dump())
    db.add(new_package)
    await db.commit()
    await db.refresh(new_package)
    # New package has 0 questions
    new_package.question_count = 0
    return new_package

@router.put("/{package_id}", response_model=PackageResponse)
async def update_package_admin(
    package_id: uuid.UUID,
    package_in: PackageUpdate,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    result = await db.execute(select(Package).where(Package.id == package_id)
        .options(selectinload(Package.questions).selectinload(Question.options)).with_for_update())
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    update_data = package_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(package, key, value)
    if package.start_at and package.end_at and package.end_at <= package.start_at:
        raise HTTPException(422, "Waktu selesai harus sesudah waktu mulai.")
    if update_data.get("is_published"):
        await publish_revision(db, package)
    await db.commit()
    await db.refresh(package)
    
    # Get question & segment counts for response
    await _attach_segment_counts(db, package)
    
    # Invalidate Cache
    await redis_service.clear_pattern("packages:*")
    await redis_service.clear_pattern("package_public:*")

    return package

@router.delete("/{package_id}")
async def delete_package_admin(
    package_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    """Soft delete (Archive) package."""
    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    # Set as inactive (Archived)
    package.is_active = False
    await db.commit()
    
    # Invalidate Cache
    await redis_service.clear_pattern("packages:*")
    await redis_service.clear_pattern("package_public:*")
    
    return {"message": "Package has been archived"}

@router.post("/{package_id}/restore", response_model=PackageResponse)
async def restore_package_admin(
    package_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    """Restore archived package."""
    result = await db.execute(select(Package).where(Package.id == package_id))
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")

    package.is_active = True
    await db.commit()
    await db.refresh(package)
    
    # Get question & segment counts for response
    await _attach_segment_counts(db, package)

    # Invalidate Cache
    await redis_service.clear_pattern("packages:*")
    await redis_service.clear_pattern("package_public:*")
    
    return package

class CopyPackageRequest(BaseModel):
    title: Optional[str] = None
    is_weekly: Optional[bool] = None
    new_start_at: Optional[datetime] = None
    new_end_at: Optional[datetime] = None

@router.post("/{package_id}/copy", response_model=PackageResponse, status_code=status.HTTP_201_CREATED)
async def copy_package_admin(
    package_id: uuid.UUID,
    body: Optional[CopyPackageRequest] = Body(default=None),
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    """Duplikasi package beserta semua soalnya (untuk revisi baru atau TO minggu berikutnya)."""
    result = await db.execute(
        select(Package)
        .options(selectinload(Package.questions).selectinload(Question.options))
        .where(Package.id == package_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Package not found")

    req = body or CopyPackageRequest()
    is_weekly = req.is_weekly if req.is_weekly is not None else source.is_weekly
    start_at = req.new_start_at if is_weekly else None
    end_at = req.new_end_at if is_weekly else None
    if start_at and end_at and end_at <= start_at:
        raise HTTPException(422, "Waktu selesai harus sesudah waktu mulai.")

    # Buat package baru sebagai draft
    new_pkg = Package(
        title=(req.title or "").strip() or f"{source.title} (Salinan)",
        description=source.description,
        is_weekly=is_weekly,
        is_published=False,
        start_at=start_at,
        end_at=end_at,
        category=source.category,
        price=source.price,
        is_premium=source.is_premium
    )
    db.add(new_pkg)
    await db.flush()

    # Copy semua soal dan opsi
    for q in source.questions:
        new_q = Question(
            package_id=new_pkg.id,
            content=q.content,
            segment=q.segment,
            number=q.number,
            image_url=q.image_url,
            discussion=q.discussion,
            sub_category=q.sub_category
        )
        new_q.options = [
            QuestionOption(label=o.label, content=o.content, score=o.score, image_url=o.image_url)
            for o in q.options
        ]
        db.add(new_q)

    await db.commit()
    await db.refresh(new_pkg)
    await _attach_segment_counts(db, new_pkg)
    
    # Invalidate Cache
    await redis_service.clear_pattern("packages:*")
    await redis_service.clear_pattern("package_public:*")
    
    return new_pkg

@router.post("/{package_id}/quick-preview")
async def quick_preview_package(
    package_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_session),
    admin: User = Depends(get_current_admin)
):
    """
    Generate a mock finished exam session for an admin to preview 
    the result and discussion pages instantly.
    """
    # 1. Verify package exists with questions and options
    result = await db.execute(
        select(Package)
        .options(selectinload(Package.questions).selectinload(Question.options))
        .where(Package.id == package_id)
        .with_for_update()
    )
    package = result.scalar_one_or_none()
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    
    if not package.questions:
        raise HTTPException(status_code=400, detail="Package has no questions to preview")

    # Preview has its own immutable snapshot and never moves the published pointer.
    revision = await freeze_revision(db, package)
    # 2. Create a mock finished session
    now = datetime.now(timezone.utc)
    session = ExamSession(
        id=uuid.uuid4(),
        user_id=admin.id,
        package_id=package_id,
        revision_id=revision.id,
        status="finished",
        is_preview=True,
        start_time=now,  # [FIX] Both must be timezone-aware UTC — no .replace(tzinfo=None)
        end_time=now,
        total_score=0, # Will calculate below
        score_twk=0,
        score_tiu=0,
        score_tkp=0,
        is_passed=True
    )
    db.add(session)
    await db.flush()

    # 3. Create mock answers (all correct/highest score)
    total_score = 0
    s_twk = 0
    s_tiu = 0
    s_tkp = 0

    for q in package.questions:
        # Pick the option with highest score
        best_option = max(q.options, key=lambda o: o.score) if q.options else None
        
        if best_option:
            ans = ExamResponse(
                session_id=session.id,
                question_id=q.id,
                option_id=best_option.id,
                mutation_id=str(uuid.uuid4()),
                revision=1,
            )
            db.add(ans)
            
            # Update scores
            total_score += best_option.score
            if q.segment == "TWK": s_twk += best_option.score
            elif q.segment == "TIU": s_tiu += best_option.score
            elif q.segment == "TKP": s_tkp += best_option.score

    # 4. Finalize session scores
    session.total_score = total_score
    session.score_twk = s_twk
    session.score_tiu = s_tiu
    session.score_tkp = s_tkp
    session.is_passed = all({"TWK": s_twk, "TIU": s_tiu, "TKP": s_tkp}[key] >= value
                            for key, value in revision.payload["passing_grades"].items())
    
    await db.commit()
    
    # NOTE: We intentionally DO NOT update the Redis leaderboard here 
    # to avoid polluting national rankings with admin preview data.

    return {"session_id": session.id}


@router.get("/{package_id}/validation")
async def validate_package(package_id: uuid.UUID, db: AsyncSession = Depends(get_async_session),
                           admin: User = Depends(get_current_admin)):
    package = await db.scalar(select(Package).where(Package.id == package_id)
        .options(selectinload(Package.questions).selectinload(Question.options)))
    if not package:
        raise HTTPException(404, "Paket tidak ditemukan.")
    payload = snapshot(package)
    errors = validation_errors(payload)
    return {"valid": not errors, "errors": errors, "question_count": len(payload["questions"]),
            "published_revision_id": package.published_revision_id,
            "notice": "Validasi struktur bukan pengganti peninjauan akademis."}
