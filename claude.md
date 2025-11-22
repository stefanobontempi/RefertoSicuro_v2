# RefertoSicuro v2

**Piattaforma SaaS medicale AI-powered per l'ottimizzazione automatica di referti medici**, progettata per medici e operatori sanitari italiani. Utilizza Azure OpenAI con assistenti specializzati per migliorare la qualità e completezza dei referti medici in 19+ specializzazioni.

## 📁 Struttura Repository

```
RefertoSicuro_v2/
├── backend/               # Microservizi FastAPI (Auth, Reports, Billing, Admin, Analytics, Notification)
│   ├── app/              # Codice applicativo
│   │   ├── api/v1/      # API endpoints RESTful
│   │   ├── core/        # Configurazione e security
│   │   ├── domain/      # Business logic
│   │   ├── models/      # SQLAlchemy models
│   │   └── services/    # Application services
│   └── tests/           # Test pytest con coverage >80%
│
├── frontend/             # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── components/  # Componenti riusabili
│   │   ├── features/    # Moduli feature-based
│   │   ├── pages/       # Pagine dell'applicazione
│   │   └── store/       # Zustand state management
│   └── tests/           # Vitest + React Testing Library
│
├── infrastructure/       # Docker, Kubernetes, Terraform
├── scripts/             # Script di setup e utility
│   └── vault/          # Gestione secrets con HashiCorp Vault
├── docs/                # Documentazione tecnica
└── .github/workflows/   # CI/CD con GitHub Actions
```

## 🤖 Istruzioni Operative per l'Agente AI

### Principi di Sviluppo

1. **Security First**: Ogni componente deve essere progettato con sicurezza in mente (encryption, validation, sanitization)
2. **Clean Architecture**: Separazione netta tra business logic e infrastruttura
3. **Test-Driven**: Minimo 80% code coverage, test su ogni feature
4. **Zero Secrets**: MAI hardcodare secrets nel codice - usa sempre Vault
5. **Medical Compliance**: Ogni feature deve rispettare GDPR, AI Act e normative medicali

### Workflow di Sviluppo

- **Branch Strategy**: `main` → `develop` → `feature/RS-XXX-description` (vedi [docs/devops/BRANCHING.md](/docs/devops/BRANCHING.md))
- **Commit Format**: tipo(scope): descrizione (es: `feat(auth): add 2FA support`)
- **Code Review**: Ogni PR richiede almeno 1 review (2 per main)
- **Testing**: Esegui sempre test locali prima di committare
- **Security Scan**: Verifica vulnerabilità con `trivy` e `semgrep`
- **Versioning**: Semantic versioning (MAJOR.MINOR.PATCH) - vedi [docs/devops/VERSIONING.md](/docs/devops/VERSIONING.md)

### Accesso Server Staging

```bash
# SSH to staging server (Hetzner VPS)
ssh -i ~/Desktop/refertosicuro_staging_key root@91.99.223.25
```

**Server Details**:

- **IP**: 91.99.223.25
- **User**: root (stefano will be created by setup script)
- **SSH Key**: `~/Desktop/refertosicuro_staging_key`
- **Documentation**: [docs/devops/STAGING-SETUP.md](/docs/devops/STAGING-SETUP.md)

**Note**: L'utente `stefano` sarà creato automaticamente dallo script `setup-staging-server.sh`

### Comandi Make Disponibili

Il progetto include un Makefile completo per semplificare lo sviluppo. Usa `make help` per vedere tutti i comandi.

#### 🚀 Comandi Principali

```bash
# Setup & Initialization
make setup              # Initial project setup completo
make deps               # Installa tutte le dipendenze (Python + Node)

# Docker Services Control
make up                 # Avvia tutti i servizi (shortcut: make u)
make down               # Ferma tutti i servizi (shortcut: make d)
make restart            # Riavvia tutti i servizi (shortcut: make r)
make rebuild            # Rebuild e riavvia tutti i servizi
make status             # Mostra stato servizi (shortcut: make s)
make urls               # Mostra tutti gli URL dei servizi

# Logs & Monitoring
make logs               # Mostra log di tutti i servizi (shortcut: make l)
make logs-service SERVICE=auth-service  # Log di un servizio specifico
make health             # Check health di tutti i servizi
make metrics            # Apre Grafana dashboard
make traces             # Apre Jaeger UI per distributed tracing
```

#### 🗄️ Database Operations

```bash
make db-migrate         # Esegui database migrations
make db-rollback        # Rollback ultima migration
make db-reset           # Reset database (⚠️ DISTRUGGE TUTTI I DATI)
make db-seed            # Popola database con dati di test
make db-backup          # Backup del database
make db-restore         # Restore da ultimo backup
make db-shell           # Apre PostgreSQL shell
make mongo-shell        # Apre MongoDB shell
make redis-cli          # Apre Redis CLI
```

#### 🧪 Testing & Quality

```bash
make test               # Esegui tutti i test (unit + integration + e2e)
make test-unit          # Solo unit tests
make test-integration   # Solo integration tests
make test-e2e           # Solo end-to-end tests
make test-coverage      # Genera report di coverage

make lint               # Esegui linters (ruff, mypy, eslint)
make format             # Formatta codice (black, isort, prettier)
make type-check         # Type checking (mypy, TypeScript)
```

