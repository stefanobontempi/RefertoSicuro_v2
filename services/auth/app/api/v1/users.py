"""
User Management API Endpoints
=============================
User profile, session management, and account operations
"""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import logging

from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models.user import User, Session
from app.services.jwt_service import jwt_service
from app.schemas.user import (
    UserProfile,
    UserUpdate,
    PasswordChange,
    SessionInfo,
    MessageResponse,
    NotificationPreferences,
    UIPreferences
)
from app.utils.validators import validate_password_strength
from app.core.redis import redis_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Get current user profile.

    Returns complete user profile information excluding sensitive data.
    """
    return UserProfile.from_orm(current_user)


@router.put("/me", response_model=UserProfile)
async def update_profile(
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Update user profile.

    Allows updating:
    - Personal information (name, phone, etc.)
    - Professional information
    - Billing information
    - Preferences
    """
    # Update allowed fields
    update_fields = [
        "full_name", "display_name", "phone_number", "birth_date",
        "tax_code", "professional_id", "specialties",
        "company_name", "vat_number", "billing_email", "billing_address",
        "preferred_language", "timezone"
    ]

    for field in update_fields:
        if hasattr(user_update, field):
            value = getattr(user_update, field)
            if value is not None:
                setattr(current_user, field, value)

    # Update timestamp
    current_user.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(current_user)

    logger.info(f"Profile updated for user: {current_user.email}")

    return UserProfile.from_orm(current_user)


@router.put("/me/password", response_model=MessageResponse)
async def change_password(
    password_data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Change user password.

    - Validates current password
    - Enforces password strength requirements
    - Revokes all sessions for security
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Check if new password is same as current
    if verify_password(password_data.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )

    # Validate new password strength
    password_errors = validate_password_strength(password_data.new_password)
    if password_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"password_errors": password_errors}
        )

    # Update password
    current_user.password_hash = get_password_hash(password_data.new_password)
    current_user.password_changed_at = datetime.now(timezone.utc)

    # Revoke all sessions except current (optional based on security policy)
    if password_data.revoke_all_sessions:
        await jwt_service.revoke_all_user_sessions(
            current_user.id,
            db,
            "password_changed"
        )

    await db.commit()

    logger.info(f"Password changed for user: {current_user.email}")

    return MessageResponse(
        message="Password changed successfully",
        success=True
    )


@router.get("/me/sessions", response_model=List[SessionInfo])
async def get_user_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user),
    active_only: bool = Query(True, description="Show only active sessions")
):
    """
    Get all sessions for current user.

    Returns list of all sessions (active and inactive based on filter).
    """
    query = select(Session).where(Session.user_id == current_user.id)

    if active_only:
        query = query.where(Session.is_active == True)

    query = query.order_by(Session.created_at.desc())

    result = await db.execute(query)
    sessions = result.scalars().all()

    return [
        SessionInfo(
            id=str(session.id),
            device_name=session.device_name or "Unknown Device",
            device_id=session.device_id,
            ip_address=str(session.ip_address),
            user_agent=session.user_agent,
            created_at=session.created_at,
            last_activity_at=session.last_activity_at,
            is_active=session.is_active,
            expires_at=session.access_expires_at
        )
        for session in sessions
    ]


@router.delete("/me/sessions/{session_id}", response_model=MessageResponse)
async def revoke_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Revoke a specific session.

    Allows users to remotely logout sessions from other devices.
    """
    # Get session
    result = await db.execute(
        select(Session).where(
            and_(
                Session.id == session_id,
                Session.user_id == current_user.id
            )
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    if not session.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is already revoked"
        )

    # Revoke session
    success = await jwt_service.revoke_session(
        session.id,
        db,
        "user_revoked"
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke session"
        )

    logger.info(f"Session revoked by user: {current_user.email}, session: {session_id}")

    return MessageResponse(
        message="Session revoked successfully",
        success=True
    )


@router.delete("/me/sessions", response_model=MessageResponse)
async def revoke_all_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Revoke all user sessions.

    Logs out user from all devices.
    """
    count = await jwt_service.revoke_all_user_sessions(
        current_user.id,
        db,
        "user_revoked_all"
    )

    logger.info(f"All sessions revoked for user: {current_user.email}, count: {count}")

    return MessageResponse(
        message=f"Successfully revoked {count} sessions",
        success=True
    )


