#!/bin/bash

# Auth Service Development Runner

echo "🚀 Starting Auth Service in development mode..."

# Set environment variables
export VAULT_ADDR="http://localhost:8200"
export VAULT_TOKEN="dev-root-token"
export ENVIRONMENT="development"
export SERVICE_NAME="auth-service"
export PORT=8001
export HOST=0.0.0.0
export LOG_LEVEL=DEBUG

# Database settings (for local connection)
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=auth_db
export REDIS_HOST=localhost
export REDIS_PORT=6379

# CORS for frontend development
export CORS_ORIGINS="http://localhost:3000,http://localhost:5173"

echo "📦 Installing dependencies..."
pip install -q -r requirements.txt 2>/dev/null || echo "Dependencies already installed"

echo "🔄 Running database migrations..."
alembic upgrade head 2>/dev/null || echo "No migrations to run"

echo "✅ Starting server on http://localhost:${PORT}"
echo "📚 API Documentation: http://localhost:${PORT}/docs"
echo "📊 Health Check: http://localhost:${PORT}/health"
echo ""

# Run with uvicorn
uvicorn app.main:app \
    --host $HOST \
    --port $PORT \
    --reload \
    --log-level $LOG_LEVEL