"""
User Pydantic Schemas
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema"""

    email: EmailStr
    full_name: Optional[str] = None
    phone_number: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a user"""

    password: str = Field(..., min_length=12)


class UserUpdate(BaseModel):
    """Schema for updating a user"""

    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    display_name: Optional[str] = None


class User(UserBase):
    """Schema for user response (public data)"""

    id: UUID
    role: str
    status: str
    email_verified: bool
    mfa_enabled: bool
    professional_verified: bool = False
    specialties: List[str] = []
    company_name: Optional[str] = None
    organization_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserInDB(User):
    """Schema for user in database (includes sensitive data)"""

    password_hash: str
    mfa_secret: Optional[str] = None
    last_login_at: Optional[datetime] = None
    failed_login_count: int = 0
    locked_until: Optional[datetime] = None

    class Config:
        from_attributes = True
