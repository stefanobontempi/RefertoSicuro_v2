"""
Unit Tests for JWT Service
==========================
Test JWT creation, validation, refresh, and revocation
"""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from freezegun import freeze_time
from jose import jwt

from app.services.jwt_service import JWTService
from app.models.user import User, Session


@pytest.fixture
def jwt_service():
    """Create JWT service instance."""
    return JWTService()


@pytest.fixture
def mock_user():
    """Create mock user."""
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "test@example.com"
    user.role = "customer"
    user.is_active = True
    return user


@pytest.fixture
def mock_db():
    """Create mock database session."""
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.execute = AsyncMock()
    return db


@pytest.fixture
def mock_redis():
    """Create mock Redis client."""
    with patch("app.services.jwt_service.redis_client") as mock:
        mock.setex = AsyncMock()
        mock.exists = AsyncMock(return_value=True)
        mock.delete = AsyncMock()
        yield mock


@pytest.fixture
def mock_settings():
    """Mock settings."""
    with patch("app.services.jwt_service.settings") as mock:
        mock.JWT_SECRET = "test-secret-key"
        mock.CSRF_SECRET = "test-csrf-secret"
        mock.JWT_ALGORITHM = "HS256"
        mock.ACCESS_TOKEN_EXPIRE_MINUTES = 15
        mock.REFRESH_TOKEN_EXPIRE_DAYS = 7
        yield mock