#### 🔧 Development Utilities

```bash
make shell SERVICE=auth-service     # Shell in un servizio
make python-shell SERVICE=reports   # Python REPL in un servizio
make clean              # Pulisci file temporanei e cache
make prune              # ⚠️ Rimuovi TUTTI i container/volumi/immagini Docker
```

#### 🎯 Service Groups Control

```bash
make start-infra        # Solo infrastructure (DB, Redis, RabbitMQ)
make start-monitoring   # Solo monitoring (Prometheus, Grafana, Jaeger)
make start-tools        # Solo dev tools (pgAdmin, Adminer, etc.)
make start-services     # Solo microservizi
make start-frontend     # Solo frontend
```

#### 📚 Documentation

```bash
make docs               # Genera documentazione API (OpenAPI)
make diagram            # Genera diagrammi architettura
```

### Comandi Manuali Essenziali

```bash
# Backend (se preferisci non usare Make)
cd backend
poetry install                   # Installa dipendenze
poetry run pytest                 # Esegui test
poetry run uvicorn app.main:app  # Avvia server

# Frontend (se preferisci non usare Make)
cd frontend
pnpm install                     # Installa dipendenze
pnpm test                        # Esegui test
pnpm dev                         # Avvia development server

# Infrastructure
docker-compose -f docker-compose.dev.yml up -d  # Avvia tutti i servizi
./scripts/vault/setup-dev-secrets.sh            # Setup secrets locali
```

### API Design Guidelines

- Usa sempre Pydantic per validazione input/output
- Implementa rate limiting su ogni endpoint
- Log strutturato con correlation IDs
- Gestione errori consistente con status codes appropriati
- Documentazione OpenAPI automatica

## 🎯 Scopo dell'Applicazione

### Problema che Risolve

I medici italiani passano ore a scrivere referti medici che devono essere:

- **Completi**: Includere tutte le informazioni cliniche rilevanti
- **Precisi**: Utilizzare terminologia medica corretta
- **Conformi**: Rispettare standard e linee guida della specializzazione
- **Leggibili**: Essere chiari per altri medici e pazienti

### Come Funziona RefertoSicuro

1. **Input del Medico**

   - Il medico accede con credenziali sicure (JWT + 2FA opzionale)
   - Seleziona la specializzazione medica (19+ disponibili)
   - Inserisce il referto da migliorare (testo o dettatura vocale)

2. **Elaborazione AI**

   - Azure OpenAI con assistente specializzato per quella specialità
   - Streaming SSE per risposta in tempo reale
   - Eliminazione immediata della risposta AI, nessun dato memorizzato salvo consent esplicito per debug, attivabile solo dall'utente

3. **Output Ottimizzato**
   - Referto migliorato con terminologia corretta
   - Struttura standard per la specializzazione
   - Completezza delle informazioni cliniche
   - **IMPORTANTE**: Output è sempre un suggerimento - responsabilità finale del medico

### Piani di Abbonamento

- **Trial** (7 giorni): Test gratuito, tutte le funzionalità attive, 20 referti
- **Basic** (€19/mese): 300 referti, 1 specializzazione
- **Medium** (€49/mese): 800 referti, 3 specializzazioni, voice-to-text
- **Professional** (€99/mese): 1500 referti, voice-to-text, API partner, input templates custom
- **Enterprise**: Soluzioni custom per ospedali e cliniche

## 🔒 Requisiti di Sicurezza e Compliance

### 1. PROTEZIONE DATI MEDICI (Priorità Assoluta)

#### Encryption

```python
# Tutti i dati medici DEVONO essere criptati
- At Rest: Fernet encryption per campi database sensibili
- In Transit: TLS 1.3 obbligatorio (no downgrade)
- Passwords: Bcrypt con cost factor 12 minimo
- Medical Reports: Encryption per-record con chiave derivata
```

#### Data Sanitization

```python
# Prima di processare con AI, SEMPRE:
def sanitize_medical_text(text: str) -> str:
    """Rimuove PII dal testo medico"""
    # Rimuovi codici fiscali
    text = re.sub(r'[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]', '[CF_REMOVED]', text)
    # Rimuovi date di nascita
    text = re.sub(r'\d{2}/\d{2}/\d{4}', '[DATE_REMOVED]', text)
    # Rimuovi nomi propri con NER model
    text = remove_names_with_ner(text)
    return text
```

### 2. AUTENTICAZIONE E AUTORIZZAZIONE

#### JWT Implementation

```python
# Access Token (4 ore max)
access_token = {
    "sub": "user_uuid",
    "email": "user@email.com",
    "roles": ["customer"],
    "exp": timestamp + 14400,  # 4 hours
    "jti": "unique_token_id"  # Per blacklist
}

# Refresh Token (7 giorni, rotazione obbligatoria)
- HttpOnly cookie
- Secure flag sempre
- SameSite=Strict
- Rotazione ad ogni uso
- Blacklist in Redis
```

#### Rate Limiting Obbligatorio

```python
RATE_LIMITS = {
    "anonymous": "10/minute",
    "authenticated": "100/minute",
    "pro_plan": "300/minute",
    "enterprise": "1000/minute"
}
```

