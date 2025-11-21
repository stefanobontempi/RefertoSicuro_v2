#!/bin/bash

# Setup development secrets in Vault
# Run this script after Vault is initialized and unsealed

VAULT_ADDR="http://localhost:8200"
VAULT_TOKEN="dev-root-token"

echo "Setting up Vault secrets for development..."

# Export for vault CLI
export VAULT_ADDR=$VAULT_ADDR
export VAULT_TOKEN=$VAULT_TOKEN

# Enable KV v2 secrets engine
docker exec rs_vault vault secrets enable -path=secret kv-v2 2>/dev/null || echo "KV v2 already enabled"

# Auth Service Secrets
echo "Configuring Auth Service secrets..."
docker exec rs_vault vault kv put secret/auth-service \
    DATABASE_URL="postgresql+asyncpg://auth_service:auth_dev_password@postgres:5432/auth_db" \
    REDIS_URL="redis://redis:6379/0" \
    JWT_SECRET="dev_jwt_secret_change_in_production_$(openssl rand -hex 32)" \
    CSRF_SECRET="dev_csrf_secret_change_in_production_$(openssl rand -hex 32)" \
    ACCESS_TOKEN_EXPIRE_MINUTES="15" \
    REFRESH_TOKEN_EXPIRE_DAYS="7" \
    EMAIL_VERIFICATION_EXPIRE_HOURS="24" \
    PASSWORD_RESET_EXPIRE_HOURS="1" \
    MFA_SECRET_LENGTH="32" \
    REQUIRE_EMAIL_VERIFICATION="false" \
    SMTP_HOST="mailhog" \
    SMTP_PORT="1025" \
    SMTP_USER="" \
    SMTP_PASSWORD="" \
    SMTP_TLS="false" \
    EMAIL_FROM="noreply@refertosicuro.local" \
    EMAIL_FROM_NAME="RefertoSicuro"

# Reports Service Secrets
echo "Configuring Reports Service secrets..."
docker exec rs_vault vault kv put secret/reports-service \
    DATABASE_URL="postgresql+asyncpg://reports_service:reports_dev_password@postgres:5432/reports_db" \
    REDIS_URL="redis://redis:6379/1" \
    MONGODB_URL="mongodb://admin:dev_password_change_me@mongodb:27017/reports?authSource=admin" \
    S3_ENDPOINT_URL="http://minio:9000" \
    S3_ACCESS_KEY_ID="minioadmin" \
    S3_SECRET_ACCESS_KEY="minioadmin" \
    S3_BUCKET_NAME="reports" \
    S3_REGION="us-east-1" \
    PDF_GENERATION_TIMEOUT="60" \
    MAX_UPLOAD_SIZE_MB="100" \
    ALLOWED_FILE_EXTENSIONS="pdf,jpg,jpeg,png,dcm,zip" \
    SIGNATURE_ALGORITHM="RSA" \
    SIGNATURE_KEY_SIZE="2048"

# Billing Service Secrets
echo "Configuring Billing Service secrets..."
docker exec rs_vault vault kv put secret/billing-service \
    DATABASE_URL="postgresql+asyncpg://billing_service:billing_dev_password@postgres:5432/billing_db" \
    REDIS_URL="redis://redis:6379/2" \
    STRIPE_SECRET_KEY="sk_test_placeholder" \
    STRIPE_WEBHOOK_SECRET="whsec_test_placeholder" \
    STRIPE_PUBLISHABLE_KEY="pk_test_placeholder" \
    PAYPAL_CLIENT_ID="test_client_id" \
    PAYPAL_CLIENT_SECRET="test_client_secret" \
    PAYPAL_WEBHOOK_ID="test_webhook_id" \
    PAYPAL_MODE="sandbox" \
    TAX_RATE_DEFAULT="22" \
    INVOICE_PREFIX="INV" \
    PAYMENT_GRACE_PERIOD_DAYS="30"

# Admin Service Secrets
echo "Configuring Admin Service secrets..."
docker exec rs_vault vault kv put secret/admin-service \
    DATABASE_URL="postgresql+asyncpg://admin_service:admin_dev_password@postgres:5432/admin_db" \
    REDIS_URL="redis://redis:6379/3" \
    MONGODB_URL="mongodb://admin:dev_password_change_me@mongodb:27017/analytics?authSource=admin" \
    ADMIN_DEFAULT_EMAIL="admin@refertosicuro.local" \
    ADMIN_DEFAULT_PASSWORD="Admin123!Change" \
    SESSION_SECRET="admin_session_secret_$(openssl rand -hex 32)" \
    AUDIT_LOG_RETENTION_DAYS="90" \
    BACKUP_RETENTION_DAYS="30" \
    METRICS_RETENTION_DAYS="30"

