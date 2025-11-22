"""
Email Worker
============
Background worker that processes email queue automatically.

Runs continuously polling notification_queue for pending emails.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger
from app.models.notification import NotificationQueue, NotificationTemplate
from app.services.email_service import EmailService, get_email_service
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger(__name__)


class EmailWorker:
    """
    Background worker that processes email queue.

    Features:
    - Polls notification_queue every 10 seconds
    - Processes pending emails (status='pending', scheduled_at <= NOW())
    - Batch processing (100 emails per iteration)
    - Priority ordering (1=high, 10=low)
    - Retry logic with exponential backoff
    - Graceful shutdown (finishes current batch)
    - Dead letter handling for max_attempts exceeded
    """

    def __init__(
        self,
        email_service: Optional[EmailService] = None,
        poll_interval: int = 10,
        batch_size: int = 100,
    ):
        """
        Initialize email worker.

        Args:
            email_service: Email service instance
            poll_interval: Seconds between queue polls
            batch_size: Max emails to process per iteration
        """
        self.email_service = email_service or get_email_service()
        self.poll_interval = poll_interval
        self.batch_size = batch_size
        self._running = False
        self._task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        """
        Start the email worker.

        Continuously polls queue until stopped.
        """
        self._running = True
        logger.info(
            f"🚀 Email worker started (poll_interval={self.poll_interval}s, batch_size={self.batch_size})"
        )

        try:
            while self._running:
                try:
                    await self._process_batch()
                except Exception as e:
                    logger.error(f"Error processing email batch: {e}", exc_info=True)

                # Sleep until next poll
                await asyncio.sleep(self.poll_interval)

        except asyncio.CancelledError:
            logger.info("🛑 Email worker cancelled - finishing current batch...")
            # Graceful shutdown - we were cancelled
            raise

        finally:
            logger.info("✅ Email worker stopped")

    async def stop(self) -> None:
        """
        Stop the email worker gracefully.

        Waits for current batch to finish before stopping.
        """
        logger.info("🛑 Stopping email worker...")
        self._running = False

        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _process_batch(self) -> None:
        """
        Process a batch of pending emails from queue.

        Steps:
        1. Fetch pending emails (status='pending', scheduled_at <= NOW())
        2. For each email:
           - Fetch template if template_id exists
           - Send via EmailService
           - Update status (sent/failed)
           - Handle retries with exponential backoff
        3. Commit database changes
        """
        async with AsyncSessionLocal() as db:
            # Fetch pending emails
            pending_emails = await self._fetch_pending_emails(db)

            if not pending_emails:
                logger.debug("No pending emails in queue")
                return

            logger.info(f"📧 Processing {len(pending_emails)} pending emails...")

            # Process each email
            for notification in pending_emails:
                try:
                    await self._process_email(notification, db)
                except Exception as e:
                    logger.error(
                        f"Failed to process notification {notification.id}: {e}",
                        exc_info=True,
                    )
                    await self._mark_failed(notification, str(e), db)

            # Commit all changes
            await db.commit()
            logger.info(f"✅ Batch processed: {len(pending_emails)} emails")

    async def _fetch_pending_emails(self, db: AsyncSession) -> List[NotificationQueue]:
        """
        Fetch pending emails from queue.

        Args:
            db: Database session

        Returns:
            List of NotificationQueue records ready to send
        """
        now = datetime.now(timezone.utc)

        stmt = (
            select(NotificationQueue)
            .where(
                and_(
                    NotificationQueue.status == "pending",
                    NotificationQueue.type == "email",
                    NotificationQueue.scheduled_at <= now,
                )
            )
            .order_by(
                NotificationQueue.priority.asc(),  # 1=high priority first
                NotificationQueue.created_at.asc(),  # Older emails first
            )
            .limit(self.batch_size)
        )

        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def _process_email(self, notification: NotificationQueue, db: AsyncSession) -> None:
        """
        Process a single email notification.

        Args:
            notification: NotificationQueue record
            db: Database session

        Raises:
            Exception: If email sending fails
        """
        logger.debug(f"Processing notification {notification.id} to {notification.recipient}")

        # Update attempts counter
        notification.attempts += 1

        try:
            # Send email
            if notification.template_id:
                # Email from template
                await self._send_from_template(notification, db)
            else:
                # Email with pre-rendered content
                await self._send_prerendered(notification, db)

            # Mark as sent
            notification.status = "sent"
            notification.sent_at = datetime.now(timezone.utc)
            notification.error_message = None

            logger.info(
                f"✅ Email sent to {notification.recipient} "
                f"(template={notification.template_name}, attempt={notification.attempts})"
            )

        except Exception as e:
            # Email sending failed
            logger.warning(
                f"❌ Email failed to {notification.recipient}: {e} "
                f"(attempt={notification.attempts}/{notification.max_attempts})"
            )

            # Check if we should retry
            if notification.attempts < notification.max_attempts:
                await self._schedule_retry(notification, str(e), db)
            else:
                await self._mark_failed(notification, str(e), db)

    async def _send_from_template(self, notification: NotificationQueue, db: AsyncSession) -> None:
        """
        Send email from template.

        Args:
            notification: NotificationQueue record
            db: Database session

        Raises:
            Exception: If template not found or email sending fails
        """
        # Fetch template
        stmt = select(NotificationTemplate).where(
            NotificationTemplate.id == notification.template_id
        )
        result = await db.execute(stmt)
        template = result.scalar_one_or_none()

        if not template:
            raise ValueError(
                f"Template {notification.template_id} not found for notification {notification.id}"
            )

        # Prepare variables
        variables = notification.variables or {}
        variables["subject"] = notification.subject or template.subject

        # Send via EmailService
        success = await self.email_service.send_from_template(
            recipient=notification.recipient,
            template_name=template.name,
            variables=variables,
            db=db,
            notification_id=notification.id,
            correlation_id=notification.correlation_id,
            event_type=notification.event_type,
            user_id=notification.user_id,
        )

        if not success:
            raise Exception("EmailService returned False (unsubscribed or failed)")

    async def _send_prerendered(self, notification: NotificationQueue, db: AsyncSession) -> None:
        """
        Send email with pre-rendered content.

        Args:
            notification: NotificationQueue record
            db: Database session

        Raises:
            Exception: If email sending fails
        """
        if not notification.body_html or not notification.body_text:
            raise ValueError(f"Notification {notification.id} missing pre-rendered content")

        success = await self.email_service.send_email(
            recipient=notification.recipient,
            subject=notification.subject or "Notification",
            body_html=notification.body_html,
            body_text=notification.body_text,
            db=db,
            recipient_name=notification.recipient_name,
            notification_id=notification.id,
            correlation_id=notification.correlation_id,
            event_type=notification.event_type,
        )

        if not success:
            raise Exception("EmailService returned False (unsubscribed or failed)")

    async def _schedule_retry(
        self, notification: NotificationQueue, error: str, db: AsyncSession
    ) -> None:
        """
        Schedule notification for retry with exponential backoff.

        Args:
            notification: NotificationQueue record
            error: Error message
            db: Database session
        """
        # Exponential backoff: 1 min, 5 min, 30 min
        backoff_minutes = [1, 5, 30]
        delay_minutes = backoff_minutes[min(notification.attempts - 1, len(backoff_minutes) - 1)]
        retry_at = datetime.now(timezone.utc) + timedelta(minutes=delay_minutes)

        notification.status = "retry"
        notification.scheduled_at = retry_at
        notification.error_message = error

        logger.info(
            f"🔄 Retry scheduled for {notification.recipient} "
            f"at {retry_at.isoformat()} (+{delay_minutes}m)"
        )

    async def _mark_failed(
        self, notification: NotificationQueue, error: str, db: AsyncSession
    ) -> None:
        """
        Mark notification as permanently failed.

        Args:
            notification: NotificationQueue record
            error: Error message
            db: Database session
        """
        notification.status = "failed"
        notification.error_message = error

        logger.error(
            f"💀 Email permanently failed to {notification.recipient} "
            f"after {notification.attempts} attempts: {error}"
        )

        # TODO: Send to Dead Letter Queue for manual review
        # This could publish a RabbitMQ message to a DLQ for monitoring


# Singleton instance
_email_worker: Optional[EmailWorker] = None


def get_email_worker() -> EmailWorker:
    """
    Get singleton email worker instance.

    Returns:
        EmailWorker instance
    """
    global _email_worker
    if _email_worker is None:
        _email_worker = EmailWorker()
    return _email_worker