### 3. COMPLIANCE NORMATIVA

#### GDPR (Obbligatorio per Legge EU)

```python
# API obbligatorie da implementare
@router.post("/api/v1/gdpr/export")
async def export_user_data():
    """Export completo dati utente in JSON/PDF"""

@router.post("/api/v1/gdpr/delete")
async def delete_user_data():
    """Cancellazione completa con audit trail"""

@router.post("/api/v1/gdpr/rectify")
async def rectify_user_data():
    """Rettifica dati personali"""

# Consent tracking obbligatorio
- Versioning dei consensi
- Timestamp di accettazione
- IP address di provenienza
- Possibilità di revoca
```

#### AI Act Compliance (High-Risk Medical AI)

```python
class AIComplianceManager:
    def log_ai_decision(self, request, response):
        """Log COMPLETO per audit AI Act"""
        log_data = {
            "timestamp": datetime.utcnow(),
            "user_id": request.user_id,
            "input_text": hash(request.text),  # Hash per privacy
            "output_text": hash(response.text),
            "ai_model": response.model,
            "confidence_score": response.confidence,
            "human_review_required": response.confidence < 0.8,
            "processing_time_ms": response.time,
            "tokens_used": response.tokens
        }

    def require_human_oversight(self, confidence: float) -> bool:
        """Review umana obbligatoria se confidence < 80%"""
        return confidence < 0.8
```

#### Medical Device Regulation (MDR)

```python
# DISCLAIMER OBBLIGATORIO su ogni pagina
MEDICAL_DISCLAIMER = """
⚠️ ATTENZIONE: Questo software NON è un dispositivo medico certificato.
L'output generato dall'AI è un SUGGERIMENTO che DEVE essere validato
da un medico abilitato prima dell'uso clinico.
La responsabilità legale del referto finale resta SEMPRE del medico firmatario.
"""

# Audit trail completo per compliance ospedaliera
class MedicalAuditLog:
    - input_originale: testo inserito dal medico
    - output_ai: suggerimento dell'AI
    - modifiche_post_ai: cosa ha cambiato il medico
    - medico_id: chi ha usato il sistema
    - timestamp: quando
    - ip_address: da dove
    - specialization: quale specialità
    - final_report: referto finale validato
```

### 4. SECURITY HEADERS (Sempre Attivi)

```python
SECURITY_HEADERS = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(self), camera=()"
}
```

### 5. INPUT VALIDATION (Su Ogni Endpoint)

```python
from pydantic import BaseModel, Field, validator

class ReportInput(BaseModel):
    specialty: str = Field(..., regex="^[A-Z]{3,5}$")
    text: str = Field(..., min_length=10, max_length=50000)

    @validator('text')
    def sanitize_input(cls, v):
        # Rimuovi HTML tags
        v = bleach.clean(v, tags=[], strip=True)
        # Rimuovi script injection attempts
        v = re.sub(r'<script.*?</script>', '', v, flags=re.DOTALL)
        # Sanitizza per SQL injection (anche se usiamo ORM)
        v = v.replace("'", "''").replace(";", "")
        return v
```

### 6. SECRETS MANAGEMENT

```bash
# Development: usa dotenv-vault
npx dotenv-vault@latest login
npx dotenv-vault@latest push

# Production: HashiCorp Vault OBBLIGATORIO
vault kv put secret/refertosicuro/openai api_key="..."
vault kv put secret/refertosicuro/stripe secret_key="..."
vault kv put secret/refertosicuro/database password="..."

# MAI nel codice:
# ❌ api_key = "sk-abc123..."
# ✅ api_key = vault.get_secret("openai/api_key")
```

### 7. MONITORING & ALERTING

```python
# Metriche di sicurezza da monitorare
security_metrics = {
    "failed_logins": Counter(),          # Tentativi di login falliti
    "unauthorized_access": Counter(),     # Accessi non autorizzati
    "data_breaches": Counter(),          # Potenziali breach
    "ai_failures": Counter(),            # Errori AI processing
    "payment_fraud_attempts": Counter(), # Tentativi di frode
    "gdpr_requests": Histogram(),        # Richieste GDPR
}

# Alert immediati per:
- Failed login > 5 in 1 minuto (possibile brute force)
- Unauthorized access a dati medici
- Errori di encryption/decryption
- Tentativi di SQL injection
- Rate limit exceeded ripetuti
```

## 📋 Architettura Tecnica Completa

### Architettura Microservizi - Separazione e Responsabilità

