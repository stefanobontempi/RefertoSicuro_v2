"""
Session Management API Endpoints (Admin)
========================================
Administrative endpoints for session and user management
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
import logging

from app.core.database import get_db
from app.models.user import User, Session
from app.services.jwt_service import jwt_service
from app.schemas.admin import (
    SessionAdminInfo,
    UserAdminInfo,
    UserLockRequest,
    MessageResponse,
    PaginatedResponse,
    AdminStats
)
from app.core.permissions import require_admin, require_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


@router.get("/sessions", response_model=PaginatedResponse[SessionAdminInfo])
@require_role(["admin", "support"])
async def list_all_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    active_only: bool = Query(False),
    user_id: Optional[str] = Query(None),
    ip_address: Optional[str] = Query(None)
):
    """
    List all sessions with filtering.

    Admin only endpoint to view all user sessions.
    """
    # Build query
    query = select(Session).join(User)

    # Apply filters
    if active_only:
        query = query.where(Session.is_active == True)

    if user_id:
        query = query.where(Session.user_id == user_id)

    if ip_address:
        query = query.where(Session.ip_address == ip_address)

    # Count total
    count_query = select(func.count()).select_from(Session)
    if active_only:
        count_query = count_query.where(Session.is_active == True)
    if user_id:
        count_query = count_query.where(Session.user_id == user_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Apply pagination
    query = query.order_by(Session.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    sessions = result.scalars().all()

    return PaginatedResponse(
        items=[
            SessionAdminInfo(
                id=str(session.id),
                user_id=str(session.user_id),
                user_email=session.user.email,
                device_name=session.device_name,
                ip_address=str(session.ip_address),
                user_agent=session.user_agent,
                created_at=session.created_at,
                last_activity_at=session.last_activity_at,
                is_active=session.is_active,
                expires_at=session.access_expires_at,
                revoked_at=session.revoked_at,
                revoked_reason=session.revoked_reason
            )
            for session in sessions
        ],
        total=total,
        page=page,
        limit=limit,
        pages=(total + limit - 1) // limit
    )


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
@require_admin
async def revoke_session_admin(
    session_id: str,
    reason: str = Query(..., description="Reason for revocation"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Revoke a specific session (admin).

    Allows admins to force logout any user session.
    """
    # Get session
    result = await db.execute(
        select(Session).where(Session.id == session_id)
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
        f"admin_revoked: {reason}"
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke session"
        )

    logger.warning(
        f"Session revoked by admin: {current_user.email}, "
        f"session: {session_id}, reason: {reason}"
    )

    return MessageResponse(
        message="Session revoked successfully",
        success=True
    )


@router.get("/users", response_model=PaginatedResponse[UserAdminInfo])
@require_role(["admin", "support"])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    verified_only: bool = Query(False)
):
    """
    List all users with filtering.

    Admin endpoint to view and search users.
    """
    # Build query
    query = select(User)

    # Apply filters
    if search:
        query = query.where(
            or_(
                User.email.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%"),
                User.company_name.ilike(f"%{search}%")
            )
        )

    if role:
        query = query.where(User.role == role)

    if status:
        query = query.where(User.status == status)

    if verified_only:
        query = query.where(User.email_verified == True)

    # Count total
    count_query = select(func.count()).select_from(User)
    if search:
        count_query = count_query.where(
            or_(
                User.email.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%")
            )
        )
    if role:
        count_query = count_query.where(User.role == role)
    if status:
        count_query = count_query.where(User.status == status)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Apply pagination
    query = query.order_by(User.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)

    result = await db.execute(query)
    users = result.scalars().all()

    # Get session counts
    session_counts = {}
    for user in users:
        count_result = await db.execute(
            select(func.count()).select_from(Session).where(
                and_(
                    Session.user_id == user.id,
                    Session.is_active == True
                )
            )
        )
        session_counts[user.id] = count_result.scalar()

    return PaginatedResponse(
        items=[
            UserAdminInfo(
                id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                role=user.role,
                status=user.status,
                email_verified=user.email_verified,
                mfa_enabled=user.mfa_enabled,
                professional_verified=user.professional_verified,
                organization_id=str(user.organization_id) if user.organization_id else None,
                created_at=user.created_at,
                last_login_at=user.last_login_at,
                is_locked=user.is_locked,
                failed_login_count=user.failed_login_count,
                active_sessions=session_counts.get(user.id, 0)
            )
            for user in users
        ],
        total=total,
        page=page,
        limit=limit,
        pages=(total + limit - 1) // limit
    )


