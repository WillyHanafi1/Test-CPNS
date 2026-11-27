"""Security regression tests covering High & Medium audit remediations."""
from datetime import date, datetime, timezone
import hashlib
import hmac
from pathlib import Path
import jwt
from sqlalchemy import select

from backend.config import Settings, settings
from backend.models.models import AuditEvent
from backend.services.visitors import compute_visitor_hash, normalize_visit_path
from backend.tests.conftest import login_and_get_cookies, mock_redis


async def test_logout_blocklist_cannot_be_bypassed_with_bearer_cookie_smuggling(client, test_user):
    cookies = await login_and_get_cookies(client, test_user.email, "TestPassword123")
    raw_token = cookies["access_token"]

    logout_resp = await client.post("/api/v1/auth/logout", cookies={"access_token": raw_token})
    assert logout_resp.status_code == 200

    # Raw revoked token in cookie or header must fail
    client.cookies.clear()
    assert (await client.get("/api/v1/auth/me", cookies={"access_token": raw_token})).status_code == 401
    assert (
        await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {raw_token}"})
    ).status_code == 401

    # Prefix smuggling in cookie MUST also be rejected (HIGH-01 regression)
    for smuggled in (f"Bearer {raw_token}", f"Bearer Bearer {raw_token}", f"bearer {raw_token}"):
        resp = await client.get("/api/v1/auth/me", cookies={"access_token": smuggled})
        assert resp.status_code == 401, f"Smuggled cookie unexpectedly accepted: {smuggled!r}"


async def test_email_normalization_and_admin_shorter_session_ttl(client, admin_user, test_user):
    # Mixed-case registration normalizes to lowercase
    reg = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "  MixedCase@Example.COM ",
            "password": "StrongPassword123",
            "full_name": "  Peserta Baru  ",
        },
    )
    assert reg.status_code == 201, reg.text
    assert reg.json()["email"] == "mixedcase@example.com"

    # Duplicate mixed-case registration is blocked
    dup = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "mixedcase@example.com",
            "password": "StrongPassword123",
            "full_name": "Duplikat",
        },
    )
    assert dup.status_code == 400

    # Participant login with uppercase email succeeds and uses standard TTL
    client.cookies.clear()
    user_cookies = await login_and_get_cookies(client, "TESTUSER@EXAMPLE.COM", "TestPassword123")
    user_claims = jwt.decode(user_cookies["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

    # Admin login gets strictly shorter TTL (ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES)
    client.cookies.clear()
    admin_cookies = await login_and_get_cookies(client, admin_user.email, "AdminPassword123")
    admin_claims = jwt.decode(admin_cookies["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

    now_ts = datetime.now(timezone.utc).timestamp()
    admin_ttl = admin_claims["exp"] - now_ts
    user_ttl = user_claims["exp"] - now_ts
    assert admin_ttl <= settings.ADMIN_ACCESS_TOKEN_EXPIRE_MINUTES * 60 + 5
    assert admin_ttl < user_ttl


async def test_per_account_login_lockout_triggers_429_and_clears_on_reset(client, test_user):
    from backend.core.security import create_reset_token

    for _ in range(settings.LOGIN_MAX_FAILED_ATTEMPTS):
        resp = await client.post(
            "/api/v1/auth/login",
            data={"username": test_user.email, "password": "WrongPassword123"},
        )
        assert resp.status_code == 401

    locked = await client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "TestPassword123"},
    )
    assert locked.status_code == 429
    assert "Retry-After" in locked.headers

    # Password reset clears the lockout counter cleanly
    token = create_reset_token(test_user.email, test_user.auth_version)
    reset_resp = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "FreshPassword123"},
    )
    assert reset_resp.status_code == 200
    ok_login = await client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "FreshPassword123"},
    )
    assert ok_login.status_code == 200


