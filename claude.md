# RefertoSicuro v2 - Architettura e Specifiche Complete

## Executive Summary

RefertoSicuro v2 è una piattaforma SaaS medicale per l'ottimizzazione di referti medici tramite AI, progettata con architettura pulita, compliance medicale built-in e scalabilità enterprise.

### Principi Guida
- **Security by Design**: Ogni componente progettato con sicurezza in mente
- **Compliance First**: GDPR, AI Act, normative medicali italiane dal day 1
- **Clean Architecture**: Separazione netta tra business logic e infrastruttura
- **Test-Driven**: 95%+ code coverage target
- **Observable**: Monitoring e logging strutturato ovunque
- **Scalabile**: Progettato per 10K+ utenti concorrenti

### ⚠️ Decisioni Chiave dal Planning Quiz
- **Architettura**: Microservizi da subito (4-5 servizi separati)
- **Timeline**: 6 mesi per v2 completa
- **Database**: PostgreSQL + MongoDB per analytics
- **Team**: 2-3 full-stack developers
- **Deployment**: Docker Compose → Docker Swarm
- **CI/CD**: GitHub Actions
- **State Management**: Zustand
- **API Design**: REST con OpenAPI/Swagger
- **Message Queue**: RabbitMQ da subito

## 1. ARCHITETTURA SISTEMA

### 1.1 Pattern Architetturale: Microservizi da Subito

**Architettura a Microservizi (5 Servizi Core)**
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

**Comunicazione tra Servizi**
- **Sincrona**: REST APIs via HTTP/2
- **Asincrona**: RabbitMQ per eventi e task
- **Service Discovery**: Consul o Docker Swarm built-in
- **Circuit Breaker**: Implementato in ogni servizio

**Database Strategy**
- **Auth Service**: PostgreSQL (users, sessions)
- **Reports Service**: PostgreSQL (reports, specialties)
- **Billing Service**: PostgreSQL (subscriptions, payments)
- **Analytics Service**: MongoDB (events, metrics)
- **Shared Cache**: Redis per tutti i servizi

**Deployment**
- Ogni servizio in container Docker separato
- Docker Swarm per orchestrazione
- Reverse proxy nginx per routing
- Health checks e auto-restart

### 1.2 Roadmap con Microservizi

**Fase 1 (MVP - Mesi 1-2): Core Services**
- Auth Service: Registrazione, login, JWT
- Reports Service: 5 specialità core
- Billing Service: Solo Stripe inizialmente
- API Gateway: Kong base config
- Database: PostgreSQL + Redis

**Fase 2 (Espansione - Mesi 3-4): Full Features**
- Tutte 19+ specialità mediche
- PayPal integration nel Billing Service
- Admin Service completo
- Analytics Service con MongoDB
- Voice transcription nel Reports Service

**Fase 3 (Enterprise - Mesi 5-6): Advanced**
- Notification Service (email, SMS)
- HL7/FHIR nel Reports Service
- Sub-accounts nel Billing Service
- Add-ons marketplace
- Advanced analytics dashboard

**Fase 4 (Scale - Mesi 7+): Optimization**
- Kubernetes migration (da Docker Swarm)
- Multi-region deployment
- Service mesh (Istio)
- Advanced monitoring con distributed tracing

### 1.3 Tech Stack Definitivo

**Backend Core**
```yaml
Language: Python 3.12
Framework: FastAPI 0.115.0
ORM: SQLAlchemy 2.0 + Alembic
Async: asyncio + httpx + aioredis
Validation: Pydantic v2
Testing: pytest + pytest-asyncio + coverage
Linting: ruff + black + mypy
Security: python-jose[cryptography] + passlib[bcrypt]
```

**Database & Caching**
```yaml
Primary DB: PostgreSQL 15 (con estensioni: pgcrypto, uuid-ossp, pg_stat_statements)
Cache: Redis 7 + CDN Cloudflare per assets
Search: PostgreSQL Full Text Search
Queue: RabbitMQ (da subito per affidabilità)
Analytics: PostgreSQL con partitioning (MongoDB solo se necessario in futuro)
```

**Frontend**
```yaml
Framework: React 18.3
Build: Vite 5
Language: TypeScript 5.3
Styling: Tailwind CSS 3.4 + Headless UI
State: Zustand (leggero, type-safe)
Forms: React Hook Form + Zod
HTTP: Axios con interceptors
Testing: Vitest + React Testing Library
```