```
                    ┌─────────────────────────────────┐
                    │     API Gateway (Kong)          │
                    │   - Rate limiting               │
                    │   - Auth forwarding             │
                    │   - Load balancing              │
                    └────────────┬────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼────────┐     ┌────────▼────────┐     ┌────────▼────────┐
│  Auth Service  │     │ Reports Service │     │ Billing Service │
│   (FastAPI)    │     │   (FastAPI)     │     │   (FastAPI)     │
│                │     │                 │     │                 │
│ - JWT tokens   │     │ - AI processing │     │ - Stripe        │
│ - User mgmt    │     │ - Specialties   │     │ - PayPal        │
│ - Sessions     │     │ - Templates     │     │ - Subscriptions │
└────────┬───────┘     └────────┬────────┘     └────────┬────────┘
         │                      │                        │
         └──────────┬───────────┴────────────────────────┘
                    │
            ┌───────▼──────────┐
            │    RabbitMQ      │
            │  Message Broker  │
            └───────┬──────────┘
                    │
    ┌───────────────┼───────────────────┐
    │               │                   │
┌───▼────────┐ ┌───▼────────┐ ┌────────▼────────┐
│  Admin     │ │ Analytics   │ │  Notification   │
│  Service   │ │  Service    │ │    Service      │
│ (FastAPI)  │ │ (FastAPI)   │ │   (FastAPI)     │
│            │ │             │ │                 │
│ - Dashboard│ │ - Metrics   │ │ - Email (SMTP)  │
│ - Reports  │ │ - Events    │ │ - SMS           │
│ - User mgmt│ │ - KPIs      │ │ - Push          │
└────────────┘ └─────┬───────┘ └─────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼────┐ ┌────▼─────┐ ┌───▼──────┐
│PostgreSQL  │ │  MongoDB │ │  Redis   │
│   (Main)   │ │(Analytics)│ │ (Cache)  │
└────────────┘ └───────────┘ └──────────┘
```

### Dettaglio Microservizi - Responsabilità e Boundaries

#### 1️⃣ **AUTH SERVICE** (Port: 8010)

```yaml
Responsabilità:
  - Registrazione utenti con verifica email
  - Login/Logout con JWT tokens
  - Gestione sessioni e refresh tokens
  - 2FA (Two-Factor Authentication)
  - Password reset e recovery
  - Gestione ruoli e permessi (RBAC)

Database: PostgreSQL (Dedicato)
  Tables:
    - users
    - user_sessions
    - user_roles
    - password_reset_tokens
    - two_factor_secrets

API Endpoints:
  POST   /api/v1/auth/register
  POST   /api/v1/auth/login
  POST   /api/v1/auth/logout
  POST   /api/v1/auth/refresh
  POST   /api/v1/auth/reset-password
  POST   /api/v1/auth/verify-email
  GET    /api/v1/auth/me
  POST   /api/v1/auth/2fa/enable
  POST   /api/v1/auth/2fa/verify

Eventi Pubblicati (RabbitMQ):
  - user.registered
  - user.logged_in
  - user.password_changed
  - user.2fa_enabled
```

#### 2️⃣ **REPORTS SERVICE** (Port: 8011)

```yaml
Responsabilità:
  - Elaborazione referti con AI
  - Gestione specializzazioni mediche
  - Template management
  - Validazione e sanitizzazione testi
  - Integrazione Azure OpenAI
  - NO STORAGE dei referti processati (privacy by design)

Database: PostgreSQL (Dedicato)
  Tables:
    - medical_specialties
    - report_templates
    - processing_metrics (anonimizzate)
    - ai_models_config

API Endpoints:
  POST   /api/v1/reports/process
  GET    /api/v1/reports/specialties
  GET    /api/v1/reports/templates/{specialty}
  POST   /api/v1/reports/templates
  GET    /api/v1/reports/metrics
  POST   /api/v1/reports/validate

Eventi Pubblicati:
  - report.processed
  - report.failed
  - quota.exceeded
  - ai.error

Integrations:
  - Azure OpenAI API
  - Voice transcription service
```

#### 3️⃣ **BILLING SERVICE** (Port: 8012)

```yaml
Responsabilità:
  - Gestione abbonamenti
  - Processamento pagamenti (Stripe, PayPal)
  - Fatturazione e invoicing
  - Gestione quote utilizzo
  - Webhook handlers per payment providers
  - Trial management

Database: PostgreSQL (Dedicato)
  Tables:
    - subscription_plans
    - user_subscriptions
    - payments
    - invoices
    - usage_quotas
    - payment_methods

API Endpoints:
  GET    /api/v1/billing/plans
  POST   /api/v1/billing/subscribe
  POST   /api/v1/billing/cancel
  GET    /api/v1/billing/subscription
  POST   /api/v1/billing/payment-method
  GET    /api/v1/billing/invoices
  POST   /api/v1/billing/webhook/stripe
  POST   /api/v1/billing/webhook/paypal
  GET    /api/v1/billing/usage

Eventi Pubblicati:
  - subscription.created
  - subscription.cancelled
  - payment.successful
  - payment.failed
  - trial.started
  - trial.ending

Integrations:
  - Stripe API
  - PayPal API
```

#### 4️⃣ **AUDIT SERVICE** (Port: 8016) ⚠️ CRITICO

```yaml
Responsabilità:
  - Logging IMMUTABILE di tutte le operazioni mediche
  - Compliance tracking (GDPR, AI Act)
  - Audit trail per certificazioni
  - Report di conformità
  - Data retention management
  - GDPR requests handling

Database: PostgreSQL (Dedicato, Write-Only)
  Tables:
    - audit_logs (append-only, partizionato per mese)
    - gdpr_requests
    - consent_log
    - data_retention_schedule
    - compliance_reports

API Endpoints:
  POST   /api/v1/audit/log (internal only)
  GET    /api/v1/audit/trail/{user_id}
  POST   /api/v1/audit/gdpr/export
  POST   /api/v1/audit/gdpr/delete
  GET    /api/v1/audit/compliance/report
  GET    /api/v1/audit/retention/status

Eventi Consumati:
  - ALL events from all services

Security:
  - Write-only database access
  - Immutable logs
  - Encryption at rest
  - Retention policy enforcement
```