async def test_csrf_middleware_fails_closed_on_missing_or_untrusted_origin(client, test_user):
    cookies = await login_and_get_cookies(client, test_user.email, "TestPassword123")

    # 1. Untrusted Origin -> 403
    bad_origin = await client.post(
        "/api/v1/user/feedback",
        json={"category": "bug", "content": "Test"},
        cookies=cookies,
        headers={"Origin": "https://evil.example"},
    )
    assert bad_origin.status_code == 403

    # 2. Missing Origin + Untrusted Referer -> 403
    bad_referer = await client.post(
        "/api/v1/user/feedback",
        json={"category": "bug", "content": "Test"},
        cookies=cookies,
        headers={"Referer": "https://evil.example/csrf.html"},
    )
    assert bad_referer.status_code == 403

    # 3. Missing Origin + Missing Referer + Missing custom headers -> 403
    # Remove default X-Exam-Protocol header from test client for this call
    stripped = await client.post(
        "/api/v1/user/feedback",
        json={"category": "bug", "content": "Test"},
        cookies=cookies,
        headers={"X-Exam-Protocol": ""},
    )
    assert stripped.status_code == 403

    # 4. Trusted Origin -> 200
    good = await client.post(
        "/api/v1/user/feedback",
        json={"category": "bug", "content": "Laporan valid"},
        cookies=cookies,
        headers={"Origin": "http://localhost:3000", "X-Exam-Protocol": ""},
    )
    assert good.status_code == 200


async def test_package_catalog_caches_content_summary_in_redis(client, test_package_with_questions):
    resp = await client.get("/api/v1/packages")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["question_count"] == 110
    assert items[0]["is_ready"] is True

    # Content summary must now exist in Redis under packages:meta:v1:*
    cached_keys = [k for k in mock_redis._store if k.startswith("packages:meta:v1:")]
    assert len(cached_keys) == 1


def test_visitor_path_allowlist_and_domain_separated_hmac_key():
    assert normalize_visit_path("/tips") == "/tips"
    assert normalize_visit_path("/exam/550e8400-e29b-41d4-a716-446655440000/review") == "/exam/[id]/review"
    # Arbitrary unknown/spam paths are rejected so DB cardinality stays bounded
    assert normalize_visit_path("/random-spam-path-12345") is None
    assert normalize_visit_path("/wp-login.php") is None

    # Visitor hash uses a derived domain-separated key, NOT raw SECRET_KEY
    d = date(2026, 11, 27)
    actual = compute_visitor_hash("203.0.113.10", "Mozilla/5.0", d)
    raw_secret_hmac = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        b"203.0.113.10|Mozilla/5.0|2026-11",
        hashlib.sha256,
    ).hexdigest()[:32]
    assert actual != raw_secret_hmac


async def test_feedback_validation_and_admin_deactivate_audit_trail(client, admin_user, test_user, db_session):
    cookies = await login_and_get_cookies(client, test_user.email, "TestPassword123")
    invalid_cat = await client.post(
        "/api/v1/user/feedback",
        json={"category": "invalid_cat", "content": "Hello"},
        cookies=cookies,
    )
    assert invalid_cat.status_code == 422

    too_long = await client.post(
        "/api/v1/user/feedback",
        json={"category": "bug", "content": "x" * 2001},
        cookies=cookies,
    )
    assert too_long.status_code == 422

    # Admin soft-delete records AuditEvent and increments auth_version
    admin_cookies = await login_and_get_cookies(client, admin_user.email, "AdminPassword123")
    prev_version = test_user.auth_version
    del_resp = await client.delete(f"/api/v1/admin/users/{test_user.id}", cookies=admin_cookies)
    assert del_resp.status_code == 200

    await db_session.refresh(test_user)
    assert test_user.is_active is False
    assert test_user.auth_version == prev_version + 1
    audit = await db_session.scalar(
        select(AuditEvent).where(
            AuditEvent.action == "admin.user_deactivate",
            AuditEvent.entity_id == str(test_user.id),
        )
    )
    assert audit is not None


def test_redis_password_injection_and_infra_security_contracts():
    cfg = Settings(
        DATABASE_URL="sqlite+aiosqlite:///:memory:",
        REDIS_URL="redis://redis:6379/0",
        REDIS_PASSWORD="p@ss/word#123",
        SECRET_KEY="a" * 40,
    )
    assert cfg.REDIS_URL == "redis://:p%40ss%2Fword%23123@redis:6379/0"

    root = Path(__file__).resolve().parents[2]
    nginx_conf = (root / "infra/gateway/nginx.conf").read_text(encoding="utf-8")
    assert "default-src 'self'" in nginx_conf
    assert "script-src 'self'" in nginx_conf
    assert "connect-src 'self'" in nginx_conf
    assert "object-src 'none'" in nginx_conf
    assert "includeSubDomains" in nginx_conf

    compose_prod = (root / "compose.production.yml").read_text(encoding="utf-8")
    assert ".secrets/redis.env" in compose_prod
    assert "--requirepass" in compose_prod
    assert "user: redis" in compose_prod
