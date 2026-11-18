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
    task_ignore_result=True,
    result_expires=300,
    worker_prefetch_multiplier=1,
    task_routes={
        "backend.core.tasks.repair_question_bias": {"queue": "admin-ai"},
        "backend.core.tasks.reconcile_payments": {"queue": "payments"},
        "backend.core.tasks.process_payment_events": {"queue": "payments"},
        "backend.core.tasks.payment_worker_heartbeat": {"queue": "payments"},
    },
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Jakarta",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
    # Celery Beat — periodic tasks
    beat_schedule={
        "worker-and-scheduler-heartbeat": {
            "task": "backend.core.tasks.operational_heartbeat", "schedule": 30.0,
        },
        "retry-recorded-payment-events": {
            "task": "backend.core.tasks.process_payment_events", "schedule": 15.0,
            "options": {"expires": 15},
        },
        "reconcile-pending-payments": {
            "task": "backend.core.tasks.reconcile_payments", "schedule": 60.0,
            "options": {"expires": 60},
        },
        "payment-worker-heartbeat": {
            "task": "backend.core.tasks.payment_worker_heartbeat", "schedule": 30.0,
            "options": {"expires": 30},
        },
        "reconcile-durable-scoring": {
            "task": "backend.core.tasks.reconcile_exam_jobs", "schedule": 10.0,
        },
        "auto-finish-expired-sessions": {
            "task": "backend.core.tasks.auto_finish_expired_sessions",
            "schedule": 120.0,  # every 2 minutes
        },
    },
)
