#!/bin/bash

# RefertoSicuro v2 - Vault Initialization Script
# ==============================================
# This script initializes HashiCorp Vault with all necessary secrets
# Run this after Vault is up and running

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vault configuration
VAULT_ADDR=${VAULT_ADDR:-"http://localhost:8200"}
VAULT_TOKEN=${VAULT_TOKEN:-"dev-root-token"}

echo -e "${GREEN}Initializing Vault for RefertoSicuro v2...${NC}"

# Wait for Vault to be ready
echo -e "${YELLOW}Waiting for Vault to be ready...${NC}"
until vault status 2>/dev/null; do
  sleep 2
done

# Login to Vault
echo -e "${YELLOW}Logging into Vault...${NC}"
vault login token=${VAULT_TOKEN}

# Enable KV v2 secrets engine
echo -e "${YELLOW}Enabling KV v2 secrets engine...${NC}"
vault secrets enable -path=secret kv-v2 || true

# ===========================================
# AUTH SERVICE SECRETS
# ===========================================
echo -e "${GREEN}Configuring Auth Service secrets...${NC}"
vault kv put secret/auth-service \
  jwt_secret="$(openssl rand -base64 32)" \
  password_reset_secret="$(openssl rand -base64 32)" \
  email_verification_secret="$(openssl rand -base64 32)" \
  csrf_secret="$(openssl rand -base64 32)" \
  oauth_google_client_id="" \
  oauth_google_client_secret="" \
  oauth_microsoft_client_id="" \
  oauth_microsoft_client_secret=""

# ===========================================
# REPORTS SERVICE SECRETS
# ===========================================
echo -e "${GREEN}Configuring Reports Service secrets...${NC}"
vault kv put secret/reports-service \
  azure_openai_endpoint="${AZURE_OPENAI_ENDPOINT:-}" \
  azure_openai_key="${AZURE_OPENAI_KEY:-}" \
  azure_openai_deployment="gpt-4o" \
  azure_speech_key="${AZURE_SPEECH_KEY:-}" \
  azure_speech_region="${AZURE_SPEECH_REGION:-westeurope}" \
  openai_api_key="${OPENAI_API_KEY:-}" \
  openai_organization="${OPENAI_ORGANIZATION:-}"

# ===========================================
# BILLING SERVICE SECRETS
# ===========================================
echo -e "${GREEN}Configuring Billing Service secrets...${NC}"
vault kv put secret/billing-service \
  stripe_publishable_key="${STRIPE_PUBLISHABLE_KEY:-pk_test_}" \
  stripe_secret_key="${STRIPE_SECRET_KEY:-sk_test_}" \
  stripe_webhook_secret="${STRIPE_WEBHOOK_SECRET:-whsec_}" \
  stripe_price_id_basic="${STRIPE_PRICE_ID_BASIC:-}" \
  stripe_price_id_pro="${STRIPE_PRICE_ID_PRO:-}" \
  stripe_price_id_enterprise="${STRIPE_PRICE_ID_ENTERPRISE:-}" \
  paypal_client_id="${PAYPAL_CLIENT_ID:-}" \
  paypal_client_secret="${PAYPAL_CLIENT_SECRET:-}" \
  paypal_webhook_id="${PAYPAL_WEBHOOK_ID:-}"

# ===========================================
# NOTIFICATION SERVICE SECRETS
# ===========================================
echo -e "${GREEN}Configuring Notification Service secrets...${NC}"
vault kv put secret/notification-service \
  smtp_host="${SMTP_HOST:-mailhog}" \
  smtp_port="${SMTP_PORT:-1025}" \
  smtp_user="${SMTP_USER:-}" \
  smtp_password="${SMTP_PASSWORD:-}" \
  smtp_from_email="${SMTP_FROM_EMAIL:-noreply@refertosicuro.it}" \
  smtp_from_name="${SMTP_FROM_NAME:-RefertoSicuro}" \
  twilio_account_sid="${TWILIO_ACCOUNT_SID:-}" \
  twilio_auth_token="${TWILIO_AUTH_TOKEN:-}" \
  twilio_phone_number="${TWILIO_PHONE_NUMBER:-}" \
  fcm_server_key="${FCM_SERVER_KEY:-}" \
  apns_key_id="${APNS_KEY_ID:-}" \
  apns_team_id="${APNS_TEAM_ID:-}"

