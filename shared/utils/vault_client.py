"""
HashiCorp Vault Client for RefertoSicuro v2
===========================================
Secure secret management for compliance
"""

import os
import logging
from typing import Any, Dict, Optional
from functools import lru_cache
import hvac
from hvac.exceptions import InvalidPath, Forbidden, VaultError

logger = logging.getLogger(__name__)


class VaultClient:
    """
    Client for interacting with HashiCorp Vault.
    Handles secret retrieval and caching for microservices.
    """

    def __init__(
        self,
        vault_addr: Optional[str] = None,
        vault_token: Optional[str] = None,
        vault_path: Optional[str] = None,
        cache_ttl: int = 300,  # 5 minutes cache
    ):
        """
        Initialize Vault client.

        Args:
            vault_addr: Vault server address
            vault_token: Authentication token
            vault_path: Base path for service secrets
            cache_ttl: Cache TTL in seconds
        """
        self.vault_addr = vault_addr or os.getenv("VAULT_ADDR", "http://localhost:8200")
        self.vault_token = vault_token or os.getenv("VAULT_TOKEN")
        self.vault_path = vault_path or os.getenv("VAULT_PATH", "secret/data/shared")
        self.cache_ttl = cache_ttl

        # Initialize client
        self.client = hvac.Client(url=self.vault_addr, token=self.vault_token)

        # Verify connection
        if not self._verify_connection():
            logger.warning(
                "Vault connection failed. Falling back to environment variables."
            )
            self.client = None

    def _verify_connection(self) -> bool:
        """Verify Vault connection and authentication."""
        try:
            if not self.client.is_authenticated():
                logger.error("Vault authentication failed")
                return False
            return True
        except Exception as e:
            logger.error(f"Vault connection error: {e}")
            return False

    @lru_cache(maxsize=128)
    def get_secret(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """
        Get a secret value from Vault or environment.

        Args:
            key: Secret key name
            default: Default value if not found

        Returns:
            Secret value or default
        """
        # Try Vault first
        if self.client:
            try:
                # Get from service-specific path
                response = self.client.secrets.kv.v2.read_secret_version(
                    path=self.vault_path.replace("secret/data/", ""),
                    mount_point="secret",
                )
                secrets = response.get("data", {}).get("data", {})

                if key in secrets:
                    return secrets[key]

                # Try shared secrets
                shared_response = self.client.secrets.kv.v2.read_secret_version(
                    path="shared",
                    mount_point="secret",
                )
                shared_secrets = shared_response.get("data", {}).get("data", {})

                if key in shared_secrets:
                    return shared_secrets[key]

            except (InvalidPath, Forbidden) as e:
                logger.warning(f"Secret not found in Vault: {key}")
            except VaultError as e:
                logger.error(f"Vault error retrieving secret {key}: {e}")

        # Fallback to environment variable
        env_key = key.upper()
        env_value = os.getenv(env_key)

        if env_value:
            logger.debug(f"Using environment variable for {key}")
            return env_value

        # Use default if provided
        if default:
            logger.debug(f"Using default value for {key}")
            return default

        logger.warning(f"Secret not found: {key}")
        return None

    def get_secrets(self, keys: list) -> Dict[str, Optional[str]]:
        """
        Get multiple secrets at once.

        Args:
            keys: List of secret keys

        Returns:
            Dictionary of key-value pairs
        """
        return {key: self.get_secret(key) for key in keys}

    def get_database_config(self, db_type: str = "postgres") -> Dict[str, Any]:
        """
        Get database configuration from Vault.

        Args:
            db_type: Database type (postgres, mongodb, redis)

        Returns:
            Database configuration dictionary
        """
        if self.client:
            try:
                response = self.client.secrets.kv.v2.read_secret_version(
                    path=f"database/{db_type}",
                    mount_point="secret",
                )
                return response.get("data", {}).get("data", {})
            except Exception as e:
                logger.error(f"Error retrieving database config: {e}")

        # Fallback to environment variables
        if db_type == "postgres":
            return {
                "host": os.getenv("POSTGRES_HOST", "localhost"),
                "port": int(os.getenv("POSTGRES_PORT", 5432)),
                "database": os.getenv("POSTGRES_DB", "refertosicuro_dev"),
                "username": os.getenv("POSTGRES_USER", "refertosicuro"),
                "password": os.getenv("POSTGRES_PASSWORD", "dev_password_change_me"),
                "ssl_mode": os.getenv("POSTGRES_SSL_MODE", "prefer"),
            }
        elif db_type == "mongodb":
            return {
                "host": os.getenv("MONGODB_HOST", "localhost"),
                "port": int(os.getenv("MONGODB_PORT", 27017)),
                "database": os.getenv("MONGODB_DATABASE", "refertosicuro_analytics"),
                "username": os.getenv("MONGODB_USER", "admin"),
                "password": os.getenv("MONGODB_PASSWORD", "dev_password_change_me"),
            }
        elif db_type == "redis":
            return {
                "host": os.getenv("REDIS_HOST", "localhost"),
                "port": int(os.getenv("REDIS_PORT", 6379)),
                "password": os.getenv("REDIS_PASSWORD", ""),
                "db": int(os.getenv("REDIS_DB", 0)),
            }
        else:
            raise ValueError(f"Unknown database type: {db_type}")

    def encrypt_data(self, plaintext: str, key_name: str = "personal-data") -> str:
        """
        Encrypt data using Vault's transit engine.

        Args:
            plaintext: Data to encrypt
            key_name: Encryption key name in transit engine

        Returns:
            Encrypted ciphertext
        """
        if not self.client:
            raise VaultError("Vault client not available for encryption")

        try:
            import base64

            # Encode plaintext to base64
            plaintext_b64 = base64.b64encode(plaintext.encode()).decode()

            # Encrypt using transit engine
            response = self.client.secrets.transit.encrypt_data(
                name=key_name,
                plaintext=plaintext_b64,
            )
            return response["data"]["ciphertext"]
        except Exception as e:
            logger.error(f"Encryption error: {e}")
            raise

    def decrypt_data(self, ciphertext: str, key_name: str = "personal-data") -> str:
        """
        Decrypt data using Vault's transit engine.

        Args:
            ciphertext: Encrypted data
            key_name: Encryption key name in transit engine

        Returns:
            Decrypted plaintext
        """
        if not self.client:
            raise VaultError("Vault client not available for decryption")

        try:
            import base64

            # Decrypt using transit engine
            response = self.client.secrets.transit.decrypt_data(
                name=key_name,
                ciphertext=ciphertext,
            )

            # Decode from base64
            plaintext_b64 = response["data"]["plaintext"]
            return base64.b64decode(plaintext_b64).decode()
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            raise

    def rotate_encryption_key(self, key_name: str = "personal-data") -> bool:
        """
        Rotate an encryption key in Vault.

        Args:
            key_name: Key to rotate

        Returns:
            Success status
        """
        if not self.client:
            return False

        try:
            self.client.secrets.transit.rotate_key(name=key_name)
            logger.info(f"Successfully rotated key: {key_name}")
            return True
        except Exception as e:
            logger.error(f"Key rotation error: {e}")
            return False

    def get_api_key(self, partner_name: str) -> Optional[str]:
        """
        Get API key for a partner.

        Args:
            partner_name: Partner identifier

        Returns:
            API key or None
        """
        if self.client:
            try:
                response = self.client.secrets.kv.v2.read_secret_version(
                    path="api-keys/partners",
                    mount_point="secret",
                )
                keys = response.get("data", {}).get("data", {})
                return keys.get(partner_name)
            except Exception as e:
                logger.error(f"Error retrieving API key: {e}")
        return None

    def clear_cache(self):
        """Clear the LRU cache for secrets."""
        self.get_secret.cache_clear()
        logger.info("Secret cache cleared")


class SecureConfig:
    """
    Secure configuration manager using Vault.
    Use this class for service configuration.
    """

    def __init__(self, service_name: str):
        """
        Initialize secure config for a service.

        Args:
            service_name: Name of the microservice
        """
        self.service_name = service_name
        self.vault = VaultClient(vault_path=f"secret/data/{service_name}")

    def get(self, key: str, default: Optional[str] = None) -> Optional[str]:
        """Get configuration value."""
        return self.vault.get_secret(key, default)

    def get_required(self, key: str) -> str:
        """
        Get required configuration value.
        Raises exception if not found.
        """
        value = self.vault.get_secret(key)
        if value is None:
            raise ValueError(f"Required configuration missing: {key}")
        return value

    def get_int(self, key: str, default: int = 0) -> int:
        """Get integer configuration value."""
        value = self.vault.get_secret(key, str(default))
        try:
            return int(value)
        except (ValueError, TypeError):
            return default

    def get_bool(self, key: str, default: bool = False) -> bool:
        """Get boolean configuration value."""
        value = self.vault.get_secret(key, str(default))
        if isinstance(value, bool):
            return value
        return value.lower() in ("true", "1", "yes", "on")

    def get_database_url(self, db_type: str = "postgres") -> str:
        """Get database connection URL."""
        config = self.vault.get_database_config(db_type)

        if db_type == "postgres":
            return (
                f"postgresql+asyncpg://{config['username']}:{config['password']}"
                f"@{config['host']}:{config['port']}/{config['database']}"
            )
        elif db_type == "mongodb":
            return (
                f"mongodb://{config['username']}:{config['password']}"
                f"@{config['host']}:{config['port']}/{config['database']}?authSource=admin"
            )
        elif db_type == "redis":
            password = f":{config['password']}@" if config['password'] else ""
            return f"redis://{password}{config['host']}:{config['port']}/{config['db']}"
        else:
            raise ValueError(f"Unknown database type: {db_type}")


# Singleton instance for easy import
vault_client = None


def initialize_vault(service_name: str) -> SecureConfig:
    """
    Initialize Vault client for a service.

    Args:
        service_name: Name of the microservice

    Returns:
        SecureConfig instance
    """
    global vault_client
    vault_client = SecureConfig(service_name)
    return vault_client


# Example usage in a FastAPI service:
"""
from shared.utils.vault_client import initialize_vault

# In your main.py or config.py
config = initialize_vault("auth-service")

# Get secrets
JWT_SECRET = config.get_required("jwt_secret")
DATABASE_URL = config.get_database_url("postgres")
REDIS_URL = config.get_database_url("redis")

# Encrypt sensitive data
from shared.utils.vault_client import VaultClient
vault = VaultClient()
encrypted_report = vault.encrypt_data(report_text, "reports")
decrypted_report = vault.decrypt_data(encrypted_report, "reports")
"""