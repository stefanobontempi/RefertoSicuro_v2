"""
Notification Service - Main Application
================================
Notification Service (Email, SMS, Push)
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
    import asyncio

    from app.core.logging import setup_logging
    from app.services.event_consumer import get_event_consumer
    from app.workers.email_worker import get_email_worker

    # Setup structured logging
    setup_logging()
    logger.info("🚀 Starting Notification Service...")

    # Start RabbitMQ event consumer
    consumer = get_event_consumer()
    consumer_task = None
    try:
        consumer_task = asyncio.create_task(consumer.start())
        logger.info("   ✅ RabbitMQ consumer: ACTIVE")
    except Exception as e:
        logger.error(f"   ❌ Failed to start event consumer: {e}", exc_info=True)
        # Continue startup even if consumer fails (for development)

    # Start Email worker
    worker = get_email_worker()
    worker_task = None
    try:
        worker_task = asyncio.create_task(worker.start())
        logger.info("   ✅ Email worker: ACTIVE")
    except Exception as e:
        logger.error(f"   ❌ Failed to start email worker: {e}", exc_info=True)

    logger.info("✅ Notification Service started successfully")

    yield

    # Shutdown
    logger.info("🛑 Shutting down Notification Service...")

    # Cancel both tasks
    tasks_to_cancel = []
    if consumer_task and not consumer_task.done():
        consumer_task.cancel()
        tasks_to_cancel.append(consumer_task)

    if worker_task and not worker_task.done():
        worker_task.cancel()
        tasks_to_cancel.append(worker_task)

    # Wait for graceful shutdown
    if tasks_to_cancel:
        await asyncio.gather(*tasks_to_cancel, return_exceptions=True)

    logger.info("✅ Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="RefertoSicuro Notification Service",
    description="Notification Service (Email, SMS, Push)",
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


# Include API routers
from app.api.v1 import notifications, templates

app.include_router(notifications.router)
app.include_router(templates.router)


# Service-specific endpoints
@app.get("/api/v1/notification/status")
async def service_status() -> Dict[str, Any]:
    """Get service status and metrics."""
    return {
        "service": "notification",
        "status": "operational",
        "uptime": "0h 0m",  # TODO: Implement uptime tracking
        "requests_handled": 0,  # TODO: Implement request counting
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8015,
        reload=True,
    )
