"""
Unit Tests for Token Service
=============================
Tests for hybrid token storage (Redis + PostgreSQL)
"""

import hashlib
from datetime import datetime, timedelta, timezone

import pytest
from app.models.token import EmailVerificationToken, PasswordResetToken
from app.services.token_service import TokenService, token_service
from sqlalchemy import select


@pytest.mark.unit
class TestTokenService:
    """Test TokenService class"""

    def test_generate_secure_token(self):
        """Test secure token generation"""
        token1 = TokenService.generate_secure_token()
        token2 = TokenService.generate_secure_token()

        # Tokens should be different
        assert token1 != token2

        # Default length is 32 bytes = 64 hex chars
        assert len(token1) == 64
        assert len(token2) == 64

        # Should be hex
        assert all(c in "0123456789abcdef" for c in token1)

    def test_generate_secure_token_custom_length(self):
        """Test token generation with custom length"""
        token = TokenService.generate_secure_token(length=16)

        # 16 bytes = 32 hex chars
        assert len(token) == 32

    def test_hash_token(self):
        """Test token hashing"""
        token = "test_token_123"
        hash1 = TokenService.hash_token(token)
        hash2 = TokenService.hash_token(token)

        # Same token should produce same hash
        assert hash1 == hash2

        # Hash should be SHA-256 (64 hex chars)
        assert len(hash1) == 64

        # Verify it's correct SHA-256
        expected = hashlib.sha256(token.encode()).hexdigest()
        assert hash1 == expected

    def test_hash_token_different_inputs(self):
        """Test that different tokens produce different hashes"""
        hash1 = TokenService.hash_token("token1")
        hash2 = TokenService.hash_token("token2")

        assert hash1 != hash2


@pytest.mark.unit
@pytest.mark.requires_db
@pytest.mark.requires_redis
class TestPasswordResetToken:
    """Test password reset token functionality"""

    @pytest.mark.asyncio
    async def test_create_password_reset_token(self, test_db, test_user, mock_redis):
        """Test creating password reset token"""
        token = await token_service.create_password_reset_token(
            user=test_user,
            db=test_db,
            ip_address="127.0.0.1",
            user_agent="pytest",
        )

        # Token should be generated
        assert token is not None
        assert len(token) == 64  # 32 bytes = 64 hex chars

        # Should be stored in Redis (mock_redis is the storage dict)
        redis_key = f"password_reset:{token}"
        redis_value = mock_redis[redis_key]
        assert redis_value == str(test_user.id)

        # Should be stored in PostgreSQL (hashed)
        token_hash = TokenService.hash_token(token)
        result = await test_db.execute(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        )
        db_token = result.scalar_one_or_none()

        assert db_token is not None
        assert db_token.user_id == test_user.id
        assert db_token.token_hash == token_hash
        assert db_token.used is False
        assert db_token.ip_address == "127.0.0.1"
        assert db_token.user_agent == "pytest"

        # Expiry should be ~1 hour from now
        assert db_token.expires_at > datetime.now(timezone.utc)
        assert db_token.expires_at < datetime.now(timezone.utc) + timedelta(hours=2)

    @pytest.mark.asyncio
    async def test_verify_password_reset_token_from_redis(self, test_db, test_user, mock_redis):
        """Test verifying token from Redis (fast path)"""
        # Create token
        token = await token_service.create_password_reset_token(user=test_user, db=test_db)

        # Verify token
        verified_user = await token_service.verify_password_reset_token(token, test_db)

        assert verified_user is not None
        assert verified_user.id == test_user.id
        assert verified_user.email == test_user.email

    @pytest.mark.asyncio
    async def test_verify_password_reset_token_from_postgres(self, test_db, test_user, mock_redis):
        """Test verifying token from PostgreSQL (fallback path)"""
        # Create token
        token = await token_service.create_password_reset_token(user=test_user, db=test_db)

        # Remove from Redis to force PostgreSQL lookup
        redis_key = f"password_reset:{token}"
        mock_redis.pop(redis_key, None)

        # Verify token (should fallback to PostgreSQL)
        verified_user = await token_service.verify_password_reset_token(token, test_db)

        assert verified_user is not None
        assert verified_user.id == test_user.id

    @pytest.mark.asyncio
    async def test_verify_invalid_token(self, test_db, mock_redis):
        """Test verifying invalid token returns None"""
        invalid_token = "invalid_token_12345"

        verified_user = await token_service.verify_password_reset_token(invalid_token, test_db)

        assert verified_user is None

    @pytest.mark.asyncio
    async def test_verify_expired_token(self, test_db, test_user, mock_redis):
        """Test that expired tokens are rejected"""
        # Create token
        token = await token_service.create_password_reset_token(user=test_user, db=test_db)

        # Mark as expired in database
        token_hash = TokenService.hash_token(token)
        result = await test_db.execute(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        )
        db_token = result.scalar_one()
        db_token.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        await test_db.commit()

        # Remove from Redis to force PostgreSQL lookup
        redis_key = f"password_reset:{token}"
        mock_redis.pop(redis_key, None)

        # Verify token (should reject expired)
        verified_user = await token_service.verify_password_reset_token(token, test_db)

        assert verified_user is None

    @pytest.mark.asyncio
    async def test_mark_password_reset_token_used(self, test_db, test_user, mock_redis):
        """Test marking token as used"""
        # Create token
        token = await token_service.create_password_reset_token(user=test_user, db=test_db)

        # Mark as used
        result = await token_service.mark_password_reset_token_used(token, test_db)

        assert result is True

        # Should be removed from Redis
        redis_key = f"password_reset:{token}"
        assert mock_redis.get(redis_key, None) is None

        # Should be marked as used in PostgreSQL
        token_hash = TokenService.hash_token(token)
        db_result = await test_db.execute(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        )
        db_token = db_result.scalar_one()

        assert db_token.used is True
        assert db_token.used_at is not None

    @pytest.mark.asyncio
    async def test_used_token_cannot_be_verified(self, test_db, test_user, mock_redis):
        """Test that used tokens cannot be verified again"""
        # Create and use token
        token = await token_service.create_password_reset_token(user=test_user, db=test_db)
        await token_service.mark_password_reset_token_used(token, test_db)

        # Try to verify used token
        verified_user = await token_service.verify_password_reset_token(token, test_db)

        assert verified_user is None