@router.post("/users/{user_id}/lock", response_model=MessageResponse)
@require_admin
async def lock_user(
    user_id: str,
    lock_data: UserLockRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Lock a user account.

    Prevents user from logging in and revokes all sessions.
    """
    # Get user
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent locking admins by non-super-admins
    if user.role == "admin" and current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot lock admin accounts"
        )

    # Lock user
    user.status = "suspended"
    user.status_reason = lock_data.reason
    user.locked_until = datetime.now(timezone.utc) + timedelta(hours=lock_data.duration_hours)

    # Revoke all sessions
    await jwt_service.revoke_all_user_sessions(
        user.id,
        db,
        f"account_locked: {lock_data.reason}"
    )

    await db.commit()

    logger.warning(
        f"User locked by admin: {current_user.email}, "
        f"locked user: {user.email}, reason: {lock_data.reason}"
    )

    return MessageResponse(
        message=f"User account locked for {lock_data.duration_hours} hours",
        success=True
    )


@router.post("/users/{user_id}/unlock", response_model=MessageResponse)
@require_admin
async def unlock_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Unlock a user account.

    Restores user access and resets failed login attempts.
    """
    # Get user
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Unlock user
    user.status = "active"
    user.status_reason = None
    user.locked_until = None
    user.failed_login_count = 0

    await db.commit()

    logger.info(
        f"User unlocked by admin: {current_user.email}, "
        f"unlocked user: {user.email}"
    )

    return MessageResponse(
        message="User account unlocked successfully",
        success=True
    )


@router.post("/users/{user_id}/verify-email", response_model=MessageResponse)
@require_admin
async def force_verify_email(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Force verify user email.

    Admin action to manually verify a user's email address.
    """
    # Get user
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )

    # Verify email
    user.email_verified = True
    user.email_verified_at = datetime.now(timezone.utc)

    await db.commit()

    logger.info(
        f"Email force-verified by admin: {current_user.email}, "
        f"for user: {user.email}"
    )

    return MessageResponse(
        message="Email verified successfully",
        success=True
    )


@router.post("/users/{user_id}/reset-mfa", response_model=MessageResponse)
@require_admin
async def reset_user_mfa(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Reset user's MFA.

    Disables MFA for a user who has lost access to their device.
    """
    # Get user
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if not user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled for this user"
        )

    # Reset MFA
    user.mfa_enabled = False
    user.mfa_secret = None
    user.mfa_backup_codes = None

    await db.commit()

    logger.warning(
        f"MFA reset by admin: {current_user.email}, "
        f"for user: {user.email}"
    )

    return MessageResponse(
        message="MFA has been reset. User will need to set it up again.",
        success=True
    )


@router.get("/stats", response_model=AdminStats)
@require_role(["admin", "support"])
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Get administrative statistics.

    Returns system-wide statistics for monitoring.
    """
    # User stats
    total_users = await db.execute(
        select(func.count()).select_from(User)
    )
    active_users = await db.execute(
        select(func.count()).select_from(User).where(User.status == "active")
    )
    verified_users = await db.execute(
        select(func.count()).select_from(User).where(User.email_verified == True)
    )
    mfa_users = await db.execute(
        select(func.count()).select_from(User).where(User.mfa_enabled == True)
    )

    # Session stats
    total_sessions = await db.execute(
        select(func.count()).select_from(Session)
    )
    active_sessions = await db.execute(
        select(func.count()).select_from(Session).where(Session.is_active == True)
    )

    # Recent activity
    recent_registrations = await db.execute(
        select(func.count()).select_from(User).where(
            User.created_at >= datetime.now(timezone.utc) - timedelta(days=7)
        )
    )
    recent_logins = await db.execute(
        select(func.count()).select_from(Session).where(
            Session.created_at >= datetime.now(timezone.utc) - timedelta(days=1)
        )
    )

    # Failed login attempts
    failed_attempts = await db.execute(
        select(func.sum(User.failed_login_count)).select_from(User)
    )

    # Locked accounts
    locked_accounts = await db.execute(
        select(func.count()).select_from(User).where(
            User.locked_until > datetime.now(timezone.utc)
        )
    )

    return AdminStats(
        total_users=total_users.scalar() or 0,
        active_users=active_users.scalar() or 0,
        verified_users=verified_users.scalar() or 0,
        mfa_enabled_users=mfa_users.scalar() or 0,
        total_sessions=total_sessions.scalar() or 0,
        active_sessions=active_sessions.scalar() or 0,
        recent_registrations=recent_registrations.scalar() or 0,
        recent_logins=recent_logins.scalar() or 0,
        failed_login_attempts=failed_attempts.scalar() or 0,
        locked_accounts=locked_accounts.scalar() or 0,
        timestamp=datetime.now(timezone.utc)
    )