**Infrastructure**
```yaml
Container: Docker + Docker Compose
Orchestration: Docker Compose (dev) → Docker Swarm (prod)
CI/CD: GitHub Actions
Monitoring: Prometheus + Grafana + Loki (open source stack)
Error Tracking: Sentry
Development: DevContainers (VS Code)
Secrets: HashiCorp Vault (prod) / dotenv-vault (dev)
CDN: Cloudflare
Storage: S3-compatible (Cloudflare R2)
Hosting: Hetzner Cloud (EU datacenter)
```

## 2. DATABASE SCHEMA v2

### 2.1 Design Principles
- **Normalizzazione**: 3NF dove appropriato
- **Audit Trail**: Ogni tabella con created_at, updated_at, deleted_at
- **Soft Delete**: Default per dati critici
- **UUID**: Primary keys UUID v4 (no sequential IDs)
- **Encryption**: Dati sensibili encrypted at rest

### 2.2 Core Schema (15 Tabelle Essenziali)

```sql
-- 1. USERS & AUTH (3 tabelle)
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  vat_number VARCHAR(50),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ, -- soft delete
  last_login_at TIMESTAMPTZ,
  failed_login_count INT DEFAULT 0,
  locked_until TIMESTAMPTZ
)

user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token_hash VARCHAR(255) UNIQUE,
  expires_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ
)

user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  role VARCHAR(50), -- 'customer', 'partner', 'admin'
  granted_at TIMESTAMPTZ,
  granted_by UUID REFERENCES users(id)
)

-- 2. MEDICAL & REPORTS (3 tabelle)
medical_specialties (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE, -- 'RAD', 'CARD', etc
  name VARCHAR(255),
  ai_assistant_id VARCHAR(255), -- Azure OpenAI assistant
  is_active BOOLEAN DEFAULT TRUE
)

reports (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  specialty_id UUID REFERENCES medical_specialties(id),
  input_text TEXT, -- encrypted
  output_text TEXT, -- encrypted
  input_tokens INT,
  output_tokens INT,
  processing_time_ms INT,
  ai_model VARCHAR(50),
  user_rating INT CHECK (user_rating IN (1,2,3,4,5)),
  created_at TIMESTAMPTZ
)

report_audit_log (
  id UUID PRIMARY KEY,
  report_id UUID REFERENCES reports(id),
  action VARCHAR(50), -- 'created', 'viewed', 'exported'
  performed_by UUID REFERENCES users(id),
  ip_address INET,
  created_at TIMESTAMPTZ
)

-- 3. BILLING & SUBSCRIPTIONS (4 tabelle)
subscription_plans (
  id UUID PRIMARY KEY,
  name VARCHAR(100), -- 'Basic', 'Pro', 'Enterprise'
  code VARCHAR(50) UNIQUE,
  monthly_price DECIMAL(10,2),
  yearly_price DECIMAL(10,2),
  report_quota INT,
  max_specialties INT,
  features JSONB, -- {api_access: true, priority_support: false}
  is_active BOOLEAN DEFAULT TRUE
)

user_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  plan_id UUID REFERENCES subscription_plans(id),
  status VARCHAR(50), -- 'active', 'cancelled', 'expired'
  current_period_start DATE,
  current_period_end DATE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

payments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  subscription_id UUID REFERENCES user_subscriptions(id),
  amount DECIMAL(10,2),
  currency VARCHAR(3),
  status VARCHAR(50), -- 'pending', 'completed', 'failed', 'refunded'
  payment_method VARCHAR(50), -- 'stripe', 'paypal', 'bank_transfer'
  external_id VARCHAR(255), -- Stripe/PayPal transaction ID
  metadata JSONB,
  created_at TIMESTAMPTZ
)

invoices (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  payment_id UUID REFERENCES payments(id),
  invoice_number VARCHAR(50) UNIQUE,
  invoice_date DATE,
  due_date DATE,
  line_items JSONB,
  total_amount DECIMAL(10,2),
  vat_amount DECIMAL(10,2),
  pdf_url VARCHAR(500),
  created_at TIMESTAMPTZ
)

-- 4. COMPLIANCE & CONSENT (2 tabelle)
user_consents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  consent_type VARCHAR(50), -- 'privacy', 'marketing', 'analytics'
  version VARCHAR(20), -- '2024.1'
  consented BOOLEAN,
  consented_at TIMESTAMPTZ,
  ip_address INET,
  withdrawal_at TIMESTAMPTZ
)

data_retention_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  data_type VARCHAR(50), -- 'reports', 'personal_data'
  retention_days INT,
  deletion_scheduled_at DATE,
  deletion_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)

-- 5. SYSTEM & CONFIG (1 tabella)
system_config (
  id UUID PRIMARY KEY,
  key VARCHAR(255) UNIQUE,
  value TEXT, -- encrypted for sensitive data
  value_type VARCHAR(50), -- 'string', 'number', 'boolean', 'json'
  is_sensitive BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
)

-- 6. ANALYTICS (2 tabelle)
events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id), -- NULL for anonymous
  session_id UUID,
  event_type VARCHAR(100),
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ
)
-- Partizionamento per mese per performance

metrics_daily (
  date DATE,
  metric_name VARCHAR(100),
  metric_value DECIMAL(20,4),
  dimensions JSONB, -- {specialty: 'RAD', plan: 'Pro'}
  PRIMARY KEY (date, metric_name)
)
-- Aggregazione giornaliera per dashboard

-- INDICI CRITICI
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_reports_user_date ON reports(user_id, created_at DESC);
CREATE INDEX idx_payments_user_status ON payments(user_id, status);
CREATE INDEX idx_events_user_type ON events(user_id, event_type, created_at);
```

