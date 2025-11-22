"""
RabbitMQ Connection Manager
===========================
Manage RabbitMQ connections with reconnection logic
"""

from typing import Optional

import aio_pika
from aio_pika import Channel
from aio_pika.abc import AbstractRobustConnection
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class RabbitMQConnectionManager:
    """
    Manage RabbitMQ connection lifecycle with automatic reconnection.

    Features:
    - Async connection with aio_pika
    - Automatic reconnection on failure
    - Connection pooling
    - Graceful shutdown
    """

    def __init__(self):
        """Initialize connection manager."""
        self.connection: Optional[AbstractRobustConnection] = None
        self.channel: Optional[Channel] = None
        self.url = settings.RABBITMQ_URL

    async def connect(self) -> None:
        """
        Establish connection to RabbitMQ.

        Raises:
            aio_pika.AMQPException: If connection fails
        """
        try:
            logger.info(
                f"Connecting to RabbitMQ at {settings.RABBITMQ_HOST}:{settings.RABBITMQ_PORT}..."
            )

            # Create robust connection (auto-reconnect)
            self.connection = await aio_pika.connect_robust(
                self.url,
                timeout=10,
            )

            # Create channel
            self.channel = await self.connection.channel()

            # Set prefetch count (QoS)
            await self.channel.set_qos(prefetch_count=settings.RABBITMQ_PREFETCH_COUNT)

            logger.info("✅ RabbitMQ connection established successfully")

        except Exception as e:
            logger.error(f"❌ Failed to connect to RabbitMQ: {e}", exc_info=True)
            raise

    async def disconnect(self) -> None:
        """
        Close RabbitMQ connection gracefully.
        """
        try:
            if self.channel:
                await self.channel.close()
                logger.info("RabbitMQ channel closed")

            if self.connection:
                await self.connection.close()
                logger.info("RabbitMQ connection closed")

        except Exception as e:
            logger.error(f"Error closing RabbitMQ connection: {e}", exc_info=True)

    async def declare_exchange(
        self,
        name: str,
        exchange_type: str = "topic",
        durable: bool = True,
    ) -> aio_pika.Exchange:
        """
        Declare an exchange.

        Args:
            name: Exchange name
            exchange_type: Exchange type (topic, direct, fanout, headers)
            durable: Whether exchange survives broker restart

        Returns:
            Exchange object

        Raises:
            RuntimeError: If not connected
        """
        if not self.channel:
            raise RuntimeError("Not connected to RabbitMQ")

        exchange = await self.channel.declare_exchange(
            name=name,
            type=aio_pika.ExchangeType(exchange_type),
            durable=durable,
        )

        logger.info(f"Exchange declared: {name} (type={exchange_type}, durable={durable})")
        return exchange

    async def declare_queue(
        self,
        name: str,
        durable: bool = True,
        arguments: Optional[dict] = None,
    ) -> aio_pika.Queue:
        """
        Declare a queue.

        Args:
            name: Queue name
            durable: Whether queue survives broker restart
            arguments: Queue arguments (e.g., x-dead-letter-exchange)

        Returns:
            Queue object

        Raises:
            RuntimeError: If not connected
        """
        if not self.channel:
            raise RuntimeError("Not connected to RabbitMQ")

        queue = await self.channel.declare_queue(
            name=name,
            durable=durable,
            arguments=arguments or {},
        )

        logger.info(f"Queue declared: {name} (durable={durable})")
        return queue

    def is_connected(self) -> bool:
        """
        Check if connected to RabbitMQ.

        Returns:
            True if connected, False otherwise
        """
        return self.connection is not None and not self.connection.is_closed


# Singleton instance
_rabbitmq_manager: Optional[RabbitMQConnectionManager] = None


def get_rabbitmq_manager() -> RabbitMQConnectionManager:
    """
    Get singleton RabbitMQ connection manager.

    Returns:
        RabbitMQConnectionManager instance
    """
    global _rabbitmq_manager
    if _rabbitmq_manager is None:
        _rabbitmq_manager = RabbitMQConnectionManager()
    return _rabbitmq_manager
