"""
Configuration Management with Vault Integration
==============================================
Notification Service Settings
"""

import os
import sys
from functools import lru_cache
from typing import List, Optional

from pydantic import Field, validator
from pydantic_settings import BaseSettings

# Add shared utilities to path
sys.path.append(os.path.join(os.path.dirname(__file__), "../../../../shared"))
from utils.vault_client import SecureConfig


class Settings(BaseSettings):
    """
    Application settings with Vault integration for secrets.
    Non-sensitive settings can be in environment variables.
    Sensitive settings are retrieved from Vault.
    """

    # Environment
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    SERVICE_NAME: str = Field(default="notification-service", env="SERVICE_NAME")
    PORT: int = Field(default=8015, env="PORT")
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")

    # Vault Configuration
    VAULT_ADDR: str = Field(default="http://localhost:8200", env="VAULT_ADDR")
    VAULT_TOKEN: Optional[str] = Field(default=None, env="VAULT_TOKEN")
    VAULT_PATH: str = Field(default="secret/data/notification-service", env="VAULT_PATH")

    # Database (non-sensitive)
    POSTGRES_HOST: str = Field(default="localhost", env="POSTGRES_HOST")
    POSTGRES_PORT: int = Field(default=5432, env="POSTGRES_PORT")
    POSTGRES_DB: str = Field(default="refertosicuro_notification", env="POSTGRES_DB")

    # Redis (non-sensitive)
    REDIS_HOST: str = Field(default="localhost", env="REDIS_HOST")
    REDIS_PORT: int = Field(default=6379, env="REDIS_PORT")
    REDIS_DB: int = Field(default=2, env="REDIS_DB")  # DB 2 for notifications

    # RabbitMQ (non-sensitive)
    RABBITMQ_HOST: str = Field(default="localhost", env="RABBITMQ_HOST")
    RABBITMQ_PORT: int = Field(default=5672, env="RABBITMQ_PORT")
    RABBITMQ_VHOST: str = Field(default="refertosicuro", env="RABBITMQ_VHOST")
    RABBITMQ_EXCHANGE: str = Field(default="refertosicuro.events", env="RABBITMQ_EXCHANGE")
    RABBITMQ_QUEUE: str = Field(default="notification.queue", env="RABBITMQ_QUEUE")
    RABBITMQ_DLQ: str = Field(default="notification.failed", env="RABBITMQ_DLQ")
    RABBITMQ_PREFETCH_COUNT: int = Field(default=10, env="RABBITMQ_PREFETCH_COUNT")

    # SMTP Configuration (non-sensitive)
    SMTP_HOST: str = Field(default="localhost", env="SMTP_HOST")  # MailHog in dev
    SMTP_PORT: int = Field(default=1025, env="SMTP_PORT")
    SMTP_USE_TLS: bool = Field(default=False, env="SMTP_USE_TLS")
    SMTP_USE_SSL: bool = Field(default=False, env="SMTP_USE_SSL")
    SMTP_FROM: str = Field(default="noreply@refertosicuro.it", env="SMTP_FROM")
    SMTP_FROM_NAME: str = Field(default="RefertoSicuro", env="SMTP_FROM_NAME")
    SMTP_TIMEOUT: int = Field(default=30, env="SMTP_TIMEOUT")

    # Email Configuration
    EMAIL_ENABLED: bool = Field(default=True, env="EMAIL_ENABLED")
    EMAIL_MAX_RETRIES: int = Field(default=3, env="EMAIL_MAX_RETRIES")
    EMAIL_RETRY_DELAY_SECONDS: int = Field(default=5, env="EMAIL_RETRY_DELAY_SECONDS")

    # SMS Configuration (future)
    SMS_ENABLED: bool = Field(default=False, env="SMS_ENABLED")
    SMS_PROVIDER: str = Field(default="twilio", env="SMS_PROVIDER")

    # Push Notifications (future)
    PUSH_ENABLED: bool = Field(default=False, env="PUSH_ENABLED")

    # Security (non-sensitive configs)
    ALLOWED_HOSTS: List[str] = Field(
        default=["localhost", "notification-service", "*.refertosicuro.it"],
        env="ALLOWED_HOSTS",
    )
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:5173", "http://localhost:5174"], env="CORS_ORIGINS"
    )

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = Field(default=True, env="RATE_LIMIT_ENABLED")
    RATE_LIMIT_PER_MINUTE_ANONYMOUS: int = Field(default=10, env="RATE_LIMIT_PER_MINUTE_ANONYMOUS")
    RATE_LIMIT_PER_MINUTE_AUTHENTICATED: int = Field(
        default=100, env="RATE_LIMIT_PER_MINUTE_AUTHENTICATED"
    )

    # Application URLs (for email links)
    FRONTEND_URL: str = Field(default="http://localhost:5173", env="FRONTEND_URL")
    BACKEND_URL: str = Field(default="http://localhost:8000", env="BACKEND_URL")

    # Template Configuration
    TEMPLATE_DIR: str = Field(default="app/templates/email", env="TEMPLATE_DIR")

    # Secrets from Vault (cached)
    _vault_client: Optional[SecureConfig] = None
    _database_password: Optional[str] = None
    _redis_password: Optional[str] = None
    _rabbitmq_password: Optional[str] = None
    _smtp_username: Optional[str] = None
    _smtp_password: Optional[str] = None
    _twilio_account_sid: Optional[str] = None
    _twilio_auth_token: Optional[str] = None

    @property
    def vault_client(self) -> SecureConfig:
        """Get or initialize Vault client."""
        if self._vault_client is None:
            self._vault_client = SecureConfig(self.SERVICE_NAME)
        return self._vault_client

    @property
    def DATABASE_PASSWORD(self) -> str:
        """Get database password from Vault."""
        if self._database_password is None:
            if self.ENVIRONMENT == "test":
                # In test mode, use default
                self._database_password = "dev_password_change_me"
            else:
                config = self.vault_client.vault.get_database_config("postgres")
                self._database_password = config.get("password", "dev_password_change_me")
        return self._database_password

    @property
    def DATABASE_URL(self) -> str:
        """Construct database URL with password from Vault."""
        password = self.DATABASE_PASSWORD
        return (
            f"postgresql+asyncpg://refertosicuro:{password}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def REDIS_PASSWORD(self) -> Optional[str]:
        """Get Redis password from Vault if configured."""
        if self._redis_password is None:
            if self.ENVIRONMENT == "test":
                self._redis_password = None
            else:
                config = self.vault_client.vault.get_database_config("redis")
                self._redis_password = config.get("password", "")
        return self._redis_password if self._redis_password else None

    @property
    def REDIS_URL(self) -> str:
        """Construct Redis URL with password from Vault."""
        password = self.REDIS_PASSWORD
        if password:
            return f"redis://:{password}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    @property
    def RABBITMQ_PASSWORD(self) -> str:
        """Get RabbitMQ password from Vault."""
        if self._rabbitmq_password is None:
            if self.ENVIRONMENT == "test":
                self._rabbitmq_password = "dev_password_change_me"
            else:
                config = self.vault_client.vault.get_rabbitmq_config()
                self._rabbitmq_password = config.get("password", "dev_password_change_me")
        return self._rabbitmq_password

    @property
    def RABBITMQ_URL(self) -> str:
        """Construct RabbitMQ URL with password from Vault."""
        password = self.RABBITMQ_PASSWORD
        return f"amqp://admin:{password}@{self.RABBITMQ_HOST}:{self.RABBITMQ_PORT}/{self.RABBITMQ_VHOST}"

    @property
    def SMTP_USERNAME(self) -> Optional[str]:
        """Get SMTP username from Vault (production only)."""
        if self._smtp_username is None:
            if self.ENVIRONMENT in ["development", "test"]:
                return None  # MailHog doesn't need auth
            self._smtp_username = self.vault_client.get("smtp_username")
        return self._smtp_username

    @property
    def SMTP_PASSWORD(self) -> Optional[str]:
        """Get SMTP password from Vault (production only)."""
        if self._smtp_password is None:
            if self.ENVIRONMENT in ["development", "test"]:
                return None  # MailHog doesn't need auth
            self._smtp_password = self.vault_client.get("smtp_password")
        return self._smtp_password

    @property
    def TWILIO_ACCOUNT_SID(self) -> Optional[str]:
        """Get Twilio Account SID from Vault."""
        if self._twilio_account_sid is None:
            self._twilio_account_sid = self.vault_client.get("twilio_account_sid")
        return self._twilio_account_sid

    @property
    def TWILIO_AUTH_TOKEN(self) -> Optional[str]:
        """Get Twilio Auth Token from Vault."""
        if self._twilio_auth_token is None:
            self._twilio_auth_token = self.vault_client.get("twilio_auth_token")
        return self._twilio_auth_token

    @validator("ENVIRONMENT")
    def validate_environment(cls, v):
        """Validate environment value."""
        valid_envs = ["development", "test", "staging", "production"]
        if v not in valid_envs:
            raise ValueError(f"ENVIRONMENT must be one of {valid_envs}")
        return v

    @validator("CORS_ORIGINS", pre=True)
    def parse_cors_origins(cls, v):
        """Parse CORS origins from string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    @validator("ALLOWED_HOSTS", pre=True)
    def parse_allowed_hosts(cls, v):
        """Parse allowed hosts from string or list."""
        if isinstance(v, str):
            return [host.strip() for host in v.split(",")]
        return v

    class Config:
        """Pydantic configuration."""

        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Use this function to import settings in other modules.
    """
    return Settings()


# Create settings instance
settings = get_settings()

# Validate critical settings on startup
if settings.ENVIRONMENT != "test":
    try:
        _ = settings.DATABASE_URL
        _ = settings.RABBITMQ_URL
    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Failed to load critical settings: {e}")
        if settings.ENVIRONMENT == "production":
            raise
