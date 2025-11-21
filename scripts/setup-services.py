#!/usr/bin/env python3
"""Setup script to create basic files for all services."""

import os
from pathlib import Path

# Service configurations
SERVICES = {
    "billing": {
        "port": 8012,
        "description": "Billing and Subscription Management Service",
        "extra_deps": ["stripe==11.1.0", "paypal-rest==1.0.0"],
    },
    "admin": {
        "port": 8013,
        "description": "Admin Dashboard and Management Service",
        "extra_deps": ["pandas==2.2.3", "openpyxl==3.1.5", "plotly==5.24.1"],
    },
    "analytics": {
        "port": 8014,
        "description": "Analytics and Metrics Service",
        "extra_deps": ["motor==3.6.0", "pandas==2.2.3", "numpy==2.1.2"],
    },
    "notification": {
        "port": 8015,
        "description": "Notification Service (Email, SMS, Push)",
        "extra_deps": ["aiosmtplib==3.0.2", "jinja2==3.1.4", "twilio==9.3.4"],
    },
}

# Base requirements template
BASE_REQUIREMENTS = """# Core Dependencies
fastapi==0.115.0
uvicorn[standard]==0.30.6
python-multipart==0.0.9
gunicorn==21.2.0

# Database
sqlalchemy==2.0.35
asyncpg==0.29.0
alembic==1.13.2

# Redis
redis==5.0.8
aioredis==2.0.1

# Validation
pydantic==2.9.2
pydantic-settings==2.5.2

# HTTP Client
httpx==0.27.2
aiohttp==3.10.5

# Message Queue
aio-pika==9.4.3

# Monitoring
prometheus-client==0.20.0

# Utilities
python-dateutil==2.9.0
pytz==2024.2

# Logging
structlog==24.4.0
python-json-logger==2.0.7

# Service-specific dependencies
"""

# Main.py template
MAIN_PY_TEMPLATE = '''"""
{service_title} Service - Main Application
================================
{description}
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
    logger.info("Starting {service_title} Service...")
    yield
    logger.info("Shutting down {service_title} Service...")


# Create FastAPI application
app = FastAPI(
    title="RefertoSicuro {service_title} Service",
    description="{description}",
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
    return {{
        "service": "{service_title} Service",
        "version": "2.0.0",
        "status": "healthy",
    }}


@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint."""
    return {{
        "status": "healthy",
        "service": "{service_name}",
    }}


@app.get("/ready")
async def readiness_check() -> Dict[str, Any]:
    """Readiness check endpoint."""
    checks = {{
        "database": True,  # TODO: Add real checks
        "redis": True,
        "dependencies": True,
    }}

    return {{
        "ready": all(checks.values()),
        "checks": checks,
    }}


# Service-specific endpoints
@app.get("/api/v1/{service_name}/status")
async def service_status() -> Dict[str, Any]:
    """Get service status and metrics."""
    return {{
        "service": "{service_name}",
        "status": "operational",
        "uptime": "0h 0m",  # TODO: Implement uptime tracking
        "requests_handled": 0,  # TODO: Implement request counting
    }}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port={port},
        reload=True,
    )
'''


def create_service_files(service_name: str, config: dict):
    """Create necessary files for a service."""
    base_path = Path(f"services/{service_name}")
    app_path = base_path / "app"

    # Create directories
    app_path.mkdir(parents=True, exist_ok=True)

    # Create __init__.py
    (app_path / "__init__.py").touch()

    # Create main.py if it doesn't exist
    main_py_path = app_path / "main.py"
    if not main_py_path.exists():
        content = MAIN_PY_TEMPLATE.format(
            service_name=service_name,
            service_title=service_name.capitalize(),
            description=config["description"],
            port=config["port"],
        )
        main_py_path.write_text(content)
        print(f"✅ Created {main_py_path}")

    # Create requirements.txt if it doesn't exist
    req_path = base_path / "requirements.txt"
    if not req_path.exists():
        requirements = BASE_REQUIREMENTS + "\n".join(config.get("extra_deps", []))
        req_path.write_text(requirements)
        print(f"✅ Created {req_path}")

    # Create empty tests directory
    tests_path = base_path / "tests"
    tests_path.mkdir(exist_ok=True)
    (tests_path / "__init__.py").touch()

    # Create basic test file
    test_file = tests_path / "test_main.py"
    if not test_file.exists():
        test_content = f'''"""Tests for {service_name} service."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "{service_name.capitalize()} Service"


def test_health():
    """Test health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
'''
        test_file.write_text(test_content)
        print(f"✅ Created {test_file}")


def main():
    """Main function."""
    print("🚀 Setting up microservices...")

    for service_name, config in SERVICES.items():
        print(f"\n📦 Processing {service_name} service...")
        create_service_files(service_name, config)

    print("\n✅ All services setup complete!")
    print("\n📋 Next steps:")
    print("1. Run: make dev-up")
    print("2. Check services at:")
    for service_name, config in SERVICES.items():
        print(f"   - {service_name}: http://localhost:{config['port']}")


if __name__ == "__main__":
    main()