class TestJWTService:
    """Test JWT service functionality."""

    @pytest.mark.asyncio
    async def test_create_tokens(self, jwt_service, mock_user, mock_db, mock_redis, mock_settings):
        """Test token creation."""
        # Arrange
        ip_address = "127.0.0.1"
        user_agent = "Mozilla/5.0 Chrome/91.0"
        device_id = "device-123"

        # Act
        result = await jwt_service.create_tokens(
            user=mock_user,
            db=mock_db,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id
        )

        # Assert
        assert "access_token" in result
        assert "refresh_token" in result
        assert result["token_type"] == "bearer"
        assert result["expires_in"] == 900  # 15 minutes
        assert result["refresh_expires_in"] == 604800  # 7 days

        # Verify database session was created
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

        # Verify Redis storage
        assert mock_redis.setex.call_count == 2

    @pytest.mark.asyncio
    async def test_validate_access_token_valid(self, jwt_service, mock_user, mock_redis, mock_settings):
        """Test validation of valid access token."""
        # Arrange
        jti = str(uuid.uuid4())
        payload = {
            "sub": str(mock_user.id),
            "email": mock_user.email,
            "role": mock_user.role,
            "jti": jti,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
            "type": "access"
        }
        token = jwt.encode(payload, "test-secret-key", algorithm="HS256")

        # Act
        result = await jwt_service.validate_access_token(token)

        # Assert
        assert result is not None
        assert result["sub"] == str(mock_user.id)
        assert result["email"] == mock_user.email
        assert result["type"] == "access"
        mock_redis.exists.assert_called_once_with(f"session:access:{jti}")

    @pytest.mark.asyncio
    async def test_validate_access_token_expired(self, jwt_service, mock_user, mock_redis, mock_settings):
        """Test validation of expired access token."""
        # Arrange
        with freeze_time("2024-01-01 12:00:00"):
            payload = {
                "sub": str(mock_user.id),
                "jti": str(uuid.uuid4()),
                "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
                "type": "access"
            }
            token = jwt.encode(payload, "test-secret-key", algorithm="HS256")

        # Act
        result = await jwt_service.validate_access_token(token)

        # Assert
        assert result is None

    @pytest.mark.asyncio
    async def test_validate_access_token_revoked(self, jwt_service, mock_user, mock_redis, mock_settings):
        """Test validation of revoked access token."""
        # Arrange
        mock_redis.exists.return_value = False
        payload = {
            "sub": str(mock_user.id),
            "jti": str(uuid.uuid4()),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
            "type": "access"
        }
        token = jwt.encode(payload, "test-secret-key", algorithm="HS256")

        # Act
        result = await jwt_service.validate_access_token(token)

        # Assert
        assert result is None

    @pytest.mark.asyncio
    async def test_refresh_tokens_valid(self, jwt_service, mock_user, mock_db, mock_redis, mock_settings):
        """Test token refresh with valid refresh token."""
        # Arrange
        refresh_jti = str(uuid.uuid4())
        session_id = uuid.uuid4()

        payload = {
            "sub": str(mock_user.id),
            "jti": refresh_jti,
            "exp": datetime.now(timezone.utc) + timedelta(days=7),
            "type": "refresh"
        }
        refresh_token = jwt.encode(payload, "test-secret-key", algorithm="HS256")

        # Mock session
        mock_session = MagicMock(spec=Session)
        mock_session.id = session_id
        mock_session.refresh_token_jti = refresh_jti
        mock_session.is_active = True

        # Mock database queries
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.side_effect = [mock_session, mock_user]
        mock_db.execute.return_value = mock_result

        # Act
        result = await jwt_service.refresh_tokens(
            refresh_token=refresh_token,
            db=mock_db,
            ip_address="127.0.0.1",
            user_agent="Chrome"
        )

        # Assert
        assert result is not None
        assert "access_token" in result
        assert "refresh_token" in result
        mock_redis.exists.assert_called_with(f"session:refresh:{refresh_jti}")

    @pytest.mark.asyncio
    async def test_revoke_session(self, jwt_service, mock_db, mock_redis, mock_settings):
        """Test session revocation."""
        # Arrange
        session_id = uuid.uuid4()
        access_jti = str(uuid.uuid4())
        refresh_jti = str(uuid.uuid4())

        mock_session = MagicMock(spec=Session)
        mock_session.id = session_id
        mock_session.access_token_jti = access_jti
        mock_session.refresh_token_jti = refresh_jti

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_session
        mock_db.execute.return_value = mock_result

        # Act
        result = await jwt_service.revoke_session(session_id, mock_db, "user_logout")

        # Assert
        assert result is True
        assert mock_session.is_active is False
        assert mock_session.revoked_at is not None
        assert mock_session.revoked_reason == "user_logout"
        mock_db.commit.assert_called_once()

        # Verify Redis operations
        assert mock_redis.delete.call_count == 2
        assert mock_redis.setex.call_count == 2  # Blacklist entries

    @pytest.mark.asyncio
    async def test_generate_and_validate_csrf_token(self, jwt_service, mock_user, mock_settings):
        """Test CSRF token generation and validation."""
        # Arrange
        user_id = str(mock_user.id)

        # Act
        csrf_token = await jwt_service.generate_csrf_token(user_id)
        is_valid = await jwt_service.validate_csrf_token(csrf_token, user_id)

        # Assert
        assert csrf_token is not None
        assert is_valid is True

        # Test invalid user_id
        is_invalid = await jwt_service.validate_csrf_token(csrf_token, "wrong-user-id")
        assert is_invalid is False

    @pytest.mark.asyncio
    async def test_revoke_all_user_sessions(self, jwt_service, mock_db, mock_redis, mock_settings):
        """Test revoking all user sessions."""
        # Arrange
        user_id = uuid.uuid4()
        sessions = [
            MagicMock(spec=Session, id=uuid.uuid4(), access_token_jti=str(uuid.uuid4()), refresh_token_jti=str(uuid.uuid4())),
            MagicMock(spec=Session, id=uuid.uuid4(), access_token_jti=str(uuid.uuid4()), refresh_token_jti=str(uuid.uuid4())),
        ]

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = sessions
        mock_db.execute.return_value = mock_result

        # Mock individual revocations
        with patch.object(jwt_service, "revoke_session", return_value=True) as mock_revoke:
            # Act
            count = await jwt_service.revoke_all_user_sessions(user_id, mock_db, "security")

            # Assert
            assert count == 2
            assert mock_revoke.call_count == 2

    def test_get_device_name(self, jwt_service):
        """Test device name extraction from user agent."""
        # Test cases
        test_cases = [
            ("Mozilla/5.0 Chrome/91.0", "Chrome Desktop"),
            ("Mozilla/5.0 Mobile Chrome/91.0", "Chrome Mobile"),
            ("Mozilla/5.0 Safari/605.1.15", "Safari Desktop"),
            ("Mozilla/5.0 Mobile Safari/605.1.15", "Safari Mobile"),
            ("Mozilla/5.0 Firefox/89.0", "Firefox"),
            ("Unknown Browser", "Unknown Device"),
            (None, None),
        ]

        for user_agent, expected in test_cases:
            result = jwt_service._get_device_name(user_agent)
            assert result == expected