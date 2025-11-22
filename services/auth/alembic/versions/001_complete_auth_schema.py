"""Complete Auth schema with all tables

Revision ID: 001_complete_auth
Revises: 009e14cad2fa
Create Date: 2025-11-22 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_complete_auth"
down_revision: Union[str, Sequence[str], None] = "009e14cad2fa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create complete Auth Service schema."""

    # ============================================
    # TABLE: users
    # ============================================
    op.create_table(
        "users",
        # Primary Key
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        # Authentication
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("email_normalized", sa.String(255), index=True),
        sa.Column("email_verified", sa.Boolean(), default=False),
        sa.Column("email_verified_at", sa.DateTime(timezone=True)),
        sa.Column("password_hash", sa.String(255), nullable=False),
        # Two-Factor Authentication
        sa.Column("mfa_secret", sa.String(255)),
        sa.Column("mfa_enabled", sa.Boolean(), default=False),
        sa.Column("mfa_backup_codes", postgresql.JSONB()),
        # Profile
        sa.Column("full_name", sa.String(255)),
        sa.Column("display_name", sa.String(100)),
        sa.Column("phone_number", sa.String(50)),
        sa.Column("phone_verified", sa.Boolean(), default=False),
        sa.Column("birth_date", sa.Date()),
        sa.Column("tax_code", sa.String(20)),
        # Professional (for medical users)
        sa.Column("professional_id", sa.String(50)),
        sa.Column("professional_verified", sa.Boolean(), default=False),
        sa.Column("professional_verified_at", sa.DateTime(timezone=True)),
        sa.Column("specialties", postgresql.JSONB(), default=list),
        # Business
        sa.Column("company_name", sa.String(255)),
        sa.Column("vat_number", sa.String(50)),
        sa.Column("billing_email", sa.String(255)),
        sa.Column("billing_address", postgresql.JSONB()),
        # Account Status
        sa.Column("status", sa.String(20), default="active"),
        sa.Column("status_reason", sa.Text()),
        sa.Column("role", sa.String(20), default="customer"),
        # Security
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        sa.Column("last_login_ip", postgresql.INET()),
        sa.Column("failed_login_count", sa.Integer(), default=0),
        sa.Column("locked_until", sa.DateTime(timezone=True)),
        sa.Column("password_changed_at", sa.DateTime(timezone=True)),
        # OAuth/SSO
        sa.Column("oauth_provider", sa.String(50)),
        sa.Column("oauth_provider_id", sa.String(255)),
        sa.Column("oauth_refresh_token", sa.Text()),
        # Multi-device
        sa.Column("trusted_devices", postgresql.JSONB(), default=list),
        # API & Rate Limiting
        sa.Column("api_rate_limit_override", sa.Integer()),
        sa.Column("api_quota_override", sa.Integer()),
        # Preferences
        sa.Column(
            "notification_preferences",
            postgresql.JSONB(),
            default={"email": True, "sms": False, "push": False},
        ),
        sa.Column(
            "ui_preferences", postgresql.JSONB(), default={"theme": "light", "language": "it"}
        ),
        sa.Column("preferred_language", sa.String(5), default="it"),
        sa.Column("timezone", sa.String(50), default="Europe/Rome"),
        # Organization (B2B) - ForeignKey will be added in Phase 3
        sa.Column("organization_id", postgresql.UUID(as_uuid=True)),
        # Timestamps
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        # Constraints
        sa.CheckConstraint("role IN ('customer', 'partner', 'admin')", name="chk_users_role"),
        sa.CheckConstraint("status IN ('active', 'suspended', 'deleted')", name="chk_users_status"),
    )

    # Indexes for users table
    op.create_index("idx_users_email_normalized", "users", ["email_normalized"])
    op.create_index("idx_users_status", "users", ["status"])
    op.create_index("idx_users_role", "users", ["role"])
    op.create_index("idx_users_created_at", "users", ["created_at"])
    op.create_index("idx_users_organization", "users", ["organization_id"])
    op.create_index("idx_users_oauth", "users", ["oauth_provider", "oauth_provider_id"])

    # ============================================
    # TABLE: sessions
    # ============================================
    op.create_table(
        "sessions",
        # Primary Key
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # Token Management
        sa.Column("access_token_jti", postgresql.UUID(as_uuid=True), unique=True, nullable=False),
        sa.Column("refresh_token_jti", postgresql.UUID(as_uuid=True), unique=True),
        sa.Column("access_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("refresh_expires_at", sa.DateTime(timezone=True)),
        # Session Info
        sa.Column("ip_address", postgresql.INET(), nullable=False),
        sa.Column("user_agent", sa.Text()),
        sa.Column("device_id", sa.String(100)),
        sa.Column("device_name", sa.String(100)),
        # Status
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("revoked_reason", sa.String(100)),
        # Metadata
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        # Constraints
        sa.CheckConstraint("access_expires_at > created_at", name="chk_sessions_expiry"),
    )

    # Indexes for sessions table
    op.create_index("idx_sessions_user_id", "sessions", ["user_id"])
    op.create_index("idx_sessions_access_jti", "sessions", ["access_token_jti"])
    op.create_index("idx_sessions_refresh_jti", "sessions", ["refresh_token_jti"])
    op.create_index("idx_sessions_expires", "sessions", ["access_expires_at"])

    # ============================================
    # TABLE: password_reset_tokens
    # ============================================
    op.create_table(
        "password_reset_tokens",
        # Primary Key
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # Token (hashed for security)
        sa.Column("token_hash", sa.String(255), unique=True, nullable=False),
        # Status
        sa.Column("used", sa.Boolean(), default=False),
        sa.Column("used_at", sa.DateTime(timezone=True)),
        # Expiry
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        # Metadata (for audit)
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("user_agent", sa.Text()),
    )

    # Indexes for password_reset_tokens
    op.create_index("idx_password_reset_user_id", "password_reset_tokens", ["user_id"])
    op.create_index("idx_password_reset_token_hash", "password_reset_tokens", ["token_hash"])
    op.create_index("idx_password_reset_expires_at", "password_reset_tokens", ["expires_at"])

    # ============================================
    # TABLE: email_verification_tokens
    # ============================================
    op.create_table(
        "email_verification_tokens",
        # Primary Key
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # Token (hashed for security)
        sa.Column("token_hash", sa.String(255), unique=True, nullable=False),
        # Status
        sa.Column("used", sa.Boolean(), default=False),
        sa.Column("used_at", sa.DateTime(timezone=True)),
        # Expiry
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        # Metadata (for audit)
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("user_agent", sa.Text()),
    )

    # Indexes for email_verification_tokens
    op.create_index("idx_email_verification_user_id", "email_verification_tokens", ["user_id"])
    op.create_index(
        "idx_email_verification_token_hash", "email_verification_tokens", ["token_hash"]
    )
    op.create_index(
        "idx_email_verification_expires_at", "email_verification_tokens", ["expires_at"]
    )


def downgrade() -> None:
    """Drop all Auth Service tables."""
    op.drop_table("email_verification_tokens")
    op.drop_table("password_reset_tokens")
    op.drop_table("sessions")
    op.drop_table("users")
