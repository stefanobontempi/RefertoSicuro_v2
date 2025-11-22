"""
Authentication Pydantic Schemas
"""

import re
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, validator


class UserRegister(BaseModel):
    """Schema for user registration"""

    email: EmailStr = Field(..., description="User email address")
    password: str = Field(
        ..., min_length=12, max_length=128, description="User password (min 12 chars)"
    )
    full_name: str = Field(..., min_length=2, max_length=255, description="User full name")
    phone_number: Optional[str] = Field(None, max_length=50, description="Phone number")

    @validator("password")
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 12:
            raise ValueError("Password must be at least 12 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "email": "medico@example.com",
                "password": "SecureP@ss123",
                "full_name": "Dr. Mario Rossi",
                "phone_number": "+39 333 1234567",
            }
        }


class UserLogin(BaseModel):
    """Schema for user login"""

    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., description="User password")
    two_factor_code: Optional[str] = Field(
        None, min_length=6, max_length=6, description="2FA code if enabled"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "email": "medico@example.com",
                "password": "SecureP@ss123",
                "two_factor_code": "123456",
            }
        }


class TokenResponse(BaseModel):
    """Schema for token response"""

    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Access token expiration time in seconds")

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJ...",
                "refresh_token": "eyJ...",
                "token_type": "bearer",
                "expires_in": 14400,
            }
        }


class EmailVerification(BaseModel):
    """Schema for email verification"""

    token: str = Field(..., min_length=32, description="Email verification token")

    class Config:
        json_schema_extra = {"example": {"token": "verification_token_abc123"}}


class PasswordResetRequest(BaseModel):
    """Schema for password reset request"""

    email: EmailStr = Field(..., description="User email")

    class Config:
        json_schema_extra = {"example": {"email": "medico@example.com"}}


class PasswordReset(BaseModel):
    """Schema for password reset with token"""

    token: str = Field(..., min_length=32, description="Password reset token")
    new_password: str = Field(..., min_length=12, max_length=128, description="New password")

    @validator("new_password")
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 12:
            raise ValueError("Password must be at least 12 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    class Config:
        json_schema_extra = {
            "example": {"token": "reset_token_abc123", "new_password": "NewSecureP@ss123"}
        }


class MFAEnable(BaseModel):
    """Schema for enabling MFA"""

    pass


class MFAVerify(BaseModel):
    """Schema for MFA verification"""

    code: str = Field(..., min_length=6, max_length=6, description="TOTP code")

    class Config:
        json_schema_extra = {"example": {"code": "123456"}}


class MessageResponse(BaseModel):
    """Schema for simple message responses"""

    success: bool = Field(default=True, description="Operation success status")
    message: str = Field(..., description="Response message")

    class Config:
        json_schema_extra = {
            "example": {"success": True, "message": "Operation completed successfully"}
        }
