"""
Token Models for Password Reset and Email Verification
=======================================================
Hybrid approach: Redis for fast lookups, PostgreSQL for audit trail
"""

import uuid
from datetime import datetime, timezone

from app.core.database import Base
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class PasswordResetToken(Base):
    """
    Password reset token model with hybrid storage.

    - Plaintext token stored in Redis for fast lookup (with TTL)
    - Token hash stored in PostgreSQL for audit trail
    """

    __tablename__ = "password_reset_tokens"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign Key
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Token (hashed for security - plaintext stored in Redis)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)

    # Status
    used = Column(Boolean, default=False)
    used_at = Column(DateTime(timezone=True))

    # Expiry
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # Audit metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String(45))  # IPv4 or IPv6
    user_agent = Column(Text)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    # Indexes
    __table_args__ = (
        Index("idx_password_reset_user_id", "user_id"),
        Index("idx_password_reset_token_hash", "token_hash"),
        Index("idx_password_reset_expires_at", "expires_at"),
    )

    def __repr__(self):
        return f"<PasswordResetToken(id={self.id}, user_id={self.user_id}, used={self.used})>"

    def verify_token(self, plaintext_token: str) -> bool:
        """Verify plaintext token against stored hash."""
        from app.core.security import verify_password

        return verify_password(plaintext_token, self.token_hash)

    @property
    def is_valid(self) -> bool:
        """Check if token is still valid"""
        return not self.used and datetime.now(timezone.utc) < self.expires_at

    @property
    def is_expired(self) -> bool:
        """Check if token is expired"""
        return datetime.now(timezone.utc) >= self.expires_at


class EmailVerificationToken(Base):
    """
    Email verification token model with hybrid storage.

    - Plaintext token stored in Redis for fast lookup (with TTL)
    - Token hash stored in PostgreSQL for audit trail
    """

    __tablename__ = "email_verification_tokens"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign Key
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Token (hashed for security - plaintext stored in Redis)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)

    # Status
    used = Column(Boolean, default=False)
    used_at = Column(DateTime(timezone=True))

    # Expiry
    expires_at = Column(DateTime(timezone=True), nullable=False)

    # Audit metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String(45))  # IPv4 or IPv6
    user_agent = Column(Text)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    # Indexes
    __table_args__ = (
        Index("idx_email_verification_user_id", "user_id"),
        Index("idx_email_verification_token_hash", "token_hash"),
        Index("idx_email_verification_expires_at", "expires_at"),
    )

    def __repr__(self):
        return f"<EmailVerificationToken(id={self.id}, user_id={self.user_id}, used={self.used})>"

    def verify_token(self, plaintext_token: str) -> bool:
        """Verify plaintext token against stored hash."""
        from app.core.security import verify_password

        return verify_password(plaintext_token, self.token_hash)

    @property
    def is_valid(self) -> bool:
        """Check if token is still valid"""
        return not self.used and datetime.now(timezone.utc) < self.expires_at

    @property
    def is_expired(self) -> bool:
        """Check if token is expired"""
        return datetime.now(timezone.utc) >= self.expires_at
