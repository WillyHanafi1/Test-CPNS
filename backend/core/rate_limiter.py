"""
Global Rate Limiter — slowapi backed by Redis.

Best Practices:
- Uses Redis backend (works across multiple uvicorn workers/containers)
- Extracts real client IP from X-Forwarded-For (Docker/Nginx proxy aware)
- Returns JSON 429 response with Retry-After header
"""

from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from starlette.responses import JSONResponse
from backend.config import settings


import ipaddress
import logging

logger = logging.getLogger(__name__)


def _parse_trusted_proxies(raw: str) -> list[ipaddress.IPv4Network | ipaddress.IPv6Network]:
    networks: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = []
    for item in (raw or "").split(","):
        cidr = item.strip()
        if not cidr:
            continue
        try:
            networks.append(ipaddress.ip_network(cidr, strict=False))
        except ValueError:
            logger.warning("Ignoring invalid TRUSTED_PROXIES entry: %r", cidr)
    return networks


# Trusted reverse-proxy CIDRs (configured via TRUSTED_PROXIES; defaults to loopback + gateway 172.30.42.2/32)
TRUSTED_PROXIES = _parse_trusted_proxies(settings.TRUSTED_PROXIES)


def _is_ip_trusted(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        for network in TRUSTED_PROXIES:
            if ip in network:
                return True
    except ValueError:
        pass
    return False


def _get_client_ip(request: Request) -> str:
    """
    Extract real client IP safely behind trusted reverse proxies.
    Walks X-Forwarded-For from RIGHT to LEFT and picks the rightmost untrusted IP
    so client-supplied spoofed leftmost headers cannot bypass rate limits.
    """
    client_host = request.client.host if request.client else None

    if client_host and _is_ip_trusted(client_host):
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            hops = [hop.strip() for hop in forwarded_for.split(",") if hop.strip()]
            for hop in reversed(hops):
                try:
                    ipaddress.ip_address(hop)
                except ValueError:
                    continue
                if not _is_ip_trusted(hop):
                    return hop
            if hops:
                return hops[0]

    return client_host or "unknown"


def authenticated_limit_key(request: Request) -> str:
    """Resolved auth dependency supplies the ID; clients cannot set this via headers."""
    user_id = getattr(request.state, "authenticated_user_id", None)
    return f"user:{user_id}" if user_id else _get_client_ip(request)


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
