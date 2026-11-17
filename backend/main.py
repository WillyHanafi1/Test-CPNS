from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
from backend.api.v1.endpoints.user_api import router as user_router
from backend.api.v1.endpoints.analytics import router as analytics_router
from backend.api.v1.endpoints.membership import router as membership_router
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
    import uuid
    from time import perf_counter
    from fastapi.responses import JSONResponse
    request_id = uuid.uuid4().hex
    started = perf_counter()
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and request.cookies.get("access_token"):
        origin = request.headers.get("origin")
        if origin and origin not in settings.cors_origins_list:
            return JSONResponse(status_code=403, content={"detail": "Asal permintaan tidak diizinkan."})
    # Password-reset tokens and payment callbacks may appear in query strings.
    logger.info("Incoming request: %s %s", request.method, request.url.path)
    # NOTE: Cookies and Authorization headers are NOT logged for security
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "private, no-store"
    logger.info("request_id=%s method=%s path=%s status=%s duration_ms=%.1f",
                request_id, request.method, request.url.path, response.status_code,
                (perf_counter() - started) * 1000)
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
app.include_router(public_stats_router, prefix="/api/v1")
app.include_router(user_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(membership_router, prefix="/api/v1")

@app.api_route("/api/v1/chat/{path:path}", methods=["GET", "POST", "DELETE"])
async def retired_participant_chat(path: str):
    from fastapi import HTTPException
    raise HTTPException(410, "Fitur AI peserta telah dihentikan. Gunakan pembahasan soal.")

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


@app.get("/api/v1/health/live", include_in_schema=False)
async def liveness():
    """Process liveness only. /health separately checks DB and Redis readiness."""
    return {"status": "alive"}