# Notification Service Secrets
echo "Configuring Notification Service secrets..."
docker exec rs_vault vault kv put secret/notification-service \
    REDIS_URL="redis://redis:6379/4" \
    RABBITMQ_URL="amqp://admin:dev_password_change_me@rabbitmq:5672/refertosicuro" \
    SMTP_HOST="mailhog" \
    SMTP_PORT="1025" \
    SMTP_USER="" \
    SMTP_PASSWORD="" \
    SMTP_TLS="false" \
    TWILIO_ACCOUNT_SID="AC_test_placeholder" \
    TWILIO_AUTH_TOKEN="test_auth_token" \
    TWILIO_PHONE_NUMBER="+1234567890" \
    FIREBASE_PROJECT_ID="refertosicuro-dev" \
    FIREBASE_PRIVATE_KEY="test_private_key" \
    PUSH_NOTIFICATION_ENABLED="false" \
    SMS_ENABLED="false" \
    EMAIL_ENABLED="true"

# Analytics Service Secrets
echo "Configuring Analytics Service secrets..."
docker exec rs_vault vault kv put secret/analytics-service \
    MONGODB_URL="mongodb://admin:dev_password_change_me@mongodb:27017/analytics?authSource=admin" \
    REDIS_URL="redis://redis:6379/5" \
    CLICKHOUSE_HOST="clickhouse" \
    CLICKHOUSE_PORT="8123" \
    CLICKHOUSE_USER="default" \
    CLICKHOUSE_PASSWORD="" \
    CLICKHOUSE_DATABASE="refertosicuro" \
    PROMETHEUS_PUSHGATEWAY_URL="http://prometheus:9091" \
    DATA_RETENTION_DAYS="365" \
    AGGREGATION_INTERVAL_MINUTES="5"

# Shared Secrets (used by multiple services)
echo "Configuring Shared secrets..."
docker exec rs_vault vault kv put secret/shared \
    ENVIRONMENT="development" \
    LOG_LEVEL="DEBUG" \
    CORS_ORIGINS="http://localhost:3000,http://localhost:5173" \
    API_RATE_LIMIT="100" \
    API_RATE_LIMIT_WINDOW="60" \
    SENTRY_DSN="" \
    OPENTELEMETRY_ENDPOINT="http://jaeger:14268/api/traces" \
    VAULT_ADDR="http://vault:8200" \
    VAULT_TOKEN="dev-root-token" \
    ENCRYPTION_KEY="$(openssl rand -base64 32)"

# Kong/API Gateway Configuration
echo "Configuring Kong secrets..."
docker exec rs_vault vault kv put secret/kong \
    POSTGRES_HOST="kong-database" \
    POSTGRES_PORT="5432" \
    POSTGRES_USER="kong" \
    POSTGRES_PASSWORD="kong_password" \
    POSTGRES_DB="kong" \
    KONG_ADMIN_LISTEN="0.0.0.0:8001" \
    KONG_PROXY_LISTEN="0.0.0.0:8000" \
    KONG_DATABASE="postgres" \
    KONG_LOG_LEVEL="debug"

# Create policies for services
echo "Creating Vault policies..."

# Auth Service Policy
docker exec rs_vault vault policy write auth-service - <<EOF
path "secret/data/auth-service" {
  capabilities = ["read"]
}
path "secret/data/shared" {
  capabilities = ["read"]
}
EOF

# Reports Service Policy
docker exec rs_vault vault policy write reports-service - <<EOF
path "secret/data/reports-service" {
  capabilities = ["read"]
}
path "secret/data/shared" {
  capabilities = ["read"]
}
EOF

# Create tokens for services (for production, use AppRole or other auth methods)
echo "Creating service tokens..."
docker exec rs_vault vault token create -policy=auth-service -ttl=720h -display-name="auth-service" | grep "token " | awk '{print "Auth Service Token: " $2}'
docker exec rs_vault vault token create -policy=reports-service -ttl=720h -display-name="reports-service" | grep "token " | awk '{print "Reports Service Token: " $2}'

echo ""
echo "✅ Vault secrets setup complete!"
echo ""
echo "📝 Important URLs:"
echo "  - Vault UI: http://localhost:8201"
echo "  - Vault API: http://localhost:8200"
echo "  - Login Token: dev-root-token"
echo ""
echo "🔐 Service Secrets Configured:"
echo "  - auth-service"
echo "  - reports-service"
echo "  - billing-service"
echo "  - admin-service"
echo "  - notification-service"
echo "  - analytics-service"
echo "  - shared"
echo "  - kong"
echo ""
echo "⚠️  Note: These are development secrets. Never use in production!"