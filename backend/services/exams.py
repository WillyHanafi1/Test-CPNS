"""Durable attempts. Redis is not the source of acknowledged answers."""
import hashlib
import json
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.core.constants import PASSING_GRADE
from backend.core.redis_service import redis_service
from backend.models.models import (
    ExamJob, ExamResponse, ExamSession, Package, PackageRevision, Question, User,
)

def utc(value):
    return value.replace(tzinfo=timezone.utc) if value and value.tzinfo is None else value


def access_decision(package, user=None, now=None):
    now = now or datetime.now(timezone.utc)
    reason = None
    if not package.is_published or not package.is_active:
        reason = "unavailable"
    elif package.start_at and utc(package.start_at) > now:
        reason = "upcoming"
    elif package.is_weekly and package.end_at and utc(package.end_at) < now:
        reason = "expired"
    elif user is None:
        reason = "login_required"
    elif package.is_premium and not user.is_pro_active:
        reason = "pro_required"
    return {"has_access": reason is None, "reason": reason or "included"}


def snapshot(package):
    return {
        "id": str(package.id), "title": package.title, "duration_minutes": 100,
        "passing_grades": dict(PASSING_GRADE),
        "questions": [{
            "id": str(q.id), "number": q.number, "content": q.content,
            "image_url": q.image_url, "segment": q.segment,
            "sub_category": q.sub_category, "discussion": q.discussion,
            "options": [{"id": str(o.id), "label": o.label, "content": o.content,
                         "image_url": o.image_url, "score": o.score}
                        for o in sorted(q.options, key=lambda o: o.label)],
        } for q in sorted(package.questions, key=lambda q: q.number)],
    }


def validation_errors(payload):
    questions = payload["questions"]
    errors = []
    if len(questions) != 110:
        errors.append(f"Simulasi SKD memerlukan 110 soal; tersedia {len(questions)}.")
    if [q["number"] for q in questions] != list(range(1, len(questions) + 1)):
        errors.append("Nomor soal harus berurutan dan unik.")
    for segment, expected in {"TWK": 30, "TIU": 35, "TKP": 45}.items():
        if sum(q["segment"] == segment for q in questions) != expected:
            errors.append(f"Komposisi {segment} harus {expected} soal.")
    for q in questions:
        prefix = f"Soal {q['number']}"
        opts = q["options"]
        if not q["content"].strip() or not (q.get("discussion") or "").strip():
            errors.append(f"{prefix}: isi dan pembahasan wajib diisi.")
        if sorted(o["label"] for o in opts) != list("ABCDE"):
            errors.append(f"{prefix}: opsi A–E harus lengkap dan unik.")
        if any(not (o["content"] or "").strip() and not o.get("image_url") for o in opts):
            errors.append(f"{prefix}: opsi tidak boleh kosong.")
        scores = sorted(o["score"] for o in opts)
        if q["segment"] in ("TWK", "TIU") and scores != [0, 0, 0, 0, 5]:
            errors.append(f"{prefix}: tepat satu jawaban bernilai 5 diperlukan.")
        if q["segment"] == "TKP" and (not scores or min(scores) < 1 or max(scores) != 5):
            errors.append(f"{prefix}: bobot TKP harus dalam rentang 1–5 dengan pilihan optimal.")
    return errors


def public_payload(payload):
    return {"id": payload["id"], "title": payload["title"], "questions": [
        {**{key: q[key] for key in ("id", "number", "content", "image_url", "segment")},
         "options": [{key: o[key] for key in ("id", "label", "content", "image_url")}
                     for o in q["options"]]} for q in payload["questions"]]}


async def owned_session(db, session_id, user_id, lock=False):
    query = select(ExamSession).where(ExamSession.id == session_id, ExamSession.user_id == user_id)
    if lock:
        query = query.with_for_update()
    session = await db.scalar(query)
    if not session:
        raise HTTPException(404, "Sesi tidak ditemukan.")
    return session


async def session_payload(db, session):
    if not session.revision_id:
        package = await db.scalar(select(Package).where(Package.id == session.package_id)
            .options(selectinload(Package.questions).selectinload(Question.options)))
        answers = await redis_service.redis.hgetall(f"exam_answers:{session.user_id}:{session.id}")
        return {"session_id": session.id, "package": public_payload(snapshot(package)),
                "end_time": utc(session.end_time), "server_now": datetime.now(timezone.utc),
                "status": session.status, "answers": answers, "revisions": {},
                "writer_epoch": 1, "writer_id": None}
    revision = await db.get(PackageRevision, session.revision_id)
    rows = (await db.scalars(select(ExamResponse).where(ExamResponse.session_id == session.id))).all()
    return {
        "session_id": session.id, "package": public_payload(revision.payload),
        "end_time": utc(session.end_time), "server_now": datetime.now(timezone.utc),
        "status": session.status, "writer_epoch": session.writer_epoch,
        "writer_id": session.writer_id,
        "answers": {str(r.question_id): str(r.option_id) for r in rows},
        "revisions": {str(r.question_id): r.revision for r in rows},
    }


