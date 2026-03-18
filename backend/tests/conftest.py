"""
Pytest fixtures for the CAT CPNS test suite.

Uses SQLite async in-memory DB (no external Postgres required)
and a mock Redis service (dict-based, no external Redis required).
"""

import sys
import os
from pathlib import Path

# ====================================================================
# 0. PATH & ENV SETUP — MUST happen before any backend imports
# ====================================================================

# Ensure 'backend' package is importable (CWD might be backend/)
_project_root = str(Path(__file__).resolve().parent.parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

# Set env vars BEFORE importing backend.config (pydantic_settings reads them at import)
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-only")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

# ====================================================================
# Now safe to import backend modules
# ====================================================================

import asyncio
import uuid
from typing import AsyncGenerator
from datetime import datetime, timezone, timedelta

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

# Import Base and models AFTER env is set
from backend.db.session import Base, get_async_session
from backend.models.models import User, UserProfile, Package, Question, QuestionOption
from backend.core.security import get_password_hash


# ====================================================================
# 1. SQLite In-Memory Engine & Session Override
# ====================================================================

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# SQLite does NOT support statement_cache_size, so we create a clean engine
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, expire_on_commit=False)


async def override_get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session


# ====================================================================
# 2. Mock Redis Service (dict-based)
# ====================================================================

class MockRedisService:
    """In-memory Redis mock — no external Redis required for tests."""

    def __init__(self):
        self._store: dict = {}
        self._hashes: dict = {}
        self._sorted_sets: dict = {}

    # --- Basic key-value ---
    async def get(self, key: str):
        return self._store.get(key)

    async def set(self, key: str, value: str, ex: int = None):
        self._store[key] = value

    async def incr(self, key: str) -> int:
        val = int(self._store.get(key, 0))
        val += 1
        self._store[key] = str(val)
        return val

    async def eval(self, script, numkeys, *keys_and_args):
        # Mock Lua script evaluation for rate limiting
        key = keys_and_args[0]
        val = int(self._store.get(key, 0))
        val += 1
        self._store[key] = str(val)
        return val

    async def delete(self, *keys: str):
        for key in keys:
            self._store.pop(key, None)
            self._hashes.pop(key, None)

    async def exists(self, key: str) -> bool:
        return key in self._store or key in self._hashes

    # --- Hashes ---
    async def hset(self, name: str, key: str = None, value: str = None, mapping: dict = None):
        if name not in self._hashes:
            self._hashes[name] = {}
        if mapping:
            self._hashes[name].update(mapping)
        elif key and value is not None:
            self._hashes[name][key] = value

    async def hgetall(self, name: str) -> dict:
        return self._hashes.get(name, {})

    async def hget(self, name: str, key: str):
        return self._hashes.get(name, {}).get(key)

    # --- Sorted Sets ---
    async def zadd(self, name: str, mapping: dict, gt: bool = False):
        if name not in self._sorted_sets:
            self._sorted_sets[name] = {}
        for member, score in mapping.items():
            if gt and member in self._sorted_sets[name]:
                if score > self._sorted_sets[name][member]:
                    self._sorted_sets[name][member] = score
            else:
                self._sorted_sets[name][member] = score

    async def zrevrange(self, name: str, start: int, end: int, withscores: bool = False):
        ss = self._sorted_sets.get(name, {})
        sorted_items = sorted(ss.items(), key=lambda x: x[1], reverse=True)
        sliced = sorted_items[start:end + 1]
        if withscores:
            return sliced
        return [item[0] for item in sliced]

    async def aclose(self):
        pass

    # --- Sets ---
    async def sadd(self, name: str, *values):
        if name not in self._store:
            self._store[name] = set()
        if isinstance(self._store[name], set):
            self._store[name].update(values)

    async def smembers(self, name: str):
        return self._store.get(name, set())

    async def sismember(self, name: str, value: str) -> bool:
        s = self._store.get(name, set())
        return isinstance(s, set) and value in s

    # --- Misc ---
    async def expire(self, name: str, time: int):
        pass  # no-op in tests

    async def setex(self, name: str, time: int, value: str):
        """SET with EXpiry — just stores the value, ignoring TTL in tests."""
        self._store[name] = value

    async def keys(self, pattern: str = "*"):
        import fnmatch
        return [k for k in list(self._store.keys()) if fnmatch.fnmatch(str(k), pattern)]

    async def scan(self, cursor: int = 0, match: str = "*", count: int = 100):
        import fnmatch
        keys = [k for k in list(self._store.keys()) + list(self._hashes.keys())
                if fnmatch.fnmatch(k, match)]
        return (0, keys[:count])

    def clear(self):
        self._store.clear()
        self._hashes.clear()
        self._sorted_sets.clear()


