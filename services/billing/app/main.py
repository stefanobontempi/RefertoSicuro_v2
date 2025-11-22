"""
Billing Service - Main Application
================================
Billing and Subscription Management Service
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any, Dict

from app.__version__ import __build__, __build_date__, __git_commit__, __service__, __version__
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    logger.info("Starting Billing Service...")
    yield
    logger.info("Shutting down Billing Service...")


# Create FastAPI application
app = FastAPI(
    title="RefertoSicuro Billing Service",
    description="Billing and Subscription Management Service",
    version="2.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> Dict[str, str]:
    """Root endpoint."""
    return {
        "service": __service__,
        "version": __version__,
        "status": "healthy",
    }


@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": __service__,
        "version": __version__,
        "build": __build__,
        "build_date": __build_date__,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/version")
async def version_info() -> Dict[str, str]:
    """Detailed version information."""
    return {
        "service": __service__,
        "version": __version__,
        "build": __build__,
        "build_date": __build_date__,
        "git_commit": __git_commit__,
    }


@app.get("/ready")
async def readiness_check() -> Dict[str, Any]:
    """Readiness check endpoint."""
    checks = {
        "database": True,  # TODO: Add real checks
        "redis": True,
        "dependencies": True,
    }

    return {
        "ready": all(checks.values()),
        "checks": checks,
    }


# Service-specific endpoints
@app.get("/api/v1/billing/status")
async def service_status() -> Dict[str, Any]:
    """Get service status and metrics."""
    return {
        "service": "billing",
        "status": "operational",
        "uptime": "0h 0m",  # TODO: Implement uptime tracking
        "requests_handled": 0,  # TODO: Implement request counting
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8012,
        reload=True,
    )