async def start(db, package_id, user, writer_id=None, protocol=2):
    # Serialize absent-row insertion as well as resume; session-row locks alone cannot do that.
    await db.scalar(select(User).where(User.id == user.id).with_for_update())
    now = datetime.now(timezone.utc)
    active = (await db.scalars(select(ExamSession).where(
        ExamSession.user_id == user.id, ExamSession.status == "ongoing",
        ExamSession.is_preview.is_(False),
    ).order_by(ExamSession.start_time.desc()).with_for_update())).all()
    for session in active:
        if utc(session.end_time) <= now:
            await stage_submission(db, session, now)
        elif session.package_id != package_id:
            raise HTTPException(409, {"code": "active_session", "session_id": str(session.id),
                                      "package_id": str(session.package_id),
                                      "message": "Selesaikan sesi yang sedang berjalan terlebih dahulu."})
        elif session.revision_id:
            require_current_client(protocol)
            result = await session_payload(db, session)
            await db.commit()
            return result
        else:
            # An in-flight pre-migration attempt stays on the legacy engine until completion.
            return None
    require_current_client(protocol)
    package = await db.scalar(select(Package).where(Package.id == package_id)
                              .options(selectinload(Package.questions).selectinload(Question.options))
                              .with_for_update())
    if not package:
        raise HTTPException(404, "Paket tidak ditemukan.")
    decision = access_decision(package, user, now)
    if not decision["has_access"]:
        raise HTTPException(403, {"code": decision["reason"], "message": "Paket belum dapat diakses."})
    if package.is_weekly and await db.scalar(select(ExamSession.id).where(
        ExamSession.user_id == user.id, ExamSession.package_id == package.id,
        ExamSession.status.in_(["finished", "processing"]), ExamSession.is_preview.is_(False),
    ).limit(1)):
        raise HTTPException(403, "Tryout terjadwal hanya dapat dikerjakan sekali.")
    published = await db.get(PackageRevision, package.published_revision_id) if package.published_revision_id else None
    payload = published.payload if published else snapshot(package)
    errors = validation_errors(payload)
    if errors:
        raise HTTPException(409, {"code": "package_not_ready", "message": "Paket sedang dipersiapkan. Pilih paket lain."})
    revision = published or await publish_revision(db, package)
    session = ExamSession(user_id=user.id, package_id=package.id, revision_id=revision.id,
                          start_time=now, end_time=now + timedelta(minutes=payload["duration_minutes"]),
                          status="ongoing", writer_epoch=1, writer_id=writer_id)
    db.add(session)
    await db.flush()
    result = await session_payload(db, session)
    await db.commit()
    return result


def require_current_client(protocol):
    # Old cached bundles cannot safely drive revision/CAS autosave and the new timer.
    if protocol != 2:
        raise HTTPException(409, {"code": "update_required",
            "message": "Aplikasi telah diperbarui. Muat ulang halaman sebelum memulai atau melanjutkan sesi baru."})


async def lock_editable_package(db, package_id):
    """All draft mutations share the same parent lock as publishing/start."""
    package = await db.scalar(select(Package).where(Package.id == package_id).with_for_update())
    if not package:
        raise HTTPException(404, "Paket tidak ditemukan.")
    if package.is_published:
        raise HTTPException(409, "Jadikan draft sebelum mengubah soal, lalu validasi dan terbitkan revisi baru.")
    if await db.scalar(select(ExamSession.id).where(ExamSession.package_id == package.id,
            ExamSession.revision_id.is_(None)).limit(1)):
        raise HTTPException(409, "Paket memiliki histori versi lama. Salin paket untuk menyunting tanpa mengubah histori peserta.")
    return package


async def freeze_revision(db, package):
    """Private content-addressed snapshot; previews may intentionally be incomplete."""
    payload = snapshot(package)
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    revision = await db.scalar(select(PackageRevision).where(
        PackageRevision.package_id == package.id, PackageRevision.digest == digest))
    if not revision:
        revision = PackageRevision(package_id=package.id, digest=digest, payload=payload)
        db.add(revision)
        await db.flush()
    return revision


