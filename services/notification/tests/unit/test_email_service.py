"""
Email Service Unit Tests
========================
Test email sending functionality
"""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from app.services.email_service import EmailService


class TestEmailService:
    """Test EmailService class."""

    def test_email_service_initialization(self):
        """Test email service can be initialized."""
        service = EmailService()
        assert service is not None
        assert service.smtp_config is not None
        assert service.max_retries == 3

    def test_build_message(self):
        """Test building email message."""
        service = EmailService()

        message = service._build_message(
            recipient="test@example.com",
            subject="Test Subject",
            body_html="<p>Test HTML</p>",
            body_text="Test Text",
            recipient_name="Test User",
        )

        assert message["To"] == "Test User <test@example.com>"
        assert message["Subject"] == "Test Subject"
        assert message["From"] is not None

    @pytest.mark.asyncio
    async def test_is_unsubscribed_returns_true(self, test_db):
        """Test checking if email is unsubscribed."""
        from app.models.notification import UnsubscribeList

        # Add email to unsubscribe list
        unsubscribe = UnsubscribeList(
            id=uuid.uuid4(),
            email="unsubscribed@example.com",
            notification_type="all",
        )
        test_db.add(unsubscribe)
        await test_db.commit()

        service = EmailService()
        result = await service._is_unsubscribed("unsubscribed@example.com", test_db)

        assert result is True

    @pytest.mark.asyncio
    async def test_is_unsubscribed_returns_false(self, test_db):
        """Test checking if email is not unsubscribed."""
        service = EmailService()
        result = await service._is_unsubscribed("active@example.com", test_db)

        assert result is False

    @pytest.mark.asyncio
    async def test_log_delivery_creates_log_entry(self, test_db):
        """Test that delivery logging creates database entry."""
        from app.models.notification import DeliveryLog
        from sqlalchemy import select

        service = EmailService()

        await service._log_delivery(
            db=test_db,
            recipient="test@example.com",
            status="sent",
            notification_id=uuid.uuid4(),
            template_name="test_template",
        )

        # Check log was created
        stmt = select(DeliveryLog).where(DeliveryLog.recipient == "test@example.com")
        result = await test_db.execute(stmt)
        log = result.scalar_one_or_none()

        assert log is not None
        assert log.status == "sent"
        assert log.recipient == "test@example.com"

    @pytest.mark.asyncio
    @patch("app.services.email_service.aiosmtplib.SMTP")
    async def test_send_email_success(self, mock_smtp, test_db):
        """Test successful email sending."""
        # Mock SMTP
        mock_smtp_instance = AsyncMock()
        mock_smtp.return_value.__aenter__.return_value = mock_smtp_instance

        service = EmailService()

        result = await service.send_email(
            recipient="test@example.com",
            subject="Test Subject",
            body_html="<p>Test</p>",
            body_text="Test",
            db=test_db,
        )

        assert result is True
        mock_smtp_instance.send_message.assert_called_once()

    @pytest.mark.asyncio
    @patch("app.services.email_service.aiosmtplib.SMTP")
    async def test_send_email_to_unsubscribed_returns_false(self, mock_smtp, test_db):
        """Test that sending to unsubscribed email returns False."""
        from app.models.notification import UnsubscribeList

        # Add to unsubscribe list
        unsubscribe = UnsubscribeList(
            id=uuid.uuid4(),
            email="unsubscribed@example.com",
            notification_type="all",
        )
        test_db.add(unsubscribe)
        await test_db.commit()

        service = EmailService()

        result = await service.send_email(
            recipient="unsubscribed@example.com",
            subject="Test",
            body_html="<p>Test</p>",
            body_text="Test",
            db=test_db,
        )

        assert result is False
        mock_smtp.assert_not_called()

    @pytest.mark.asyncio
    async def test_send_from_template_renders_and_sends(self, test_db):
        """Test sending email from template."""
        with patch("app.services.email_service.aiosmtplib.SMTP") as mock_smtp:
            mock_smtp_instance = AsyncMock()
            mock_smtp.return_value.__aenter__.return_value = mock_smtp_instance

            service = EmailService()

            variables = {
                "user_name": "Test User",
                "verification_link": "http://test",
                "trial_days": 7,
            }

            result = await service.send_from_template(
                recipient="test@example.com",
                template_name="welcome_email",
                variables=variables,
                db=test_db,
            )

            assert result is True
            mock_smtp_instance.send_message.assert_called_once()
