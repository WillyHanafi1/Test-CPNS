"""One private, version-aware leaderboard shared by current and legacy routes."""
import hashlib
from fastapi import HTTPException
from sqlalchemy import func, select
from backend.models.models import ExamSession, Package, PackageRevision


async def ranking(db, package_id, user_id, revision_id=None, limit=50):
    package = await db.scalar(select(Package).where(Package.id == package_id,
        Package.is_published.is_(True), Package.is_active.is_(True)))
    if not package:
        raise HTTPException(404, "Paket tidak ditemukan.")
    target = revision_id or package.published_revision_id
    empty = {'rows': [], 'current_user': None, 'total_participants': 0, 'revision_id': target,
             'notice': 'Peringkat tersedia setelah ada hasil pada versi latihan ini.'}
    if not target:
        return empty
    revision = await db.get(PackageRevision, target)
    if not revision or revision.package_id != package.id:
        raise HTTPException(404, "Versi latihan tidak ditemukan.")
    order = [ExamSession.total_score.desc(), ExamSession.score_tkp.desc(),
        ExamSession.score_tiu.desc(), ExamSession.score_twk.desc(), ExamSession.start_time.asc(), ExamSession.id]
    best = select(ExamSession.user_id, ExamSession.total_score.label('score'),
        ExamSession.score_twk.label('twk'), ExamSession.score_tiu.label('tiu'), ExamSession.score_tkp.label('tkp'),
        func.row_number().over(partition_by=ExamSession.user_id, order_by=order).label('attempt_rank')).where(
            ExamSession.package_id == package.id, ExamSession.revision_id == target,
            ExamSession.status == 'finished', ExamSession.is_preview.is_(False)).subquery()
    ranked = select(best.c.user_id, best.c.score, best.c.twk, best.c.tiu, best.c.tkp,
        func.row_number().over(order_by=[best.c.score.desc(), best.c.tkp.desc(), best.c.tiu.desc(),
                                        best.c.twk.desc(), best.c.user_id]).label('rank'),
        func.count().over().label('total')).where(best.c.attempt_rank == 1).subquery()
    rows = (await db.execute(select(ranked).order_by(ranked.c.rank).limit(min(limit, 50)))).mappings().all()
    mine = next((row for row in rows if row['user_id'] == user_id), None)
    if mine is None:
        mine = (await db.execute(select(ranked).where(ranked.c.user_id == user_id))).mappings().first()
    def public(row):
        return {'rank': row['rank'], 'name': 'Kamu' if row['user_id'] == user_id else
            'Peserta ' + hashlib.sha256(f'{package_id}:{row["user_id"]}'.encode()).hexdigest()[:6],
            **{key: row[key] for key in ('score', 'twk', 'tiu', 'tkp')}}
    return {'rows': [public(row) for row in rows], 'current_user': public(mine) if mine else None,
        'total_participants': rows[0]['total'] if rows else 0, 'revision_id': target,
        'notice': 'Satu hasil terbaik per peserta pada versi yang sama. Bukan peringkat seleksi resmi.'}
