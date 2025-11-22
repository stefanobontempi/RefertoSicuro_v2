"""
Unit Tests for Security Module
===============================
Tests for password hashing, verification, and validation
"""

import pytest
from app.core.security import generate_verification_token, get_password_hash, verify_password
from app.utils.validators import validate_password_strength


@pytest.mark.unit
class TestPasswordHashing:
    """Test password hashing and verification"""

    def test_get_password_hash(self):
        """Test password hashing"""
        password = "SecurePass123!"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        # Hashes should be different (bcrypt uses salt)
        assert hash1 != hash2

        # Both should start with $2b$ (bcrypt)
        assert hash1.startswith("$2b$")
        assert hash2.startswith("$2b$")

    def test_verify_password_correct(self):
        """Test verifying correct password"""
        password = "SecurePass123!"
        password_hash = get_password_hash(password)

        assert verify_password(password, password_hash) is True

    def test_verify_password_incorrect(self):
        """Test verifying incorrect password"""
        password = "SecurePass123!"
        wrong_password = "WrongPass456!"
        password_hash = get_password_hash(password)

        assert verify_password(wrong_password, password_hash) is False

    def test_verify_password_case_sensitive(self):
        """Test password verification is case sensitive"""
        password = "SecurePass123!"
        password_hash = get_password_hash(password)

        assert verify_password("securepass123!", password_hash) is False
        assert verify_password("SECUREPASS123!", password_hash) is False

    def test_verify_password_empty(self):
        """Test verifying empty password"""
        password = "SecurePass123!"
        password_hash = get_password_hash(password)

        assert verify_password("", password_hash) is False


@pytest.mark.unit
class TestPasswordValidation:
    """Test password strength validation"""

    def test_valid_password(self):
        """Test valid password passes all checks"""
        is_valid, error = validate_password_strength("SecurePass123!")

        assert is_valid is True
        assert error is None

    def test_password_too_short(self):
        """Test password shorter than 12 characters"""
        is_valid, error = validate_password_strength("Sh0rt!")

        assert is_valid is False
        assert "at least 12 characters" in error.lower()

    def test_password_no_uppercase(self):
        """Test password without uppercase letter"""
        is_valid, error = validate_password_strength("securepass123!")

        assert is_valid is False
        assert "uppercase" in error.lower()

    def test_password_no_lowercase(self):
        """Test password without lowercase letter"""
        is_valid, error = validate_password_strength("SECUREPASS123!")

        assert is_valid is False
        assert "lowercase" in error.lower()

    def test_password_no_digit(self):
        """Test password without digit"""
        is_valid, error = validate_password_strength("SecurePassword!")

        assert is_valid is False
        assert "digit" in error.lower()

    def test_password_no_special(self):
        """Test password without special character"""
        is_valid, error = validate_password_strength("SecurePass1234")

        assert is_valid is False
        assert "special character" in error.lower()

    def test_password_minimum_length(self):
        """Test password minimum length requirement"""
        is_valid, error = validate_password_strength("Pass123!")

        assert is_valid is False
        assert "at least 12 characters" in error.lower()

    def test_password_with_spaces(self):
        """Test password with spaces (should be valid)"""
        is_valid, error = validate_password_strength("Secure Pass 123!")

        # Spaces are allowed
        assert is_valid is True
        assert error is None

    def test_password_very_long(self):
        """Test very long password (should be valid)"""
        long_password = "A" * 100 + "a1!"
        is_valid, error = validate_password_strength(long_password)

        assert is_valid is True
        assert error is None


@pytest.mark.unit
class TestVerificationToken:
    """Test verification token generation"""

    def test_generate_verification_token(self):
        """Test token generation"""
        token1 = generate_verification_token()
        token2 = generate_verification_token()

        # Tokens should be different
        assert token1 != token2

        # Tokens should be non-empty strings
        assert isinstance(token1, str)
        assert len(token1) > 0

    def test_generate_verification_token_unique(self):
        """Test that generated tokens are unique"""
        tokens = [generate_verification_token() for _ in range(100)]

        # All tokens should be unique
        assert len(tokens) == len(set(tokens))
