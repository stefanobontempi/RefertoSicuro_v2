"""
Email service for sending transactional emails
"""

import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Email service implementation"""

    def __init__(self):
        self.enabled = False
        logger.info("Email service initialized (disabled in dev mode)")

    async def send_verification_email(self, email: str, token: str) -> bool:
        """Send verification email"""
        logger.info(f"[MOCK] Sending verification email to {email} with token {token}")
        return True

    async def send_password_reset_email(self, email: str, token: str) -> bool:
        """Send password reset email"""
        logger.info(f"[MOCK] Sending password reset email to {email} with token {token}")
        return True

    async def send_welcome_email(self, email: str, name: str) -> bool:
        """Send welcome email"""
        logger.info(f"[MOCK] Sending welcome email to {email} (name: {name})")
        return True


# Global email service instance
email_service = EmailService()
