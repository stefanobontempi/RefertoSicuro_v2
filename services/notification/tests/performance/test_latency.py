"""
Latency Performance Tests
==========================
Verify that email processing latency meets p95 < 500ms requirement.
"""

import asyncio
import time
from datetime import datetime, timezone
from statistics import median, quantiles
from typing import List
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.notification import NotificationQueue
from app.workers.email_worker import EmailWorker


@pytest.mark.skip(reason="Database setup issues with SQLAlchemy metadata caching - TODO: Fix with Alembic-based test setup")
@pytest.mark.asyncio
@patch("app.workers.email_worker.EmailService")
async def test_email_processing_latency_p95_under_500ms(mock_email_service_class, test_db):
    """
    Test that p95 email processing latency is under 500ms.

    This test:
    1. Processes 100 individual emails
    2. Mocks EmailService to avoid SMTP latency
    3. Measures processing time for each
    4. Calculates p95 latency
    5. Verifies p95 < 500ms
    """
    # Mock EmailService.send_email
    mock_email_service = MagicMock()
    mock_email_service.send_email = AsyncMock(return_value=True)
    mock_email_service_class.return_value = mock_email_service

    # Arrange: Create 100 pending emails
    num_emails = 100
    latencies: List[float] = []

    worker = EmailWorker(poll_interval=0.1, batch_size=1)  # Process one at a time

    for i in range(num_emails):
        async with AsyncSessionLocal() as db:
            # Create single email
            notification = NotificationQueue(
                id=uuid4(),
                type="email",
                status="pending",
                priority=1,
                recipient_email=f"user{i}@example.com",
                subject=f"Latency Test Email {i}",
                template_name="test_template",
                template_data={"message": f"Test message {i}"},
                scheduled_at=datetime.now(timezone.utc),
                max_attempts=1,
                retry_count=0,
            )
            db.add(notification)
            await db.commit()

        # Act: Measure processing latency
        start_time = time.time()
        await worker._process_batch()
        end_time = time.time()

        latency_ms = (end_time - start_time) * 1000
        latencies.append(latency_ms)

    # Calculate percentiles
    latencies.sort()
    p50 = median(latencies)
    p95, p99 = quantiles(latencies, n=100)[94], quantiles(latencies, n=100)[98]

    # Assertions
    assert p95 < 500, (
        f"p95 latency requirement not met: {p95:.2f}ms (target: < 500ms)"
    )

    print(f"\n✅ Latency test passed:")
    print(f"   - Emails processed: {num_emails}")
    print(f"   - p50 latency: {p50:.2f}ms")
    print(f"   - p95 latency: {p95:.2f}ms")
    print(f"   - p99 latency: {p99:.2f}ms")
    print(f"   - Min latency: {min(latencies):.2f}ms")
    print(f"   - Max latency: {max(latencies):.2f}ms")


@pytest.mark.skip(reason="Database setup issues with SQLAlchemy metadata caching - TODO: Fix with Alembic-based test setup")
@pytest.mark.asyncio
async def test_template_rendering_latency(test_db):
    """
    Test template rendering latency in isolation.

    Template rendering should be fast (<100ms p95) as it's a critical path.
    """
    from app.services.template_service import TemplateService

    template_service = TemplateService()
    num_renders = 100
    latencies: List[float] = []

    # Test data
    template_name = "welcome"
    context = {
        "user_name": "John Doe",
        "verification_link": "https://example.com/verify/abc123",
    }

    for _ in range(num_renders):
        start_time = time.time()

        # Render both HTML and text versions
        html_body = await template_service.render_template(
            template_name=template_name,
            context=context,
            format="html"
        )
        text_body = await template_service.render_template(
            template_name=template_name,
            context=context,
            format="text"
        )

        end_time = time.time()
        latency_ms = (end_time - start_time) * 1000
        latencies.append(latency_ms)

    # Calculate percentiles
    latencies.sort()
    p50 = median(latencies)
    p95, p99 = quantiles(latencies, n=100)[94], quantiles(latencies, n=100)[98]

    # Assertions - template rendering should be very fast
    assert p95 < 100, (
        f"Template rendering p95 latency too high: {p95:.2f}ms (target: < 100ms)"
    )

    print(f"\n✅ Template rendering latency test passed:")
    print(f"   - Renders: {num_renders}")
    print(f"   - p50 latency: {p50:.2f}ms")
    print(f"   - p95 latency: {p95:.2f}ms")
    print(f"   - p99 latency: {p99:.2f}ms")