mock_redis = MockRedisService()


# ====================================================================
# 3. Core Fixtures
# ====================================================================

@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Create all tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    mock_redis.clear()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a clean DB session for test helpers."""
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """HTTPX AsyncClient wired to FastAPI app with overridden deps."""
    from backend.main import app
    from backend.core.rate_limiter import limiter

    # Override DB session dependency
    app.dependency_overrides[get_async_session] = override_get_async_session

    # Disable rate limiting in tests (no real Redis needed)
    limiter.enabled = False

    # Monkey-patch redis_service to use mock
    from backend.core import redis_service as rs_module
    original_redis_prop = type(rs_module.redis_service).redis
    type(rs_module.redis_service).redis = property(lambda self: mock_redis)

    # Mock Celery task in exam endpoint
    from backend.api.v1.endpoints import exam as exam_endpoint
    from unittest.mock import MagicMock
    mock_task = MagicMock()
    original_calculate_exam_score = exam_endpoint.calculate_exam_score
    exam_endpoint.calculate_exam_score = mock_task

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    # Restore
    app.dependency_overrides.clear()
    limiter.enabled = True
    type(rs_module.redis_service).redis = original_redis_prop
    exam_endpoint.calculate_exam_score = original_calculate_exam_score


# ====================================================================
# 4. Test Data Fixtures
# ====================================================================

@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user with profile."""
    user = User(
        id=uuid.uuid4(),
        email="testuser@example.com",
        hashed_password=get_password_hash("TestPassword123"),
        role="participant",
        is_active=True,
        auth_provider="local",
    )
    profile = UserProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        full_name="Test User",
    )
    db_session.add(user)
    db_session.add(profile)
    await db_session.commit()
    return user


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession) -> User:
    """Create an admin user."""
    user = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        hashed_password=get_password_hash("AdminPassword123"),
        role="admin",
        is_active=True,
        auth_provider="local",
    )
    profile = UserProfile(
        id=uuid.uuid4(),
        user_id=user.id,
        full_name="Admin User",
    )
    db_session.add(user)
    db_session.add(profile)
    await db_session.commit()
    return user


@pytest_asyncio.fixture
async def test_package_with_questions(db_session: AsyncSession) -> Package:
    """Create a free package with 3 questions (1 TWK, 1 TIU, 1 TKP)."""
    pkg = Package(
        id=uuid.uuid4(),
        title="Test Package",
        description="A test exam package",
        price=0,
        is_premium=False,
        is_published=True,
        category="SKD",
    )
    db_session.add(pkg)
    await db_session.flush()

    # Question 1: TWK (correct = option A, score 5)
    q1 = Question(
        id=uuid.uuid4(), package_id=pkg.id, content="TWK Question 1",
        segment="TWK", number=1,
    )
    db_session.add(q1)
    await db_session.flush()
    for label, score in [("A", 5), ("B", 0), ("C", 0), ("D", 0), ("E", 0)]:
        db_session.add(QuestionOption(
            id=uuid.uuid4(), question_id=q1.id,
            label=label, content=f"Option {label}", score=score,
        ))

    # Question 2: TIU (correct = option B, score 5)
    q2 = Question(
        id=uuid.uuid4(), package_id=pkg.id, content="TIU Question 1",
        segment="TIU", number=2,
    )
    db_session.add(q2)
    await db_session.flush()
    for label, score in [("A", 0), ("B", 5), ("C", 0), ("D", 0), ("E", 0)]:
        db_session.add(QuestionOption(
            id=uuid.uuid4(), question_id=q2.id,
            label=label, content=f"Option {label}", score=score,
        ))

    # Question 3: TKP (scores: A=1, B=2, C=3, D=4, E=5)
    q3 = Question(
        id=uuid.uuid4(), package_id=pkg.id, content="TKP Question 1",
        segment="TKP", number=3,
    )
    db_session.add(q3)
    await db_session.flush()
    for label, score in [("A", 1), ("B", 2), ("C", 3), ("D", 4), ("E", 5)]:
        db_session.add(QuestionOption(
            id=uuid.uuid4(), question_id=q3.id,
            label=label, content=f"Option {label}", score=score,
        ))

    await db_session.commit()
    return pkg


async def login_and_get_cookies(client: AsyncClient, email: str, password: str) -> dict:
    """Helper: login and return cookies dict for authenticated requests."""
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return dict(resp.cookies)
