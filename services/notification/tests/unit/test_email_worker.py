"""
Email Worker Tests
==================
Unit tests for background email worker.
"""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from app.models.notification import NotificationQueue, NotificationTemplate
from app.workers.email_worker import EmailWorker
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
def email_worker():
    """Create email worker with mocked email service."""
    with patch("app.workers.email_worker.get_email_service") as mock_get_service:
        mock_service = AsyncMock()
        mock_get_service.return_value = mock_service

        worker = EmailWorker(email_service=mock_service, poll_interval=1, batch_size=10)
        yield worker


@pytest.fixture
async def pending_notification(test_db: AsyncSession):
    """Create a pending notification in queue."""
    notification = NotificationQueue(
        id=uuid.uuid4(),
        type="email",
        recipient="test@example.com",
        recipient_name="Test User",
        subject="Test Subject",
        body_html="<p>Test HTML</p>",
        body_text="Test Text",
        status="pending",
        scheduled_at=datetime.now(timezone.utc) - timedelta(seconds=10),  # Past scheduled time
        priority=5,
        attempts=0,
        max_attempts=3,
        correlation_id=uuid.uuid4(),
        event_type="test.event",
    )

    test_db.add(notification)
    await test_db.commit()
    await test_db.refresh(notification)

    return notification


@pytest.fixture
async def template_based_notification(
    test_db: AsyncSession, notification_template: NotificationTemplate
):
    """Create a notification with template reference."""
    notification = NotificationQueue(
        id=uuid.uuid4(),
        type="email",
        recipient="template@example.com",
        template_id=notification_template.id,
        template_name=notification_template.name,
        subject="Welcome!",
        variables={"user_name": "Test User", "verification_link": "https://example.com/verify"},
        status="pending",
        scheduled_at=datetime.now(timezone.utc),
        priority=1,  # High priority
        attempts=0,
        max_attempts=3,
    )

    test_db.add(notification)
    await test_db.commit()
    await test_db.refresh(notification)

    return notification


class TestEmailWorkerFetchPending:
    """Test fetching pending emails from queue."""

    async def test_fetch_pending_emails_returns_only_pending(
        self, email_worker: EmailWorker, test_db: AsyncSession, pending_notification
    ):
        """Should fetch only emails with status='pending'."""
        # Create a sent notification (should not be fetched)
        sent_notification = NotificationQueue(
            id=uuid.uuid4(),
            type="email",
            recipient="sent@example.com",
            subject="Already sent",
            body_html="<p>Sent</p>",
            body_text="Sent",
            status="sent",
            scheduled_at=datetime.now(timezone.utc),
        )
        test_db.add(sent_notification)
        await test_db.commit()

        # Fetch pending
        pending = await email_worker._fetch_pending_emails(test_db)

        assert len(pending) == 1
        assert pending[0].id == pending_notification.id
        assert pending[0].status == "pending"

    async def test_fetch_pending_emails_respects_scheduled_at(
        self, email_worker: EmailWorker, test_db: AsyncSession
    ):
        """Should only fetch emails where scheduled_at <= NOW()."""
        # Create notification scheduled in future
        future_notification = NotificationQueue(
            id=uuid.uuid4(),
            type="email",
            recipient="future@example.com",
            subject="Future",
            body_html="<p>Future</p>",
            body_text="Future",
            status="pending",
            scheduled_at=datetime.now(timezone.utc) + timedelta(hours=1),  # Future
        )
        test_db.add(future_notification)
        await test_db.commit()

        # Fetch pending
        pending = await email_worker._fetch_pending_emails(test_db)

        assert len(pending) == 0  # Should not fetch future-scheduled emails

    async def test_fetch_pending_emails_priority_ordering(
        self, email_worker: EmailWorker, test_db: AsyncSession
    ):
        """Should fetch high priority (lower number) emails first."""
        # Create notifications with different priorities
        low_priority = NotificationQueue(
            id=uuid.uuid4(),
            type="email",
            recipient="low@example.com",
            subject="Low",
            body_html="<p>Low</p>",
            body_text="Low",
            status="pending",
            scheduled_at=datetime.now(timezone.utc),
            priority=10,  # Low priority
        )

        high_priority = NotificationQueue(
            id=uuid.uuid4(),
            type="email",
            recipient="high@example.com",
            subject="High",
            body_html="<p>High</p>",
            body_text="High",
            status="pending",
            scheduled_at=datetime.now(timezone.utc),
            priority=1,  # High priority
        )

        test_db.add_all([low_priority, high_priority])
        await test_db.commit()

        # Fetch pending
        pending = await email_worker._fetch_pending_emails(test_db)

        assert len(pending) == 2
        assert pending[0].priority == 1  # High priority first
        assert pending[1].priority == 10  # Low priority second

    async def test_fetch_pending_emails_respects_batch_size(
        self, email_worker: EmailWorker, test_db: AsyncSession
    ):
        """Should respect batch_size limit."""
        # Create 15 pending notifications (batch_size=10)
        for i in range(15):
            notification = NotificationQueue(
                id=uuid.uuid4(),
                type="email",
                recipient=f"test{i}@example.com",
                subject=f"Test {i}",
                body_html=f"<p>Test {i}</p>",
                body_text=f"Test {i}",
                status="pending",
                scheduled_at=datetime.now(timezone.utc),
            )
            test_db.add(notification)

        await test_db.commit()

        # Fetch pending
        pending = await email_worker._fetch_pending_emails(test_db)

        assert len(pending) == 10  # Should respect batch_size


