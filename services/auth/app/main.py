"""
Auth Service - Main Application
================================
Handles authentication, authorization, and user management
with JWT tokens, refresh tokens, CSRF protection, and Vault integration.
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from app.__version__ import __build__, __build_date__, __git_commit__, __service__, __version__
from app.api import router
from app.core.config import settings
from app.core.database import Base, engine
from app.core.logging import setup_logging
from app.core.vault import vault_client
from app.middleware.csrf import CSRFMiddleware
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from app.utils.rate_limiter import limiter
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from prometheus_client import make_asgi_app
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Manage application lifecycle.
    Initialize resources on startup and cleanup on shutdown.
    """
    # Startup
    logger.info("Starting Auth Service...")

    # Initialize Vault client
    vault_client.initialize()
    logger.info("Vault client initialized")

    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")

    # Add Prometheus metrics endpoint
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)

    logger.info("Auth Service started successfully")

    yield

    # Shutdown
    logger.info("Shutting down Auth Service...")
    await engine.dispose()
    logger.info("Auth Service shut down successfully")


# Create FastAPI application
app = FastAPI(
    title="RefertoSicuro Auth Service",
    description="Authentication and Authorization Service with JWT, CSRF protection, and Vault integration",
    version="2.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    openapi_url="/openapi.json" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add middleware (order matters!)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# CSRF Protection
app.add_middleware(
    CSRFMiddleware,
    secret=settings.CSRF_SECRET,
    cookie_name="csrf_token",
    header_name="X-CSRF-Token",
)

# Trusted Host
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Token", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)

# Include routers
app.include_router(router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": __service__,
        "version": __version__,
        "status": "healthy",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    from datetime import datetime

    try:
        # Check database connection
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")

        # Check Vault connection
        vault_status = vault_client.is_healthy()

        return {
            "status": "healthy",
            "service": __service__,
            "version": __version__,
            "build": __build__,
            "build_date": __build_date__,
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected",
            "vault": "connected" if vault_status else "disconnected",
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": __service__,
            "version": __version__,
            "error": str(e),
        }


@app.get("/version")
async def version_info():
    """Detailed version information."""
    return {
        "service": __service__,
        "version": __version__,
        "build": __build__,
        "build_date": __build_date__,
        "git_commit": __git_commit__,
    }


@app.get("/ready")
async def readiness_check():
    """Readiness check for Kubernetes."""
    # Similar to health but more thorough
    checks = {
        "database": False,
        "vault": False,
        "redis": False,
    }

    try:
        # Check database
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")
        checks["database"] = True

        # Check Vault
        checks["vault"] = vault_client.is_healthy()

        # Check Redis (for rate limiting/sessions)
        from app.core.redis import redis_client

        await redis_client.ping()
        checks["redis"] = True

    except Exception as e:
        logger.error(f"Readiness check failed: {e}")

    all_ready = all(checks.values())

    return {
        "ready": all_ready,
        "checks": checks,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_level=settings.LOG_LEVEL.lower(),
    )