@pytest.mark.unit
@pytest.mark.requires_db
@pytest.mark.requires_redis
class TestEmailVerificationToken:
    """Test email verification token functionality"""

    @pytest.mark.asyncio
    async def test_create_email_verification_token(self, test_db, test_user, mock_redis):
        """Test creating email verification token"""
        token = await token_service.create_email_verification_token(
            user=test_user,
            db=test_db,
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
        )

        # Token should be generated
        assert token is not None
        assert len(token) == 64

        # Should be stored in Redis with 7-day TTL
        redis_key = f"email_verify:{token}"
        redis_value = mock_redis[redis_key]
        assert redis_value == str(test_user.id)

        # Should be stored in PostgreSQL (hashed)
        token_hash = TokenService.hash_token(token)
        result = await test_db.execute(
            select(EmailVerificationToken).where(EmailVerificationToken.token_hash == token_hash)
        )
        db_token = result.scalar_one_or_none()

        assert db_token is not None
        assert db_token.user_id == test_user.id
        assert db_token.token_hash == token_hash
        assert db_token.ip_address == "192.168.1.1"
        assert db_token.user_agent == "Mozilla/5.0"

        # Expiry should be ~7 days from now
        expected_expiry = datetime.now(timezone.utc) + timedelta(days=7)
        assert db_token.expires_at > datetime.now(timezone.utc)
        assert db_token.expires_at < expected_expiry + timedelta(hours=1)

    @pytest.mark.asyncio
    async def test_verify_email_verification_token(self, test_db, test_user, mock_redis):
        """Test verifying email token"""
        # Create token
        token = await token_service.create_email_verification_token(user=test_user, db=test_db)

        # Verify token
        verified_user = await token_service.verify_email_verification_token(token, test_db)

        assert verified_user is not None
        assert verified_user.id == test_user.id

    @pytest.mark.asyncio
    async def test_mark_email_verification_token_used(self, test_db, test_user, mock_redis):
        """Test marking email verification token as used"""
        # Create token
        token = await token_service.create_email_verification_token(user=test_user, db=test_db)

        # Mark as used
        result = await token_service.mark_email_verification_token_used(token, test_db)

        assert result is True

        # Should be removed from Redis
        redis_key = f"email_verify:{token}"
        assert mock_redis.get(redis_key, None) is None

        # Should be marked as used in database
        token_hash = TokenService.hash_token(token)
        db_result = await test_db.execute(
            select(EmailVerificationToken).where(EmailVerificationToken.token_hash == token_hash)
        )
        db_token = db_result.scalar_one()

        assert db_token.used is True
        assert db_token.used_at is not None