### 2.3 Migrazione Dati da v0
- Script ETL per mappare 33 tabelle v0 → 15 tabelle v2
- Validazione dati pre-migrazione
- Backup completo prima della migrazione
- Migrazione incrementale con rollback capability

## 3. API DESIGN

### 3.1 RESTful + GraphQL Hybrid

**REST per operazioni CRUD standard**
```
/api/v1/auth/...
/api/v1/users/...
/api/v1/reports/...
/api/v1/billing/...
/api/v1/admin/...
```

**GraphQL per query complesse (opzionale fase 2)**
```
/graphql
```

### 3.2 API Versioning Strategy
- URL versioning: `/api/v1/`, `/api/v2/`
- Deprecation policy: 6 mesi notice
- Sunset headers per deprecation warnings
- OpenAPI specs per version

### 3.3 Authentication & Authorization

**JWT Strategy Migliorata**
```python
# Access Token (15 minuti)
{
  "sub": "user_uuid",
  "email": "user@example.com",
  "roles": ["customer"],
  "exp": 1234567890,
  "jti": "unique_token_id"
}

# Refresh Token (7 giorni, rotazione automatica)
- Stored in HttpOnly, Secure, SameSite=Strict cookie
- Rotazione ad ogni uso
- Blacklist dei token revocati in Redis
```

**Rate Limiting**
```yaml
Anonymous: 10 req/min
Authenticated: 100 req/min
Pro Plan: 300 req/min
Enterprise: 1000 req/min
Partner API: Custom quotas
```

## 4. SECURITY IMPLEMENTATION

### 4.1 Security Layers

```python
# 1. Input Validation (Pydantic)
class ReportInput(BaseModel):
    specialty: str = Field(..., regex="^[A-Z]{3,4}$")
    text: str = Field(..., min_length=10, max_length=50000)

    @validator('text')
    def sanitize_text(cls, v):
        # Remove potential PII
        return sanitize_medical_text(v)

# 2. SQL Injection Prevention
# Sempre parametrized queries con SQLAlchemy

# 3. XSS Prevention
# - CSP headers strict
# - Input sanitization
# - Output encoding

# 4. CSRF Protection
# Double Submit Cookie pattern

# 5. Encryption
# - Bcrypt per passwords (cost factor 12)
# - Fernet per dati sensibili in DB
# - TLS 1.3 per transit
```

### 4.2 Security Headers
```python
SECURITY_HEADERS = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
}
```

### 4.3 Secrets Management

**Development**
```bash
# dotenv-vault per team sharing
npx dotenv-vault@latest push
npx dotenv-vault@latest pull
```

**Production**
```yaml
# HashiCorp Vault
vault:
  address: https://vault.refertosicuro.it
  auth_method: kubernetes
  role: refertosicuro-app
  secrets:
    - database/creds/readonly
    - kv/data/openai
    - kv/data/stripe
```

## 5. TESTING STRATEGY

### 5.1 Testing Pyramid

```
         /\
        /e2e\       (5%)  - Playwright, scenari critici
       /─────\
      /integr.\     (15%) - API testing, DB testing
     /─────────\
    /   unit    \   (80%) - Business logic, services
   /─────────────\
```

### 5.2 Test Implementation

