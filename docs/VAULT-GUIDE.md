# 🔐 HashiCorp Vault Integration Guide

## Overview

RefertoSicuro v2 utilizza **HashiCorp Vault** per la gestione centralizzata e sicura di tutti i secrets e credenziali sensibili. Questo approccio garantisce:

- ✅ **Zero secrets nel codice** - Nessuna password hardcoded
- ✅ **Rotazione automatica** - Secrets possono essere ruotati senza restart
- ✅ **Audit trail completo** - Ogni accesso ai secrets è tracciato
- ✅ **Encryption as a Service** - Crittografia dati sensibili via Transit engine
- ✅ **Dynamic credentials** - Database credentials generate dinamicamente

## 🏗️ Architettura

```
┌─────────────────────────────────────────┐
│           HashiCorp Vault               │
│                                         │
│  ┌────────────┐  ┌──────────────┐      │
│  │ KV Engine  │  │Transit Engine│      │
│  │  (Secrets) │  │(Encryption)  │      │
│  └────────────┘  └──────────────┘      │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┴──────────┐
    │                    │
┌───▼────┐        ┌──────▼──────┐
│Services│        │  Databases  │
│        │        │             │
│ - Auth │        │ - PostgreSQL│
│ - Reports       │ - MongoDB   │
│ - Billing       │ - Redis     │
│ - Admin │       └──────────────┘
│ - Analytics
│ - Notification
└─────────────────┘
```

## 🚀 Quick Start

### 1. Avviare Vault

```bash
# Avvia solo Vault
docker-compose -f docker-compose.dev.yml up -d vault

# Verifica che sia attivo
curl http://localhost:8200/v1/sys/health
```

### 2. Configurare i Secrets

```bash
# Esegui lo script di configurazione
./scripts/vault/configure-vault.sh

# Oppure per setup completo development
./scripts/vault/setup-dev-secrets.sh
```

### 3. Verificare i Secrets

```bash
# Lista tutti i secrets
docker exec -e VAULT_TOKEN=dev-root-token rs_vault vault kv list secret/

# Visualizza un secret specifico
docker exec -e VAULT_TOKEN=dev-root-token rs_vault vault kv get secret/auth-service
```

## 📦 Struttura Secrets

### Percorsi Standard

```
secret/
├── auth-service/          # Auth Service secrets
│   ├── jwt_secret
│   ├── csrf_secret
│   ├── database_url
│   └── redis_url
│
├── reports-service/       # Reports Service secrets
│   ├── database_url
│   ├── azure_openai_key
│   └── s3_credentials
│
├── billing-service/       # Billing Service secrets
│   ├── stripe_keys
│   ├── paypal_credentials
│   └── database_url
│
├── notification-service/  # Notification secrets
│   ├── smtp_config
│   ├── twilio_credentials
│   └── sendgrid_api_key
│
├── shared/               # Shared configuration
│   ├── environment
│   ├── log_level
│   └── vault_config
│
└── database/            # Database credentials
    ├── postgres/
    ├── mongodb/
    └── redis/
```

## 🐍 Python Integration

### Vault Client Usage

```python
from shared.utils.vault_client import VaultClient

# Initialize client
vault = VaultClient(
    vault_addr="http://vault:8200",
    vault_token="service-token",
    vault_path="secret/data/auth-service"
)

# Get a secret
jwt_secret = vault.get_secret("jwt_secret")
db_url = vault.get_secret("database_url")

# Get with default fallback
api_key = vault.get_secret("api_key", default="dev-key")
```

### Service Configuration

```python
# services/auth/app/core/config.py
from shared.utils.vault_client import VaultClient

class Settings:
    def __init__(self):
        self.vault = VaultClient()

        # Secrets from Vault
        self.JWT_SECRET = self.vault.get_secret("jwt_secret")
        self.DB_PASSWORD = self.vault.get_secret("db_password")

        # Non-sensitive from environment
        self.PORT = os.getenv("PORT", "8010")
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
```

## 🔒 Security Best Practices

### Development Environment

```bash
# .env.development (NON commitare!)
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=dev-root-token  # Solo per development!
```

