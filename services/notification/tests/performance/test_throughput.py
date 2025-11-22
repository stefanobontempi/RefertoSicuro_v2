"""
Throughput Performance Tests
=============================
Verify that the Notification Service can handle at least 100 emails/minute.
"""

import asyncio
import time
from datetime import datetime, timezone
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
async def test_email_worker_throughput_100_emails_per_minute(mock_email_service_class, test_db):
    """
    Test that email worker can process at least 100 emails per minute.

    This test:
    1. Creates 100 pending email notifications
    2. Mocks EmailService to avoid SMTP calls
    3. Measures time to process all emails
    4. Verifies throughput >= 100 emails/min
    """
    # Mock EmailService.send_email to return immediately (simulates fast SMTP)
    mock_email_service = MagicMock()
    mock_email_service.send_email = AsyncMock(return_value=True)
    mock_email_service_class.return_value = mock_email_service

    # Arrange: Create 100 pending emails
    num_emails = 100

    async with AsyncSessionLocal() as db:
        for i in range(num_emails):
            notification = NotificationQueue(
                id=uuid4(),
                type="email",
                status="pending",
                priority=1,
                recipient_email=f"user{i}@example.com",
                subject=f"Performance Test Email {i}",
                template_name="test_template",
                template_data={"message": f"Test message {i}"},
                scheduled_at=datetime.now(timezone.utc),
                max_attempts=1,  # Only 1 attempt for performance testing
                retry_count=0,
            )
            db.add(notification)

        await db.commit()

    # Act: Process emails and measure time
    worker = EmailWorker(
        poll_interval=0.1,  # Fast polling for performance test
        batch_size=100,  # Process all at once
    )

    start_time = time.time()

    # Process one batch (should handle all 100 emails)
    await worker._process_batch()

    end_time = time.time()
    elapsed_seconds = end_time - start_time

    # Assert: Verify throughput
    emails_per_second = num_emails / elapsed_seconds
    emails_per_minute = emails_per_second * 60

    # Check that all emails were processed
    async with AsyncSessionLocal() as db:
        stmt = select(NotificationQueue).where(NotificationQueue.status == "pending")
        result = await db.execute(stmt)
        pending_emails = result.scalars().all()

    # Assertions
    assert len(pending_emails) == 0, f"Expected 0 pending emails, found {len(pending_emails)}"
    assert emails_per_minute >= 100, (
        f"Throughput requirement not met: {emails_per_minute:.2f} emails/min "
        f"(target: >= 100 emails/min, elapsed: {elapsed_seconds:.2f}s)"
    )

    print(f"\n✅ Throughput test passed:")
    print(f"   - Processed: {num_emails} emails")
    print(f"   - Time: {elapsed_seconds:.2f} seconds")
    print(f"   - Throughput: {emails_per_minute:.2f} emails/minute")


