"""
Integration Tests for Auth Endpoints
====================================
End-to-end testing of authentication flows
"""

import pytest
from httpx import AsyncClient


@pytest.mark.integration
class TestUserRegistration:
    """Test user registration endpoint"""

    @pytest.mark.asyncio
    async def test_register_success(self, async_client: AsyncClient, mock_event_service):
        """Test successful user registration"""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@refertosicuro.it",
                "password": "SecurePass123!",
                "full_name": "New User",
                "phone_number": "+39 123 456 7890",
                "tax_code": "NEWUSR80A01H501Z",
                "preferred_language": "it",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert "verify your account" in data["message"].lower()

        # Check event was published (email will be sent by Notification Service)
        assert len(mock_event_service) == 1
        assert mock_event_service[0]["event_type"] == "user.registered"
        assert "verification_token" in mock_event_service[0]["payload"]

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, async_client: AsyncClient, test_user):
        """Test registration with existing email"""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": test_user.email,
                "password": "SecurePass123!",
                "full_name": "Duplicate User",
            },
        )

        assert response.status_code == 409
        assert "already registered" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_register_weak_password(self, async_client: AsyncClient):
        """Test registration with weak password"""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "weakpass@refertosicuro.it",
                "password": "weakpassword123",  # Missing uppercase and special char - will fail Pydantic validator
                "full_name": "Weak Password User",
            },
        )

        assert response.status_code == 422  # Pydantic validation error (not our custom 400)
        # Pydantic returns a list of validation errors, not our custom format
        assert "detail" in response.json()

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, async_client: AsyncClient):
        """Test registration with invalid email"""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "not-an-email",
                "password": "SecurePass123!",
                "full_name": "Invalid Email",
            },
        )

        assert response.status_code == 422  # Validation error


@pytest.mark.integration
class TestUserLogin:
    """Test user login endpoint"""

    @pytest.mark.asyncio
    async def test_login_success(
        self, async_client: AsyncClient, test_user, test_user_data, mock_event_service
    ):
        """Test successful login"""
        response = await async_client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user_data["email"],
                "password": test_user_data["password"],
            },
        )

        assert response.status_code == 200
        data = response.json()

        # Check tokens are returned
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data

        # Check event published
        events = [e for e in mock_event_service if e["event_type"] == "user.logged_in"]
        assert len(events) == 1

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, async_client: AsyncClient, test_user, test_user_data):
        """Test login with wrong password"""
        response = await async_client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user_data["email"],
                "password": "WrongPassword123!",
            },
        )

        assert response.status_code == 401
        assert "invalid credentials" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, async_client: AsyncClient):
        """Test login with non-existent user"""
        response = await async_client.post(
            "/api/v1/auth/login",
            data={
                "username": "nonexistent@refertosicuro.it",
                "password": "SomePassword123!",
            },
        )

        assert response.status_code == 401
        assert "invalid credentials" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_login_account_locked(
        self, async_client: AsyncClient, test_user, test_user_data, test_db
    ):
        """Test login with locked account"""
        # Lock the account
        test_user.failed_login_count = 5
        from datetime import datetime, timedelta, timezone

        test_user.locked_until = datetime.now(timezone.utc) + timedelta(hours=1)
        await test_db.commit()

        response = await async_client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user_data["email"],
                "password": test_user_data["password"],
            },
        )

        assert response.status_code == 423
        assert "locked" in response.json()["detail"].lower()


