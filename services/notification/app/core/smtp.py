"""
SMTP Configuration
==================
Environment-specific SMTP configuration for email sending
"""

from dataclasses import dataclass
from typing import Optional

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class SMTPConfig:
    """SMTP configuration settings."""

    host: str
    port: int
    username: Optional[str]
    password: Optional[str]
    use_tls: bool
    use_ssl: bool
    timeout: int
    from_address: str
    from_name: str

    def __post_init__(self):
        """Validate configuration after initialization."""
        if self.use_tls and self.use_ssl:
            raise ValueError("Cannot use both TLS and SSL simultaneously")

        # Log configuration (without secrets)
        logger.info(
            f"SMTP Config initialized: {self.host}:{self.port} "
            f"(TLS={self.use_tls}, SSL={self.use_ssl}, Auth={bool(self.username)})"
        )


def get_smtp_config() -> SMTPConfig:
    """
    Get environment-specific SMTP configuration.

    Returns:
        SMTPConfig instance with environment-appropriate settings

    Notes:
        - Development/Test: MailHog (localhost:1025, no auth)
        - Production: SendGrid (credentials from Vault!)
    """
    environment = settings.ENVIRONMENT

    if environment in ["development", "test"]:
        # MailHog configuration (no authentication required)
        config = SMTPConfig(
            host=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=None,  # MailHog doesn't need auth
            password=None,
            use_tls=settings.SMTP_USE_TLS,
            use_ssl=settings.SMTP_USE_SSL,
            timeout=settings.SMTP_TIMEOUT,
            from_address=settings.SMTP_FROM,
            from_name=settings.SMTP_FROM_NAME,
        )
        logger.info(f"Using MailHog SMTP config for {environment}")

    elif environment in ["staging", "production"]:
        # Production SMTP (SendGrid) - credentials from Vault!
        username = settings.SMTP_USERNAME
        password = settings.SMTP_PASSWORD

        if not username or not password:
            logger.error("SMTP credentials not found in Vault for production environment!")
            raise ValueError("SMTP credentials required for production. Check Vault configuration.")

        config = SMTPConfig(
            host=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=username,
            password=password,
            use_tls=settings.SMTP_USE_TLS,
            use_ssl=settings.SMTP_USE_SSL,
            timeout=settings.SMTP_TIMEOUT,
            from_address=settings.SMTP_FROM,
            from_name=settings.SMTP_FROM_NAME,
        )
        logger.info(f"Using production SMTP config for {environment}")

    else:
        raise ValueError(f"Unknown environment: {environment}")

    return config
