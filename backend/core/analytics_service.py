from collections import defaultdict
from sqlalchemy import select, func
from backend.models.models import Answer, Question, QuestionOption, ExamSession, ExamResponse, PackageRevision
from backend.core.redis_service import redis_service


class AnalyticsService:
    async def get_topic_mastery(self, db, user_id):
        cache_key = f"mastery_cache:{user_id}"
        cached = await redis_service.get_cache(cache_key)
        if cached is not None:
            return cached
        totals = defaultdict(lambda: {"total_answered": 0, "points": 0, "maximum": 0, "correct_count": 0})
        def add(segment, topic, points, maximum, count=1):
            row = totals[(segment, topic or "Umum")]
            row["total_answered"] += count
            row["points"] += points * count
            row["maximum"] += maximum * count
            if points == maximum and maximum > 0:
                row["correct_count"] += count
        maxima = select(QuestionOption.question_id, func.max(QuestionOption.score).label("maximum")).group_by(QuestionOption.question_id).subquery()
        legacy = (await db.execute(select(Question.segment, Question.sub_category, Answer.points_earned, maxima.c.maximum)
            .join(Answer, Answer.question_id == Question.id)
            .join(ExamSession, ExamSession.id == Answer.session_id)
            .join(maxima, maxima.c.question_id == Question.id)
            .where(ExamSession.user_id == user_id, ExamSession.status == "finished", ExamSession.is_preview.is_(False), ExamSession.revision_id.is_(None)))).all()
        for segment, topic, points, maximum in legacy:
            add(segment, topic, points, maximum)
        modern = (await db.execute(select(ExamSession.revision_id, ExamResponse.question_id,
                                          ExamResponse.option_id, func.count())
            .select_from(ExamResponse)
            .join(ExamSession, ExamSession.id == ExamResponse.session_id)
            .where(ExamSession.user_id == user_id, ExamSession.status == "finished", ExamSession.is_preview.is_(False),
                   ExamSession.revision_id.is_not(None))
            .group_by(ExamSession.revision_id, ExamResponse.question_id, ExamResponse.option_id))).all()
        if modern:
            revision_ids = {row.revision_id for row in modern}
            snapshots = await db.execute(select(PackageRevision.id, PackageRevision.payload)
                                         .where(PackageRevision.id.in_(revision_ids)))
            questions = {revision_id: {q["id"]: q for q in payload["questions"]}
                         for revision_id, payload in snapshots}
            for revision_id, question_id, option_id, count in modern:
                question = questions[revision_id][str(question_id)]
                scores = {option["id"]: option["score"] for option in question["options"]}
                add(question["segment"], question.get("sub_category"), scores[str(option_id)], max(scores.values()), count)
        mastery = [{"segment": segment, "sub_category": topic, **row,
                    "mastery_percentage": round(row["points"] * 100 / row["maximum"], 1) if row["maximum"] else 0,
                    "status": "Perolehan poin jawaban"} for (segment, topic), row in sorted(totals.items())]
        await redis_service.set_cache(cache_key, mastery, expire=60)
        return mastery

    async def get_weak_points(self, db, user_id, limit=3):
        rows = await self.get_topic_mastery(db, user_id)
        pool = [row for row in rows if row["total_answered"] >= 5] or [row for row in rows if row["total_answered"] >= 1]
        return sorted(pool, key=lambda row: row["mastery_percentage"])[:limit]

analytics_service = AnalyticsService()
