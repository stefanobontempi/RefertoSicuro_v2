"""
Rate limiting configuration using SlowAPI
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Create rate limiter instance
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],  # Default limit for all endpoints
    storage_uri="memory://",  # Can be switched to Redis later
)
