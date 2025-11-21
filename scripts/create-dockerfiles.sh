#!/bin/bash

# Script to create Dockerfile.dev for all services

# Define services and their ports
declare -A services=(
    ["billing"]=8012
    ["admin"]=8013
    ["analytics"]=8014
    ["notification"]=8015
)

# Base Dockerfile template for services
create_dockerfile_dev() {
    local service=$1
    local port=$2
    local dir="services/${service}"

    cat > "${dir}/Dockerfile.dev" << EOF
# Development Dockerfile for ${service^} Service
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1 \\
    PIP_NO_CACHE_DIR=1 \\
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \\
    gcc \\
    g++ \\
    curl \\
    libpq-dev \\
    build-essential \\
    postgresql-client \\
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip setuptools wheel

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements*.txt ./

# Install Python dependencies (with fallback to basic deps)
RUN pip install -r requirements.txt 2>/dev/null || \\
    pip install fastapi uvicorn sqlalchemy asyncpg redis aioredis pydantic

# Install additional dev tools
RUN pip install \\
    ipython \\
    ipdb \\
    black \\
    ruff \\
    mypy \\
    watchdog[watchmedo]

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE ${port}

# Development command with auto-reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "${port}", "--reload", "--log-level", "debug"]
EOF

    echo "Created ${dir}/Dockerfile.dev"
}

# Create basic requirements.txt if not exists
create_requirements() {
    local service=$1
    local dir="services/${service}"

    if [ ! -f "${dir}/requirements.txt" ]; then
        cat > "${dir}/requirements.txt" << EOF
# Core Dependencies
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

# Monitoring
prometheus-client==0.20.0

# Utilities
python-dateutil==2.9.0
pytz==2024.2

# Logging
structlog==24.4.0
python-json-logger==2.0.7
EOF
        echo "Created ${dir}/requirements.txt"
    fi
}

# Create main.py if not exists
create_main_py() {
    local service=$1
    local port=$2
    local dir="services/${service}"

    if [ ! -f "${dir}/app/main.py" ]; then
        mkdir -p "${dir}/app"
        cat > "${dir}/app/main.py" << EOF
"""
${service^} Service - Main Application
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="RefertoSicuro ${service^} Service",
    description="${service^} Service API",
    version="2.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "${service^} Service",
        "version": "2.0.0",
        "status": "healthy",
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "${service}",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=${port},
        reload=True,
    )
EOF
        echo "Created ${dir}/app/main.py"
    fi
}

# Process each service
for service in "${!services[@]}"; do
    port=${services[$service]}
    echo "Processing ${service} service (port ${port})..."
    create_dockerfile_dev "$service" "$port"
    create_requirements "$service"
    create_main_py "$service" "$port"
done

echo "All Dockerfiles created successfully!"