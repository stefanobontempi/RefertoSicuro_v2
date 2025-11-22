"""
Auth Service Event Handlers
===========================
Handle events from Auth Service and queue notifications
"""

import uuid
from datetime import datetime, timezone
from typing import Dict

from app.core.config import settings
from app.core.logging import get_logger
from app.models.notification import NotificationQueue
from app.services.template_service import get_template_service
from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger(__name__)


class AuthEventHandler:
    """
    Handle Auth Service events and queue email notifications.

    Events handled:
    1. user.registered → Welcome + email verification
    2. password_reset.requested → Password reset link
    3. user.email_verified → Confirmation email
    4. user.password_changed → Security alert
    5. user.2fa_enabled → 2FA confirmation
    6. user.logged_in → Analytics only (no email)
    7. user.logged_out → Analytics only (no email)
    """

    def __init__(self):
        """Initialize handler."""
        self.template_service = get_template_service()

    async def handle_user_registered(self, event: Dict, db: AsyncSession) -> None:
        """
        Handle user.registered event.

        Sends welcome email with verification link.

        Args:
            event: Event payload
            db: Database session
        """
        payload = event["payload"]
        correlation_id = uuid.UUID(event["correlation_id"])

        # Extract event data
        user_id = uuid.UUID(payload["user_id"])
        email = payload["email"]
        full_name = payload.get("full_name", email)
        verification_token = payload.get("verification_token")

        # Build verification link
        verification_link = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"

        # Render template
        template_name = "welcome_email"
        variables = {
            "user_name": full_name,
            "verification_link": verification_link,
            "trial_days": 7,
        }

        html, text = self.template_service.render_email(template_name, variables)

        # Queue notification
        notification = NotificationQueue(
            id=uuid.uuid4(),
            type="email",
            recipient=email,
            recipient_name=full_name,
            template_name=template_name,
            subject="Benvenuto su RefertoSicuro - Verifica il tuo account",
            body_html=html,
            body_text=text,
            variables=variables,
            status="pending",
            priority=1,  # High priority
            correlation_id=correlation_id,
            event_type="user.registered",
            user_id=user_id,
        )

        db.add(notification)
        await db.commit()

        logger.info(f"Queued welcome email for {email} (correlation_id={correlation_id})")

    async def handle_password_reset_requested(self, event: Dict, db: AsyncSession) -> None:
        """
        Handle password_reset.requested event.

        Sends password reset email with link.

        Args:
            event: Event payload
            db: Database session
        """
        payload = event["payload"]
        correlation_id = uuid.UUID(event["correlation_id"])

        # Extract event data
        user_id = uuid.UUID(payload["user_id"])
        email = payload["email"]
        full_name = payload.get("full_name", email)
        reset_token = payload.get("reset_token")
        expiration_hours = payload.get("expiration_hours", 6)

        # Build reset link
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

        # Render template
        template_name = "password_reset"
        variables = {
            "user_name": full_name,
            "reset_link": reset_link,
            "expiration_hours": expiration_hours,
        }

        html, text = self.template_service.render_email(template_name, variables)

        # Queue notification
        notification = NotificationQueue(
            id=uuid.uuid4(),
            type="email",
            recipient=email,
            recipient_name=full_name,
            template_name=template_name,
            subject="Reimpostazione password - RefertoSicuro",
            body_html=html,
            body_text=text,
            variables=variables,
            status="pending",
            priority=1,  # High priority
            correlation_id=correlation_id,
            event_type="password_reset.requested",
            user_id=user_id,
        )

        db.add(notification)
        await db.commit()

        logger.info(f"Queued password reset email for {email} (correlation_id={correlation_id})")

    async def handle_email_verified(self, event: Dict, db: AsyncSession) -> None:
        """
        Handle user.email_verified event.

        Sends confirmation email.

        Args:
            event: Event payload
            db: Database session
        """
        payload = event["payload"]
        correlation_id = uuid.UUID(event["correlation_id"])

        user_id = uuid.UUID(payload["user_id"])
        email = payload["email"]
        full_name = payload.get("full_name", email)

        # Render template
        template_name = "email_verification"
        variables = {
            "user_name": full_name,
            "verification_link": f"{settings.FRONTEND_URL}/dashboard",
        }

        html, text = self.template_service.render_email(template_name, variables)

        # Queue notification
        notification = NotificationQueue(
            id=uuid.uuid4(),
            type="email",
            recipient=email,
            recipient_name=full_name,
            template_name=template_name,
            subject="Email verificata - RefertoSicuro",
            body_html=html,
            body_text=text,
            variables=variables,
            status="pending",
            priority=5,  # Normal priority
            correlation_id=correlation_id,
            event_type="user.email_verified",
            user_id=user_id,
        )

        db.add(notification)
        await db.commit()

        logger.info(
            f"Queued email verified confirmation for {email} (correlation_id={correlation_id})"
        )

    async def handle_password_changed(self, event: Dict, db: AsyncSession) -> None:
        """
        Handle user.password_changed event.

        Sends security alert email.

        Args:
            event: Event payload
            db: Database session
        """
        payload = event["payload"]
        correlation_id = uuid.UUID(event["correlation_id"])

        user_id = uuid.UUID(payload["user_id"])
        email = payload["email"]
        full_name = payload.get("full_name", email)
        changed_at = payload.get("changed_at", datetime.now(timezone.utc).isoformat())
        ip_address = payload.get("ip_address", "N/A")

        # Render template
        template_name = "password_changed_alert"
        variables = {
            "user_name": full_name,
            "changed_at": changed_at,
            "ip_address": ip_address,
            "support_link": f"{settings.FRONTEND_URL}/support",
        }

        html, text = self.template_service.render_email(template_name, variables)

        # Queue notification
        notification = NotificationQueue(
            id=uuid.uuid4(),
            type="email",
            recipient=email,
            recipient_name=full_name,
            template_name=template_name,
            subject="⚠️ Password modificata - RefertoSicuro",
            body_html=html,
            body_text=text,
            variables=variables,
            status="pending",
            priority=1,  # High priority (security)
            correlation_id=correlation_id,
            event_type="user.password_changed",
            user_id=user_id,
        )

        db.add(notification)
        await db.commit()

        logger.info(f"Queued password changed alert for {email} (correlation_id={correlation_id})")

    async def handle_2fa_enabled(self, event: Dict, db: AsyncSession) -> None:
        """
        Handle user.2fa_enabled event.

        Sends 2FA confirmation email.

        Args:
            event: Event payload
            db: Database session
        """
        payload = event["payload"]
        correlation_id = uuid.UUID(event["correlation_id"])

        user_id = uuid.UUID(payload["user_id"])
        email = payload["email"]
        full_name = payload.get("full_name", email)
        enabled_at = payload.get("enabled_at", datetime.now(timezone.utc).isoformat())
        backup_codes_count = payload.get("backup_codes_count", 10)

        # Render template
        template_name = "2fa_enabled"
        variables = {
            "user_name": full_name,
            "enabled_at": enabled_at,
            "backup_codes_count": backup_codes_count,
        }

        html, text = self.template_service.render_email(template_name, variables)

        # Queue notification
        notification = NotificationQueue(
            id=uuid.uuid4(),
            type="email",
            recipient=email,
            recipient_name=full_name,
            template_name=template_name,
            subject="🔒 Autenticazione a due fattori attivata - RefertoSicuro",
            body_html=html,
            body_text=text,
            variables=variables,
            status="pending",
            priority=5,  # Normal priority
            correlation_id=correlation_id,
            event_type="user.2fa_enabled",
            user_id=user_id,
        )

        db.add(notification)
        await db.commit()

        logger.info(
            f"Queued 2FA enabled confirmation for {email} (correlation_id={correlation_id})"
        )

    async def handle_user_logged_in(self, event: Dict, db: AsyncSession) -> None:
        """
        Handle user.logged_in event.

        This is for analytics only - no email sent.

        Args:
            event: Event payload
            db: Database session
        """
        # Analytics only - no email
        logger.debug(f"User logged in: {event['payload'].get('email')}")

    async def handle_user_logged_out(self, event: Dict, db: AsyncSession) -> None:
        """
        Handle user.logged_out event.

        This is for analytics only - no email sent.

        Args:
            event: Event payload
            db: Database session
        """
        # Analytics only - no email
        logger.debug(f"User logged out: {event['payload'].get('email')}")