@pytest.mark.skip(reason="Database setup issues with SQLAlchemy metadata caching - TODO: Fix with Alembic-based test setup")
@pytest.mark.asyncio
async def test_database_query_latency(test_db):
    """
    Test database query latency for fetching pending emails.

    Database queries should be fast (<50ms p95) with proper indexing.
    """
    # Arrange: Create 500 emails with various statuses
    async with AsyncSessionLocal() as db:
        for i in range(500):
            status = "pending" if i % 2 == 0 else "sent"
            notification = NotificationQueue(
                id=uuid4(),
                type="email",
                status=status,
                priority=i % 3,  # Mix of priorities
                recipient_email=f"user{i}@example.com",
                subject=f"DB Query Test Email {i}",
                template_name="test_template",
                template_data={"message": f"Test message {i}"},
                scheduled_at=datetime.now(timezone.utc),
                max_attempts=3,
                retry_count=0,
            )
            db.add(notification)

        await db.commit()

    # Act: Measure query latency 100 times
    num_queries = 100
    latencies: List[float] = []

    for _ in range(num_queries):
        start_time = time.time()

        async with AsyncSessionLocal() as db:
            # Query that the worker uses
            stmt = (
                select(NotificationQueue)
                .where(
                    NotificationQueue.status == "pending",
                    NotificationQueue.type == "email",
                    NotificationQueue.scheduled_at <= datetime.now(timezone.utc),
                )
                .order_by(
                    NotificationQueue.priority.asc(),
                    NotificationQueue.created_at.asc(),
                )
                .limit(100)
            )
            result = await db.execute(stmt)
            emails = result.scalars().all()

        end_time = time.time()
        latency_ms = (end_time - start_time) * 1000
        latencies.append(latency_ms)

    # Calculate percentiles
    latencies.sort()
    p50 = median(latencies)
    p95, p99 = quantiles(latencies, n=100)[94], quantiles(latencies, n=100)[98]

    # Assertions - database queries should be very fast with indexes
    assert p95 < 50, (
        f"Database query p95 latency too high: {p95:.2f}ms (target: < 50ms)"
    )

    print(f"\n✅ Database query latency test passed:")
    print(f"   - Queries: {num_queries}")
    print(f"   - p50 latency: {p50:.2f}ms")
    print(f"   - p95 latency: {p95:.2f}ms")
    print(f"   - p99 latency: {p99:.2f}ms")


@pytest.mark.skip(reason="Database setup issues with SQLAlchemy metadata caching - TODO: Fix with Alembic-based test setup")
@pytest.mark.asyncio
@patch("app.workers.email_worker.EmailService")
async def test_end_to_end_notification_latency(mock_email_service_class, test_db):
    """
    Test end-to-end latency from API call to email sent status.

    This simulates the full user journey and measures total latency.
    """
    # Mock EmailService.send_email
    mock_email_service = MagicMock()
    mock_email_service.send_email = AsyncMock(return_value=True)
    mock_email_service_class.return_value = mock_email_service

    from app.schemas.notification import NotificationCreate

    # Measure full end-to-end latency
    num_notifications = 50
    latencies: List[float] = []

    worker = EmailWorker(poll_interval=0.1, batch_size=1)

    for i in range(num_notifications):
        # Create notification via API
        notification_data = NotificationCreate(
            type="email",
            recipient_email=f"user{i}@example.com",
            subject=f"E2E Test Email {i}",
            template_name="test_template",
            template_data={"message": f"Test message {i}"},
            priority=1,
        )

        start_time = time.time()

        # API call (simulated)
        async with AsyncSessionLocal() as db:
            notification = NotificationQueue(
                id=uuid4(),
                type=notification_data.type,
                status="pending",
                priority=notification_data.priority,
                recipient_email=notification_data.recipient_email,
                subject=notification_data.subject,
                template_name=notification_data.template_name,
                template_data=notification_data.template_data,
                scheduled_at=datetime.now(timezone.utc),
                max_attempts=3,
                retry_count=0,
            )
            db.add(notification)
            await db.commit()

        # Worker processes it
        await worker._process_batch()

        end_time = time.time()
        latency_ms = (end_time - start_time) * 1000
        latencies.append(latency_ms)

    # Calculate percentiles
    latencies.sort()
    p50 = median(latencies)
    p95, p99 = quantiles(latencies, n=100)[94], quantiles(latencies, n=100)[98]

    # Assertions - end-to-end should still be under 500ms at p95
    assert p95 < 500, (
        f"End-to-end p95 latency too high: {p95:.2f}ms (target: < 500ms)"
    )

    print(f"\n✅ End-to-end latency test passed:")
    print(f"   - Notifications: {num_notifications}")
    print(f"   - p50 latency: {p50:.2f}ms")
    print(f"   - p95 latency: {p95:.2f}ms")
    print(f"   - p99 latency: {p99:.2f}ms")
