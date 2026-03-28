from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler as _default_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from backend.api.v1.endpoints.auth import router as auth_router
from backend.api.v1.endpoints.package_api import router as package_router
from backend.api.v1.endpoints.exam import router as exam_router
from backend.api.v1.endpoints.admin_questions import router as admin_questions_router
from backend.api.v1.endpoints.admin_import import router as admin_import_router
from backend.api.v1.endpoints.admin_packages import router as admin_packages_router
from backend.api.v1.endpoints.admin_users import router as admin_users_router
from backend.api.v1.endpoints.public_stats import router as public_stats_router
from backend.api.v1.endpoints.admin_transactions import router as admin_transactions_router
from backend.api.v1.endpoints.admin_analytics import router as admin_analytics_router
from backend.api.v1.endpoints.admin_feedback import router as admin_feedback_router
from backend.api.v1.endpoints.transactions_api import router as transactions_router
from backend.api.v1.endpoints.chat import router as chat_router
from backend.api.v1.endpoints.user_api import router as user_router
from backend.api.v1.endpoints.analytics import router as analytics_router
from backend.config import settings
from backend.core.rate_limiter import limiter, rate_limit_exceeded_handler

import logging

logging.basicConfig(level=settings.LOG_LEVEL.upper())
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CPNS Platform API",
    description="Latest Tech Stack CPNS Exam Practice Platform",
    version="1.0.0",
    redirect_slashes=True
)

# Configure CORS — origins read from settings (configurable via .env CORS_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZIP Compression for payload efficiency
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Rate Limiting — slowapi backed by Redis
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    # NOTE: Cookies and Authorization headers are NOT logged for security
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

app.include_router(auth_router, prefix="/api/v1")
app.include_router(package_router, prefix="/api/v1")
app.include_router(exam_router, prefix="/api/v1")
app.include_router(admin_questions_router, prefix="/api/v1")
app.include_router(admin_import_router, prefix="/api/v1")
app.include_router(admin_packages_router, prefix="/api/v1")
app.include_router(admin_users_router, prefix="/api/v1")
app.include_router(admin_transactions_router, prefix="/api/v1")
app.include_router(admin_analytics_router, prefix="/api/v1")
app.include_router(admin_feedback_router, prefix="/api/v1")
app.include_router(transactions_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(public_stats_router, prefix="/api/v1")
app.include_router(user_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "CPNS Platform API is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """
    Enhanced health check: verifies DB and Redis are reachable.
    Returns 503 if any dependency is down, so load balancers can route traffic away.
    """
    from fastapi.responses import JSONResponse
    from sqlalchemy import text
    from backend.db.session import get_async_session
    from backend.core.redis_service import redis_service
    
    health = {"status": "healthy", "db": "unknown", "redis": "unknown"}
    is_healthy = True
    
    # Check Database
    try:
        async for db in get_async_session():
            await db.execute(text("SELECT 1"))
            health["db"] = "ok"
            break
    except Exception as e:
        health["db"] = f"error: {type(e).__name__}"
        is_healthy = False
    
    # Check Redis
    try:
        if redis_service.redis:
            await redis_service.redis.ping()
            health["redis"] = "ok"
        else:
            health["redis"] = "not initialized"
            is_healthy = False
    except Exception as e:
        health["redis"] = f"error: {type(e).__name__}"
        is_healthy = False
    
    if not is_healthy:
        health["status"] = "unhealthy"
        return JSONResponse(status_code=503, content=health)
    
    return health
