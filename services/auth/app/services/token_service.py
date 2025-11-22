"""
Token Service - Hybrid Storage Implementation
==============================================
Redis for fast lookups + PostgreSQL for audit trail (medical-grade compliance)
"""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.redis import redis_client
from app.models.token import EmailVerificationToken, PasswordResetToken
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class TokenService:
    """Service for managing verification and reset tokens with hybrid storage."""

    # Token expiry times
    PASSWORD_RESET_EXPIRY_HOURS = 1
    EMAIL_VERIFICATION_EXPIRY_DAYS = 7

    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """
        Generate a cryptographically secure random token.

        Args:
            length: Token length in bytes (default 32 = 64 hex chars)

        Returns:
            Secure random token as hex string
        """
        return secrets.token_hex(length)

    @staticmethod
    def hash_token(token: str) -> str:
        """
        Hash a token for secure storage in database.

        Uses SHA-256 for fast verification without reversibility.

        Args:
            token: Plaintext token

        Returns:
            Hashed token
        """
        return hashlib.sha256(token.encode()).hexdigest()

    async def create_password_reset_token(
        self,
        user: User,
        db: AsyncSession,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> str:
        """
        Create password reset token with hybrid storage.

        Strategy:
        1. Generate secure random token
        2. Store plaintext in Redis with TTL (fast lookup)
        3. Store hash in PostgreSQL (audit trail)

        Args:
            user: User requesting password reset
            db: Database session
            ip_address: Client IP for audit
            user_agent: Client user agent for audit

        Returns:
            Plaintext token to send via email
        """
        # Generate secure token
        token = self.generate_secure_token()

        # Calculate expiry
        expires_at = datetime.now(timezone.utc) + timedelta(hours=self.PASSWORD_RESET_EXPIRY_HOURS)

        # 1. Store in Redis for fast lookup (primary)
        redis_key = f"password_reset:{token}"
        redis_value = str(user.id)
        ttl_seconds = int(self.PASSWORD_RESET_EXPIRY_HOURS * 3600)

        await redis_client.setex(redis_key, ttl_seconds, redis_value)

        logger.info(
            f"Password reset token stored in Redis for user {user.email} (TTL: {ttl_seconds}s)"
        )

        # 2. Store hash in PostgreSQL for audit (secondary)
        token_hash = self.hash_token(token)

        db_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        db.add(db_token)
        await db.commit()

        logger.info(
            f"Password reset token audit record created for user {user.email} (DB ID: {db_token.id})"
        )

        return token

    async def verify_password_reset_token(self, token: str, db: AsyncSession) -> Optional[User]:
        """
        Verify password reset token using hybrid lookup.

        Strategy:
        1. Check Redis first (fast path)
        2. If not in Redis, check PostgreSQL (fallback for audit)

        Args:
            token: Plaintext token from email link
            db: Database session

        Returns:
            User if token valid, None otherwise
        """
        # 1. Try Redis first (fast path)
        redis_key = f"password_reset:{token}"
        user_id = await redis_client.get(redis_key)

        if user_id:
            logger.info(f"Password reset token found in Redis for user_id: {user_id}")

            # Get user from database
            user = await db.get(User, user_id)

            if user and user.is_active:
                return user

        # 2. Fallback to PostgreSQL (slow path, audit)
        token_hash = self.hash_token(token)

        from sqlalchemy import select

        result = await db.execute(
            select(PasswordResetToken)
            .where(PasswordResetToken.token_hash == token_hash)
            .where(PasswordResetToken.used == False)  # noqa: E712
        )
        db_token = result.scalar_one_or_none()

        if db_token and db_token.is_valid:
            logger.info(f"Password reset token found in PostgreSQL for user_id: {db_token.user_id}")
            return await db.get(User, db_token.user_id)

        logger.warning("Invalid password reset token attempted")
        return None

    async def mark_password_reset_token_used(self, token: str, db: AsyncSession) -> bool:
        """
        Mark password reset token as used and remove from Redis.

        Args:
            token: Plaintext token
            db: Database session

        Returns:
            True if marked successfully
        """
        # 1. Remove from Redis
        redis_key = f"password_reset:{token}"
        await redis_client.delete(redis_key)

        # 2. Mark as used in PostgreSQL
        token_hash = self.hash_token(token)

        from sqlalchemy import select

        result = await db.execute(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        )
        db_token = result.scalar_one_or_none()

        if db_token:
            db_token.used = True
            db_token.used_at = datetime.now(timezone.utc)
            await db.commit()
            logger.info(f"Password reset token marked as used (DB ID: {db_token.id})")
            return True

        return False

    async def create_email_verification_token(
        self,
        user: User,
        db: AsyncSession,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> str:
        """
        Create email verification token with hybrid storage.

        Strategy:
        1. Generate secure random token
        2. Store plaintext in Redis with TTL (fast lookup)
        3. Store hash in PostgreSQL (audit trail)

        Args:
            user: User to verify
            db: Database session
            ip_address: Client IP for audit
            user_agent: Client user agent for audit

        Returns:
            Plaintext token to send via email
        """
        # Generate secure token
        token = self.generate_secure_token()

        # Calculate expiry
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=self.EMAIL_VERIFICATION_EXPIRY_DAYS
        )

        # 1. Store in Redis for fast lookup
        redis_key = f"email_verify:{token}"
        redis_value = str(user.id)
        ttl_seconds = int(self.EMAIL_VERIFICATION_EXPIRY_DAYS * 86400)

        await redis_client.setex(redis_key, ttl_seconds, redis_value)

        logger.info(
            f"Email verification token stored in Redis for user {user.email} (TTL: {ttl_seconds}s)"
        )

        # 2. Store hash in PostgreSQL for audit
        token_hash = self.hash_token(token)

        db_token = EmailVerificationToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        db.add(db_token)
        await db.commit()

        logger.info(
            f"Email verification token audit record created for user {user.email} (DB ID: {db_token.id})"
        )

        return token

    async def verify_email_verification_token(self, token: str, db: AsyncSession) -> Optional[User]:
        """
        Verify email verification token using hybrid lookup.

        Strategy:
        1. Check Redis first (fast path)
        2. If not in Redis, check PostgreSQL (fallback)

        Args:
            token: Plaintext token from email link
            db: Database session

        Returns:
            User if token valid, None otherwise
        """
        # 1. Try Redis first (fast path)
        redis_key = f"email_verify:{token}"
        user_id = await redis_client.get(redis_key)

        if user_id:
            logger.info(f"Email verification token found in Redis for user_id: {user_id}")

            user = await db.get(User, user_id)

            if user and user.is_active:
                return user

        # 2. Fallback to PostgreSQL
        token_hash = self.hash_token(token)

        from sqlalchemy import select

        result = await db.execute(
            select(EmailVerificationToken)
            .where(EmailVerificationToken.token_hash == token_hash)
            .where(EmailVerificationToken.used == False)  # noqa: E712
        )
        db_token = result.scalar_one_or_none()

        if db_token and db_token.is_valid:
            logger.info(
                f"Email verification token found in PostgreSQL for user_id: {db_token.user_id}"
            )
            return await db.get(User, db_token.user_id)

        logger.warning("Invalid email verification token attempted")
        return None

    async def mark_email_verification_token_used(self, token: str, db: AsyncSession) -> bool:
        """
        Mark email verification token as used and remove from Redis.

        Args:
            token: Plaintext token
            db: Database session

        Returns:
            True if marked successfully
        """
        # 1. Remove from Redis
        redis_key = f"email_verify:{token}"
        await redis_client.delete(redis_key)

        # 2. Mark as used in PostgreSQL
        token_hash = self.hash_token(token)

        from sqlalchemy import select

        result = await db.execute(
            select(EmailVerificationToken).where(EmailVerificationToken.token_hash == token_hash)
        )
        db_token = result.scalar_one_or_none()

        if db_token:
            db_token.used = True
            db_token.used_at = datetime.now(timezone.utc)
            await db.commit()
            logger.info(f"Email verification token marked as used (DB ID: {db_token.id})")
            return True

        return False


# Singleton instance
token_service = TokenService()