### Production Environment

```bash
# Use AppRole authentication
export VAULT_ROLE_ID="role-id-from-ci"
export VAULT_SECRET_ID="secret-id-from-ci"

# Or Kubernetes auth
export VAULT_K8S_ROLE="refertosicuro-app"
```

### Token Management

1. **Development**: Usa token root (solo locale)
2. **Staging**: AppRole con policy limitate
3. **Production**: Kubernetes Service Account o AWS IAM

## 📝 Comandi Utili

### Gestione Secrets

```bash
# Creare un nuovo secret
vault kv put secret/my-service api_key="value" db_pass="value"

# Aggiornare un secret esistente
vault kv patch secret/my-service api_key="new-value"

# Eliminare un secret
vault kv delete secret/my-service

# Recuperare versione precedente
vault kv get -version=2 secret/my-service
```

### Policy Management

```bash
# Creare una policy
vault policy write my-service-policy - <<EOF
path "secret/data/my-service" {
  capabilities = ["read"]
}
EOF

# Assegnare policy a un token
vault token create -policy=my-service-policy
```

### Encryption as a Service

```python
# Crittografare dati sensibili
ciphertext = vault.encrypt_data("patient-data", "sensitive-info")

# Decrittografare
plaintext = vault.decrypt_data("patient-data", ciphertext)
```

## 🚨 Troubleshooting

### Problema: Vault non risponde

```bash
# Check container status
docker ps | grep vault

# Check logs
docker logs rs_vault

# Restart Vault
docker-compose -f docker-compose.dev.yml restart vault
```

### Problema: Permission denied

```bash
# Verifica token
vault token lookup

# Verifica policy
vault token capabilities secret/data/my-service
```

### Problema: Secret non trovato

```bash
# Verifica path corretto
vault kv list secret/

# Verifica versione
vault kv metadata get secret/my-service
```

## 🔄 Rotazione Secrets

### Manuale

```bash
# Script per rotare JWT secret
./scripts/vault/rotate-jwt-secret.sh
```

### Automatica (Production)

```yaml
# Configurazione rotazione automatica
vault write secret/config/rotate \
  max_versions=10 \
  cas_required=false \
  delete_version_after="30d"
```

## 📊 Monitoring

### Metrics Endpoints

- Health: `http://localhost:8200/v1/sys/health`
- Metrics: `http://localhost:8200/v1/sys/metrics`
- Audit: `vault audit list`

### Grafana Dashboard

Dashboard pre-configurate disponibili in:
- `configs/grafana/dashboards/vault-metrics.json`

## 🆘 Emergency Procedures

### Backup Vault

```bash
# Backup tutti i secrets
./scripts/vault/backup-secrets.sh

# Restore da backup
./scripts/vault/restore-secrets.sh backup-20240121.json
```

### Unseal Vault (se sealed)

```bash
# In development (auto-unseal)
docker-compose -f docker-compose.dev.yml restart vault

# In production (manual unseal)
vault operator unseal $UNSEAL_KEY_1
vault operator unseal $UNSEAL_KEY_2
vault operator unseal $UNSEAL_KEY_3
```

## 📚 Riferimenti

- [Vault Documentation](https://www.vaultproject.io/docs)
- [Best Practices](https://learn.hashicorp.com/tutorials/vault/production-hardening)
- [Python hvac Library](https://python-hvac.org/)
- [Security Model](https://www.vaultproject.io/docs/internals/security)

## ✅ Checklist Integrazione Servizio

Quando aggiungi un nuovo servizio:

- [ ] Crea path in Vault: `secret/nuovo-servizio`
- [ ] Crea policy: `vault policy write nuovo-servizio-policy`
- [ ] Genera token/AppRole per il servizio
- [ ] Configura VaultClient nel servizio
- [ ] Aggiungi secrets nello script `configure-vault.sh`
- [ ] Testa recupero secrets
- [ ] Documenta secrets necessari
- [ ] Configura rotation policy se necessario

---

**Ultimo aggiornamento**: 2024-11-21
**Versione Vault**: 1.21.1