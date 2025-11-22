"""
Auth Event Handlers Integration Tests
=====================================
Test Auth Service event handling flow
"""

import uuid

import pytest
from app.handlers.auth_events import AuthEventHandler
from app.models.notification import NotificationQueue
from sqlalchemy import select


class TestAuthEventHandlers:
    """Test Auth Service event handlers."""

    @pytest.mark.asyncio
    async def test_handle_user_registered_queues_email(self, test_db, sample_auth_event):
        """Test that user.registered event queues welcome email."""
        handler = AuthEventHandler()

        await handler.handle_user_registered(sample_auth_event, test_db)

        # Check notification was queued
        stmt = select(NotificationQueue).where(NotificationQueue.event_type == "user.registered")
        result = await test_db.execute(stmt)
        notification = result.scalar_one_or_none()

        assert notification is not None
        assert notification.recipient == sample_auth_event["payload"]["email"]
        assert notification.template_name == "welcome_email"
        assert notification.status == "pending"
        assert notification.priority == 1  # High priority
        assert "verification_link" in notification.variables

    @pytest.mark.asyncio
    async def test_handle_password_reset_queues_email(self, test_db):
        """Test that password_reset.requested event queues reset email."""
        handler = AuthEventHandler()

        event = {
            "event_type": "password_reset.requested",
            "timestamp": "2025-11-22T00:00:00Z",
            "correlation_id": str(uuid.uuid4()),
            "payload": {
                "user_id": str(uuid.uuid4()),
                "email": "test@example.com",
                "full_name": "Test User",
                "reset_token": "reset123",
                "expiration_hours": 6,
            },
        }

        await handler.handle_password_reset_requested(event, test_db)

        # Check notification was queued
        stmt = select(NotificationQueue).where(
            NotificationQueue.event_type == "password_reset.requested"
        )
        result = await test_db.execute(stmt)
        notification = result.scalar_one_or_none()

        assert notification is not None
        assert notification.template_name == "password_reset"
        assert "reset_link" in notification.variables
        assert notification.variables["expiration_hours"] == 6

    @pytest.mark.asyncio
    async def test_handle_email_verified_queues_confirmation(self, test_db):
        """Test that user.email_verified event queues confirmation email."""
        handler = AuthEventHandler()

        event = {
            "event_type": "user.email_verified",
            "timestamp": "2025-11-22T00:00:00Z",
            "correlation_id": str(uuid.uuid4()),
            "payload": {
                "user_id": str(uuid.uuid4()),
                "email": "verified@example.com",
                "full_name": "Test User",
            },
        }

        await handler.handle_email_verified(event, test_db)

        # Check notification was queued
        stmt = select(NotificationQueue).where(
            NotificationQueue.event_type == "user.email_verified"
        )
        result = await test_db.execute(stmt)
        notification = result.scalar_one_or_none()

        assert notification is not None
        assert notification.template_name == "email_verification"

    @pytest.mark.asyncio
    async def test_handle_password_changed_queues_alert(self, test_db):
        """Test that user.password_changed event queues security alert."""
        handler = AuthEventHandler()

        event = {
            "event_type": "user.password_changed",
            "timestamp": "2025-11-22T00:00:00Z",
            "correlation_id": str(uuid.uuid4()),
            "payload": {
                "user_id": str(uuid.uuid4()),
                "email": "test@example.com",
                "full_name": "Test User",
                "changed_at": "2025-11-22T12:00:00Z",
                "ip_address": "192.168.1.1",
            },
        }

        await handler.handle_password_changed(event, test_db)

        # Check notification was queued
        stmt = select(NotificationQueue).where(
            NotificationQueue.event_type == "user.password_changed"
        )
        result = await test_db.execute(stmt)
        notification = result.scalar_one_or_none()

        assert notification is not None
        assert notification.template_name == "password_changed_alert"
        assert notification.priority == 1  # High priority (security)
        assert "ip_address" in notification.variables

    @pytest.mark.asyncio
    async def test_handle_2fa_enabled_queues_confirmation(self, test_db):
        """Test that user.2fa_enabled event queues confirmation email."""
        handler = AuthEventHandler()

        event = {
            "event_type": "user.2fa_enabled",
            "timestamp": "2025-11-22T00:00:00Z",
            "correlation_id": str(uuid.uuid4()),
            "payload": {
                "user_id": str(uuid.uuid4()),
                "email": "test@example.com",
                "full_name": "Test User",
                "enabled_at": "2025-11-22T12:00:00Z",
                "backup_codes_count": 10,
            },
        }

        await handler.handle_2fa_enabled(event, test_db)

        # Check notification was queued
        stmt = select(NotificationQueue).where(NotificationQueue.event_type == "user.2fa_enabled")
        result = await test_db.execute(stmt)
        notification = result.scalar_one_or_none()

        assert notification is not None
        assert notification.template_name == "2fa_enabled"
        assert notification.variables["backup_codes_count"] == 10

    @pytest.mark.asyncio
    async def test_correlation_id_is_preserved(self, test_db, sample_auth_event):
        """Test that correlation ID is preserved in queued notification."""
        handler = AuthEventHandler()

        correlation_id = uuid.UUID(sample_auth_event["correlation_id"])

        await handler.handle_user_registered(sample_auth_event, test_db)

        # Check correlation ID
        stmt = select(NotificationQueue).where(NotificationQueue.correlation_id == correlation_id)
        result = await test_db.execute(stmt)
        notification = result.scalar_one_or_none()

        assert notification is not None
        assert notification.correlation_id == correlation_id
