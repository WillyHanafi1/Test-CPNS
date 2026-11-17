from collections import defaultdict
from sqlalchemy import select, func
from backend.models.models import Answer, Question, QuestionOption, ExamSession, ExamResponse, PackageRevision


class AnalyticsService:
    async def get_topic_mastery(self, db, user_id):
        totals = defaultdict(lambda: {"total_answered": 0, "points": 0, "maximum": 0, "correct_count": 0})
        def add(segment, topic, points, maximum):
            row = totals[(segment, topic or "Umum")]
            row["total_answered"] += 1
            row["points"] += points
            row["maximum"] += maximum
            row["correct_count"] += int(points == maximum and maximum > 0)
        maxima = select(QuestionOption.question_id, func.max(QuestionOption.score).label("maximum")).group_by(QuestionOption.question_id).subquery()
        legacy = (await db.execute(select(Question.segment, Question.sub_category, Answer.points_earned, maxima.c.maximum)
            .join(Answer, Answer.question_id == Question.id)
            .join(ExamSession, ExamSession.id == Answer.session_id)
            .join(maxima, maxima.c.question_id == Question.id)
            .where(ExamSession.user_id == user_id, ExamSession.status == "finished", ExamSession.is_preview.is_(False), ExamSession.revision_id.is_(None)))).all()
        for segment, topic, points, maximum in legacy:
            add(segment, topic, points, maximum)
        modern = (await db.execute(select(ExamResponse, PackageRevision.payload)
            .join(ExamSession, ExamSession.id == ExamResponse.session_id)
            .join(PackageRevision, PackageRevision.id == ExamSession.revision_id)
            .where(ExamSession.user_id == user_id, ExamSession.status == "finished", ExamSession.is_preview.is_(False)))).all()
        for response, payload in modern:
            question = next(q for q in payload["questions"] if q["id"] == str(response.question_id))
            option = next(o for o in question["options"] if o["id"] == str(response.option_id))
            add(question["segment"], question.get("sub_category"), option["score"], max(o["score"] for o in question["options"]))
        return [{"segment": segment, "sub_category": topic, **row,
                 "mastery_percentage": round(row["points"] * 100 / row["maximum"], 1) if row["maximum"] else 0,
                 "status": "Perolehan poin jawaban"} for (segment, topic), row in sorted(totals.items())]

    async def get_weak_points(self, db, user_id, limit=3):
        rows = await self.get_topic_mastery(db, user_id)
        return sorted([row for row in rows if row["total_answered"] >= 5], key=lambda row: row["mastery_percentage"])[:limit]

analytics_service = AnalyticsService()
