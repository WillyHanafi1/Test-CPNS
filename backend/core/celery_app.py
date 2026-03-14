from celery import Celery
from backend.config import settings

celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["backend.core.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Jakarta",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    # Celery Beat — periodic tasks
    beat_schedule={
        "auto-finish-expired-sessions": {
            "task": "backend.core.tasks.auto_finish_expired_sessions",
            "schedule": 120.0,  # every 2 minutes
        },
    },
)
