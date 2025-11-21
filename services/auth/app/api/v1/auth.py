"""
Authentication API Endpoints
============================
Core authentication endpoints for user registration, login, and token management
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import secrets
import logging

from app.core.database import get_db
from app.core.config import settings
from app.core.security import (
    get_password_hash,
    verify_password,
    generate_verification_token,
    verify_token
)
from app.models.user import User
from app.services.jwt_service import jwt_service
from app.services.email_service import email_service
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    EmailVerification,
    PasswordResetRequest,
    PasswordReset,
    MFAEnable,
    MFAVerify,
    MessageResponse
)
from app.utils.validators import validate_password_strength
from app.core.rate_limit import rate_limit
from app.core.redis import redis_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
@rate_limit(max_calls=5, time_window=3600)  # 5 registrations per hour
async def register(
    user_data: UserRegister,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user account.

    - Validates email uniqueness
    - Enforces password strength requirements
    - Sends email verification
    - Creates initial session
    """
    # Check if email already exists
    result = await db.execute(
        select(User).where(User.email == user_data.email.lower())
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    # Validate password strength
    password_errors = validate_password_strength(user_data.password)
    if password_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"password_errors": password_errors}
        )

    # Create user
    user = User(
        email=user_data.email.lower(),
        email_normalized=user_data.email.lower().replace(".", "").replace("+", ""),
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        phone_number=user_data.phone_number,
        tax_code=user_data.tax_code,
        preferred_language=user_data.preferred_language or "it",
        notification_preferences=user_data.notification_preferences or {
            "email": True,
            "sms": False,
            "push": False
        }
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Send verification email
    verification_token = generate_verification_token()
    await redis_client.setex(
        f"email_verify:{verification_token}",
        86400,  # 24 hours
        str(user.id)
    )

    await email_service.send_verification_email(
        email=user.email,
        name=user.full_name,
        token=verification_token,
        language=user.preferred_language
    )

    logger.info(f"New user registered: {user.email}")

    return MessageResponse(
        message="Registration successful. Please check your email to verify your account.",
        success=True
    )


@router.post("/login", response_model=TokenResponse)
@rate_limit(max_calls=10, time_window=300)  # 10 attempts per 5 minutes
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Login with email and password.

    - Validates credentials
    - Checks account status and locks
    - Generates JWT tokens
    - Records session
    """
    # Get user
    result = await db.execute(
        select(User).where(User.email == form_data.username.lower())
    )
    user = result.scalar_one_or_none()

    if not user:
        # Log failed attempt for security monitoring
        logger.warning(f"Login attempt for non-existent user: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # Check if account is locked
    if user.is_locked:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account is locked due to multiple failed login attempts"
        )

    # Check if account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active"
        )

    # Verify password
    if not verify_password(form_data.password, user.password_hash):
        # Increment failed login count
        user.failed_login_count += 1

        # Lock account after 5 failed attempts
        if user.failed_login_count >= 5:
            user.locked_until = datetime.now(timezone.utc).replace(
                hour=datetime.now(timezone.utc).hour + 1
            )
            logger.warning(f"Account locked due to failed attempts: {user.email}")

        await db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # Check if email is verified (optional based on settings)
    if settings.REQUIRE_EMAIL_VERIFICATION and not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in"
        )

    # Reset failed login count on successful login
    user.failed_login_count = 0
    user.last_login_at = datetime.now(timezone.utc)
    user.last_login_ip = request.client.host if request else None

    # Generate tokens
    tokens = await jwt_service.create_tokens(
        user=user,
        db=db,
        ip_address=request.client.host if request else "unknown",
        user_agent=request.headers.get("User-Agent"),
        device_id=request.headers.get("X-Device-Id")
    )

    await db.commit()

    logger.info(f"User logged in: {user.email}")

    return TokenResponse(**tokens)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Logout current session.

    - Revokes current access token
    - Revokes refresh token
    - Updates session in database
    """
    # Get token from header
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )

    token = authorization.replace("Bearer ", "")

    # Decode token to get JTI
    payload = await jwt_service.validate_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    # Find and revoke session
    jti = payload.get("jti")
    result = await db.execute(
        select(Session).where(
            Session.access_token_jti == jti,
            Session.user_id == current_user.id
        )
    )
    session = result.scalar_one_or_none()

    if session:
        await jwt_service.revoke_session(session.id, db, "user_logout")

    logger.info(f"User logged out: {current_user.email}")

    return MessageResponse(
        message="Logged out successfully",
        success=True
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh access token using refresh token.

    - Validates refresh token
    - Generates new token pair
    - Revokes old tokens
    """
    tokens = await jwt_service.refresh_tokens(
        refresh_token=refresh_token,
        db=db,
        ip_address=request.client.host if request else "unknown",
        user_agent=request.headers.get("User-Agent")
    )

    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    return TokenResponse(**tokens)


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(
    data: EmailVerification,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify email address with token.

    - Validates verification token
    - Updates user email_verified status
    - Removes token from Redis
    """
    # Get user ID from Redis
    user_id = await redis_client.get(f"email_verify:{data.token}")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )

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

    # Update verification status
    user.email_verified = True
    user.email_verified_at = datetime.now(timezone.utc)
    await db.commit()

    # Remove token from Redis
    await redis_client.delete(f"email_verify:{data.token}")

    logger.info(f"Email verified for user: {user.email}")

    return MessageResponse(
        message="Email verified successfully",
        success=True
    )