@pytest.mark.skip(reason="Database setup issues with SQLAlchemy metadata caching - TODO: Fix with Alembic-based test setup")
@pytest.mark.asyncio
@patch("app.workers.email_worker.EmailService")
async def test_email_worker_sustained_throughput_5_batches(mock_email_service_class, test_db):
    """
    Test sustained throughput over 5 batches of 50 emails each (250 total).

    This test verifies that the worker can maintain high throughput
    across multiple batches without degradation.
    """
    # Mock EmailService.send_email
    mock_email_service = MagicMock()
    mock_email_service.send_email = AsyncMock(return_value=True)
    mock_email_service_class.return_value = mock_email_service

    # Arrange: Create 250 pending emails (5 batches of 50)
    num_batches = 5
    batch_size = 50
    total_emails = num_batches * batch_size

    async with AsyncSessionLocal() as db:
        for i in range(total_emails):
            notification = NotificationQueue(
                id=uuid4(),
                type="email",
                status="pending",
                priority=1,
                recipient_email=f"user{i}@example.com",
                subject=f"Sustained Test Email {i}",
                template_name="test_template",
                template_data={"message": f"Test message {i}"},
                scheduled_at=datetime.now(timezone.utc),
                max_attempts=1,
                retry_count=0,
            )
            db.add(notification)

        await db.commit()

    # Act: Process in batches and measure time
    worker = EmailWorker(
        poll_interval=0.1,
        batch_size=batch_size,
    )

    start_time = time.time()

    # Process 5 batches
    for batch_num in range(num_batches):
        await worker._process_batch()

    end_time = time.time()
    elapsed_seconds = end_time - start_time

    # Assert: Verify sustained throughput
    emails_per_second = total_emails / elapsed_seconds
    emails_per_minute = emails_per_second * 60

    # Check that all emails were processed
    async with AsyncSessionLocal() as db:
        stmt = select(NotificationQueue).where(NotificationQueue.status == "pending")
        result = await db.execute(stmt)
        pending_emails = result.scalars().all()

    # Assertions
    assert len(pending_emails) == 0, f"Expected 0 pending emails, found {len(pending_emails)}"
    assert emails_per_minute >= 100, (
        f"Sustained throughput requirement not met: {emails_per_minute:.2f} emails/min "
        f"(target: >= 100 emails/min, elapsed: {elapsed_seconds:.2f}s)"
    )

    print(f"\n✅ Sustained throughput test passed:")
    print(f"   - Batches: {num_batches}")
    print(f"   - Batch size: {batch_size}")
    print(f"   - Total emails: {total_emails}")
    print(f"   - Time: {elapsed_seconds:.2f} seconds")
    print(f"   - Throughput: {emails_per_minute:.2f} emails/minute")


@pytest.mark.skip(reason="Database setup issues with SQLAlchemy metadata caching - TODO: Fix with Alembic-based test setup")
@pytest.mark.asyncio
@patch("app.workers.email_worker.EmailService")
async def test_email_worker_concurrent_processing(mock_email_service_class, test_db):
    """
    Test that multiple workers can process emails concurrently.

    This simulates horizontal scaling with multiple worker instances.
    """
    # Mock EmailService.send_email
    mock_email_service = MagicMock()
    mock_email_service.send_email = AsyncMock(return_value=True)
    mock_email_service_class.return_value = mock_email_service

    # Arrange: Create 200 pending emails
    num_emails = 200

    async with AsyncSessionLocal() as db:
        for i in range(num_emails):
            notification = NotificationQueue(
                id=uuid4(),
                type="email",
                status="pending",
                priority=1,
                recipient_email=f"user{i}@example.com",
                subject=f"Concurrent Test Email {i}",
                template_name="test_template",
                template_data={"message": f"Test message {i}"},
                scheduled_at=datetime.now(timezone.utc),
                max_attempts=1,
                retry_count=0,
            )
            db.add(notification)

        await db.commit()

    # Act: Start 4 workers concurrently
    workers = [
        EmailWorker(poll_interval=0.1, batch_size=50)
        for _ in range(4)
    ]

    start_time = time.time()

    # Process batches concurrently
    await asyncio.gather(
        *[worker._process_batch() for worker in workers]
    )

    end_time = time.time()
    elapsed_seconds = end_time - start_time

    # Assert: Verify improved throughput with concurrency
    emails_per_second = num_emails / elapsed_seconds
    emails_per_minute = emails_per_second * 60

    # Check that all emails were processed
    async with AsyncSessionLocal() as db:
        stmt = select(NotificationQueue).where(NotificationQueue.status == "pending")
        result = await db.execute(stmt)
        pending_emails = result.scalars().all()

    # Assertions
    assert len(pending_emails) == 0, f"Expected 0 pending emails, found {len(pending_emails)}"

    # With 4 workers, throughput should be significantly higher
    assert emails_per_minute >= 100, (
        f"Concurrent throughput requirement not met: {emails_per_minute:.2f} emails/min"
    )

    print(f"\n✅ Concurrent processing test passed:")
    print(f"   - Workers: {len(workers)}")
    print(f"   - Total emails: {num_emails}")
    print(f"   - Time: {elapsed_seconds:.2f} seconds")
    print(f"   - Throughput: {emails_per_minute:.2f} emails/minute")
    print(f"   - Speedup: {num_emails / 100 / elapsed_seconds * 60:.2f}x vs baseline")