**Backend Testing**
```python
# pytest.ini
[tool.pytest.ini_options]
minversion = "7.0"
testpaths = ["tests"]
python_files = "test_*.py"
addopts = """
    --cov=app
    --cov-report=term-missing
    --cov-report=html
    --cov-fail-under=80
    --asyncio-mode=auto
"""

# Esempio test
@pytest.mark.asyncio
async def test_report_improvement():
    async with AsyncClient(app=app) as client:
        response = await client.post(
            "/api/v1/reports/improve",
            json={"specialty": "RAD", "text": "..."},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert "improved_text" in response.json()
```

**Frontend Testing**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      threshold: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    }
  }
})
```

### 5.3 CI/CD Pipeline

```yaml
# .github/workflows/main.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
      redis:
        image: redis:7

    steps:
      - uses: actions/checkout@v4

      - name: Security Scan
        run: |
          # Trivy per vulnerabilità container
          # Semgrep per SAST
          # GitLeaks per secrets

      - name: Backend Tests
        run: |
          poetry install
          poetry run pytest --cov-fail-under=80

      - name: Frontend Tests
        run: |
          pnpm install
          pnpm test:coverage

      - name: E2E Tests
        run: |
          pnpm playwright test

      - name: Build & Push
        if: github.ref == 'refs/heads/main'
        run: |
          docker build -t refertosicuro:${{ github.sha }}
          docker push registry.refertosicuro.it/app:${{ github.sha }}

      - name: Deploy
        if: github.ref == 'refs/heads/main'
        run: |
          # Blue-Green deployment con health checks
```

## 6. COMPLIANCE MEDICALE

### 6.1 GDPR Compliance

**Privacy by Design**
```python
class PrivacyEngine:
    def pseudonymize_report(self, text: str) -> str:
        """Rimuove PII dal testo del referto"""
        # Regex per codici fiscali, nomi, date di nascita
        # NER model per identificazione entità

    def encrypt_at_rest(self, data: str) -> str:
        """Crittografia con Fernet"""

    def schedule_deletion(self, user_id: UUID, days: int = 30):
        """Programmazione cancellazione automatica"""
```

**Data Subject Rights API**
```python
@router.post("/api/v1/gdpr/export")
async def export_user_data(user: CurrentUser) -> FileResponse:
    """Export tutti i dati utente in formato JSON/PDF"""

@router.post("/api/v1/gdpr/delete")
async def delete_user_data(user: CurrentUser):
    """Cancellazione completa con audit trail"""

@router.post("/api/v1/gdpr/rectify")
async def rectify_user_data(user: CurrentUser, updates: dict):
    """Rettifica dati con validazione"""
```

### 6.2 AI Act Compliance

**High-Risk AI System Requirements**
```python
class AIComplianceManager:
    def log_ai_decision(self, request, response):
        """Log completo per audit AI Act"""

    def validate_output_quality(self, output):
        """Controllo qualità output AI"""

    def human_review_required(self, confidence_score):
        """Flag per review umana obbligatoria"""

    def generate_transparency_report(self):
        """Report mensile trasparenza AI"""
```

### 6.3 Medical Device Regulation (MDR)

**Disclaimer e Responsabilità**
```python
MEDICAL_DISCLAIMER = """
Questo software NON è un dispositivo medico certificato.
L'output è un suggerimento che DEVE essere validato da un medico.
La responsabilità finale del referto è del medico firmatario.
"""
```

## 7. MONITORING & OBSERVABILITY

### 7.1 Metrics Collection

```python
# Prometheus metrics
from prometheus_client import Counter, Histogram, Gauge

report_requests = Counter(
    'report_requests_total',
    'Total report improvement requests',
    ['specialty', 'plan', 'status']
)

report_duration = Histogram(
    'report_processing_seconds',
    'Report processing duration',
    ['specialty', 'model']
)

active_subscriptions = Gauge(
    'active_subscriptions',
    'Number of active subscriptions',
    ['plan']
)
```

### 7.2 Structured Logging

```python
import structlog

logger = structlog.get_logger()

logger.info(
    "report_processed",
    user_id=user.id,
    specialty=specialty,
    tokens_used=tokens,
    duration_ms=duration,
    correlation_id=request_id
)
```

### 7.3 Alerting Rules

```yaml
# Prometheus Alert Manager
groups:
  - name: refertosicuro
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05

      - alert: SlowAPIResponse
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 2

      - alert: LowSubscriptionConversion
        expr: rate(subscription_conversions[1d]) < 0.02
```

## 8. DEPLOYMENT STRATEGY

### 8.1 Infrastructure as Code

```terraform
# terraform/main.tf
provider "hetzner" {
  token = var.hcloud_token
}

