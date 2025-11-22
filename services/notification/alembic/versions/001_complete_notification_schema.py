"""complete_notification_schema

Revision ID: 001
Revises:
Create Date: 2025-11-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create notification_templates table
    op.create_table(
        "notification_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("subject", sa.String(255)),
        sa.Column("body_html", sa.Text()),
        sa.Column("body_text", sa.Text(), nullable=False),
        sa.Column("variables", postgresql.JSONB(), server_default="[]"),
        sa.Column("locale", sa.String(5), server_default="it"),
        sa.Column("version", sa.Integer(), server_default="1"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("created_by", postgresql.UUID(as_uuid=True)),
        sa.CheckConstraint("type IN ('email', 'sms', 'push')", name="valid_type"),
    )

    # Indexes for notification_templates
    op.create_index("ix_notification_templates_name", "notification_templates", ["name"])
    op.create_index("ix_notification_templates_type", "notification_templates", ["type"])
    op.create_index("ix_notification_templates_is_active", "notification_templates", ["is_active"])
    op.create_index(
        "ix_notification_templates_type_active", "notification_templates", ["type", "is_active"]
    )
    op.create_index(
        "ix_notification_templates_name_locale", "notification_templates", ["name", "locale"]
    )

    # Create notification_queue table
    op.create_table(
        "notification_queue",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("recipient", sa.String(255), nullable=False),
        sa.Column("recipient_name", sa.String(255)),
        sa.Column("template_id", postgresql.UUID(as_uuid=True)),
        sa.Column("template_name", sa.String(100)),
        sa.Column("subject", sa.String(255)),
        sa.Column("body_html", sa.Text()),
        sa.Column("body_text", sa.Text()),
        sa.Column("variables", postgresql.JSONB(), server_default="{}"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("priority", sa.Integer(), server_default="5"),
        sa.Column("attempts", sa.Integer(), server_default="0"),
        sa.Column("max_attempts", sa.Integer(), server_default="3"),
        sa.Column("error_message", sa.Text()),
        sa.Column("smtp_response", sa.Text()),
        sa.Column("correlation_id", postgresql.UUID(as_uuid=True)),
        sa.Column("event_type", sa.String(100)),
        sa.Column("user_id", postgresql.UUID(as_uuid=True)),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("sent_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["template_id"], ["notification_templates.id"], ondelete="SET NULL"
        ),
        sa.CheckConstraint("type IN ('email', 'sms', 'push')", name="valid_type"),
        sa.CheckConstraint("status IN ('pending', 'sent', 'failed', 'retry')", name="valid_status"),
        sa.CheckConstraint("priority >= 1 AND priority <= 10", name="valid_priority"),
    )

    # Indexes for notification_queue
    op.create_index("ix_notification_queue_type", "notification_queue", ["type"])
    op.create_index("ix_notification_queue_recipient", "notification_queue", ["recipient"])
    op.create_index("ix_notification_queue_status", "notification_queue", ["status"])
    op.create_index(
        "ix_notification_queue_correlation_id", "notification_queue", ["correlation_id"]
    )
    op.create_index("ix_notification_queue_event_type", "notification_queue", ["event_type"])
    op.create_index("ix_notification_queue_user_id", "notification_queue", ["user_id"])
    op.create_index("ix_notification_queue_scheduled_at", "notification_queue", ["scheduled_at"])
    op.create_index(
        "ix_notification_queue_status_scheduled", "notification_queue", ["status", "scheduled_at"]
    )
    op.create_index("ix_notification_queue_type_status", "notification_queue", ["type", "status"])

    # Create delivery_log table
    op.create_table(
        "delivery_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("notification_id", postgresql.UUID(as_uuid=True)),
        sa.Column("event_type", sa.String(100)),
        sa.Column("correlation_id", postgresql.UUID(as_uuid=True)),
        sa.Column("recipient", sa.String(255), nullable=False),
        sa.Column("template_name", sa.String(100)),
        sa.Column("notification_type", sa.String(20)),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("smtp_response", sa.Text()),
        sa.Column("error_message", sa.Text()),
        sa.Column("user_id", postgresql.UUID(as_uuid=True)),
        sa.Column("delivered_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("retry_attempt", sa.Integer(), server_default="0"),
        sa.Column("extra_data", postgresql.JSONB(), server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["notification_id"], ["notification_queue.id"], ondelete="SET NULL"
        ),
        sa.CheckConstraint(
            "notification_type IN ('email', 'sms', 'push')", name="valid_notification_type"
        ),
        sa.CheckConstraint("status IN ('sent', 'failed', 'bounced')", name="valid_status"),
    )

    # Indexes for delivery_log
    op.create_index("ix_delivery_log_notification_id", "delivery_log", ["notification_id"])
    op.create_index("ix_delivery_log_recipient", "delivery_log", ["recipient"])
    op.create_index("ix_delivery_log_event_type", "delivery_log", ["event_type"])
    op.create_index("ix_delivery_log_correlation_id", "delivery_log", ["correlation_id"])
    op.create_index("ix_delivery_log_user_id", "delivery_log", ["user_id"])
    op.create_index("ix_delivery_log_delivered_at", "delivery_log", ["delivered_at"])
    op.create_index("ix_delivery_log_recipient_status", "delivery_log", ["recipient", "status"])

    # Create unsubscribe_list table
    op.create_table(
        "unsubscribe_list",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("notification_type", sa.String(20), server_default="all"),
        sa.Column("reason", sa.Text()),
        sa.Column("unsubscribe_token", sa.String(255), unique=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True)),
        sa.Column("unsubscribed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("user_agent", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "notification_type IN ('all', 'marketing', 'transactional')",
            name="valid_notification_type",
        ),
    )

    # Indexes for unsubscribe_list
    op.create_index("ix_unsubscribe_list_email", "unsubscribe_list", ["email"])
    op.create_index("ix_unsubscribe_list_user_id", "unsubscribe_list", ["user_id"])


def downgrade() -> None:
    op.drop_table("unsubscribe_list")
    op.drop_table("delivery_log")
    op.drop_table("notification_queue")
    op.drop_table("notification_templates")
