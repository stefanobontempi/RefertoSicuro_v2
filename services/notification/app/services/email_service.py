"""
Email Service
=============
Send emails via SMTP with MailHog (dev) or SendGrid (prod)
"""

import asyncio
import uuid
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import Dict, Optional

import aiosmtplib
from app.core.logging import get_logger
from app.core.smtp import get_smtp_config
from app.models.notification import DeliveryLog, UnsubscribeList
from app.services.template_service import TemplateService, get_template_service
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger(__name__)


class EmailError(Exception):
    """Raised when email sending fails."""

    pass


class EmailService:
    """
    Send emails via SMTP with retry logic and delivery tracking.

    Features:
    - Async email sending with aiosmtplib
    - Environment-specific SMTP (MailHog dev, SendGrid prod)
    - Multipart emails (HTML + plain text)
    - Delivery logging to database
    - Unsubscribe list checking (GDPR)
    - Retry logic with exponential backoff
    """

    def __init__(
        self,
        template_service: Optional[TemplateService] = None,
        max_retries: int = 3,
    ):
        """
        Initialize email service.

        Args:
            template_service: Template rendering service
            max_retries: Maximum retry attempts for failed emails
        """
        self.smtp_config = get_smtp_config()
        self.template_service = template_service or get_template_service()
        self.max_retries = max_retries

    async def send_email(
        self,
        recipient: str,
        subject: str,
        body_html: str,
        body_text: str,
        db: AsyncSession,
        recipient_name: Optional[str] = None,
        notification_id: Optional[uuid.UUID] = None,
        correlation_id: Optional[uuid.UUID] = None,
        event_type: Optional[str] = None,
    ) -> bool:
        """
        Send an email via SMTP.

        Args:
            recipient: Recipient email address
            subject: Email subject
            body_html: HTML body
            body_text: Plain text body
            db: Database session for logging
            recipient_name: Recipient display name
            notification_id: Notification queue ID
            correlation_id: Correlation ID for tracing
            event_type: Event type that triggered this email

        Returns:
            True if sent successfully, False otherwise

        Raises:
            EmailError: If sending fails after all retries
        """
        # Check unsubscribe list (GDPR compliance)
        if await self._is_unsubscribed(recipient, db):
            logger.info(f"Email not sent - recipient unsubscribed: {recipient}")
            await self._log_delivery(
                db=db,
                notification_id=notification_id,
                recipient=recipient,
                template_name=None,
                status="failed",
                error_message="Recipient has unsubscribed",
                correlation_id=correlation_id,
                event_type=event_type,
            )
            return False

        # Build email message
        message = self._build_message(
            recipient=recipient,
            recipient_name=recipient_name,
            subject=subject,
            body_html=body_html,
            body_text=body_text,
        )

        # Send with retry logic
        for attempt in range(self.max_retries):
            try:
                await self._send_smtp(message)
                logger.info(f"Email sent successfully to {recipient} (attempt {attempt + 1})")

                # Log successful delivery
                await self._log_delivery(
                    db=db,
                    notification_id=notification_id,
                    recipient=recipient,
                    template_name=None,
                    status="sent",
                    correlation_id=correlation_id,
                    event_type=event_type,
                    retry_attempt=attempt,
                )

                return True

            except Exception as e:
                logger.warning(
                    f"Email send failed to {recipient} (attempt {attempt + 1}/{self.max_retries}): {e}"
                )

                if attempt == self.max_retries - 1:
                    # Final attempt failed - log and raise
                    await self._log_delivery(
                        db=db,
                        notification_id=notification_id,
                        recipient=recipient,
                        template_name=None,
                        status="failed",
                        error_message=str(e),
                        correlation_id=correlation_id,
                        event_type=event_type,
                        retry_attempt=attempt,
                    )
                    raise EmailError(f"Failed to send email after {self.max_retries} attempts: {e}")

                # Exponential backoff: 1s, 5s, 30s
                delay = [1, 5, 30][attempt]
                await asyncio.sleep(delay)

        return False

    async def send_from_template(
        self,
        recipient: str,
        template_name: str,
        variables: Dict[str, any],
        db: AsyncSession,
        notification_id: Optional[uuid.UUID] = None,
        correlation_id: Optional[uuid.UUID] = None,
        event_type: Optional[str] = None,
        user_id: Optional[uuid.UUID] = None,
    ) -> bool:
        """
        Render template and send email.

        Args:
            recipient: Recipient email address
            template_name: Template name (without extension)
            variables: Template variables
            db: Database session
            notification_id: Notification queue ID
            correlation_id: Correlation ID for tracing
            event_type: Event type that triggered this email
            user_id: User ID who triggered this email

        Returns:
            True if sent successfully, False otherwise

        Raises:
            EmailError: If template rendering or sending fails
        """
        try:
            # Render template
            body_html, body_text = self.template_service.render_email(template_name, variables)

            # Extract subject from variables or use default
            subject = variables.get("subject", f"RefertoSicuro - {template_name}")

            # Send email
            return await self.send_email(
                recipient=recipient,
                subject=subject,
                body_html=body_html,
                body_text=body_text,
                db=db,
                recipient_name=variables.get("user_name"),
                notification_id=notification_id,
                correlation_id=correlation_id,
                event_type=event_type,
            )

        except Exception as e:
            logger.error(f"Failed to send email from template {template_name}: {e}", exc_info=True)
            raise EmailError(f"Template email failed: {e}")

    def _build_message(
        self,
        recipient: str,
        subject: str,
        body_html: str,
        body_text: str,
        recipient_name: Optional[str] = None,
    ) -> EmailMessage:
        """
        Build multipart email message.

        Args:
            recipient: Recipient email address
            subject: Email subject
            body_html: HTML body
            body_text: Plain text body
            recipient_name: Recipient display name

        Returns:
            EmailMessage ready to send
        """
        message = EmailMessage()

        # Set headers
        message["From"] = f"{self.smtp_config.from_name} <{self.smtp_config.from_address}>"

        if recipient_name:
            message["To"] = f"{recipient_name} <{recipient}>"
        else:
            message["To"] = recipient

        message["Subject"] = subject

        # Set content (plain text + HTML alternative)
        message.set_content(body_text)
        message.add_alternative(body_html, subtype="html")

        return message

    async def _send_smtp(self, message: EmailMessage) -> None:
        """
        Send email via SMTP.

        Args:
            message: Email message to send

        Raises:
            aiosmtplib.SMTPException: If SMTP send fails
        """
        config = self.smtp_config

        async with aiosmtplib.SMTP(
            hostname=config.host,
            port=config.port,
            use_tls=config.use_tls,
            timeout=config.timeout,
        ) as smtp:
            # Authenticate if credentials provided (production)
            if config.username and config.password:
                await smtp.login(config.username, config.password)

            # Send message
            await smtp.send_message(message)

    async def _is_unsubscribed(self, email: str, db: AsyncSession) -> bool:
        """
        Check if email is in unsubscribe list.

        Args:
            email: Email address to check
            db: Database session

        Returns:
            True if unsubscribed, False otherwise
        """
        stmt = select(UnsubscribeList).where(UnsubscribeList.email == email)
        result = await db.execute(stmt)
        unsubscribe = result.scalar_one_or_none()
        return unsubscribe is not None

    async def _log_delivery(
        self,
        db: AsyncSession,
        recipient: str,
        status: str,
        notification_id: Optional[uuid.UUID] = None,
        template_name: Optional[str] = None,
        error_message: Optional[str] = None,
        smtp_response: Optional[str] = None,
        correlation_id: Optional[uuid.UUID] = None,
        event_type: Optional[str] = None,
        retry_attempt: int = 0,
    ) -> None:
        """
        Log email delivery to database (audit trail).

        Args:
            db: Database session
            recipient: Recipient email address
            status: Delivery status (sent, failed, bounced)
            notification_id: Notification queue ID
            template_name: Template name used
            error_message: Error message if failed
            smtp_response: SMTP server response
            correlation_id: Correlation ID for tracing
            event_type: Event type that triggered this email
            retry_attempt: Retry attempt number
        """
        log = DeliveryLog(
            id=uuid.uuid4(),
            notification_id=notification_id,
            event_type=event_type,
            correlation_id=correlation_id,
            recipient=recipient,
            template_name=template_name,
            notification_type="email",
            status=status,
            smtp_response=smtp_response,
            error_message=error_message,
            retry_attempt=retry_attempt,
            delivered_at=datetime.now(timezone.utc),
        )

        db.add(log)
        await db.commit()

        logger.debug(f"Delivery logged: {recipient} - {status}")


# Singleton instance
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """
    Get singleton email service instance.

    Returns:
        EmailService instance
    """
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
