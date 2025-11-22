"""
Notification Models
==================
Database models for email, SMS, and push notifications
"""

import uuid

from app.core.database import Base
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class NotificationTemplate(Base):
    """
    Email/SMS/Push notification templates with Jinja2 variables.

    Templates support multiple locales and can be versioned for A/B testing.
    """

    __tablename__ = "notification_templates"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Template Identification
    name = Column(String(100), unique=True, nullable=False, index=True)
    type = Column(String(20), nullable=False, index=True)  # email, sms, push
    description = Column(Text)

    # Email-specific fields
    subject = Column(String(255))  # For email only
    body_html = Column(Text)  # HTML version (email)
    body_text = Column(Text, nullable=False)  # Plain text version (email/sms/push)

    # Template Configuration
    variables = Column(JSONB, default=list)  # Required variables: ["user_name", "link"]
    locale = Column(String(5), default="it")  # it, en, etc.
    version = Column(Integer, default=1)  # For A/B testing
    is_active = Column(Boolean, default=True, index=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True))  # Admin user ID

    # Indexes
    __table_args__ = (
        Index("ix_notification_templates_type_active", "type", "is_active"),
        Index("ix_notification_templates_name_locale", "name", "locale"),
        CheckConstraint("type IN ('email', 'sms', 'push')", name="valid_type"),
    )

    # Relationships
    notifications = relationship(
        "NotificationQueue", back_populates="template", cascade="all, delete-orphan"
    )


class NotificationQueue(Base):
    """
    Queue for pending/sent/failed notifications.

    Supports retry logic with exponential backoff and delivery tracking.
    """

    __tablename__ = "notification_queue"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Notification Type & Recipient
    type = Column(String(20), nullable=False, index=True)  # email, sms, push
    recipient = Column(String(255), nullable=False, index=True)
    recipient_name = Column(String(255))  # Optional display name

    # Template Reference
    template_id = Column(
        UUID(as_uuid=True),
        ForeignKey("notification_templates.id", ondelete="SET NULL"),
        nullable=True,
    )
    template_name = Column(String(100))  # Cached for audit (in case template deleted)

    # Content (rendered or raw)
    subject = Column(String(255))  # Rendered subject
    body_html = Column(Text)  # Rendered HTML body
    body_text = Column(Text)  # Rendered plain text body
    variables = Column(JSONB, default=dict)  # Variables used for rendering

    # Status & Delivery
    status = Column(
        String(20), default="pending", nullable=False, index=True
    )  # pending, sent, failed, retry
    priority = Column(Integer, default=5)  # 1 (high) to 10 (low)
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    error_message = Column(Text)
    smtp_response = Column(Text)  # Full SMTP response (for debugging)

    # Correlation (for tracing)
    correlation_id = Column(UUID(as_uuid=True), index=True)  # Links to event
    event_type = Column(String(100), index=True)  # e.g., "user.registered"
    user_id = Column(UUID(as_uuid=True), index=True)  # User who triggered the notification

    # Scheduling
    scheduled_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    sent_at = Column(DateTime(timezone=True))

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Indexes
    __table_args__ = (
        Index("ix_notification_queue_status_scheduled", "status", "scheduled_at"),
        Index("ix_notification_queue_type_status", "type", "status"),
        Index("ix_notification_queue_event_type", "event_type"),
        Index("ix_notification_queue_correlation_id", "correlation_id"),
        CheckConstraint("type IN ('email', 'sms', 'push')", name="valid_type"),
        CheckConstraint("status IN ('pending', 'sent', 'failed', 'retry')", name="valid_status"),
        CheckConstraint("priority >= 1 AND priority <= 10", name="valid_priority"),
    )

    # Relationships
    template = relationship("NotificationTemplate", back_populates="notifications")
    delivery_logs = relationship(
        "DeliveryLog", back_populates="notification", cascade="all, delete-orphan"
    )


class DeliveryLog(Base):
    """
    Immutable audit log for all notification delivery attempts.

    Critical for GDPR compliance and debugging. Never delete.
    """

    __tablename__ = "delivery_log"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Reference to Notification
    notification_id = Column(
        UUID(as_uuid=True),
        ForeignKey("notification_queue.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Event Tracking
    event_type = Column(String(100), index=True)  # e.g., "user.registered"
    correlation_id = Column(UUID(as_uuid=True), index=True)

    # Delivery Details
    recipient = Column(String(255), nullable=False, index=True)
    template_name = Column(String(100))
    notification_type = Column(String(20))  # email, sms, push
    status = Column(String(20), nullable=False)  # sent, failed, bounced
    smtp_response = Column(Text)  # Full SMTP response
    error_message = Column(Text)  # Error details if failed

    # Compliance & Audit
    user_id = Column(UUID(as_uuid=True), index=True)
    delivered_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    retry_attempt = Column(Integer, default=0)

    # Additional Data (for analytics)
    extra_data = Column(JSONB, default=dict)  # Additional tracking data

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Indexes
    __table_args__ = (
        Index("ix_delivery_log_delivered_at", "delivered_at"),
        Index("ix_delivery_log_recipient_status", "recipient", "status"),
        Index("ix_delivery_log_event_type", "event_type"),
        Index("ix_delivery_log_correlation_id", "correlation_id"),
        CheckConstraint(
            "notification_type IN ('email', 'sms', 'push')", name="valid_notification_type"
        ),
        CheckConstraint("status IN ('sent', 'failed', 'bounced')", name="valid_status"),
    )

    # Relationships
    notification = relationship("NotificationQueue", back_populates="delivery_logs")


class UnsubscribeList(Base):
    """
    GDPR-compliant unsubscribe list.

    Users can opt out of specific notification types or all notifications.
    """

    __tablename__ = "unsubscribe_list"

    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Unsubscribe Details
    email = Column(String(255), unique=True, nullable=False, index=True)
    notification_type = Column(String(20), default="all")  # all, marketing, transactional
    reason = Column(Text)  # User-provided reason
    unsubscribe_token = Column(String(255), unique=True)  # For one-click unsubscribe

    # User Reference (if available)
    user_id = Column(UUID(as_uuid=True), index=True)

    # Metadata
    unsubscribed_at = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String(45))  # IPv4/IPv6
    user_agent = Column(Text)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Indexes
    __table_args__ = (
        Index("ix_unsubscribe_list_email", "email"),
        Index("ix_unsubscribe_list_user_id", "user_id"),
        CheckConstraint(
            "notification_type IN ('all', 'marketing', 'transactional')",
            name="valid_notification_type",
        ),
    )
