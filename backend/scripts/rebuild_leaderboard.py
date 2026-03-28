import asyncio
import sys
import os
import logging

# Add backend and parent directory to sys.path to resolve 'backend' imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.db.session import async_session_maker
from backend.models.models import ExamSession, Package, User
from backend.core.redis_service import redis_service
from sqlalchemy import select
from sqlalchemy.orm import selectinload

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def rebuild_leaderboard():
    logger.info("Connecting to Redis...")
    
    async with async_session_maker() as db:
        logger.info("Fetching all public finished sessions from PostgreSQL...")
        result = await db.execute(
            select(ExamSession)
            .options(selectinload(ExamSession.package), selectinload(ExamSession.user))
            .where(
                ExamSession.status == "finished",
                ExamSession.is_preview == False
            )
        )
        sessions = result.scalars().all()
        logger.info(f"Found {len(sessions)} valid finished sessions.")
        
        # Dictionary to store the best packed score per user per package
        # Map: package_id -> { "is_weekly": bool, "scores": { email: packed_score } }
        best_sessions = {}
        for session in sessions:
            if not session.package or not session.user:
                continue
                
            pkg_id = str(session.package_id)
            email = session.user.email
            
            # Calculate packed score constraint (Total > TKP > TIU > TWK)
            packed_score = (
                (session.total_score or 0) * 1000000000 +
                (session.score_tkp or 0) * 1000000 +
                (session.score_tiu or 0) * 1000 +
                (session.score_twk or 0)
            )
            
            if pkg_id not in best_sessions:
                best_sessions[pkg_id] = {"is_weekly": session.package.is_weekly, "scores": {}}
                
            current_best = best_sessions[pkg_id]["scores"].get(email, 0)
            if packed_score > current_best:
                best_sessions[pkg_id]["scores"][email] = packed_score
                
        logger.info(f"Grouped into {len(best_sessions)} packages for leaderboard processing.")
        
        # Commit to Redis ZSET
        for pkg_id, data in best_sessions.items():
            lb_type = "weekly" if data["is_weekly"] else "practice"
            lb_key = f"leaderboard:{lb_type}:{pkg_id}"
            
            logger.info(f"Rebuilding {lb_key} with {len(data['scores'])} participants...")
            
            # We clear the existing set to ensure a clean sync
            await redis_service.redis.delete(lb_key)
            
            # ZADD expects a mapping of {member: score}
            mapping = {email: float(score) for email, score in data["scores"].items()}
            
            if mapping:
                await redis_service.redis.zadd(lb_key, mapping)
                
            # If it's a practice package, enforce 30 days rolling expiry
            if not data["is_weekly"]:
                await redis_service.redis.expire(lb_key, 30 * 24 * 60 * 60)
                
    logger.info("Leaderboard rebuild successfully completed!")

if __name__ == "__main__":
    asyncio.run(rebuild_leaderboard())
