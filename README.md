# RefertoSicuro v2 - Medical Report AI Platform

## 🏗️ Architettura Microservizi

Piattaforma completa per l'ottimizzazione di referti medici con AI, progettata con architettura a microservizi, compliance medicale built-in e gestione sicura dei secrets.

## 📁 Struttura Progetto

```
RefertoSicuro_v2/
├── services/              # Microservizi
│   ├── auth/             # Autenticazione e autorizzazione
│   ├── reports/          # Gestione referti e AI
│   ├── billing/          # Fatturazione e pagamenti
│   ├── admin/            # Dashboard amministrativa
│   ├── analytics/        # Analytics e metriche
│   ├── notification/     # Email, SMS, notifiche
│   └── gateway/          # API Gateway
├── frontend/             # React + TypeScript + Vite
├── shared/               # Librerie condivise
│   └── utils/
│       └── vault_client.py  # Client Vault per secrets
├── infrastructure/       # Docker, Kubernetes, Terraform
├── scripts/              # Script di automazione
│   └── vault/
│       └── init-vault.sh # Inizializzazione Vault
├── configs/              # Configurazioni servizi
├── docs/                 # Documentazione
├── docker-compose.dev.yml # Stack completo sviluppo
├── Makefile              # Comandi di sviluppo
└── .env.example          # Template variabili ambiente
```

## 🔒 Security & Compliance

### HashiCorp Vault Integration
- **NO secrets in .env files** - Compliance medicale garantita
- Tutti i secrets gestiti centralmente in Vault
- Encryption at rest per dati sensibili
- Transit encryption per report medici
- Audit logging completo

### Inizializzazione Vault
```bash
# 1. Avvia Vault
make start-infra

# 2. Inizializza secrets
./scripts/vault/init-vault.sh

# 3. Vault UI disponibile
http://localhost:8201
Token: dev-root-token
```

## 🚀 Quick Start

### 1. Setup Iniziale
```bash
# Clona e prepara l'ambiente
cp .env.example .env
make setup
```

### 2. Avvia l'Infrastruttura
```bash
# Avvia tutti i servizi
make up

# O avvia selettivamente:
make start-infra      # Database, Redis, RabbitMQ, Vault
make start-monitoring # Prometheus, Grafana, Jaeger
make start-tools      # pgAdmin, RedisInsight, etc.
make start-services   # Microservizi
make start-frontend   # Frontend React
```

### 3. URLs Principali

#### 🎯 Applicazione
- **Frontend**: http://localhost:5173
- **API Gateway**: http://localhost:8000

#### 🔧 Microservizi
- **Auth Service**: http://localhost:8010
- **Reports Service**: http://localhost:8011
- **Billing Service**: http://localhost:8012
- **Admin Service**: http://localhost:8013
- **Analytics Service**: http://localhost:8014
- **Notification**: http://localhost:8015

#### 🗄️ Database Tools
- **pgAdmin**: http://localhost:5050
  - Email: `admin@refertosicuro.local`
  - Password: `pgadmin_password`
- **Adminer**: http://localhost:8080
- **Mongo Express**: http://localhost:8081
- **RedisInsight**: http://localhost:8001

#### 📊 Monitoring
- **Grafana**: http://localhost:3000
  - User: `admin`
  - Password: `grafana_password`
- **Prometheus**: http://localhost:9090
- **Jaeger**: http://localhost:16686

#### 🔐 Security
- **Vault UI**: http://localhost:8201
  - Token: `dev-root-token`
- **Vault API**: http://localhost:8200

#### 🛠️ Development Tools
- **RabbitMQ Management**: http://localhost:15672
  - User: `admin`
  - Password: `dev_password_change_me`
- **Kong Admin**: http://localhost:8002
- **Konga**: http://localhost:1337
- **Swagger UI**: http://localhost:8082
- **Mailhog**: http://localhost:8025
- **MinIO Console**: http://localhost:9001
  - User: `minioadmin`
  - Password: `minioadmin123`
- **Portainer**: http://localhost:9002

## 📊 Database Schema

