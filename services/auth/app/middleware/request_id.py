"""
Request ID middleware for distributed tracing
"""

import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add X-Request-ID header to all requests/responses
    for distributed tracing and correlation
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and add Request ID

        Args:
            request: Incoming HTTP request
            call_next: Next middleware/handler

        Returns:
            HTTP response with X-Request-ID header
        """
        # Get or generate request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        # Store request ID in request state
        request.state.request_id = request_id

        # Process request
        response = await call_next(request)

        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id

        return response
