"""
Rate limiting utilities using slowapi
"""

from functools import wraps
from typing import Callable

from slowapi import Limiter
from slowapi.util import get_remote_address

# Create limiter instance
limiter = Limiter(key_func=get_remote_address)


def rate_limit(limit: str):
    """
    Rate limit decorator for endpoints

    Args:
        limit: Rate limit string (e.g., "5/minute", "100/hour")

    Usage:
        @router.post("/login")
        @rate_limit("5/minute")
        async def login(...):
            ...
    """

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await func(*args, **kwargs)

        # Apply rate limit using slowapi
        return limiter.limit(limit)(wrapper)

    return decorator
