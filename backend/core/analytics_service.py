from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case
from backend.models.models import Answer, Question, ExamSession, User
from typing import List, Dict, Any
import uuid

class AnalyticsService:
    async def get_topic_mastery(self, db: AsyncSession, user_id: uuid.UUID) -> List[Dict[str, Any]]:
        """
        Calculate mastery percentage for each sub-category based on past answers.
        """
        # 1. Join Answers -> Questions to get sub_category
        # We only count finished sessions to ensure data integrity
        stmt = (
            select(
                Question.segment,
                Question.sub_category,
                func.count(Answer.id).label("total_answered"),
                func.sum(case((Answer.points_earned > 0, 1), else_=0)).label("correct_count")
            )
            .join(Answer, Question.id == Answer.question_id)
            .join(ExamSession, Answer.session_id == ExamSession.id)
            .where(
                and_(
                    ExamSession.user_id == user_id,
                    ExamSession.status == "finished"
                )
            )
            .group_by(Question.segment, Question.sub_category)
        )
        

        result = await db.execute(stmt)
        
        mastery_data = []
        for row in result:
            segment, sub_cat, total, correct = row
            correct = correct or 0
            sub_cat = sub_cat or "Umum"
            percentage = round((correct / total * 100), 1) if total > 0 else 0.0
            
            mastery_data.append({
                "segment": segment,
                "sub_category": sub_cat,
                "total_answered": total,
                "correct_count": correct,
                "mastery_percentage": round(percentage, 1),
                "status": self._get_status_label(percentage)
            })
            
        return mastery_data

    def _get_status_label(self, percentage: float) -> str:
        if percentage >= 80: return "Master"
        if percentage >= 60: return "Proficient"
        if percentage >= 40: return "Intermediate"
        return "Beginner"

    async def get_weak_points(self, db: AsyncSession, user_id: uuid.UUID, limit: int = 3) -> List[Dict[str, Any]]:
        """
        Identify top sub-categories where the user is struggling.
        """
        mastery = await self.get_topic_mastery(db, user_id)
        # Sort by percentage ascending
        struggling = sorted([m for m in mastery if m['total_answered'] >= 5], key=lambda x: x['mastery_percentage'])
        return struggling[:limit]

analytics_service = AnalyticsService()