class TestEmailWorkerProcessing:
    """Test email processing logic."""

    async def test_process_prerendered_email_success(
        self, email_worker: EmailWorker, test_db: AsyncSession, pending_notification
    ):
        """Should successfully send pre-rendered email."""
        # Mock email service to return success
        email_worker.email_service.send_email = AsyncMock(return_value=True)

        # Process email
        await email_worker._process_email(pending_notification, test_db)
        await test_db.commit()
        await test_db.refresh(pending_notification)

        # Verify email was sent
        assert pending_notification.status == "sent"
        assert pending_notification.attempts == 1
        assert pending_notification.sent_at is not None
        assert pending_notification.error_message is None

        # Verify email service was called
        email_worker.email_service.send_email.assert_called_once()

    async def test_process_template_email_success(
        self,
        email_worker: EmailWorker,
        test_db: AsyncSession,
        template_based_notification,
    ):
        """Should successfully send template-based email."""
        # Mock email service to return success
        email_worker.email_service.send_from_template = AsyncMock(return_value=True)

        # Process email
        await email_worker._process_email(template_based_notification, test_db)
        await test_db.commit()
        await test_db.refresh(template_based_notification)

        # Verify email was sent
        assert template_based_notification.status == "sent"
        assert template_based_notification.attempts == 1
        assert template_based_notification.sent_at is not None

        # Verify email service was called with template
        email_worker.email_service.send_from_template.assert_called_once()

    async def test_process_email_failure_schedules_retry(
        self, email_worker: EmailWorker, test_db: AsyncSession, pending_notification
    ):
        """Should schedule retry on first failure."""
        # Mock email service to fail
        email_worker.email_service.send_email = AsyncMock(side_effect=Exception("SMTP error"))

        # Process email
        await email_worker._process_email(pending_notification, test_db)
        await test_db.commit()
        await test_db.refresh(pending_notification)

        # Verify retry scheduled
        assert pending_notification.status == "retry"
        assert pending_notification.attempts == 1
        assert pending_notification.error_message == "SMTP error"
        assert pending_notification.scheduled_at > datetime.now(timezone.utc)

    async def test_process_email_max_attempts_marks_failed(
        self, email_worker: EmailWorker, test_db: AsyncSession, pending_notification
    ):
        """Should mark as failed after max_attempts."""
        # Set notification to 2 attempts (max is 3)
        pending_notification.attempts = 2

        # Mock email service to fail
        email_worker.email_service.send_email = AsyncMock(
            side_effect=Exception("Permanent SMTP error")
        )

        # Process email
        await email_worker._process_email(pending_notification, test_db)
        await test_db.commit()
        await test_db.refresh(pending_notification)

        # Verify marked as failed
        assert pending_notification.status == "failed"
        assert pending_notification.attempts == 3
        assert pending_notification.error_message == "Permanent SMTP error"
        assert pending_notification.sent_at is None

    async def test_process_email_increments_attempts(
        self, email_worker: EmailWorker, test_db: AsyncSession, pending_notification
    ):
        """Should increment attempts counter on each processing."""
        email_worker.email_service.send_email = AsyncMock(return_value=True)

        initial_attempts = pending_notification.attempts

        await email_worker._process_email(pending_notification, test_db)
        await test_db.commit()
        await test_db.refresh(pending_notification)

        assert pending_notification.attempts == initial_attempts + 1