### 20 Tabelle Ottimizzate
- **Core**: users, sessions, reports, specialties
- **Billing**: plans, subscriptions, transactions
- **B2B**: organizations, organization_users, api_keys
- **Templates**: report_templates
- **Compliance**: consents, audit_logs, data_retention
- **Analytics**: events, metrics_daily
- **Config**: config

### Migrations
```bash
# Esegui migrations
make db-migrate

# Rollback
make db-rollback

# Reset completo (ATTENZIONE: cancella tutto)
make db-reset

# Seed con dati di test
make db-seed
```

## 🧪 Testing

```bash
# Tutti i test
make test

# Test specifici
make test-unit
make test-integration
make test-e2e

# Coverage report
make test-coverage
```

## 📝 Comandi Utili

```bash
# Visualizza tutti i comandi
make help

# Status servizi
make status

# Logs
make logs                    # Tutti i servizi
make logs-service SERVICE=auth-service  # Servizio specifico

# Database
make db-shell               # PostgreSQL CLI
make mongo-shell            # MongoDB CLI
make redis-cli              # Redis CLI

# Backup
make db-backup              # Backup database
make db-restore             # Restore ultimo backup

# Pulizia
make clean                  # Pulisci cache e temp files
make prune                  # ATTENZIONE: Rimuove tutto Docker
```

## 🏛️ Architettura Dettagliata

### Microservizi (5 Core + Gateway)
1. **Auth Service**: JWT, OAuth, 2FA
2. **Reports Service**: AI processing, templates, HL7/FHIR
3. **Billing Service**: Stripe, PayPal, subscriptions
4. **Admin Service**: Dashboard, user management
5. **Analytics Service**: Metriche, eventi, MongoDB
6. **Notification Service**: Email, SMS, push

### Comunicazione
- **Sincrona**: REST APIs via Kong Gateway
- **Asincrona**: RabbitMQ per eventi
- **Cache**: Redis shared
- **Service Discovery**: Docker Swarm built-in

### Stack Tecnologico
- **Backend**: Python 3.12, FastAPI, SQLAlchemy, Pydantic
- **Frontend**: React 18, TypeScript, Vite, Zustand, TailwindCSS
- **Database**: PostgreSQL 15 + MongoDB 7
- **Cache/Queue**: Redis 7 + RabbitMQ 3.12
- **Secret Management**: HashiCorp Vault
- **Monitoring**: Prometheus + Grafana + Jaeger
- **API Gateway**: Kong

## 🔐 Vault Integration Example

```python
# In ogni microservizio
from shared.utils.vault_client import initialize_vault

# Inizializza per il servizio
config = initialize_vault("auth-service")

# Recupera secrets
JWT_SECRET = config.get_required("jwt_secret")
DATABASE_URL = config.get_database_url("postgres")

# Cripta dati sensibili
vault = VaultClient()
encrypted = vault.encrypt_data(report_text, "reports")
decrypted = vault.decrypt_data(encrypted, "reports")
```

## 📈 Performance Targets
- **Uptime**: 99.9% (43 min/mese max downtime)
- **Response Time**: p95 < 500ms
- **Test Coverage**: 95%+
- **Security Score**: A+

## 🚨 Note Importanti

1. **MAI committare .env con secrets reali**
2. **Usa sempre Vault per secrets in produzione**
3. **Database migrations sempre tramite Alembic**
4. **Test coverage minimo 95%**
5. **Code review obbligatoria**

## 📚 Documentazione Completa
- `claude.md` - Architettura dettagliata v2
- `database-schema-v2.md` - Schema database completo
- `planning-quiz-v2.md` - Decisioni architetturali

## 🤝 Team
- 2-3 Full-stack developers
- Scrum 2 settimane
- Full remote
- Weekly releases

## 📅 Roadmap
- **Fase 1 (Mesi 1-2)**: MVP con 5 servizi core
- **Fase 2 (Mesi 3-4)**: 19+ specialità, PayPal, voice
- **Fase 3 (Mesi 5-6)**: HL7/FHIR, marketplace, B2B
- **Fase 4 (Mesi 7+)**: Kubernetes, multi-region

---

**Sviluppato con ❤️ per la compliance medicale italiana**