# ===========================================
# ADMIN SERVICE SECRETS
# ===========================================
echo -e "${GREEN}Configuring Admin Service secrets...${NC}"
vault kv put secret/admin-service \
  admin_secret_key="$(openssl rand -base64 32)" \
  admin_jwt_secret="$(openssl rand -base64 32)" \
  admin_2fa_secret="$(openssl rand -base64 32)"

# ===========================================
# ANALYTICS SERVICE SECRETS
# ===========================================
echo -e "${GREEN}Configuring Analytics Service secrets...${NC}"
vault kv put secret/analytics-service \
  mongodb_connection_string="mongodb://admin:dev_password_change_me@mongodb:27017/refertosicuro_analytics?authSource=admin" \
  analytics_api_key="$(openssl rand -base64 32)"

# ===========================================
# SHARED SECRETS
# ===========================================
echo -e "${GREEN}Configuring shared secrets...${NC}"
vault kv put secret/shared \
  master_encryption_key="$(openssl rand -base64 32)" \
  api_gateway_secret="$(openssl rand -base64 32)" \
  internal_service_token="$(openssl rand -base64 32)" \
  sentry_dsn="${SENTRY_DSN:-}" \
  s3_access_key_id="${S3_ACCESS_KEY_ID:-minioadmin}" \
  s3_secret_access_key="${S3_SECRET_ACCESS_KEY:-minioadmin123}" \
  s3_endpoint_url="${S3_ENDPOINT_URL:-http://minio:9000}"

# ===========================================
# DATABASE CREDENTIALS
# ===========================================
echo -e "${GREEN}Configuring database credentials...${NC}"
vault kv put secret/database/postgres \
  host="postgres" \
  port="5432" \
  database="refertosicuro_dev" \
  username="refertosicuro" \
  password="$(openssl rand -base64 16)" \
  ssl_mode="prefer"

vault kv put secret/database/mongodb \
  host="mongodb" \
  port="27017" \
  database="refertosicuro_analytics" \
  username="admin" \
  password="$(openssl rand -base64 16)"

vault kv put secret/database/redis \
  host="redis" \
  port="6379" \
  password="" \
  db="0"

# ===========================================
# API KEYS FOR PARTNERS
# ===========================================
echo -e "${GREEN}Configuring partner API keys...${NC}"
vault kv put secret/api-keys/partners \
  demo_hospital="$(openssl rand -base64 32)" \
  demo_clinic="$(openssl rand -base64 32)"

# ===========================================
# ENCRYPTION KEYS
# ===========================================
echo -e "${GREEN}Configuring encryption keys...${NC}"
vault kv put secret/encryption \
  report_encryption_key="$(openssl rand -base64 32)" \
  pii_encryption_key="$(openssl rand -base64 32)" \
  audit_log_encryption_key="$(openssl rand -base64 32)" \
  backup_encryption_key="$(openssl rand -base64 32)"

# ===========================================
# COMPLIANCE KEYS
# ===========================================
echo -e "${GREEN}Configuring compliance keys...${NC}"
vault kv put secret/compliance \
  gdpr_processor_key="$(openssl rand -base64 32)" \
  anonymization_salt="$(openssl rand -hex 16)" \
  audit_hmac_key="$(openssl rand -base64 32)"

# ===========================================
# ENABLE AUDIT LOGGING
# ===========================================
echo -e "${GREEN}Enabling audit logging...${NC}"
vault audit enable file file_path=/vault/logs/audit.log || true

# ===========================================
# CREATE POLICIES
# ===========================================
echo -e "${GREEN}Creating access policies...${NC}"

