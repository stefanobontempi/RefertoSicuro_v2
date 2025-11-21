"""
Admin Service - Main Application
================================
Admin Dashboard and Management Service
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
    logger.info("Starting Admin Service...")
    yield
    logger.info("Shutting down Admin Service...")


# Create FastAPI application
app = FastAPI(
    title="RefertoSicuro Admin Service",
    description="Admin Dashboard and Management Service",
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
        "service": "Admin Service",
        "version": "2.0.0",
        "status": "healthy",
    }


@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "admin",
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
@app.get("/api/v1/admin/status")
async def service_status() -> Dict[str, Any]:
    """Get service status and metrics."""
    return {
        "service": "admin",
        "status": "operational",
        "uptime": "0h 0m",  # TODO: Implement uptime tracking
        "requests_handled": 0,  # TODO: Implement request counting
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8013,
        reload=True,
    )