async def publish_revision(db, package):
    errors = validation_errors(snapshot(package))
    if errors:
        raise HTTPException(422, {"code": "invalid_package", "errors": errors})
    revision = await freeze_revision(db, package)
    package.published_revision_id = revision.id
    return revision


async def save(db, session, question_id, option_id, mutation_id, expected_revision, writer_epoch, writer_id):
    now = datetime.now(timezone.utc)
    revision = await db.get(PackageRevision, session.revision_id)
    question = next((q for q in revision.payload["questions"] if q["id"] == str(question_id)), None)
    if not question or not any(o["id"] == str(option_id) for o in question["options"]):
        raise HTTPException(400, "Pilihan tidak termasuk dalam soal sesi ini.")
    row = await db.scalar(select(ExamResponse).where(
        ExamResponse.session_id == session.id, ExamResponse.question_id == question_id))
    # Replaying a committed write after a network timeout is safe, even after submission.
    if row and row.mutation_id == mutation_id and row.option_id == option_id:
        return {"status": "saved", "revision": row.revision, "saved_at": row.saved_at}
    if session.status != "ongoing" or utc(session.end_time) <= now:
        raise HTTPException(403, "Waktu ujian sudah berakhir atau jawaban sudah dikumpulkan.")
    require_writer(session, writer_epoch, writer_id)
    if (row.revision if row else 0) != expected_revision:
        raise HTTPException(409, {"code": "revision_conflict", "message": "Sinkronkan jawaban terlebih dahulu."})
    if row:
        row.option_id, row.mutation_id, row.saved_at = option_id, mutation_id, now
        row.revision += 1
    else:
        row = ExamResponse(session_id=session.id, question_id=question_id, option_id=option_id,
                           mutation_id=mutation_id, revision=1, saved_at=now)
        db.add(row)
    await db.commit()
    return {"status": "saved", "revision": row.revision, "saved_at": row.saved_at}


def require_writer(session, writer_epoch, writer_id):
    if session.writer_epoch != writer_epoch or (session.writer_id and session.writer_id != writer_id):
        raise HTTPException(409, {"code": "writer_conflict", "message": "Sesi dilanjutkan di tab/perangkat lain."})


def check_deadline(session, mode, now):
    if mode == "deadline" and (session.end_time is None or utc(session.end_time) > now):
        raise HTTPException(409, {"code": "deadline_not_reached", "message": "Waktu ujian masih berjalan."})


async def stage_submission(db, session, now):
    """The caller holds the session lock until the job and status are committed."""
    started_processing = session.status == "ongoing"
    if started_processing:
        session.status = "processing"
        session.submitted_at = now
    created_job = session.status == "processing" and not await db.scalar(
        select(ExamJob.id).where(ExamJob.session_id == session.id))
    if created_job:
        db.add(ExamJob(session_id=session.id))
    return started_processing or created_job


async def submit(db, session, submission):
    now = datetime.now(timezone.utc)
    if session.status == "ongoing":
        require_writer(session, submission.writer_epoch, submission.writer_id)
        check_deadline(session, submission.mode, now)
    dispatch = await stage_submission(db, session, now)
    await db.commit()
    return dispatch


async def score(db, session):
    """Caller holds the session lock. Snapshot and database responses are authoritative."""
    if session.status == "finished":
        return
    if session.status == "ongoing" and utc(session.end_time) > datetime.now(timezone.utc):
        raise ValueError("Cannot score a live, unsubmitted session")
    revision = await db.get(PackageRevision, session.revision_id)
    rows = (await db.scalars(select(ExamResponse).where(ExamResponse.session_id == session.id))).all()
    answers = {str(r.question_id): str(r.option_id) for r in rows}
    totals = {"TWK": 0, "TIU": 0, "TKP": 0}
    for q in revision.payload["questions"]:
        option = next((o for o in q["options"] if o["id"] == answers.get(q["id"])), None)
        if option:
            totals[q["segment"]] += option["score"]
    session.score_twk, session.score_tiu, session.score_tkp = totals["TWK"], totals["TIU"], totals["TKP"]
    session.total_score = sum(totals.values())
    session.is_passed = all(totals[key] >= value for key, value in revision.payload["passing_grades"].items())
    session.status = "finished"
    job = await db.scalar(select(ExamJob).where(ExamJob.session_id == session.id))
    if job:
        job.status, job.completed_at = "completed", datetime.now(timezone.utc)
    await db.commit()