#### 5️⃣ **ADMIN SERVICE** (Port: 8013)

```yaml
Responsabilità:
  - Dashboard amministrativo
  - User management
  - System monitoring
  - Report generation
  - Configuration management
  - Support tools

Database: PostgreSQL (Read replicas)
  Views:
    - users_view (read-only)
    - subscriptions_view (read-only)
    - system_metrics_view
    - support_tickets

API Endpoints:
  GET    /api/v1/admin/dashboard
  GET    /api/v1/admin/users
  POST   /api/v1/admin/users/{id}/suspend
  GET    /api/v1/admin/reports/usage
  GET    /api/v1/admin/reports/revenue
  POST   /api/v1/admin/config
  GET    /api/v1/admin/logs

Authorization:
  - Solo ruolo 'admin'
  - IP whitelist
  - 2FA obbligatorio
```

#### 6️⃣ **ANALYTICS SERVICE** (Port: 8014)

```yaml
Responsabilità:
  - Raccolta metriche anonimizzate
  - Aggregazione dati per dashboard
  - KPIs calculation
  - Trend analysis
  - Performance metrics

Database: MongoDB (Time-series optimized)
  Collections:
    - events
    - metrics_hourly
    - metrics_daily
    - user_behavior (anonimizzato)

API Endpoints:
  POST   /api/v1/analytics/event
  GET    /api/v1/analytics/metrics
  GET    /api/v1/analytics/kpis
  GET    /api/v1/analytics/trends

Eventi Consumati:
  - ALL events (anonimizzati)

Data Pipeline:
  - Real-time aggregation
  - Hourly rollups
  - Daily summaries
```

#### 7️⃣ **NOTIFICATION SERVICE** (Port: 8015)

```yaml
Responsabilità:
  - Invio email transazionali
  - SMS notifications
  - Push notifications
  - Template management
  - Delivery tracking

Database: PostgreSQL (Dedicato)
  Tables:
    - notification_templates
    - notification_queue
    - delivery_log
    - unsubscribe_list

API Endpoints:
  POST   /api/v1/notifications/send
  GET    /api/v1/notifications/templates
  POST   /api/v1/notifications/unsubscribe
  GET    /api/v1/notifications/status/{id}

Eventi Consumati:
  - user.registered → welcome email
  - subscription.created → confirmation
  - payment.successful → receipt
  - trial.ending → reminder

Integrations:
  - SMTP Server
  - Twilio (SMS)
  - FCM (Push)
```

### Comunicazione Inter-Service

#### Sincrona (REST/HTTP)

```yaml
Pattern: Request-Response
Uso: Operazioni che richiedono risposta immediata
Esempi:
  - Auth validation (Gateway → Auth)
  - Quota check (Reports → Billing)
  - User details (Admin → Auth)

Circuit Breaker: Implementato su ogni chiamata
Timeout: 5 secondi default
Retry: 3 tentativi con exponential backoff
```

#### Asincrona (RabbitMQ)

```yaml
Pattern: Event-Driven / Pub-Sub
Uso: Operazioni che possono essere differite
Exchanges:
  - refertosicuro.events (topic)
  - refertosicuro.commands (direct)
  - refertosicuro.dlx (dead letter)

Queues per Service:
  - auth.queue
  - billing.queue
  - audit.queue (priority queue)
  - notifications.queue
  - analytics.queue

Message Format:
  {
    "event_type": "user.registered",
    "timestamp": "2024-01-01T00:00:00Z",
    "correlation_id": "uuid",
    "payload": { ... },
    "metadata": { ... },
  }
```

### Database Isolation Strategy

```yaml
Principio: Ogni microservizio ha il proprio database

Auth Service:
  - PostgreSQL dedicato
  - Schema: auth_db
  - No condivisione diretta

Reports Service:
  - PostgreSQL dedicato
  - Schema: reports_db
  - Cache Redis condivisa (read-only)

Billing Service:
  - PostgreSQL dedicato
  - Schema: billing_db
  - Transazioni ACID critiche

Audit Service:
  - PostgreSQL dedicato
  - Schema: audit_db
  - Write-only, append-only

Admin Service:
  - Read replicas degli altri DB
  - Nessun write diretto

Analytics Service:
  - MongoDB per time-series
  - Dati aggregati e anonimizzati

Notification Service:
  - PostgreSQL dedicato
  - Schema: notifications_db
  - Queue transazionale
```

### Service Discovery & Health Checks

```yaml
Service Discovery:
  - Docker Swarm DNS interno
  - Consul per produzione
  - Health checks ogni 30 secondi

Health Check Endpoints: GET /health/live    → Is service running?
  GET /health/ready   → Is service ready to accept traffic?
  GET /health/startup → Has service completed initialization?

Response Format:
  {
    "status": "healthy|unhealthy",
    "timestamp": "2024-01-01T00:00:00Z",
    "checks": { "database": "ok", "redis": "ok", "rabbitmq": "ok" },
  }
```