module "kubernetes" {
  source = "./modules/k8s"

  cluster_name = "refertosicuro-prod"
  node_count   = 3
  node_type    = "cpx31"
  location     = "nbg1"
}

module "database" {
  source = "./modules/postgres"

  version = "15"
  size    = "db-4vcpu-8gb"
  backup_retention = 30
  high_availability = true
}
```

### 8.2 Progressive Rollout

```yaml
# Flagger canary deployment
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: refertosicuro-api
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: refertosicuro-api
  progressDeadlineSeconds: 300
  service:
    port: 8000
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: error-rate
        threshold: 1
      - name: latency
        threshold: 500
```

## 9. DISASTER RECOVERY

### 9.1 Backup Strategy

```yaml
Backup Schedule:
  Database:
    - Full: Daily at 02:00 UTC
    - Incremental: Every 6 hours
    - Retention: 30 days

  Files (S3):
    - Versioning enabled
    - Cross-region replication
    - Lifecycle: Archive after 90 days

  Configurations:
    - Git repository (encrypted)
    - Vault snapshots daily
```

### 9.2 RTO/RPO Targets

```yaml
Recovery Objectives:
  RPO (Recovery Point Objective): < 1 hour
  RTO (Recovery Time Objective): < 4 hours

Disaster Scenarios:
  - Database corruption: Restore from backup (30 min)
  - Regional outage: Failover to secondary region (2 hours)
  - Data breach: Incident response + forensics (4 hours)
  - Ransomware: Restore from immutable backups (4 hours)
```

## 10. DEVELOPMENT WORKFLOW

### 10.1 Git Flow

```
main
  └── develop
        ├── feature/RS-123-report-improvement
        ├── feature/RS-124-billing-integration
        └── hotfix/RS-125-security-patch
```

### 10.2 Definition of Done

- [ ] Code scritto e testato (coverage > 80%)
- [ ] Code review da almeno 1 developer
- [ ] Documentazione aggiornata
- [ ] Security scan passed
- [ ] Performance test passed
- [ ] Accessibilità verificata (WCAG 2.1 AA)
- [ ] Traduzione completata (IT/EN)

### 10.3 Release Process

1. **Feature Freeze** (giovedì)
2. **Testing su Staging** (venerdì)
3. **Release Notes** (lunedì mattina)
4. **Deploy Produzione** (lunedì pomeriggio)
5. **Monitoring Intensivo** (24h post-deploy)

## 11. COST OPTIMIZATION

### 11.1 Infrastructure Costs

```yaml
Monthly Estimates:
  Hosting (Hetzner):
    - 3x CPX31 servers: €150
    - Load Balancer: €50
    - Backup storage: €30

  Database (Managed):
    - PostgreSQL HA: €200
    - Redis Cluster: €100

  External Services:
    - Azure OpenAI: €500 (@ 1000 users)
    - Cloudflare: €50
    - Monitoring (Datadog): €200

  Total: ~€1,280/month
```

### 11.2 Cost per User

```yaml
Economics @ 1000 users:
  Infrastructure: €1.28/user/month
  AI costs: €0.50/user/month
  Total cost: €1.78/user/month

  Average revenue: €69/user/month
  Gross margin: 97.4%

Break-even: ~20 paying users
```

## 12. ROADMAP

### Phase 1: MVP (Mesi 1-3)
- ✅ Core authentication system
- ✅ Report improvement (5 specialties)
- ✅ Basic billing (Stripe)
- ✅ Admin dashboard
- ✅ GDPR compliance base

### Phase 2: Enhancement (Mesi 4-6)
- 🔄 19+ specialties
- 🔄 PayPal integration
- 🔄 Partner API
- 🔄 Advanced analytics
- 🔄 Mobile app (React Native)

### Phase 3: Scale (Mesi 7-12)
- ⏳ Multi-tenancy completo
- ⏳ White-label solution
- ⏳ AI training su dati proprietari
- ⏳ Integrazione PACS/RIS
- ⏳ Certificazione ISO 27001

### Phase 4: Innovation (Anno 2)
- ⏳ Voice-first interface
- ⏳ Real-time collaboration
- ⏳ Predictive analytics
- ⏳ Blockchain per audit trail
- ⏳ Espansione EU (GDPR-compliant)

## 13. TEAM & SKILLS REQUIRED

### Core Team Minimo
```yaml
CTO/Tech Lead:
  - Architettura sistema
  - Security oversight
  - Compliance expertise

