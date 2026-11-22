"""Tests for privacy-friendly visitor analytics (online now, daily/monthly uniques, top pages, bot filtering)."""
from backend.services.visitors import is_bot_user_agent, normalize_visit_path
from backend.tests.conftest import login_and_get_cookies


def test_path_normalization_and_bot_detection():
    assert normalize_visit_path("/") == "/"
    assert normalize_visit_path("/catalog?page=2#top") == "/catalog"
    assert normalize_visit_path("/catalog/upgrade") == "/catalog/upgrade"
    assert normalize_visit_path("/catalog/550e8400-e29b-41d4-a716-446655440000") == "/catalog/[id]"
    assert normalize_visit_path("/session/abc123/result") == "/session/[id]/result"
    assert normalize_visit_path("/admin") is None
    assert normalize_visit_path("/admin/analytics") is None
    assert normalize_visit_path("/api/v1/public/stats") is None

    assert is_bot_user_agent("Mozilla/5.0 (compatible; Googlebot/2.1)") is True
    assert is_bot_user_agent("curl/8.4.0") is True
    assert is_bot_user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0") is False


async def test_visitor_beacon_dedup_heartbeat_and_admin_analytics(client, admin_user, test_user):
    ua_a = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0"
    ua_b = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1"

    # 1. Bot is ignored
    bot_res = await client.post(
        "/api/v1/public/visit",
        json={"path": "/", "heartbeat": False},
        headers={"User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)"},
    )
    assert bot_res.status_code == 200
    assert bot_res.json()["recorded"] is False

    # 2. Admin path is excluded
    adm_path = await client.post(
        "/api/v1/public/visit",
        json={"path": "/admin/users", "heartbeat": False},
        headers={"User-Agent": ua_a},
    )
    assert adm_path.status_code == 200
    assert adm_path.json()["recorded"] is False

    # 3. Visitor A visits / then /catalog then sends heartbeat
    v1 = await client.post(
        "/api/v1/public/visit",
        json={"path": "/", "heartbeat": False},
        headers={"User-Agent": ua_a},
    )
    assert v1.status_code == 200
    assert v1.json()["recorded"] is True
    assert v1.json()["is_new_today"] is True

    v2 = await client.post(
        "/api/v1/public/visit",
        json={"path": "/catalog/550e8400-e29b-41d4-a716-446655440000", "heartbeat": False},
        headers={"User-Agent": ua_a},
    )
    assert v2.status_code == 200
    assert v2.json()["is_new_today"] is False
    assert v2.json()["path"] == "/catalog/[id]"

    hb = await client.post(
        "/api/v1/public/visit",
        json={"path": "/catalog", "heartbeat": True},
        headers={"User-Agent": ua_a},
    )
    assert hb.status_code == 200
    assert hb.json()["recorded"] is True

    # 4. Visitor B (distinct UA) visits /
    v3 = await client.post(
        "/api/v1/public/visit",
        json={"path": "/", "heartbeat": False},
        headers={"User-Agent": ua_b},
    )
    assert v3.status_code == 200
    assert v3.json()["is_new_today"] is True

    # 5. Public visitor summary returns accurate aggregate counts
    pub = await client.get("/api/v1/public/visitors")
    assert pub.status_code == 200
    pub_data = pub.json()
    assert pub_data["online_now"] == 2
    assert pub_data["today_visitors"] == 2
    assert pub_data["month_visitors"] == 2
    assert pub_data["total_visitors"] == 2

    # 6. Admin analytics endpoint rejects non-admin users
    unauth = await client.get("/api/v1/admin/analytics/visitors")
    assert unauth.status_code in (401, 403)

    await login_and_get_cookies(client, test_user.email, "TestPassword123")
    part_res = await client.get("/api/v1/admin/analytics/visitors")
    assert part_res.status_code == 403

    # 7. Admin receives full visitor trend & normalized top pages (heartbeat did NOT inflate pageviews!)
    await login_and_get_cookies(client, admin_user.email, "AdminPassword123")
    adm = await client.get("/api/v1/admin/analytics/visitors?days=14")
    assert adm.status_code == 200, adm.text
    body = adm.json()
    assert body["online_now"] == 2
    assert body["today_visitors"] == 2
    assert body["today_pageviews"] == 3  # 2 visits to '/' + 1 visit to '/catalog/[id]', heartbeat excluded
    assert body["month_visitors"] == 2
    assert body["month_pageviews"] == 3
    assert body["total_visitors"] == 2
    assert body["total_pageviews"] == 3
    assert len(body["daily_trend"]) == 14
    assert body["daily_trend"][-1]["visitors"] == 2
    assert body["daily_trend"][-1]["pageviews"] == 3
    top_map = {item["path"]: item["pageviews"] for item in body["top_pages"]}
    assert top_map["/"] == 2
    assert top_map["/catalog/[id]"] == 1