@router.post("/forgot-password", response_model=MessageResponse)
@rate_limit(max_calls=3, time_window=3600)  # 3 requests per hour
async def forgot_password(
    data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Request password reset.

    - Validates email exists
    - Generates reset token
    - Sends reset email
    """
    # Get user
    result = await db.execute(
        select(User).where(User.email == data.email.lower())
    )
    user = result.scalar_one_or_none()

    # Always return success even if user doesn't exist (security)
    if not user:
        logger.warning(f"Password reset requested for non-existent email: {data.email}")
        return MessageResponse(
            message="If the email exists, a reset link has been sent",
            success=True
        )

    # Generate reset token
    reset_token = generate_verification_token()
    await redis_client.setex(
        f"password_reset:{reset_token}",
        3600,  # 1 hour
        str(user.id)
    )

    # Send reset email
    await email_service.send_password_reset_email(
        email=user.email,
        name=user.full_name,
        token=reset_token,
        language=user.preferred_language
    )

    logger.info(f"Password reset requested for: {user.email}")

    return MessageResponse(
        message="If the email exists, a reset link has been sent",
        success=True
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: PasswordReset,
    db: AsyncSession = Depends(get_db)
):
    """
    Reset password with token.

    - Validates reset token
    - Updates password
    - Revokes all existing sessions
    """
    # Get user ID from Redis
    user_id = await redis_client.get(f"password_reset:{data.token}")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    # Validate new password
    password_errors = validate_password_strength(data.new_password)
    if password_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"password_errors": password_errors}
        )

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

    # Update password
    user.password_hash = get_password_hash(data.new_password)
    user.password_changed_at = datetime.now(timezone.utc)

    # Revoke all sessions for security
    await jwt_service.revoke_all_user_sessions(user.id, db, "password_reset")

    await db.commit()

    # Remove token from Redis
    await redis_client.delete(f"password_reset:{data.token}")

    logger.info(f"Password reset completed for: {user.email}")

    return MessageResponse(
        message="Password reset successfully",
        success=True
    )


@router.post("/mfa/enable", response_model=dict)
async def enable_mfa(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Enable two-factor authentication.

    - Generates TOTP secret
    - Returns QR code and backup codes
    """
    if current_user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled"
        )

    # Generate TOTP secret
    import pyotp
    secret = pyotp.random_base32()

    # Generate backup codes
    backup_codes = [secrets.token_hex(4) for _ in range(10)]

    # Store temporarily in Redis (user must verify to confirm)
    await redis_client.setex(
        f"mfa_setup:{current_user.id}",
        600,  # 10 minutes
        {
            "secret": secret,
            "backup_codes": backup_codes
        }
    )

    # Generate QR code URL
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=current_user.email,
        issuer_name="RefertoSicuro"
    )

    return {
        "secret": secret,
        "qr_code": totp_uri,
        "backup_codes": backup_codes,
        "message": "Please scan the QR code and verify with a code to complete setup"
    }


@router.post("/mfa/verify", response_model=MessageResponse)
async def verify_mfa(
    data: MFAVerify,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(jwt_service.get_current_user)
):
    """
    Verify MFA code to complete setup or login.

    - Validates TOTP code
    - Enables MFA if in setup mode
    - Completes login if already enabled
    """
    import pyotp

    # Check if this is setup verification
    setup_data = await redis_client.get(f"mfa_setup:{current_user.id}")

    if setup_data:
        # Verify setup code
        totp = pyotp.TOTP(setup_data["secret"])
        if not totp.verify(data.code, valid_window=1):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code"
            )

        # Enable MFA
        current_user.mfa_secret = setup_data["secret"]
        current_user.mfa_enabled = True
        current_user.mfa_backup_codes = [
            get_password_hash(code) for code in setup_data["backup_codes"]
        ]

        await db.commit()
        await redis_client.delete(f"mfa_setup:{current_user.id}")

        logger.info(f"MFA enabled for user: {current_user.email}")

        return MessageResponse(
            message="Two-factor authentication enabled successfully",
            success=True
        )

    else:
        # Verify login code
        if not current_user.mfa_enabled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="MFA is not enabled for this account"
            )

        totp = pyotp.TOTP(current_user.mfa_secret)

        # Try TOTP code first
        if totp.verify(data.code, valid_window=1):
            return MessageResponse(
                message="MFA verification successful",
                success=True
            )

        # Try backup codes
        for hashed_code in current_user.mfa_backup_codes or []:
            if verify_password(data.code, hashed_code):
                # Remove used backup code
                current_user.mfa_backup_codes.remove(hashed_code)
                await db.commit()

                logger.info(f"Backup code used for MFA: {current_user.email}")

                return MessageResponse(
                    message="MFA verification successful (backup code used)",
                    success=True
                )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )