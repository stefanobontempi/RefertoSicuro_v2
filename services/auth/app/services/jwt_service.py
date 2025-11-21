"""
JWT Service with Refresh Tokens
===============================
Secure JWT implementation with refresh tokens and CSRF protection
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple

from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.user import User, Session
from app.core.redis import redis_client
import logging

logger = logging.getLogger(__name__)


class JWTService:
    """Service for managing JWT tokens with refresh capability."""

    def __init__(self):
        self.algorithm = settings.JWT_ALGORITHM
        self.access_token_expire = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        self.refresh_token_expire = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    async def create_tokens(
        self,
        user: User,
        db: AsyncSession,
        ip_address: str,
        user_agent: Optional[str] = None,
        device_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create access and refresh tokens for a user.

        Args:
            user: User object
            db: Database session
            ip_address: Client IP address
            user_agent: Client user agent
            device_id: Device identifier

        Returns:
            Dictionary with access_token, refresh_token, and expiry info
        """
        # Generate unique JTIs (JWT IDs)
        access_jti = str(uuid.uuid4())
        refresh_jti = str(uuid.uuid4())

        # Calculate expiry times
        now = datetime.now(timezone.utc)
        access_expires = now + self.access_token_expire
        refresh_expires = now + self.refresh_token_expire

        # Create access token payload
        access_payload = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role,
            "jti": access_jti,
            "exp": access_expires,
            "iat": now,
            "type": "access",
        }

        # Create refresh token payload
        refresh_payload = {
            "sub": str(user.id),
            "jti": refresh_jti,
            "exp": refresh_expires,
            "iat": now,
            "type": "refresh",
        }

        # Encode tokens
        access_token = jwt.encode(
            access_payload,
            settings.JWT_SECRET,
            algorithm=self.algorithm
        )
        refresh_token = jwt.encode(
            refresh_payload,
            settings.JWT_SECRET,
            algorithm=self.algorithm
        )

        # Store session in database
        session = Session(
            user_id=user.id,
            access_token_jti=access_jti,
            refresh_token_jti=refresh_jti,
            access_expires_at=access_expires,
            refresh_expires_at=refresh_expires,
            ip_address=ip_address,
            user_agent=user_agent,
            device_id=device_id,
            device_name=self._get_device_name(user_agent),
        )
        db.add(session)
        await db.commit()

        # Store in Redis for quick validation (with expiry)
        await redis_client.setex(
            f"session:access:{access_jti}",
            int(self.access_token_expire.total_seconds()),
            str(user.id)
        )
        await redis_client.setex(
            f"session:refresh:{refresh_jti}",
            int(self.refresh_token_expire.total_seconds()),
            str(user.id)
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": int(self.access_token_expire.total_seconds()),
            "refresh_expires_in": int(self.refresh_token_expire.total_seconds()),
        }

    async def refresh_tokens(
        self,
        refresh_token: str,
        db: AsyncSession,
        ip_address: str,
        user_agent: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Refresh access token using refresh token.

        Args:
            refresh_token: Refresh token
            db: Database session
            ip_address: Client IP address
            user_agent: Client user agent

        Returns:
            New token set or None if invalid
        """
        try:
            # Decode refresh token
            payload = jwt.decode(
                refresh_token,
                settings.JWT_SECRET,
                algorithms=[self.algorithm]
            )

            # Validate token type
            if payload.get("type") != "refresh":
                logger.warning("Invalid token type for refresh")
                return None

            refresh_jti = payload.get("jti")
            user_id = payload.get("sub")

            # Check if refresh token is in Redis (not revoked)
            redis_key = f"session:refresh:{refresh_jti}"
            if not await redis_client.exists(redis_key):
                logger.warning(f"Refresh token not found or revoked: {refresh_jti}")
                return None

            # Get session from database
            result = await db.execute(
                select(Session).where(
                    Session.refresh_token_jti == refresh_jti,
                    Session.is_active == True
                )
            )
            session = result.scalar_one_or_none()

            if not session:
                logger.warning(f"Session not found for refresh token: {refresh_jti}")
                return None

            # Get user
            result = await db.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()

            if not user or not user.is_active:
                logger.warning(f"User not found or inactive: {user_id}")
                return None

            # Revoke old tokens
            await self.revoke_session(session.id, db, reason="token_refresh")

            # Create new tokens
            return await self.create_tokens(user, db, ip_address, user_agent)

        except JWTError as e:
            logger.error(f"JWT refresh error: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during token refresh: {e}")
            return None

    async def validate_access_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate access token and return payload.

        Args:
            token: JWT access token

        Returns:
            Token payload or None if invalid
        """
        try:
            # Decode token
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=[self.algorithm]
            )

            # Validate token type
            if payload.get("type") != "access":
                return None

            # Check if token is in Redis (not revoked)
            jti = payload.get("jti")
            redis_key = f"session:access:{jti}"
            if not await redis_client.exists(redis_key):
                logger.warning(f"Access token not found or revoked: {jti}")
                return None

            return payload

        except JWTError as e:
            logger.debug(f"JWT validation error: {e}")
            return None

    async def revoke_session(
        self,
        session_id: uuid.UUID,
        db: AsyncSession,
        reason: str = "user_logout"
    ) -> bool:
        """
        Revoke a session and its tokens.

        Args:
            session_id: Session ID to revoke
            db: Database session
            reason: Revocation reason

        Returns:
            Success status
        """
        try:
            # Get session
            result = await db.execute(
                select(Session).where(Session.id == session_id)
            )
            session = result.scalar_one_or_none()

            if not session:
                return False

            # Update database
            session.is_active = False
            session.revoked_at = datetime.now(timezone.utc)
            session.revoked_reason = reason
            await db.commit()

            # Remove from Redis
            await redis_client.delete(f"session:access:{session.access_token_jti}")
            await redis_client.delete(f"session:refresh:{session.refresh_token_jti}")

            # Add to blacklist (for extra security)
            blacklist_ttl = int(self.refresh_token_expire.total_seconds())
            await redis_client.setex(
                f"blacklist:access:{session.access_token_jti}",
                blacklist_ttl,
                "revoked"
            )
            await redis_client.setex(
                f"blacklist:refresh:{session.refresh_token_jti}",
                blacklist_ttl,
                "revoked"
            )

            return True

        except Exception as e:
            logger.error(f"Error revoking session: {e}")
            return False

    async def revoke_all_user_sessions(
        self,
        user_id: uuid.UUID,
        db: AsyncSession,
        reason: str = "security"
    ) -> int:
        """
        Revoke all sessions for a user.

        Args:
            user_id: User ID
            db: Database session
            reason: Revocation reason

        Returns:
            Number of sessions revoked
        """
        try:
            # Get all active sessions
            result = await db.execute(
                select(Session).where(
                    Session.user_id == user_id,
                    Session.is_active == True
                )
            )
            sessions = result.scalars().all()

            count = 0
            for session in sessions:
                if await self.revoke_session(session.id, db, reason):
                    count += 1

            return count

        except Exception as e:
            logger.error(f"Error revoking user sessions: {e}")
            return 0

    async def generate_csrf_token(self, user_id: str) -> str:
        """
        Generate CSRF token for a user.

        Args:
            user_id: User ID

        Returns:
            CSRF token
        """
        csrf_payload = {
            "sub": user_id,
            "jti": str(uuid.uuid4()),
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "type": "csrf",
        }
        return jwt.encode(
            csrf_payload,
            settings.CSRF_SECRET,
            algorithm=self.algorithm
        )

    async def validate_csrf_token(self, token: str, user_id: str) -> bool:
        """
        Validate CSRF token.

        Args:
            token: CSRF token
            user_id: User ID to validate against

        Returns:
            Validation status
        """
        try:
            payload = jwt.decode(
                token,
                settings.CSRF_SECRET,
                algorithms=[self.algorithm]
            )
            return (
                payload.get("type") == "csrf" and
                payload.get("sub") == user_id
            )
        except JWTError:
            return False

    def _get_device_name(self, user_agent: Optional[str]) -> Optional[str]:
        """
        Extract device name from user agent.

        Args:
            user_agent: User agent string

        Returns:
            Friendly device name
        """
        if not user_agent:
            return None

        # Simple parsing - in production use a proper library
        if "Chrome" in user_agent:
            if "Mobile" in user_agent:
                return "Chrome Mobile"
            return "Chrome Desktop"
        elif "Safari" in user_agent:
            if "Mobile" in user_agent:
                return "Safari Mobile"
            return "Safari Desktop"
        elif "Firefox" in user_agent:
            return "Firefox"
        else:
            return "Unknown Device"


# Create service instance
jwt_service = JWTService()