"""
Pydantic schemas for Auth Service
"""

from app.schemas.auth import (
    EmailVerification,
    MessageResponse,
    MFAEnable,
    MFAVerify,
    PasswordReset,
    PasswordResetRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
)
from app.schemas.user import User, UserCreate, UserInDB, UserUpdate

__all__ = [
    # Auth schemas
    "UserRegister",
    "UserLogin",
    "TokenResponse",
    "EmailVerification",
    "PasswordResetRequest",
    "PasswordReset",
    "MFAEnable",
    "MFAVerify",
    "MessageResponse",
    # User schemas
    "User",
    "UserCreate",
    "UserUpdate",
    "UserInDB",
]