### Database Schema Core (15 Tabelle)

```sql
-- Users & Authentication
users                 -- Utenti con soft delete
user_sessions        -- Sessioni JWT
user_roles           -- Ruoli (customer, partner, admin)

-- Medical & Reports
medical_specialties  -- 19+ specializzazioni
reports             -- Referti processati (encrypted)
report_audit_log    -- Audit trail completo

-- Billing
subscription_plans   -- Basic, Medium, Pro, Enterprise
user_subscriptions  -- Abbonamenti attivi
payments            -- Pagamenti Stripe/PayPal
invoices            -- Fatture PDF

-- Compliance
user_consents       -- GDPR consent tracking
data_retention_log  -- Programmazione cancellazioni

-- System
system_config       -- Configurazioni (encrypted)
events             -- Analytics events
metrics_daily      -- Metriche aggregate
```

### Tech Stack Definitivo

#### Backend

```yaml
Language: Python 3.12
Framework: FastAPI 0.115.0
ORM: SQLAlchemy 2.0 + Alembic
Validation: Pydantic v2
Authentication: python-jose + passlib[bcrypt]
Testing: pytest + pytest-asyncio (coverage >80%)
Linting: ruff + black + mypy
Async: asyncio + httpx + aioredis
```

#### Frontend

```yaml
Framework: React 18.3
Build: Vite 5
Language: TypeScript 5.3
Styling: Tailwind CSS 3.4 + Headless UI
State: Zustand
Forms: React Hook Form + Zod
HTTP: Axios + interceptors
Testing: Vitest + React Testing Library
```

#### Infrastructure

```yaml
Container: Docker + Docker Compose
Orchestration: Docker Swarm → Kubernetes
Database: PostgreSQL 15 + MongoDB + Redis 7
Queue: RabbitMQ
Secrets: HashiCorp Vault
Monitoring: Prometheus + Grafana + Jaeger
CI/CD: GitHub Actions
CDN: Cloudflare
Storage: S3-compatible (Cloudflare R2)
Hosting: Hetzner Cloud (EU)
```

## 🚀 Roadmap di Sviluppo

### Fase 1: MVP (Mesi 1-2)

- [x] Setup infrastruttura base con Docker Compose
- [ ] Auth Service: registrazione, login, JWT
- [ ] Reports Service: 5 specialità core
- [ ] Billing Service: integrazione Stripe base
- [ ] Frontend: homepage, profile, subscription
- [ ] Compliance: GDPR base, disclaimer medicale

### Fase 2: Espansione (Mesi 3-4)

- [ ] Tutte 19+ specialità mediche
- [ ] PayPal integration
- [ ] Voice-to-text con Web Audio API
- [ ] Templates custom per specializzazione
- [ ] Admin dashboard completo
- [ ] Analytics service con MongoDB

### Fase 3: Enterprise (Mesi 5-6)

- [ ] Notification service (email, SMS)
- [ ] Partner API per B2B
- [ ] Sub-accounts per organizzazioni
- [ ] HL7/FHIR integration
- [ ] Advanced compliance dashboard
- [ ] Mobile app React Native

### Fase 4: Scale (Mesi 7+)

- [ ] Kubernetes migration
- [ ] Multi-region deployment
- [ ] Service mesh (Istio)
- [ ] AI model fine-tuning
- [ ] Marketplace add-ons

## 📊 Metriche di Successo

### Performance Target

- API Response: p95 < 500ms
- Uptime: 99.9% (43 min/mese max)
- Error Rate: < 0.1%
- Test Coverage: > 80%

### Business Target

- User Acquisition: 100 medici/mese
- Conversion Rate: > 5% trial → paid
- Churn Rate: < 5% mensile
- NPS Score: > 50

### Compliance Target

- GDPR: 100% API implementate
- AI Act: Tutti log richiesti attivi
- MDR: Disclaimer sempre visibile
- Security: Score A+ SSL Labs

## 🛠️ Development Guidelines

### Testing Strategy

```bash
# Unit tests (80% del totale)
pytest tests/unit/ --cov=app --cov-report=html

# Integration tests (15%)
pytest tests/integration/

# E2E tests (5%)
playwright test
```

### Code Quality

```bash
# Formatting
black . --line-length=100
ruff . --fix

# Type checking
mypy app/ --strict

# Security scan
trivy fs .
semgrep --config=auto
```

### Git Workflow

```bash
# Feature branch
git checkout -b feature/RS-123-description

# Commit conventionali
git commit -m "feat(auth): add 2FA support"

# PR con review obbligatoria
gh pr create --title "feat: 2FA support" --body "..."
```

## 🚨 Security Checklist Pre-Deploy

- [ ] Tutti i secrets in Vault (no hardcoding)
- [ ] HTTPS/TLS 1.3 ovunque
- [ ] Rate limiting su tutti gli endpoints
- [ ] Input validation con Pydantic
- [ ] SQL injection prevention (ORM)
- [ ] XSS prevention (sanitization)
- [ ] CSRF tokens implementati
- [ ] Security headers configurati
- [ ] Audit logging attivo
- [ ] Backup automatici configurati
- [ ] Disaster recovery plan testato
- [ ] Penetration test eseguito
- [ ] GDPR compliance verificata
- [ ] Medical disclaimer visibile

