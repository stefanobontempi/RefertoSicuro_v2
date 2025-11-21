#!/bin/bash

# Configure Vault secrets for all services
echo "🔐 Configuring Vault secrets for all services..."

# Auth Service
echo "  📝 Auth Service..."
docker exec -e VAULT_TOKEN=dev-root-token rs_vault vault kv put secret/auth-service \
    DATABASE_URL="postgresql+asyncpg://auth_service:auth_dev_password@postgres:5432/auth_db" \
    REDIS_URL="redis://redis:6379/0" \
    JWT_SECRET="dev_jwt_secret_$(openssl rand -hex 16)" \
    CSRF_SECRET="dev_csrf_secret_$(openssl rand -hex 16)" \
    ACCESS_TOKEN_EXPIRE_MINUTES="15" \
    REFRESH_TOKEN_EXPIRE_DAYS="7" > /dev/null

# Reports Service
echo "  📝 Reports Service..."
docker exec -e VAULT_TOKEN=dev-root-token rs_vault vault kv put secret/reports-service \
    DATABASE_URL="postgresql+asyncpg://reports_service:reports_dev_password@postgres:5432/reports_db" \
    REDIS_URL="redis://redis:6379/1" \
    S3_ENDPOINT_URL="http://minio:9000" \
    S3_ACCESS_KEY_ID="minioadmin" \
    S3_SECRET_ACCESS_KEY="minioadmin" > /dev/null

# Billing Service
echo "  📝 Billing Service..."
docker exec -e VAULT_TOKEN=dev-root-token rs_vault vault kv put secret/billing-service \
    DATABASE_URL="postgresql+asyncpg://billing_service:billing_dev_password@postgres:5432/billing_db" \
    REDIS_URL="redis://redis:6379/2" > /dev/null

# Shared Configuration
echo "  📝 Shared Configuration..."
docker exec -e VAULT_TOKEN=dev-root-token rs_vault vault kv put secret/shared \
    ENVIRONMENT="development" \
    LOG_LEVEL="DEBUG" \
    VAULT_ADDR="http://vault:8200" \
    VAULT_TOKEN="dev-root-token" > /dev/null

echo "✅ Vault configuration complete!"