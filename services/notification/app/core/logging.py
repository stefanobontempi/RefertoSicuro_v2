"""
Logging Configuration
====================
Structured logging for Notification Service
"""

import logging
import sys
from typing import Any, Dict

from app.core.config import settings


class StructuredFormatter(logging.Formatter):
    """
    Structured log formatter that outputs JSON-like logs.
    """

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as structured message."""
        log_data: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "service": settings.SERVICE_NAME,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields
        if hasattr(record, "correlation_id"):
            log_data["correlation_id"] = record.correlation_id
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "event_type"):
            log_data["event_type"] = record.event_type

        return str(log_data)


def setup_logging() -> None:
    """
    Configure logging for the service.
    """
    # Get log level from settings
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    # Create formatter
    if settings.ENVIRONMENT == "production":
        formatter = StructuredFormatter()
    else:
        # Development: use simple format
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Remove existing handlers
    root_logger.handlers = []

    # Add console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # Reduce noise from third-party libraries
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)
    logging.getLogger("aio_pika").setLevel(logging.WARNING)
    logging.getLogger("aiormq").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)

    # Log startup message
    logger = logging.getLogger(__name__)
    logger.info(
        f"Logging configured for {settings.SERVICE_NAME} "
        f"(level={settings.LOG_LEVEL}, env={settings.ENVIRONMENT})"
    )


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the given name.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)
