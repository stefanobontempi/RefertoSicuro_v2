"""
Schemas Package
===============
Pydantic schemas for request/response validation
"""

from app.schemas.email import EmailRequest, EmailResponse, SendEmailRequest, SendEmailResponse

__all__ = [
    "EmailRequest",
    "EmailResponse",
    "SendEmailRequest",
    "SendEmailResponse",
]
