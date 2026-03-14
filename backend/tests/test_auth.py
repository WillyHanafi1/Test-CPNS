"""
Auth Flow Tests — register, login, me, logout, duplicate prevention.
"""

import pytest
from httpx import AsyncClient
from tests.conftest import login_and_get_cookies


class TestRegister:
    async def test_register_success(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/register", json={
            "email": "newuser@test.com",
            "password": "SecurePass123",
            "full_name": "New User",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "newuser@test.com"
        assert "id" in data

    async def test_register_duplicate_email(self, client: AsyncClient, test_user):
        resp = await client.post("/api/v1/auth/register", json={
            "email": "testuser@example.com",  # same as test_user fixture
            "password": "AnotherPass123",
            "full_name": "Duplicate User",
        })
        assert resp.status_code == 400
        assert "already exists" in resp.json()["detail"].lower()

    async def test_register_invalid_email(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/register", json={
            "email": "not-an-email",
            "password": "Pass123",
            "full_name": "Bad Email",
        })
        assert resp.status_code == 422  # Pydantic validation error


class TestLogin:
    async def test_login_success(self, client: AsyncClient, test_user):
        resp = await client.post("/api/v1/auth/login", data={
            "username": "testuser@example.com",
            "password": "TestPassword123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "testuser@example.com"
        assert "access_token" not in data  # JWT is in HttpOnly cookie, not body
        # Verify cookie is set
        assert "access_token" in resp.cookies

    async def test_login_wrong_password(self, client: AsyncClient, test_user):
        resp = await client.post("/api/v1/auth/login", data={
            "username": "testuser@example.com",
            "password": "WrongPassword",
        })
        assert resp.status_code == 401

    async def test_login_nonexistent_user(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/login", data={
            "username": "nonexistent@test.com",
            "password": "SomePass",
        })
        assert resp.status_code == 401


class TestMe:
    async def test_me_authenticated(self, client: AsyncClient, test_user):
        cookies = await login_and_get_cookies(client, "testuser@example.com", "TestPassword123")
        resp = await client.get("/api/v1/auth/me", cookies=cookies)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == "testuser@example.com"
        assert data["role"] == "participant"

    async def test_me_unauthenticated(self, client: AsyncClient):
        resp = await client.get("/api/v1/auth/me")
        assert resp.status_code == 401


class TestLogout:
    async def test_logout_clears_cookie(self, client: AsyncClient, test_user):
        cookies = await login_and_get_cookies(client, "testuser@example.com", "TestPassword123")
        resp = await client.post("/api/v1/auth/logout", cookies=cookies)
        assert resp.status_code == 200
        # After logout, /me should fail
        resp2 = await client.get("/api/v1/auth/me")
        assert resp2.status_code == 401
