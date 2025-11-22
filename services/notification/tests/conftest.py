"""
Pytest Configuration and Fixtures
=================================
Shared fixtures for all tests
"""

import asyncio
import os
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from app.core.config import settings
from app.core.database import Base
from app.models.notification import (
    NotificationQueue,
    NotificationTemplate,
)
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

# Test database URL
TEST_DATABASE_URL = settings.DATABASE_URL.replace(
    settings.POSTGRES_DB, f"{settings.POSTGRES_DB}_test"
)


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """
    Setup test database before all tests.

    This fixture runs ONCE per test session and drops/recreates the database.
    Uses psycopg2 directly to avoid SQLAlchemy caching issues.
    """
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

    db_name = f"{settings.POSTGRES_DB}_test"
    # Use hardcoded credentials for test (same as docker-compose.dev.yml)
    password = "dev_password"
    user = "refertosicuro"
    host = settings.POSTGRES_HOST
    port = settings.POSTGRES_PORT

    # Connect to postgres database to drop/create test database
    conn = psycopg2.connect(
        dbname="postgres",
        user=user,
        password=password,
        host=host,
        port=port
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()

    # Terminate all connections to test database
    cursor.execute(f"""
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '{db_name}'
          AND pid <> pg_backend_pid()
    """)

    # Drop and recreate
    cursor.execute(f"DROP DATABASE IF EXISTS {db_name}")
    cursor.execute(f"CREATE DATABASE {db_name}")

    cursor.close()
    conn.close()

    yield

    # Cleanup after all tests (optional - comment out to keep for debugging)
    # conn = psycopg2.connect(dbname="postgres", user=user, password=password, host=host, port=port)
    # conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    # cursor = conn.cursor()
    # cursor.execute(f"DROP DATABASE IF EXISTS {db_name}")
    # cursor.close()
    # conn.close()


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """
    Create event loop for async tests.
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Create test database and session for each test.

    Yields:
        AsyncSession for test database
    """
    # Create test engine
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        poolclass=NullPool,
    )

    # Create all tables (database was recreated by session fixture)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session factory
    async_session = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    # Create session
    async with async_session() as session:
        yield session

    # Drop tables after test
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
def sample_template_data() -> dict:
    """
    Sample template data for testing.

    Returns:
        Dictionary with template fields
    """
    return {
        "name": "test_template",
        "type": "email",
        "description": "Test template for unit tests",
        "subject": "Test Subject",
        "body_html": "<p>Hello {{ user_name }}!</p>",
        "body_text": "Hello {{ user_name }}!",
        "variables": ["user_name"],
        "locale": "it",
        "is_active": True,
    }


@pytest.fixture
def sample_notification_data() -> dict:
    """
    Sample notification data for testing.

    Returns:
        Dictionary with notification fields
    """
    return {
        "type": "email",
        "recipient": "test@example.com",
        "recipient_name": "Test User",
        "template_name": "test_template",
        "subject": "Test Email",
        "body_html": "<p>Test HTML body</p>",
        "body_text": "Test text body",
        "variables": {"user_name": "Test User"},
        "status": "pending",
        "priority": 5,
        "correlation_id": uuid.uuid4(),
        "event_type": "user.registered",
        "user_id": uuid.uuid4(),
    }


@pytest_asyncio.fixture
async def sample_template(
    test_db: AsyncSession, sample_template_data: dict
) -> NotificationTemplate:
    """
    Create sample template in database.

    Args:
        test_db: Test database session
        sample_template_data: Template data

    Returns:
        Created NotificationTemplate instance
    """
    template = NotificationTemplate(id=uuid.uuid4(), **sample_template_data)
    test_db.add(template)
    await test_db.commit()
    await test_db.refresh(template)
    return template


@pytest_asyncio.fixture
async def sample_notification(
    test_db: AsyncSession, sample_notification_data: dict
) -> NotificationQueue:
    """
    Create sample notification in database.

    Args:
        test_db: Test database session
        sample_notification_data: Notification data

    Returns:
        Created NotificationQueue instance
    """
    notification = NotificationQueue(id=uuid.uuid4(), **sample_notification_data)
    test_db.add(notification)
    await test_db.commit()
    await test_db.refresh(notification)
    return notification


@pytest.fixture
def sample_template_variables() -> dict:
    """
    Sample variables for template rendering.

    Returns:
        Dictionary of template variables
    """
    return {
        "user_name": "Mario Rossi",
        "verification_link": "https://refertosicuro.it/verify/abc123",
        "trial_days": 7,
    }


@pytest.fixture
def sample_auth_event() -> dict:
    """
    Sample Auth Service event.

    Returns:
        Event dictionary matching Auth Service format
    """
    return {
        "event_type": "user.registered",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "correlation_id": str(uuid.uuid4()),
        "payload": {
            "user_id": str(uuid.uuid4()),
            "email": "test@example.com",
            "full_name": "Test User",
            "verification_token": "abc123def456",
        },
        "metadata": {
            "service": "auth-service",
            "version": "1.0.0",
        },
    }


@pytest.fixture
def mock_smtp_config():
    """
    Mock SMTP configuration for testing.

    Returns:
        Mock SMTP config object
    """
    from app.core.smtp import SMTPConfig

    return SMTPConfig(
        host="localhost",
        port=1025,
        username=None,
        password=None,
        use_tls=False,
        use_ssl=False,
        timeout=10,
        from_address="noreply@refertosicuro.it",
        from_name="RefertoSicuro Test",
    )


@pytest.fixture
def mock_rabbitmq_message():
    """
    Mock RabbitMQ message for testing.

    Returns:
        Mock message object
    """
    import json
    from unittest.mock import MagicMock

    message = MagicMock()
    message.body = json.dumps(
        {
            "event_type": "user.registered",
            "correlation_id": str(uuid.uuid4()),
            "payload": {
                "user_id": str(uuid.uuid4()),
                "email": "test@example.com",
                "full_name": "Test User",
                "verification_token": "test_token",
            },
        }
    ).encode()
    return message
