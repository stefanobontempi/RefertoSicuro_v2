"""
Redis client configuration and utilities
"""

import logging
from typing import Optional

import redis.asyncio as redis
from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisClient:
    """Redis async client wrapper"""

    def __init__(self):
        self._client: Optional[redis.Redis] = None

    async def connect(self):
        """Establish Redis connection"""
        try:
            self._client = await redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=10,
            )
            # Test connection
            await self._client.ping()
            logger.info("Redis connection established")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise

    async def disconnect(self):
        """Close Redis connection"""
        if self._client:
            await self._client.close()
            logger.info("Redis connection closed")

    async def get(self, key: str) -> Optional[str]:
        """Get value from Redis"""
        if not self._client:
            return None
        try:
            return await self._client.get(key)
        except Exception as e:
            logger.error(f"Redis GET error: {e}")
            return None

    async def set(self, key: str, value: str, expire: int = None) -> bool:
        """Set value in Redis with optional expiration"""
        if not self._client:
            return False
        try:
            if expire:
                await self._client.setex(key, expire, value)
            else:
                await self._client.set(key, value)
            return True
        except Exception as e:
            logger.error(f"Redis SET error: {e}")
            return False

    async def setex(self, key: str, seconds: int, value: str) -> bool:
        """Set value with expiration in seconds"""
        return await self.set(key, value, expire=seconds)

    async def ping(self) -> bool:
        """Ping Redis to check connection"""
        if not self._client:
            await self.connect()
        try:
            await self._client.ping()
            return True
        except Exception as e:
            logger.error(f"Redis PING error: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from Redis"""
        if not self._client:
            return False
        try:
            await self._client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis DELETE error: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """Check if key exists in Redis"""
        if not self._client:
            return False
        try:
            return await self._client.exists(key) > 0
        except Exception as e:
            logger.error(f"Redis EXISTS error: {e}")
            return False

    async def expire(self, key: str, seconds: int) -> bool:
        """Set expiration on key"""
        if not self._client:
            return False
        try:
            await self._client.expire(key, seconds)
            return True
        except Exception as e:
            logger.error(f"Redis EXPIRE error: {e}")
            return False


# Global Redis client instance
redis_client = RedisClient()
