"""
Global Rate Limiter — slowapi backed by Redis.

Best Practices:
- Uses Redis backend (works across multiple uvicorn workers/containers)
- Extracts real client IP from X-Forwarded-For (Docker/Nginx proxy aware)
- Returns JSON 429 response with Retry-After header
"""

from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from backend.config import settings


def _get_client_ip(request: Request) -> str:
    """
    Extract real client IP considering reverse proxies.
    Priority: X-Forwarded-For → X-Real-IP → client.host
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP (original client) from comma-separated list
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    return request.client.host if request.client else "unknown"


# Initialize limiter with Redis storage backend
limiter = Limiter(
    key_func=_get_client_ip,
    storage_uri=settings.REDIS_URL,
    # Default limit for all endpoints (generous baseline)
    default_limits=["60/minute"],
    # Enable headers so clients know their remaining quota
    headers_enabled=True,
)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom 429 handler with JSON body and Retry-After header."""
    # Extract retry time from the exception detail
    retry_after = getattr(exc, "retry_after", 60)
    
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Terlalu banyak permintaan. Silakan coba lagi nanti.",
            "retry_after_seconds": retry_after,
        },
        headers={
            "Retry-After": str(retry_after),
        },
    )
