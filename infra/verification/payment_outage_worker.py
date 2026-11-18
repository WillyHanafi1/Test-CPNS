"""Synthetic provider outage, loaded only by the disposable verification worker."""
import os
import time
import redis
from backend.config import settings
from backend.core.celery_app import celery_app
from backend.core.doku_service import DokuError, doku_service

if settings.DATABASE_URL != 'postgresql+asyncpg://ujian_verify:verification-only@postgres:5432/ujian_verify':
    raise RuntimeError('Fault injection is restricted to the disposable verification database')


def unavailable_provider(order_id):
    client = redis.Redis.from_url(settings.REDIS_URL)
    client.setex('verification:payment_outage_started', 60, '1')
    try:
        time.sleep(12)
        client.setex('verification:payment_outage_completed', 60, '1')
        raise DokuError('SYNTHETIC_PROVIDER_TIMEOUT')
    finally:
        client.close()


doku_service.get_status = unavailable_provider
if __name__ == '__main__':
    celery_app.worker_main(['worker', '--queues=payments', '--concurrency=1', '--loglevel=WARNING',
                           '--hostname=payment-verification@' + os.uname().nodename])