class TestEmailWorkerRetryLogic:
    """Test retry logic and backoff."""

    async def test_retry_backoff_increases(self, email_worker: EmailWorker, test_db: AsyncSession):
        """Should use exponential backoff for retries."""
        notification = NotificationQueue(
            id=uuid.uuid4(),
            type="email",
            recipient="retry@example.com",
            subject="Test",
            body_html="<p>Test</p>",
            body_text="Test",
            status="pending",
            scheduled_at=datetime.now(timezone.utc),
            attempts=0,
            max_attempts=3,
        )

        # Test first retry (1 minute)
        await email_worker._schedule_retry(notification, "Error 1", test_db)
        first_retry = notification.scheduled_at
        assert first_retry > datetime.now(timezone.utc)

        # Test second retry (5 minutes)
        notification.attempts = 1
        await email_worker._schedule_retry(notification, "Error 2", test_db)
        second_retry = notification.scheduled_at
        assert second_retry > first_retry

        # Test third retry (30 minutes)
        notification.attempts = 2
        await email_worker._schedule_retry(notification, "Error 3", test_db)
        third_retry = notification.scheduled_at
        assert third_retry > second_retry


class TestEmailWorkerBatchProcessing:
    """Test batch processing functionality."""

    async def test_process_batch_handles_multiple_emails(
        self, email_worker: EmailWorker, test_db: AsyncSession
    ):
        """Should process multiple emails in one batch."""
        # Create 3 pending notifications
        notifications = []
        for i in range(3):
            notification = NotificationQueue(
                id=uuid.uuid4(),
                type="email",
                recipient=f"batch{i}@example.com",
                subject=f"Batch {i}",
                body_html=f"<p>Batch {i}</p>",
                body_text=f"Batch {i}",
                status="pending",
                scheduled_at=datetime.now(timezone.utc),
            )
            notifications.append(notification)
            test_db.add(notification)

        await test_db.commit()

        # Mock email service to succeed
        email_worker.email_service.send_email = AsyncMock(return_value=True)

        # Process batch
        await email_worker._process_batch()

        # Verify all emails sent
        for notification in notifications:
            await test_db.refresh(notification)
            assert notification.status == "sent"

    async def test_process_batch_continues_on_error(
        self, email_worker: EmailWorker, test_db: AsyncSession
    ):
        """Should continue processing batch even if one email fails."""
        # Create 2 notifications
        notification1 = NotificationQueue(
            id=uuid.uuid4(),
            type="email",
            recipient="fail@example.com",
            subject="Will fail",
            body_html="<p>Fail</p>",
            body_text="Fail",
            status="pending",
            scheduled_at=datetime.now(timezone.utc),
        )

        notification2 = NotificationQueue(
            id=uuid.uuid4(),
            type="email",
            recipient="success@example.com",
            subject="Will succeed",
            body_html="<p>Success</p>",
            body_text="Success",
            status="pending",
            scheduled_at=datetime.now(timezone.utc),
        )

        test_db.add_all([notification1, notification2])
        await test_db.commit()

        # Mock email service to fail first, succeed second
        email_worker.email_service.send_email = AsyncMock(
            side_effect=[Exception("SMTP error"), True]
        )

        # Process batch
        await email_worker._process_batch()

        # Verify first email retry scheduled
        await test_db.refresh(notification1)
        assert notification1.status == "retry"

        # Verify second email sent
        await test_db.refresh(notification2)
        assert notification2.status == "sent"


class TestEmailWorkerLifecycle:
    """Test worker start/stop lifecycle."""

    @pytest.mark.asyncio
    async def test_worker_stops_gracefully(self, email_worker: EmailWorker):
        """Should stop gracefully when cancelled."""
        # Start worker in background
        import asyncio

        worker_task = asyncio.create_task(email_worker.start())

        # Let it run briefly
        await asyncio.sleep(0.1)

        # Stop worker
        worker_task.cancel()

        # Should raise CancelledError
        with pytest.raises(asyncio.CancelledError):
            await worker_task
