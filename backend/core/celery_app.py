from celery import Celery
from backend.config import settings

celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["backend.core.tasks"]
)

celery_app.conf.update(
    broker_connection_timeout=2,
    task_publish_retry=False,
    task_routes={"backend.core.tasks.repair_question_bias": {"queue": "admin-ai"}},
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Jakarta",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    # Celery Beat — periodic tasks
    beat_schedule={
        "reconcile-durable-scoring": {
            "task": "backend.core.tasks.reconcile_exam_jobs", "schedule": 10.0,
        },
        "auto-finish-expired-sessions": {
            "task": "backend.core.tasks.auto_finish_expired_sessions",
            "schedule": 120.0,  # every 2 minutes
        },
    },
)
