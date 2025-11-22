"""
Email Schemas
=============
Pydantic models for email request/response validation
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, validator


class EmailRequest(BaseModel):
    """Base email request model."""

    recipient: EmailStr = Field(..., description="Recipient email address")
    recipient_name: Optional[str] = Field(None, description="Recipient display name")
    subject: str = Field(..., min_length=1, max_length=255, description="Email subject")
    body_html: str = Field(..., min_length=1, description="HTML email body")
    body_text: str = Field(..., min_length=1, description="Plain text email body")

    @validator("subject")
    def sanitize_subject(cls, v):
        """Sanitize subject line."""
        # Remove line breaks
        v = v.replace("\n", " ").replace("\r", " ")
        # Remove control characters
        v = "".join(char for char in v if ord(char) >= 32 or char == "\t")
        return v.strip()


class SendEmailRequest(BaseModel):
    """Request to send an email from a template."""

    recipient: EmailStr = Field(..., description="Recipient email address")
    template_name: str = Field(..., description="Template name (without extension)")
    variables: Dict[str, Any] = Field(default_factory=dict, description="Template variables")
    priority: int = Field(default=5, ge=1, le=10, description="Email priority (1=high, 10=low)")
    scheduled_at: Optional[datetime] = Field(None, description="Schedule email for later")
    correlation_id: Optional[UUID] = Field(None, description="Correlation ID for tracing")
    event_type: Optional[str] = Field(None, description="Event type that triggered this email")
    user_id: Optional[UUID] = Field(None, description="User ID who triggered this email")


class EmailResponse(BaseModel):
    """Email delivery response."""

    id: UUID = Field(..., description="Notification ID")
    recipient: str = Field(..., description="Recipient email address")
    subject: str = Field(..., description="Email subject")
    status: str = Field(..., description="Delivery status (pending, sent, failed)")
    created_at: datetime = Field(..., description="Creation timestamp")
    sent_at: Optional[datetime] = Field(None, description="Delivery timestamp")
    error_message: Optional[str] = Field(None, description="Error message if failed")

    class Config:
        """Pydantic config."""

        from_attributes = True


class SendEmailResponse(BaseModel):
    """Response for send email request."""

    success: bool = Field(..., description="Whether email was queued successfully")
    notification_id: UUID = Field(..., description="Notification ID")
    message: str = Field(..., description="Status message")
    queued_at: datetime = Field(..., description="Queue timestamp")
    scheduled_at: Optional[datetime] = Field(None, description="Scheduled send time")


class EmailBatchRequest(BaseModel):
    """Request to send multiple emails."""

    emails: List[SendEmailRequest] = Field(..., min_items=1, max_items=100)


class EmailBatchResponse(BaseModel):
    """Response for batch email request."""

    success_count: int = Field(..., description="Number of emails queued successfully")
    failure_count: int = Field(..., description="Number of emails that failed to queue")
    notification_ids: List[UUID] = Field(..., description="List of notification IDs")
    errors: List[Dict[str, str]] = Field(default_factory=list, description="List of errors if any")
