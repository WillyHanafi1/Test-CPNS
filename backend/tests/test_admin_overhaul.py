"""Tests for admin overhaul backend contracts (filters, outerjoin search, segment counts, action summary)."""
from datetime import datetime, timedelta, timezone
from backend.core.security import get_password_hash
from backend.models.models import ExamSession, Feedback, Package, Question, QuestionOption, User, UserTransaction
from backend.tests.conftest import login_and_get_cookies


async def test_admin_users_search_includes_users_without_profile_and_protects_self(
    client, admin_user, test_user, db_session
):
    profileless = User(
        email="noprofile@example.com",
        hashed_password=get_password_hash("Password123!"),
        role="participant",
        is_active=True,
        is_pro=True,
        pro_expires_at=datetime.now(timezone.utc) + timedelta(days=90),
    )
    db_session.add(profileless)
    await db_session.commit()

    await login_and_get_cookies(client, admin_user.email, "AdminPassword123")

    # Search by email must find user even when user_profiles row does not exist
    res = await client.get("/api/v1/admin/users?search=noprofile")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["total"] == 1
    assert body["items"][0]["email"] == "noprofile@example.com"
    assert body["items"][0]["is_pro"] is True

    # Filter by is_pro
    pro_res = await client.get("/api/v1/admin/users?is_pro=true")
    assert pro_res.status_code == 200
    assert [u["email"] for u in pro_res.json()["items"]] == ["noprofile@example.com"]

    # Admin cannot demote or deactivate themselves
    self_demote = await client.put(f"/api/v1/admin/users/{admin_user.id}", json={"role": "participant"})
    assert self_demote.status_code == 400
    self_ban = await client.put(f"/api/v1/admin/users/{admin_user.id}", json={"is_active": False})
    assert self_ban.status_code == 400

    # Admin can grant Pro with explicit expiry date
    expiry = (datetime.now(timezone.utc) + timedelta(days=365)).replace(microsecond=0)
    updated = await client.put(
        f"/api/v1/admin/users/{test_user.id}",
        json={"is_pro": True, "pro_expires_at": expiry.isoformat()},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["is_pro"] is True
    assert updated.json()["pro_expires_at"] is not None


async def test_admin_packages_segment_counts_copy_and_question_sub_category(
    client, admin_user, test_package_with_questions, db_session
):
    await login_and_get_cookies(client, admin_user.email, "AdminPassword123")

    # Package list returns TWK/TIU/TKP breakdown
    res = await client.get("/api/v1/admin/packages?status=published")
    assert res.status_code == 200, res.text
    pkg = res.json()["items"][0]
    assert pkg["question_count"] == 110
    assert pkg["twk_count"] == 30
    assert pkg["tiu_count"] == 35
    assert pkg["tkp_count"] == 45

    # Copy package works cleanly without mandatory weekly dates
    copied = await client.post(
        f"/api/v1/admin/packages/{test_package_with_questions.id}/copy",
        json={"title": "Paket Salinan Draft"},
    )
    assert copied.status_code == 201, copied.text
    copy_pkg = copied.json()
    assert copy_pkg["title"] == "Paket Salinan Draft"
    assert copy_pkg["is_published"] is False
    assert copy_pkg["question_count"] == 110

    # Create a draft question with sub_category and filter by missing_discussion
    draft_pkg = Package(title="Draft Kosong", description="Uji editor", category="Mix", is_published=False)
    db_session.add(draft_pkg)
    await db_session.commit()
    await db_session.refresh(draft_pkg)

    created_q = await client.post(
        "/api/v1/admin/questions",
        json={
            "package_id": str(draft_pkg.id),
            "content": "Berapa hasil $2 + 2$?",
            "segment": "TIU",
            "sub_category": "Numerik Berhitung",
            "number": 1,
            "discussion": "",
            "options": [
                {"label": "A", "content": "3", "score": 0},
                {"label": "B", "content": "4", "score": 5},
                {"label": "C", "content": "5", "score": 0},
                {"label": "D", "content": "6", "score": 0},
                {"label": "E", "content": "7", "score": 0},
            ],
        },
    )
    assert created_q.status_code == 201, created_q.text
    assert created_q.json()["sub_category"] == "Numerik Berhitung"

    missing = await client.get(
        f"/api/v1/admin/questions?package_id={draft_pkg.id}&missing_discussion=true"
    )
    assert missing.status_code == 200
    assert missing.json()["total"] == 1


async def test_admin_transactions_feedback_and_analytics_enhancements(
    client, admin_user, test_user, test_package_with_questions, db_session
):
    now = datetime.now(timezone.utc)
    db_session.add_all([
        UserTransaction(
            user_id=test_user.id,
            order_id="PRO-OVERHAUL-01",
            transaction_type="pro_upgrade",
            payment_status="success",
            amount=50000,
            paid_at=now,
        ),
        UserTransaction(
            user_id=test_user.id,
            order_id="DON-OVERHAUL-01",
            transaction_type="donation",
            payment_status="success",
            amount=15000,
            message="Semangat tim TOCPNS",
            is_anonymous=False,
            paid_at=now,
        ),
        Feedback(
            user_id=test_user.id,
            category="correction",
            priority="high",
            status="pending",
            content="Soal nomor 12 ada typo",
            path_context="/exam/demo",
        ),
        ExamSession(
            user_id=test_user.id,
            package_id=test_package_with_questions.id,
            status="finished",
            is_preview=False,
            total_score=410,
            score_twk=100,
            score_tiu=120,
            score_tkp=190,
            start_time=now - timedelta(hours=1),
            end_time=now,
        ),
    ])
    await db_session.commit()

    await login_and_get_cookies(client, admin_user.email, "AdminPassword123")

    # Transactions: search by order_id + filter donation + breakdown summary
    tx_search = await client.get("/api/v1/admin/transactions?search=DON-OVERHAUL")
    assert tx_search.status_code == 200
    assert tx_search.json()["total"] == 1
    assert tx_search.json()["items"][0]["transaction_type"] == "donation"

    tx_summary = await client.get("/api/v1/admin/transactions/summary")
    assert tx_summary.status_code == 200
    s = tx_summary.json()
    assert s["total_revenue"] == 65000
    assert s["pro_revenue"] == 50000
    assert s["donation_revenue"] == 15000

    # Feedback: search + counts_by_status
    fb = await client.get("/api/v1/admin/feedback?search=typo")
    assert fb.status_code == 200
    assert fb.json()["total"] == 1
    assert fb.json()["counts_by_status"]["pending"] == 1

    # Action summary & enriched revenue trends
    summary = await client.get("/api/v1/admin/analytics/action-summary")
    assert summary.status_code == 200, summary.text
    assert summary.json()["pending_feedback"] == 1
    assert len(summary.json()["recent_transactions"]) == 2

    trends = await client.get("/api/v1/admin/analytics/revenue-trends?days=7")
    assert trends.status_code == 200, trends.text
    t = trends.json()
    assert len(t["revenue_by_type"]) == 2
    assert len(t["top_attempted_packages"]) == 1
    assert t["top_attempted_packages"][0]["attempts"] == 1
    assert t["top_attempted_packages"][0]["pass_rate"] == 100.0
