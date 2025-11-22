"""
Configuration Management with Vault Integration
==============================================
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
    SERVICE_NAME: str = Field(default="auth-service", env="SERVICE_NAME")
    PORT: int = Field(default=8010, env="PORT")
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")

    # Vault Configuration
    VAULT_ADDR: str = Field(default="http://localhost:8200", env="VAULT_ADDR")
    VAULT_TOKEN: Optional[str] = Field(default=None, env="VAULT_TOKEN")
    VAULT_PATH: str = Field(default="secret/data/auth-service", env="VAULT_PATH")

    # Database (non-sensitive)
    POSTGRES_HOST: str = Field(default="localhost", env="POSTGRES_HOST")
    POSTGRES_PORT: int = Field(default=5432, env="POSTGRES_PORT")
    POSTGRES_DB: str = Field(default="refertosicuro_dev", env="POSTGRES_DB")

    # Redis (non-sensitive)
    REDIS_HOST: str = Field(default="localhost", env="REDIS_HOST")
    REDIS_PORT: int = Field(default=6379, env="REDIS_PORT")
    REDIS_DB: int = Field(default=0, env="REDIS_DB")

    # JWT Configuration (non-sensitive)
    JWT_ALGORITHM: str = Field(default="HS256", env="JWT_ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=240, env="ACCESS_TOKEN_EXPIRE_MINUTES"
    )  # 4 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, env="REFRESH_TOKEN_EXPIRE_DAYS")
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = Field(
        default=6, env="PASSWORD_RESET_TOKEN_EXPIRE_HOURS"
    )
    EMAIL_VERIFICATION_TOKEN_EXPIRE_DAYS: int = Field(
        default=7, env="EMAIL_VERIFICATION_TOKEN_EXPIRE_DAYS"
    )

    # Security (non-sensitive configs)
    ALLOWED_HOSTS: List[str] = Field(
        default=["localhost", "auth-service", "*.refertosicuro.it"], env="ALLOWED_HOSTS"
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

    # Password Policy
    PASSWORD_MIN_LENGTH: int = Field(default=12, env="PASSWORD_MIN_LENGTH")
    PASSWORD_REQUIRE_UPPERCASE: bool = Field(default=True, env="PASSWORD_REQUIRE_UPPERCASE")
    PASSWORD_REQUIRE_LOWERCASE: bool = Field(default=True, env="PASSWORD_REQUIRE_LOWERCASE")
    PASSWORD_REQUIRE_DIGIT: bool = Field(default=True, env="PASSWORD_REQUIRE_DIGIT")
    PASSWORD_REQUIRE_SPECIAL: bool = Field(default=True, env="PASSWORD_REQUIRE_SPECIAL")

    # Account Lockout
    MAX_LOGIN_ATTEMPTS: int = Field(default=5, env="MAX_LOGIN_ATTEMPTS")
    LOCKOUT_DURATION_MINUTES: int = Field(default=15, env="LOCKOUT_DURATION_MINUTES")

    # Feature Flags
    REGISTRATION_ENABLED: bool = Field(default=True, env="REGISTRATION_ENABLED")
    SOCIAL_LOGIN_ENABLED: bool = Field(default=False, env="SOCIAL_LOGIN_ENABLED")
    TWO_FACTOR_AUTH_ENABLED: bool = Field(default=True, env="TWO_FACTOR_AUTH_ENABLED")

    # Secrets from Vault (cached)
    _vault_client: Optional[SecureConfig] = None
    _jwt_secret: Optional[str] = None
    _csrf_secret: Optional[str] = None
    _database_password: Optional[str] = None
    _redis_password: Optional[str] = None
    _email_verification_secret: Optional[str] = None
    _password_reset_secret: Optional[str] = None

    @property
    def vault_client(self) -> SecureConfig:
        """Get or initialize Vault client."""
        if self._vault_client is None:
            self._vault_client = SecureConfig(self.SERVICE_NAME)
        return self._vault_client

    @property
    def JWT_SECRET(self) -> str:
        """Get JWT secret from Vault."""
        if self._jwt_secret is None:
            self._jwt_secret = self.vault_client.get_required("jwt_secret")
        return self._jwt_secret

    @property
    def SECRET_KEY(self) -> str:
        """Alias for JWT_SECRET for backwards compatibility."""
        return self.JWT_SECRET

    @property
    def ALGORITHM(self) -> str:
        """Alias for JWT_ALGORITHM for backwards compatibility."""
        return self.JWT_ALGORITHM

    @property
    def CSRF_SECRET(self) -> str:
        """Get CSRF secret from Vault."""
        if self._csrf_secret is None:
            self._csrf_secret = self.vault_client.get_required("csrf_secret")
        return self._csrf_secret

    @property
    def DATABASE_PASSWORD(self) -> str:
        """Get database password from Vault."""
        if self._database_password is None:
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
    def EMAIL_VERIFICATION_SECRET(self) -> str:
        """Get email verification secret from Vault."""
        if self._email_verification_secret is None:
            self._email_verification_secret = self.vault_client.get_required(
                "email_verification_secret"
            )
        return self._email_verification_secret

    @property
    def PASSWORD_RESET_SECRET(self) -> str:
        """Get password reset secret from Vault."""
        if self._password_reset_secret is None:
            self._password_reset_secret = self.vault_client.get_required("password_reset_secret")
        return self._password_reset_secret

    @property
    def OAUTH_GOOGLE_CLIENT_ID(self) -> Optional[str]:
        """Get Google OAuth client ID from Vault."""
        return self.vault_client.get("oauth_google_client_id")

    @property
    def OAUTH_GOOGLE_CLIENT_SECRET(self) -> Optional[str]:
        """Get Google OAuth client secret from Vault."""
        return self.vault_client.get("oauth_google_client_secret")

    @property
    def OAUTH_MICROSOFT_CLIENT_ID(self) -> Optional[str]:
        """Get Microsoft OAuth client ID from Vault."""
        return self.vault_client.get("oauth_microsoft_client_id")

    @property
    def OAUTH_MICROSOFT_CLIENT_SECRET(self) -> Optional[str]:
        """Get Microsoft OAuth client secret from Vault."""
        return self.vault_client.get("oauth_microsoft_client_secret")

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

# Validate critical secrets on startup
if settings.ENVIRONMENT != "test":
    try:
        _ = settings.JWT_SECRET
        _ = settings.CSRF_SECRET
        _ = settings.DATABASE_URL
    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Failed to load critical secrets from Vault: {e}")
        if settings.ENVIRONMENT == "production":
            raise
