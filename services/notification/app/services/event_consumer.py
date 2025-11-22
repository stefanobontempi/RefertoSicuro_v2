"""
Event Consumer Service
=====================
RabbitMQ event consumer for processing notification events
"""

import json
from typing import Dict, Optional

from aio_pika.abc import AbstractIncomingMessage
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.logging import get_logger
from app.core.rabbitmq import RabbitMQConnectionManager, get_rabbitmq_manager
from app.handlers.auth_events import AuthEventHandler

logger = get_logger(__name__)


class EventConsumer:
    """
    RabbitMQ event consumer for notification processing.

    Consumes events from the refertosicuro.events exchange and
    routes them to appropriate handlers.
    """

    def __init__(self, rabbitmq_manager: Optional[RabbitMQConnectionManager] = None):
        """
        Initialize event consumer.

        Args:
            rabbitmq_manager: RabbitMQ connection manager
        """
        self.rabbitmq_manager = rabbitmq_manager or get_rabbitmq_manager()
        self.auth_handler = AuthEventHandler()
        self.running = False

    async def start(self) -> None:
        """
        Start consuming events.

        Sets up exchange, queue, and bindings, then starts consuming messages.
        """
        logger.info("Starting event consumer...")

        # Connect to RabbitMQ
        await self.rabbitmq_manager.connect()

        # Declare main exchange
        exchange = await self.rabbitmq_manager.declare_exchange(
            name=settings.RABBITMQ_EXCHANGE,
            exchange_type="topic",
            durable=True,
        )

        # Declare Dead Letter Exchange
        dlx = await self.rabbitmq_manager.declare_exchange(
            name="refertosicuro.dlx",
            exchange_type="direct",
            durable=True,
        )

        # Declare main queue with DLQ
        queue = await self.rabbitmq_manager.declare_queue(
            name=settings.RABBITMQ_QUEUE,
            durable=True,
            arguments={
                "x-dead-letter-exchange": "refertosicuro.dlx",
                "x-dead-letter-routing-key": settings.RABBITMQ_DLQ,
            },
        )

        # Declare Dead Letter Queue
        dlq = await self.rabbitmq_manager.declare_queue(
            name=settings.RABBITMQ_DLQ,
            durable=True,
        )

        # Bind DLQ to DLX
        await dlq.bind(dlx, routing_key=settings.RABBITMQ_DLQ)

        # Bind main queue to exchange with routing keys
        routing_keys = [
            "user.*",  # All user events
            "subscription.*",  # Subscription events
            "payment.*",  # Payment events
            "quota.*",  # Quota events
            "gdpr.*",  # GDPR events
        ]

        for routing_key in routing_keys:
            await queue.bind(exchange, routing_key=routing_key)
            logger.info(f"Bound queue to routing key: {routing_key}")

        # Start consuming
        await queue.consume(self.process_message)
        self.running = True

        logger.info("✅ Event consumer started successfully")

    async def stop(self) -> None:
        """
        Stop consuming events gracefully.
        """
        logger.info("Stopping event consumer...")
        self.running = False
        await self.rabbitmq_manager.disconnect()
        logger.info("✅ Event consumer stopped")

    async def process_message(self, message: AbstractIncomingMessage) -> None:
        """
        Process incoming RabbitMQ message.

        Args:
            message: Incoming message from RabbitMQ
        """
        async with message.process():
            try:
                # Parse message
                event = json.loads(message.body.decode())
                event_type = event.get("event_type")
                correlation_id = event.get("correlation_id")

                logger.info(f"Received event: {event_type} (correlation_id={correlation_id})")

                # Route to appropriate handler
                await self.handle_event(event)

                logger.info(f"Event processed successfully: {event_type}")

            except Exception as e:
                logger.error(f"Failed to process message: {e}", exc_info=True)
                # Message will be rejected and sent to DLQ
                raise

    async def handle_event(self, event: Dict) -> None:
        """
        Route event to appropriate handler.

        Args:
            event: Event dictionary

        Raises:
            ValueError: If event type is unknown
        """
        event_type = event.get("event_type")

        # Create database session
        async with AsyncSessionLocal() as db:
            try:
                # Route to handler based on event type
                if event_type == "user.registered":
                    await self.auth_handler.handle_user_registered(event, db)

                elif event_type == "password_reset.requested":
                    await self.auth_handler.handle_password_reset_requested(event, db)

                elif event_type == "user.email_verified":
                    await self.auth_handler.handle_email_verified(event, db)

                elif event_type == "user.password_changed":
                    await self.auth_handler.handle_password_changed(event, db)

                elif event_type == "user.2fa_enabled":
                    await self.auth_handler.handle_2fa_enabled(event, db)

                elif event_type == "user.logged_in":
                    await self.auth_handler.handle_user_logged_in(event, db)

                elif event_type == "user.logged_out":
                    await self.auth_handler.handle_user_logged_out(event, db)

                # Add more event types here as needed
                # elif event_type == "subscription.created":
                #     await self.subscription_handler.handle_subscription_created(event, db)

                else:
                    logger.warning(f"Unknown event type: {event_type}")

            except Exception as e:
                logger.error(f"Event handler failed for {event_type}: {e}", exc_info=True)
                await db.rollback()
                raise

    def is_running(self) -> bool:
        """
        Check if consumer is running.

        Returns:
            True if running, False otherwise
        """
        return self.running


# Singleton instance
_event_consumer: Optional[EventConsumer] = None


def get_event_consumer() -> EventConsumer:
    """
    Get singleton event consumer instance.

    Returns:
        EventConsumer instance
    """
    global _event_consumer
    if _event_consumer is None:
        _event_consumer = EventConsumer()
    return _event_consumer
