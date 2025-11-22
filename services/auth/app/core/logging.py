"""
Structured logging configuration for Auth Service
"""

import logging
import sys
from typing import Any

import structlog


def setup_logging(log_level: str = "INFO") -> None:
    """
    Configure structured logging with structlog

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper()),
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            (
                structlog.dev.ConsoleRenderer()
                if sys.stderr.isatty()
                else structlog.processors.JSONRenderer()
            ),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, log_level.upper())),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=False,
    )


def get_logger(name: str) -> Any:
    """
    Get a structlog logger instance

    Args:
        name: Logger name (usually __name__)

    Returns:
        Structlog logger instance
    """
    return structlog.get_logger(name)
