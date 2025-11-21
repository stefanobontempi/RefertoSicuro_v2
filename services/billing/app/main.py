"""
Billing Service - Main Application
================================
Billing and Subscription Management Service
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

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
        "service": "Billing Service",
        "version": "2.0.0",
        "status": "healthy",
    }


@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "billing",
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
