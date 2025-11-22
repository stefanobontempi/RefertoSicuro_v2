"""
Workers Package
===============
Background workers for asynchronous task processing.
"""

from .email_worker import EmailWorker

__all__ = ["EmailWorker"]