## 📞 Contatti e Supporto

- **Tech Lead**: Stefano (GitHub issues per feedback)
- **Documentation**: `/docs` folder
- **API Docs**: `http://localhost:8000/docs` (Swagger)
- **Monitoring**: Grafana dashboard su `:3000`

## ⚠️ Guardrails - Regole Imperative per lo Sviluppo

### 1. NO FALLBACK CODE

```python
# ❌ MAI FARE QUESTO:
try:
    new_implementation()
except:
    old_implementation()  # NO! Stiamo ristrutturando, non mantenere vecchio codice

# ✅ FARE INVECE:
new_implementation()  # Le modifiche sono definitive, commit solo codice finale
```

### 2. CLEAN CODE PRINCIPLES

- **DRY** (Don't Repeat Yourself): Estrai funzioni riusabili
- **KISS** (Keep It Simple): Soluzioni semplici > soluzioni complesse
- **YAGNI** (You Ain't Gonna Need It): Non implementare feature "per il futuro"
- **Single Responsibility**: Ogni funzione/classe fa UNA cosa sola
- **Early Return**: Usa return anticipati invece di nesting profondo

### 3. DOCUMENTATION STANDARDS

```python
def process_medical_report(
    text: str,
    specialty: MedicalSpecialty,
    user_id: UUID
) -> ProcessedReport:
    """
    Process and enhance a medical report using AI.

    This function sanitizes the input text, sends it to the appropriate
    AI assistant based on specialty, and returns the enhanced report
    with full audit logging for compliance.

    Args:
        text: The raw medical report text to process
        specialty: Medical specialty enum (RAD, CARD, etc.)
        user_id: UUID of the authenticated user

    Returns:
        ProcessedReport containing enhanced text, metrics, and metadata

    Raises:
        ValidationError: If input text fails sanitization
        AIProcessingError: If AI service is unavailable
        QuotaExceededError: If user exceeds plan limits

    Example:
        >>> report = process_medical_report(
        ...     text="Patient shows signs of...",
        ...     specialty=MedicalSpecialty.RADIOLOGY,
        ...     user_id=current_user.id
        ... )
        >>> print(report.enhanced_text)
    """
    # Implementation here
```

### 4. CODE QUALITY STANDARDS

- **Type Hints**: SEMPRE su parametri e return values
- **Docstrings**: Su TUTTE le funzioni pubbliche (Google style)
- **Comments**: Solo per logica NON ovvia, in inglese
- **Naming**: snake_case (Python), camelCase (JS/TS), UPPER_CASE (constants)
- **Line Length**: Max 100 caratteri (configurato in black/prettier)

### 5. ERROR HANDLING

```python
# ❌ MAI catch generico:
except Exception:
    pass

# ✅ SEMPRE specifico con logging:
except ValidationError as e:
    logger.error(f"Validation failed for report: {e}", exc_info=True)
    raise HTTPException(status_code=400, detail=str(e))
```

### 6. SECURITY FIRST

- **Input Validation**: SEMPRE validate prima di processare
- **Output Encoding**: SEMPRE encode output per prevenire XSS
- **SQL Queries**: SOLO tramite ORM, MAI query raw
- **Secrets**: MAI hardcoded, SEMPRE da Vault/env
- **Logging**: MAI loggare dati sensibili (passwords, tokens, PII)

### 7. TESTING REQUIREMENTS

```python
# Ogni feature DEVE avere:
- Unit tests (minimo 80% coverage)
- Integration test per API endpoints
- Docstring con esempio di utilizzo
- Type hints per static analysis

# Naming convention:
test_<function_name>_<scenario>_<expected_result>()
# Esempio:
test_process_report_invalid_specialty_raises_validation_error()
```

### 8. COMMIT DISCIPLINE

```bash
# ❌ MAI:
git commit -m "fix"
git commit -m "wip"
git commit -m "aggiornamento"

# ✅ SEMPRE formato conventionale:
git commit -m "feat(auth): implement JWT refresh token rotation"
git commit -m "fix(reports): handle Unicode characters in medical text"
git commit -m "docs(api): update OpenAPI schema for v2 endpoints"
git commit -m "test(billing): add integration tests for Stripe webhooks"
```

### 9. REFACTORING RULES

- **No Dead Code**: Rimuovi IMMEDIATAMENTE codice non usato
- **No Commented Code**: Cancella, non commentare (Git tiene la storia)
- **No Debug Prints**: Usa logger con livelli appropriati
- **No Magic Numbers**: Usa costanti con nomi descrittivi
- **No Deep Nesting**: Max 3 livelli di indentazione

### 10. PERFORMANCE GUIDELINES

- **Database**: Indici su campi di ricerca, eager loading per N+1
- **Caching**: Redis per dati frequenti, TTL appropriati
- **Async**: Usa async/await per I/O operations
- **Pagination**: SEMPRE per liste lunghe (default 20 items)
- **Rate Limiting**: Su TUTTI gli endpoint pubblici

### 11. MICROSERVICES BOUNDARIES

```yaml
# Ogni servizio DEVE:
- Avere un singolo scopo ben definito
- Essere deployabile indipendentemente
- Avere il proprio database (no sharing)
- Comunicare via API ben documentate
- Gestire i propri errori gracefully
- Implementare health checks
```

### 12. MEDICAL DOMAIN SPECIFICS

- **Disclaimer**: SEMPRE visibile su ogni response medica
- **Audit Log**: OGNI operazione su dati medici
- **Data Retention**: Rispetta SEMPRE policy di retention
- **Anonymization**: PII removal prima di logging/analytics
- **Compliance Check**: Ogni feature contro GDPR/AI Act checklist

### 13. DEVOPS & DEPLOYMENT - REGOLE CRITICHE

```yaml
VERSIONING (OBBLIGATORIO):
  - Ogni microservizio DEVE avere __version__.py
  - Semantic versioning: MAJOR.MINOR.PATCH
  - Version in health endpoint response
  - NO deploy senza version bump
  - Documentazione: docs/devops/VERSIONING.md

BRANCHING (RIGIDO):
  - main: Solo production releases (protected, 2 reviewers)
  - develop: Integration branch (protected, 1 reviewer)
  - feature/RS-XXX-desc: Da develop, merge in develop
  - hotfix/RS-XXX-desc: Da main, merge in main + develop
  - NO force push su main/develop
  - Documentazione: docs/devops/BRANCHING.md

ENVIRONMENTS (OBBLIGATORI):
  - development: docker-compose.dev.yml (local)
  - staging: docker-compose.staging.yml (auto-deploy da develop)
  - production: docker-compose.prod.yml (manual approval)
  - Secrets: Solo da Vault, MAI in .env files per staging/prod

CI/CD (AUTOMATICO):
  - Security scan: Ogni push (Trivy, Semgrep, Gitleaks)
  - Tests: Copertura >80% obbligatoria
  - Build: Docker images su GHCR con SHA tag
  - Deploy staging: Automatico su merge develop
  - Deploy production: Manuale con approval
  - Rollback: Capability sempre attiva

SECURITY SCANNING (DAILY):
  - Trivy: Container + filesystem vulnerabilities
  - Semgrep: SAST code analysis
  - Bandit: Python security linter
  - Safety: Dependency vulnerabilities
  - Gitleaks: Secrets detection
  - NO merge se CRITICAL vulnerabilities

COMPLIANCE (MEDICALE):
  - Audit logging: OGNI operazione medica
  - GDPR endpoints: export, delete, rectify
  - AI Act: Decision logging con confidence
  - Data retention: 7 anni per audit logs
  - Encryption: At rest + in transit
  - Anonymization: PII removal automatico

MONITORING (OBBLIGATORIO):
  - Prometheus: Application + business metrics
  - Grafana: Dashboards real-time
  - Jaeger: Distributed tracing
  - Loki: Log aggregation
  - Alerting: PagerDuty/Slack per critical

BACKUP & DR:
  - PostgreSQL: Backup daily, retention 30 giorni
  - MongoDB: Backup daily, retention 30 giorni
  - Vault: Backup daily, retention 90 giorni
  - RTO: 4 ore, RPO: 1 ora
  - Testing: Recovery test mensile
```

**Riferimenti**:

- [DevOps Analysis](/docs/devops/DEVOPS-ANALYSIS.md)
- [Implementation Roadmap](/docs/devops/DEVOPS-ROADMAP.md)
- [Versioning Guide](/docs/devops/VERSIONING.md)
- [Branching Strategy](/docs/devops/BRANCHING.md)

### 14. HISTORY TRACKING - OBBLIGATORIO

````markdown
# SEMPRE aggiornare history.md dopo OGNI task completato

## Formato richiesto:

| Data       | Task                 | Stato                  | Note                        |
| ---------- | -------------------- | ---------------------- | --------------------------- |
| 2024-11-21 | Setup Docker Compose | completed              | Tutti i servizi configurati |
| 2024-11-21 | Auth Service JWT     | in_progress            | Implementazione in corso    |
| 2024-11-22 | Database Migrations  | pending                | Da iniziare                 |
| 2024-11-22 | Security Audit       | validated_from_stefano | Approvato                   |

## Stati possibili:

- pending: Task pianificato ma non iniziato
- in_progress: Lavoro in corso
- completed: Completato e testato
- validated_from_stefano: Revisionato e approvato da Stefano
- blocked: In attesa di dipendenze

## Esempio di aggiornamento:

```bash
# Dopo ogni task significativo:
echo "| $(date +%Y-%m-%d) | $TASK_NAME | $STATUS | $NOTES |" >> history.md
```
````

## Regole

1. Aggiorna IMMEDIATAMENTE dopo completamento task
2. Mai rimuovere entries precedenti
3. Ordine cronologico (più recenti in alto)
4. Descrizioni chiare e concise
5. Note solo per informazioni critiche

```

---

**Ultimo Aggiornamento**: 2024-11-21
**Versione**: 2.0.0
**Status**: In Development - Fase Setup Iniziale
```