@pytest.mark.integration
class TestPasswordReset:
    """Test password reset flow"""

    @pytest.mark.asyncio
    async def test_forgot_password_success(
        self, async_client: AsyncClient, test_user, mock_event_service, mock_redis
    ):
        """Test forgot password request"""
        response = await async_client.post(
            "/api/v1/auth/forgot-password",
            json={"email": test_user.email},
        )

        assert response.status_code == 200
        assert "reset link" in response.json()["message"].lower()

        # Check event was published (email will be sent by Notification Service)
        events = [e for e in mock_event_service if e["event_type"] == "password_reset.requested"]
        assert len(events) == 1
        assert "reset_token" in events[0]["payload"]

    @pytest.mark.asyncio
    async def test_forgot_password_nonexistent_email(
        self, async_client: AsyncClient, mock_event_service
    ):
        """Test forgot password with non-existent email (should still return success for security)"""
        response = await async_client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "nonexistent@refertosicuro.it"},
        )

        # Should return success to prevent email enumeration
        assert response.status_code == 200

        # But no event should be published (user doesn't exist)
        events = [e for e in mock_event_service if e["event_type"] == "password_reset.requested"]
        assert len(events) == 0

    @pytest.mark.asyncio
    async def test_reset_password_success(
        self,
        async_client: AsyncClient,
        test_user,
        test_db,
        mock_redis,
        mock_event_service,
    ):
        """Test complete password reset flow"""
        from app.services.token_service import token_service

        # Generate reset token
        token = await token_service.create_password_reset_token(user=test_user, db=test_db)

        # Reset password
        response = await async_client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": token,
                "new_password": "NewSecurePass456!",
            },
        )

        assert response.status_code == 200
        assert "success" in response.json()["message"].lower()

        # Check event published
        events = [e for e in mock_event_service if e["event_type"] == "user.password_changed"]
        assert len(events) == 1

        # Verify old password doesn't work
        login_response = await async_client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user.email,
                "password": "SecurePass123!",  # Old password
            },
        )
        assert login_response.status_code == 401

        # Verify new password works
        await test_db.refresh(test_user)
        login_response = await async_client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user.email,
                "password": "NewSecurePass456!",  # New password
            },
        )
        assert login_response.status_code == 200

    @pytest.mark.asyncio
    async def test_reset_password_invalid_token(self, async_client: AsyncClient):
        """Test reset with invalid token"""
        response = await async_client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": "a" * 64,  # 64 char token (valid format but doesn't exist in DB)
                "new_password": "NewSecurePass456!",
            },
        )

        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_reset_password_weak_password(
        self, async_client: AsyncClient, test_user, test_db, mock_redis
    ):
        """Test reset with weak password"""
        from app.services.token_service import token_service

        token = await token_service.create_password_reset_token(user=test_user, db=test_db)

        response = await async_client.post(
            "/api/v1/auth/reset-password",
            json={
                "token": token,
                "new_password": "weakpassword123",  # Missing uppercase and special char - Pydantic validation
            },
        )

        assert response.status_code == 422  # Pydantic validation error
        assert "detail" in response.json()


@pytest.mark.integration
class TestEmailVerification:
    """Test email verification flow"""

    @pytest.mark.asyncio
    async def test_verify_email_success(
        self, async_client: AsyncClient, test_user, test_db, mock_redis, mock_event_service
    ):
        """Test email verification"""
        from app.services.token_service import token_service

        # Mark user as unverified
        test_user.email_verified = False
        test_user.email_verified_at = None
        await test_db.commit()

        # Generate verification token
        token = await token_service.create_email_verification_token(user=test_user, db=test_db)

        # Verify email
        response = await async_client.post(
            "/api/v1/auth/verify-email",
            json={"token": token},
        )

        assert response.status_code == 200
        assert "success" in response.json()["message"].lower()

        # Check user is now verified
        await test_db.refresh(test_user)
        assert test_user.email_verified is True
        assert test_user.email_verified_at is not None

        # Check event published
        events = [e for e in mock_event_service if e["event_type"] == "user.email_verified"]
        assert len(events) == 1

    @pytest.mark.asyncio
    async def test_verify_email_invalid_token(self, async_client: AsyncClient):
        """Test verification with invalid token"""
        response = await async_client.post(
            "/api/v1/auth/verify-email",
            json={"token": "a" * 64},  # 64 char token (valid format but doesn't exist)
        )

        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()


@pytest.mark.integration
class TestLogout:
    """Test logout functionality"""

    @pytest.mark.asyncio
    async def test_logout_success(
        self,
        async_client: AsyncClient,
        test_user,
        test_user_data,
        mock_redis,
        mock_event_service,
    ):
        """Test successful logout"""
        # Login first
        login_response = await async_client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user_data["email"],
                "password": test_user_data["password"],
            },
        )
        access_token = login_response.json()["access_token"]

        # Logout
        response = await async_client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        assert "success" in response.json()["message"].lower()

        # Check event published
        events = [e for e in mock_event_service if e["event_type"] == "user.logged_out"]
        assert len(events) >= 1

    @pytest.mark.asyncio
    async def test_logout_without_token(self, async_client: AsyncClient):
        """Test logout without auth token"""
        response = await async_client.post("/api/v1/auth/logout")

        assert response.status_code in [401, 403]