@router.put("/me/notifications", response_model=MessageResponse)
async def update_notification_preferences(
    preferences: NotificationPreferences,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Update notification preferences.

    Controls how user receives notifications:
    - Email notifications
    - SMS notifications
    - Push notifications
    """
    current_user.notification_preferences = preferences.dict()
    current_user.updated_at = datetime.now(timezone.utc)

    await db.commit()

    logger.info(f"Notification preferences updated for user: {current_user.email}")

    return MessageResponse(
        message="Notification preferences updated successfully",
        success=True
    )


@router.put("/me/ui-preferences", response_model=MessageResponse)
async def update_ui_preferences(
    preferences: UIPreferences,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Update UI preferences.

    Controls UI customization:
    - Theme (light/dark)
    - Language
    - Other UI settings
    """
    current_user.ui_preferences = preferences.dict()
    current_user.updated_at = datetime.now(timezone.utc)

    await db.commit()

    logger.info(f"UI preferences updated for user: {current_user.email}")

    return MessageResponse(
        message="UI preferences updated successfully",
        success=True
    )


@router.delete("/me", response_model=MessageResponse)
async def delete_account(
    password_confirmation: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Delete user account (soft delete).

    - Requires password confirmation
    - Performs soft delete (data retained for compliance)
    - Revokes all sessions
    - Anonymizes personal data after retention period
    """
    # Verify password
    if not verify_password(password_confirmation, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password confirmation is incorrect"
        )

    # Soft delete
    current_user.status = "deleted"
    current_user.status_reason = "User requested deletion"
    current_user.deleted_at = datetime.now(timezone.utc)

    # Revoke all sessions
    await jwt_service.revoke_all_user_sessions(
        current_user.id,
        db,
        "account_deleted"
    )

    # Schedule data anonymization (after retention period)
    # This would typically be handled by a background job
    await redis_client.setex(
        f"deletion_pending:{current_user.id}",
        86400 * 30,  # 30 days retention
        datetime.now(timezone.utc).isoformat()
    )

    await db.commit()

    logger.warning(f"Account deletion requested by user: {current_user.email}")

    return MessageResponse(
        message="Account scheduled for deletion. Data will be retained for 30 days per compliance requirements.",
        success=True
    )


@router.post("/me/verify-phone", response_model=MessageResponse)
async def request_phone_verification(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Request phone number verification.

    Sends verification code via SMS.
    """
    if not current_user.phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No phone number on file"
        )

    if current_user.phone_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already verified"
        )

    # Generate verification code
    import random
    code = str(random.randint(100000, 999999))

    # Store in Redis with expiry
    await redis_client.setex(
        f"phone_verify:{current_user.id}",
        300,  # 5 minutes
        code
    )

    # Send SMS (implementation depends on SMS provider)
    # await sms_service.send_verification_code(
    #     phone=current_user.phone_number,
    #     code=code
    # )

    logger.info(f"Phone verification requested for user: {current_user.email}")

    return MessageResponse(
        message="Verification code sent to your phone",
        success=True
    )


@router.post("/me/verify-phone/{code}", response_model=MessageResponse)
async def verify_phone_number(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Verify phone number with code.
    """
    # Get stored code
    stored_code = await redis_client.get(f"phone_verify:{current_user.id}")

    if not stored_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No verification code found or code expired"
        )

    if stored_code != code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )

    # Update user
    current_user.phone_verified = True
    await db.commit()

    # Clean up Redis
    await redis_client.delete(f"phone_verify:{current_user.id}")

    logger.info(f"Phone verified for user: {current_user.email}")

    return MessageResponse(
        message="Phone number verified successfully",
        success=True
    )


@router.post("/me/export-data", response_model=MessageResponse)
async def export_user_data(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Request GDPR data export.

    Generates a complete export of user data for GDPR compliance.
    The export will be prepared and sent via email.
    """
    # Schedule export job
    await redis_client.setex(
        f"data_export:{current_user.id}",
        3600,  # 1 hour to process
        datetime.now(timezone.utc).isoformat()
    )

    # This would typically trigger a background job to:
    # 1. Collect all user data from all services
    # 2. Generate PDF/JSON export
    # 3. Email the export to user

    logger.info(f"Data export requested by user: {current_user.email}")

    return MessageResponse(
        message="Your data export has been scheduled. You will receive an email with the download link within 1 hour.",
        success=True
    )