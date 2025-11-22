"""
Model Unit Tests
===============
Test database models
"""

import uuid

import pytest
from app.models.notification import (
    DeliveryLog,
    NotificationQueue,
    NotificationTemplate,
    UnsubscribeList,
)


class TestNotificationTemplate:
    """Test NotificationTemplate model."""

    @pytest.mark.asyncio
    async def test_create_template(self, test_db, sample_template_data):
        """Test creating a notification template."""
        template = NotificationTemplate(id=uuid.uuid4(), **sample_template_data)

        test_db.add(template)
        await test_db.commit()
        await test_db.refresh(template)

        assert template.id is not None
        assert template.name == "test_template"
        assert template.type == "email"
        assert template.is_active is True
        assert template.created_at is not None

    @pytest.mark.asyncio
    async def test_template_unique_name(self, test_db, sample_template):
        """Test that template names must be unique."""
        # Try to create another template with same name
        duplicate = NotificationTemplate(
            id=uuid.uuid4(),
            name=sample_template.name,  # Same name
            type="email",
            subject="Test",
            body_text="Test",
            variables=[],
        )

        test_db.add(duplicate)

        with pytest.raises(Exception):  # IntegrityError for unique constraint
            await test_db.commit()


class TestNotificationQueue:
    """Test NotificationQueue model."""

    @pytest.mark.asyncio
    async def test_create_notification(self, test_db, sample_notification_data):
        """Test creating a notification in queue."""
        notification = NotificationQueue(id=uuid.uuid4(), **sample_notification_data)

        test_db.add(notification)
        await test_db.commit()
        await test_db.refresh(notification)

        assert notification.id is not None
        assert notification.recipient == "test@example.com"
        assert notification.status == "pending"
        assert notification.priority == 5
        assert notification.created_at is not None

    @pytest.mark.asyncio
    async def test_notification_default_values(self, test_db):
        """Test notification default values."""
        notification = NotificationQueue(
            id=uuid.uuid4(),
            type="email",
            recipient="test@example.com",
            body_text="Test",
        )

        test_db.add(notification)
        await test_db.commit()
        await test_db.refresh(notification)

        assert notification.status == "pending"
        assert notification.priority == 5
        assert notification.attempts == 0
        assert notification.max_attempts == 3


class TestDeliveryLog:
    """Test DeliveryLog model."""

    @pytest.mark.asyncio
    async def test_create_delivery_log(self, test_db, sample_notification):
        """Test creating a delivery log entry."""
        log = DeliveryLog(
            id=uuid.uuid4(),
            notification_id=sample_notification.id,
            recipient="test@example.com",
            notification_type="email",
            status="sent",
        )

        test_db.add(log)
        await test_db.commit()
        await test_db.refresh(log)

        assert log.id is not None
        assert log.notification_id == sample_notification.id
        assert log.status == "sent"
        assert log.delivered_at is not None


class TestUnsubscribeList:
    """Test UnsubscribeList model."""

    @pytest.mark.asyncio
    async def test_create_unsubscribe_entry(self, test_db):
        """Test creating an unsubscribe list entry."""
        unsubscribe = UnsubscribeList(
            id=uuid.uuid4(),
            email="test@example.com",
            notification_type="all",
            reason="No longer interested",
        )

        test_db.add(unsubscribe)
        await test_db.commit()
        await test_db.refresh(unsubscribe)

        assert unsubscribe.id is not None
        assert unsubscribe.email == "test@example.com"
        assert unsubscribe.notification_type == "all"
        assert unsubscribe.unsubscribed_at is not None

    @pytest.mark.asyncio
    async def test_unsubscribe_unique_email(self, test_db):
        """Test that email must be unique in unsubscribe list."""
        email = "unique@example.com"

        # Create first entry
        unsubscribe1 = UnsubscribeList(id=uuid.uuid4(), email=email, notification_type="all")
        test_db.add(unsubscribe1)
        await test_db.commit()

        # Try to create duplicate
        unsubscribe2 = UnsubscribeList(id=uuid.uuid4(), email=email, notification_type="marketing")
        test_db.add(unsubscribe2)

        with pytest.raises(Exception):  # IntegrityError for unique constraint
            await test_db.commit()