Backend Developer (2):
  - Python/FastAPI expert
  - Database optimization
  - AI/ML integration

Frontend Developer (1):
  - React/TypeScript
  - UI/UX sensibility
  - Performance optimization

DevOps Engineer (1):
  - Kubernetes
  - CI/CD pipelines
  - Monitoring setup

QA Engineer (1):
  - Test automation
  - Security testing
  - Compliance validation
```

## 14. RISK MITIGATION

### Technical Risks
```yaml
OpenAI Dependency:
  Risk: API changes/downtime
  Mitigation:
    - Abstract AI layer
    - Fallback a modelli locali
    - Multi-provider support (Anthropic, Mistral)

Data Breach:
  Risk: Medical data exposure
  Mitigation:
    - Encryption everywhere
    - Zero-trust architecture
    - Regular pentesting
    - Cyber insurance

Scalability Issues:
  Risk: System overload
  Mitigation:
    - Auto-scaling
    - Load testing
    - Circuit breakers
    - Graceful degradation
```

### Business Risks
```yaml
Regulatory Changes:
  Risk: New compliance requirements
  Mitigation:
    - Legal advisor retainer
    - Compliance buffer in architecture
    - Regular audit schedule

Competition:
  Risk: Market saturation
  Mitigation:
    - Focus su specializzazione medicale
    - Partnership con ospedali
    - Continuous innovation
```

## 15. SUCCESS METRICS

### Technical KPIs
- API Response Time: p95 < 500ms
- Uptime: 99.9% (43 min/month downtime max)
- Error Rate: < 0.1%
- Test Coverage: > 80%
- Security Score: A+ (SSL Labs)
- Lighthouse Score: > 90

### Business KPIs
- User Acquisition: 100 users/month
- Conversion Rate: > 5% trial → paid
- Churn Rate: < 5% monthly
- NPS Score: > 50
- Customer Lifetime Value: > €2,000
- Payback Period: < 3 months

## APPENDIX A: File Structure

```
RefertoSicuro_v2/
├── backend/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   │   └── v1/
│   │   ├── core/         # Core configuration
│   │   ├── domain/       # Business logic
│   │   ├── infrastructure/ # External services
│   │   ├── models/       # Database models
│   │   └── services/     # Application services
│   ├── tests/
│   ├── migrations/
│   └── pyproject.toml
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── features/     # Feature-based modules
│   │   ├── hooks/
│   │   ├── lib/          # Utilities
│   │   ├── pages/
│   │   └── store/        # Zustand stores
│   ├── tests/
│   └── package.json
│
├── infrastructure/
│   ├── docker/
│   ├── kubernetes/
│   ├── terraform/
│   └── scripts/
│
├── docs/
│   ├── api/
│   ├── architecture/
│   ├── compliance/
│   └── deployment/
│
└── .github/
    └── workflows/
```

## APPENDIX B: Security Checklist

- [ ] All passwords hashed with bcrypt (cost 12+)
- [ ] JWT tokens expire in 15 minutes
- [ ] Refresh tokens rotate on use
- [ ] HTTPS enforced everywhere
- [ ] CSP headers configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (ORM)
- [ ] XSS prevention (sanitization)
- [ ] CSRF tokens implemented
- [ ] Secrets in Vault (not in code)
- [ ] Dependencies scanned for vulnerabilities
- [ ] Regular pentesting scheduled
- [ ] Incident response plan documented
- [ ] Data encryption at rest and in transit

## APPENDIX C: Compliance Checklist

### GDPR
- [ ] Privacy by design implemented
- [ ] Data minimization enforced
- [ ] Consent management system
- [ ] Data portability API
- [ ] Right to erasure API
- [ ] Data breach notification process
- [ ] DPA agreements with processors
- [ ] Privacy policy updated
- [ ] Cookie banner compliant

### AI Act
- [ ] Risk assessment documented
- [ ] Human oversight implemented
- [ ] Transparency obligations met
- [ ] Accuracy monitoring active
- [ ] Bias testing completed
- [ ] Technical documentation maintained

### Medical
- [ ] Disclaimer clearly visible
- [ ] Audit trail complete
- [ ] Data retention compliant
- [ ] Professional liability insurance
- [ ] Medical terminology validated

---

# Note Finali

Questo documento è un living document che deve essere aggiornato continuamente durante lo sviluppo. Ogni decisione architetturale significativa deve essere documentata qui.

**Ultimo aggiornamento**: 2024-11-21
**Versione**: 2.0.0
**Autore**: Team RefertoSicuro + Claude