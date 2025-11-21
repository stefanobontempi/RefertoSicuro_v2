"""
User Model
==========
Core user model with enhanced security features
"""

import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import (
    Column, String, Boolean, DateTime, Text, JSON,
    Integer, ForeignKey, Index, CheckConstraint, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, INET, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    """User model with comprehensive fields for medical compliance."""

    __tablename__ = "users"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Authentication
    email = Column(String(255), unique=True, nullable=False, index=True)
    email_normalized = Column(String(255), index=True)  # Computed in app
    email_verified = Column(Boolean, default=False)
    email_verified_at = Column(DateTime(timezone=True))
    password_hash = Column(String(255), nullable=False)

    # Two-Factor Authentication
    mfa_secret = Column(String(255))
    mfa_enabled = Column(Boolean, default=False)
    mfa_backup_codes = Column(JSONB)

    # Profile
    full_name = Column(String(255))
    display_name = Column(String(100))
    phone_number = Column(String(50))
    phone_verified = Column(Boolean, default=False)
    birth_date = Column(DateTime)
    tax_code = Column(String(20))  # Codice Fiscale

    # Professional (for medical users)
    professional_id = Column(String(50))  # Numero ordine medici
    professional_verified = Column(Boolean, default=False)
    professional_verified_at = Column(DateTime(timezone=True))
    specialties = Column(JSONB, default=list)  # List of specialty codes

    # Business
    company_name = Column(String(255))
    vat_number = Column(String(50))
    billing_email = Column(String(255))
    billing_address = Column(JSONB)

    # Account Status
    status = Column(String(20), default="active")  # active, suspended, deleted
    status_reason = Column(Text)
    role = Column(String(20), default="customer")  # customer, partner, admin

    # Security
    last_login_at = Column(DateTime(timezone=True))
    last_login_ip = Column(INET)
    failed_login_count = Column(Integer, default=0)
    locked_until = Column(DateTime(timezone=True))
    password_changed_at = Column(DateTime(timezone=True))

    # OAuth/SSO
    oauth_provider = Column(String(50))
    oauth_provider_id = Column(String(255))
    oauth_refresh_token = Column(Text)

    # Multi-device
    trusted_devices = Column(JSONB, default=list)

    # API & Rate Limiting
    api_rate_limit_override = Column(Integer)
    api_quota_override = Column(Integer)

    # Preferences
    notification_preferences = Column(JSONB, default=lambda: {
        "email": True,
        "sms": False,
        "push": False
    })
    ui_preferences = Column(JSONB, default=lambda: {
        "theme": "light",
        "language": "it"
    })
    preferred_language = Column(String(5), default="it")
    timezone = Column(String(50), default="Europe/Rome")

    # Organization (B2B)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"))

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))  # Soft delete

    # Relationships
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    consents = relationship("UserConsent", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    organization = relationship("Organization", back_populates="users")

    # Indexes
    __table_args__ = (
        Index("idx_users_email_normalized", "email_normalized"),
        Index("idx_users_status", "status"),
        Index("idx_users_role", "role"),
        Index("idx_users_created_at", "created_at"),
        Index("idx_users_organization", "organization_id"),
        Index("idx_users_oauth", "oauth_provider", "oauth_provider_id"),
        CheckConstraint("role IN ('customer', 'partner', 'admin')", name="chk_role"),
        CheckConstraint("status IN ('active', 'suspended', 'deleted')", name="chk_status"),
    )

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"

    @property
    def is_active(self) -> bool:
        """Check if user is active."""
        return self.status == "active" and self.deleted_at is None

    @property
    def is_verified(self) -> bool:
        """Check if user email is verified."""
        return self.email_verified

    @property
    def is_locked(self) -> bool:
        """Check if user account is locked."""
        if self.locked_until:
            return datetime.utcnow() < self.locked_until
        return False

    @property
    def requires_password_change(self) -> bool:
        """Check if password change is required."""
        if not self.password_changed_at:
            return True
        # Require password change every 90 days for high security
        days_since_change = (datetime.utcnow() - self.password_changed_at).days
        return days_since_change > 90

    def to_dict(self) -> dict:
        """Convert user to dictionary (excluding sensitive data)."""
        return {
            "id": str(self.id),
            "email": self.email,
            "full_name": self.full_name,
            "display_name": self.display_name,
            "role": self.role,
            "status": self.status,
            "email_verified": self.email_verified,
            "mfa_enabled": self.mfa_enabled,
            "professional_verified": self.professional_verified,
            "specialties": self.specialties or [],
            "company_name": self.company_name,
            "organization_id": str(self.organization_id) if self.organization_id else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Session(Base):
    """JWT Session management with refresh tokens."""

    __tablename__ = "sessions"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Token Management
    access_token_jti = Column(UUID(as_uuid=True), unique=True, nullable=False, index=True)
    refresh_token_jti = Column(UUID(as_uuid=True), unique=True, index=True)
    access_expires_at = Column(DateTime(timezone=True), nullable=False)
    refresh_expires_at = Column(DateTime(timezone=True))

    # Session Info
    ip_address = Column(INET, nullable=False)
    user_agent = Column(Text)
    device_id = Column(String(100))
    device_name = Column(String(100))

    # Status
    is_active = Column(Boolean, default=True)
    revoked_at = Column(DateTime(timezone=True))
    revoked_reason = Column(String(100))

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="sessions")

    # Indexes
    __table_args__ = (
        Index("idx_sessions_user_id", "user_id"),
        Index("idx_sessions_access_jti", "access_token_jti"),
        Index("idx_sessions_refresh_jti", "refresh_token_jti"),
        Index("idx_sessions_expires", "access_expires_at"),
        CheckConstraint("access_expires_at > created_at", name="chk_expiry"),
    )

    def __repr__(self):
        return f"<Session(id={self.id}, user_id={self.user_id}, active={self.is_active})>"