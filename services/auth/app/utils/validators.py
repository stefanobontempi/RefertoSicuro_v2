"""
Input validators for Auth Service
"""

import re
from typing import Optional


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password strength according to security policy

    Args:
        password: Password to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if len(password) < 12:
        return False, "Password must be at least 12 characters"

    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"

    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"

    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"

    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"

    # Check against common passwords (basic check)
    common_passwords = [
        "password123",
        "admin123456",
        "qwerty123456",
        "12345678901",
        "password1234",
    ]
    if password.lower() in common_passwords:
        return False, "Password is too common"

    return True, None


def validate_email(email: str) -> tuple[bool, Optional[str]]:
    """
    Validate email format

    Args:
        email: Email to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"

    if not re.match(email_pattern, email):
        return False, "Invalid email format"

    return True, None


def validate_phone_number(phone: str) -> tuple[bool, Optional[str]]:
    """
    Validate phone number format (Italian format)

    Args:
        phone: Phone number to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Remove spaces and common separators
    clean_phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")

    # Italian phone pattern (+39 or 0039 followed by 9-10 digits)
    italian_pattern = r"^(\+39|0039)?[0-9]{9,10}$"

    if not re.match(italian_pattern, clean_phone):
        return False, "Invalid phone number format"

    return True, None