# Policy for auth-service
vault policy write auth-service - <<EOF
path "secret/data/auth-service" {
  capabilities = ["read"]
}
path "secret/data/shared" {
  capabilities = ["read"]
}
path "secret/data/database/postgres" {
  capabilities = ["read"]
}
path "secret/data/database/redis" {
  capabilities = ["read"]
}
EOF

# Policy for reports-service
vault policy write reports-service - <<EOF
path "secret/data/reports-service" {
  capabilities = ["read"]
}
path "secret/data/shared" {
  capabilities = ["read"]
}
path "secret/data/database/postgres" {
  capabilities = ["read"]
}
path "secret/data/database/redis" {
  capabilities = ["read"]
}
path "secret/data/encryption" {
  capabilities = ["read"]
}
EOF

# Policy for billing-service
vault policy write billing-service - <<EOF
path "secret/data/billing-service" {
  capabilities = ["read"]
}
path "secret/data/shared" {
  capabilities = ["read"]
}
path "secret/data/database/postgres" {
  capabilities = ["read"]
}
path "secret/data/database/redis" {
  capabilities = ["read"]
}
EOF

# Policy for admin-service
vault policy write admin-service - <<EOF
path "secret/data/admin-service" {
  capabilities = ["read"]
}
path "secret/data/shared" {
  capabilities = ["read"]
}
path "secret/data/database/*" {
  capabilities = ["read"]
}
path "secret/data/api-keys/*" {
  capabilities = ["read", "list"]
}
EOF

# Policy for analytics-service
vault policy write analytics-service - <<EOF
path "secret/data/analytics-service" {
  capabilities = ["read"]
}
path "secret/data/shared" {
  capabilities = ["read"]
}
path "secret/data/database/mongodb" {
  capabilities = ["read"]
}
path "secret/data/database/redis" {
  capabilities = ["read"]
}
EOF

# Policy for notification-service
vault policy write notification-service - <<EOF
path "secret/data/notification-service" {
  capabilities = ["read"]
}
path "secret/data/shared" {
  capabilities = ["read"]
}
path "secret/data/database/postgres" {
  capabilities = ["read"]
}
path "secret/data/database/redis" {
  capabilities = ["read"]
}
EOF

# ===========================================
# ENABLE TRANSIT ENGINE (for encryption)
# ===========================================
echo -e "${GREEN}Enabling transit engine for encryption...${NC}"
vault secrets enable transit || true

# Create encryption keys
vault write -f transit/keys/reports type=aes256-gcm96
vault write -f transit/keys/personal-data type=aes256-gcm96
vault write -f transit/keys/audit-logs type=aes256-gcm96

# ===========================================
# CREATE SERVICE TOKENS
# ===========================================
echo -e "${GREEN}Creating service tokens...${NC}"

# Note: In production, use proper authentication methods (AppRole, Kubernetes, etc.)
# These tokens are only for development

vault token create -policy=auth-service -id=auth-service-dev-token
vault token create -policy=reports-service -id=reports-service-dev-token
vault token create -policy=billing-service -id=billing-service-dev-token
vault token create -policy=admin-service -id=admin-service-dev-token
vault token create -policy=analytics-service -id=analytics-service-dev-token
vault token create -policy=notification-service -id=notification-service-dev-token

# ===========================================
# SUMMARY
# ===========================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Vault initialization complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Vault UI available at:${NC} http://localhost:8201"
echo -e "${YELLOW}Login token:${NC} dev-root-token"
echo ""
echo -e "${YELLOW}Service tokens created:${NC}"
echo "  - auth-service-dev-token"
echo "  - reports-service-dev-token"
echo "  - billing-service-dev-token"
echo "  - admin-service-dev-token"
echo "  - analytics-service-dev-token"
echo "  - notification-service-dev-token"
echo ""
echo -e "${RED}WARNING:${NC} These are development tokens!"
echo "In production, use proper authentication methods like AppRole or Kubernetes auth."