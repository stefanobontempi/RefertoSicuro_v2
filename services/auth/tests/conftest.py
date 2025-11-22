"""
Test Configuration and Fixtures
================================
Shared fixtures for Auth Service tests
"""

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import AsyncGenerator, Dict, Generator

import pytest
import pytest_asyncio
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.models.user import Session, User
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# Test database URL
TEST_DATABASE_URL = (
    "postgresql+asyncpg://refertosicuro:dev_password_change_me@localhost:5432/refertosicuro_test"
)


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Create test database session.

    Creates a fresh database for each test and cleans up after.
    """
    # Create test engine
    test_engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        poolclass=NullPool,  # No connection pooling for tests
    )

    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session

    # Cleanup
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await test_engine.dispose()


@pytest_asyncio.fixture
async def async_client(test_db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Create async HTTP client for API testing.

    Creates a minimal FastAPI app with only auth endpoints for testing.
    """
    from app.api.v1 import auth
    from fastapi import FastAPI

    # Create minimal test app
    app = FastAPI(title="Auth Service Test")
    app.include_router(auth.router)  # router already has /api/v1/auth prefix

    # Override database dependency
    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

    # Clear overrides
    app.dependency_overrides.clear()


@pytest.fixture
def test_user_data() -> Dict:
    """Sample user data for testing."""
    return {
        "email": "test@refertosicuro.it",
        "password": "SecurePass123!",
        "full_name": "Test User",
        "phone_number": "+39 123 456 7890",
        "tax_code": "TSTusr80A01H501Z",
        "preferred_language": "it",
    }


@pytest_asyncio.fixture
async def test_user(test_db: AsyncSession, test_user_data: Dict) -> User:
    """
    Create test user in database.

    Returns verified user ready for testing.
    """
    user = User(
        email=test_user_data["email"],
        email_normalized=test_user_data["email"].lower(),
        password_hash=get_password_hash(test_user_data["password"]),
        full_name=test_user_data["full_name"],
        phone_number=test_user_data["phone_number"],
        tax_code=test_user_data["tax_code"],
        preferred_language=test_user_data["preferred_language"],
        email_verified=True,
        email_verified_at=datetime.now(timezone.utc),
        status="active",
        role="customer",
    )

    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)

    return user


@pytest_asyncio.fixture
async def test_admin_user(test_db: AsyncSession) -> User:
    """Create test admin user."""
    admin = User(
        email="admin@refertosicuro.it",
        email_normalized="admin@refertosicuro.it",
        password_hash=get_password_hash("AdminPass123!"),
        full_name="Admin User",
        email_verified=True,
        status="active",
        role="admin",
    )

    test_db.add(admin)
    await test_db.commit()
    await test_db.refresh(admin)

    return admin


@pytest_asyncio.fixture
async def test_session(test_db: AsyncSession, test_user: User) -> Session:
    """Create test session for user."""
    session = Session(
        user_id=test_user.id,
        access_token_jti=uuid.uuid4(),
        refresh_token_jti=uuid.uuid4(),
        access_expires_at=datetime.now(timezone.utc) + timedelta(hours=4),
        refresh_expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        ip_address="127.0.0.1",
        user_agent="pytest",
        device_name="Test Device",
        is_active=True,
    )

    test_db.add(session)
    await test_db.commit()
    await test_db.refresh(session)

    return session


@pytest.fixture
def mock_redis(monkeypatch):
    """
    Mock Redis client for testing.

    Provides in-memory dict-based mock.
    """
    storage = {}

    class MockRedis:
        async def get(self, key: str):
            return storage.get(key)

        async def setex(self, key: str, ttl: int, value: str):
            storage[key] = value
            return True

        async def delete(self, key: str):
            storage.pop(key, None)
            return True

        async def exists(self, key: str):
            """Check if key exists in Redis"""
            return key in storage

        async def ping(self):
            return True

    # Patch redis_client in all modules that import it
    from app.core import redis
    from app.services import jwt_service, token_service

    mock_instance = MockRedis()
    monkeypatch.setattr(redis, "redis_client", mock_instance)
    monkeypatch.setattr(token_service, "redis_client", mock_instance)
    monkeypatch.setattr(jwt_service, "redis_client", mock_instance)

    yield storage

    # Cleanup
    storage.clear()


@pytest.fixture
def mock_email_service(monkeypatch):
    """Mock email service to prevent actual email sending."""
    sent_emails = []

    class MockEmailService:
        async def send_verification_email(self, **kwargs):
            sent_emails.append({"type": "verification", **kwargs})
            return True

        async def send_password_reset_email(self, **kwargs):
            sent_emails.append({"type": "password_reset", **kwargs})
            return True

    from app.services import email_service

    monkeypatch.setattr(email_service, "email_service", MockEmailService())

    yield sent_emails


@pytest.fixture
def mock_event_service(monkeypatch):
    """Mock event service to capture published events."""
    published_events = []

    class MockEventService:
        async def publish_event(self, event_type: str, payload: Dict, **kwargs):
            published_events.append({"event_type": event_type, "payload": payload})
            return True

        async def publish_user_registered(self, **kwargs):
            return await self.publish_event("user.registered", kwargs)

        async def publish_user_logged_in(self, **kwargs):
            return await self.publish_event("user.logged_in", kwargs)

        async def publish_user_logged_out(self, **kwargs):
            return await self.publish_event("user.logged_out", kwargs)

        async def publish_user_email_verified(self, **kwargs):
            return await self.publish_event("user.email_verified", kwargs)

        async def publish_user_password_changed(self, **kwargs):
            return await self.publish_event("user.password_changed", kwargs)

        async def publish_user_2fa_enabled(self, **kwargs):
            return await self.publish_event("user.2fa_enabled", kwargs)

        async def publish_password_reset_requested(self, **kwargs):
            return await self.publish_event("password_reset.requested", kwargs)

    from app.api.v1 import auth
    from app.services import event_service

    mock_instance = MockEventService()
    monkeypatch.setattr(event_service, "event_service", mock_instance)
    monkeypatch.setattr(auth, "event_service", mock_instance)

    yield published_events


@pytest.fixture
def auth_headers(test_user: User) -> Dict[str, str]:
    """Generate auth headers with JWT token."""
    from app.services.jwt_service import jwt_service

    # Create simple token for testing
    token = jwt_service._create_access_token(
        data={
            "sub": str(test_user.id),
            "email": test_user.email,
            "role": test_user.role,
        }
    )

    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
