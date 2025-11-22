"""
CSRF Protection middleware
"""

import hmac
import logging
import secrets
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    CSRF Protection middleware using double-submit cookie pattern
    """

    def __init__(
        self,
        app,
        secret: str,
        cookie_name: str = "csrf_token",
        header_name: str = "X-CSRF-Token",
        safe_methods: set = None,
    ):
        """
        Initialize CSRF middleware

        Args:
            app: FastAPI application
            secret: Secret key for CSRF token generation
            cookie_name: Name of the CSRF cookie
            header_name: Name of the CSRF header
            safe_methods: HTTP methods that don't require CSRF check
        """
        super().__init__(app)
        self.secret = secret
        self.cookie_name = cookie_name
        self.header_name = header_name
        self.safe_methods = safe_methods or {"GET", "HEAD", "OPTIONS", "TRACE"}

    def generate_csrf_token(self) -> str:
        """
        Generate a new CSRF token

        Returns:
            CSRF token string
        """
        return secrets.token_urlsafe(32)

    def verify_csrf_token(self, cookie_token: str, header_token: str) -> bool:
        """
        Verify CSRF token using constant-time comparison

        Args:
            cookie_token: Token from cookie
            header_token: Token from header

        Returns:
            True if tokens match, False otherwise
        """
        if not cookie_token or not header_token:
            return False

        return hmac.compare_digest(cookie_token, header_token)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and verify CSRF token

        Args:
            request: Incoming HTTP request
            call_next: Next middleware/handler

        Returns:
            HTTP response
        """
        # Skip CSRF check for safe methods
        if request.method in self.safe_methods:
            response = await call_next(request)

            # Set CSRF token cookie on GET requests if not present
            if request.method == "GET" and self.cookie_name not in request.cookies:
                csrf_token = self.generate_csrf_token()
                response.set_cookie(
                    key=self.cookie_name,
                    value=csrf_token,
                    httponly=True,
                    secure=True,
                    samesite="strict",
                )
            return response

        # For unsafe methods, verify CSRF token
        cookie_token = request.cookies.get(self.cookie_name)
        header_token = request.headers.get(self.header_name)

        if not self.verify_csrf_token(cookie_token, header_token):
            logger.warning(
                f"CSRF token mismatch for {request.method} {request.url.path} "
                f"from {request.client.host if request.client else 'unknown'}"
            )
            return JSONResponse(
                status_code=403,
                content={"detail": "CSRF token validation failed"},
            )

        response = await call_next(request)
        return response
