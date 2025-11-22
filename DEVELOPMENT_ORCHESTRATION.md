# RefertoSicuro v2 - Development Orchestration Plan

## 🎯 Obiettivo

Questo documento orchestra lo sviluppo parallelo dei microservizi, definendo fasi, dipendenze e priorità per permettere a più agenti di lavorare simultaneamente senza conflitti.

## 📋 Microservizi da Sviluppare

| #   | Servizio             | Port | Priority | Status      | Dipendenze    | Estimated Days |
| --- | -------------------- | ---- | -------- | ----------- | ------------- | -------------- |
| 1   | Auth Service         | 8010 | CRITICAL | ✅ Partial  | Nessuna       | 3-4            |
| 2   | Billing Service      | 8012 | HIGH     | ⚠️ Skeleton | Auth          | 4-5            |
| 3   | Reports Service      | 8011 | HIGH     | ⚠️ Skeleton | Auth, Billing | 4-5            |
| 4   | Audit Service        | 8016 | CRITICAL | ❌ Missing  | Tutti         | 5-6            |
| 5   | Notification Service | 8015 | MEDIUM   | ⚠️ Skeleton | Auth          | 3-4            |
| 6   | Analytics Service    | 8014 | MEDIUM   | ⚠️ Skeleton | Tutti         | 3-4            |
| 7   | Admin Service        | 8013 | LOW      | ⚠️ Skeleton | Tutti         | 3-4            |

**Total Estimated Time**: 25-32 giorni (con sviluppo parallelo: ~2 settimane)

## 🔄 Dependency Graph

```
                    ┌─────────────────┐
                    │  Auth Service   │
                    │   (No deps)     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┬──────────────┐
              │              │              │              │
     ┌────────▼────────┐  ┌─▼──────────┐  ┌▼──────────┐  ┌▼────────────┐
     │ Billing Service │  │ Notification│  │ Analytics │  │   Admin     │
     │   (Auth only)   │  │  (Auth)     │  │  (Events) │  │  (Read-only)│
     └────────┬────────┘  └─────────────┘  └───────────┘  └─────────────┘
              │
     ┌────────▼────────┐
     │ Reports Service │
     │ (Auth+Billing)  │
     └────────┬────────┘
              │
     ┌────────▼────────┐
     │  Audit Service  │
     │  (All Events)   │
     └─────────────────┘
```

## 🚦 Development Phases

### ⚡ Phase 0: Infrastructure & Shared (0 giorni - già fatto)

**Status**: ✅ COMPLETED

**Outputs**:

- ✅ Docker Compose configurato
- ✅ Database infrastructure (PostgreSQL, MongoDB, Redis, RabbitMQ)
- ✅ Vault setup
- ✅ Monitoring stack (Prometheus, Grafana, Jaeger)
- ✅ Frontend base con endpoint v2

**Next**: Nessuna azione richiesta, infrastruttura pronta.

---

### 🔴 Phase 1: Core Authentication (3-4 giorni)

**Priority**: CRITICAL
**Parallel Agents**: 1

#### Agent 1: Auth Service Developer

**Inputs**:

- `/services/auth/DEVELOPMENT.md`
- `/docs/development/MICROSERVICES_OVERVIEW.md`

**Tasks**:

1. Completare implementazione Auth Service

   - [ ] User model + migrations (già parzialmente fatto)
   - [ ] JWT service (access + refresh tokens)
   - [ ] Login/Logout endpoints
   - [ ] Registration + email verification flow
   - [ ] Password reset flow
   - [ ] Session management con Redis
   - [ ] 2FA con TOTP
   - [ ] Rate limiting + brute force protection
   - [ ] CSRF middleware
   - [ ] RabbitMQ event publishing

2. Testing

   - [ ] Unit tests (coverage >= 80%)
   - [ ] Integration tests API
   - [ ] Security tests

3. Documentation
   - [ ] OpenAPI schema aggiornato
   - [ ] README con esempi d'uso
   - [ ] Postman collection

**Outputs**:

- ✅ Auth Service completamente funzionante
- ✅ JWT token generation/validation
- ✅ User CRUD APIs
- ✅ RabbitMQ events: `user.registered`, `user.logged_in`, etc.

**Blockers**: Nessuno - può iniziare immediatamente

**Validation**:

```bash
# Health checks
curl http://localhost:8010/health
curl http://localhost:8010/ready

# Test registration
curl -X POST http://localhost:8010/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","full_name":"Test User"}'

# Test login
curl -X POST http://localhost:8010/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Run tests
cd services/auth && pytest tests/ --cov=app
```

---

### 🟠 Phase 2: Billing & Quota Management (4-5 giorni)

**Priority**: HIGH
**Parallel Agents**: 2
**Dependencies**: Auth Service completato

#### Agent 2: Billing Service Developer

**Inputs**:

- `/services/billing/DEVELOPMENT.md`
- Auth Service API (per user validation)

**Tasks**:

1. Database & Models

   - [ ] subscription_plans model + seed data (Trial, Basic, Medium, Professional)
   - [ ] user_subscriptions model
   - [ ] payments model
   - [ ] invoices model
   - [ ] usage_quotas model
   - [ ] Migrations

2. Core Subscription Logic

   - [ ] GET /plans endpoint
   - [ ] GET /subscription endpoint
   - [ ] POST /subscribe (Stripe integration)
   - [ ] POST /cancel subscription
   - [ ] PUT /upgrade downgrade

3. Quota Management

   - [ ] Quota service (check + increment)
   - [ ] POST /usage/increment (internal endpoint)
   - [ ] GET /usage endpoint
   - [ ] Monthly reset cron job

4. Stripe Integration

   - [ ] Stripe service wrapper
   - [ ] Payment intent flow
   - [ ] Webhook handler (subscription._, payment._)
   - [ ] Customer creation

5. Events & Integration
   - [ ] RabbitMQ publisher (subscription.created, payment.successful, etc.)
   - [ ] Consume events from Auth (user.registered → create trial)

**Outputs**:

- ✅ Billing Service API completo
- ✅ Stripe integration funzionante
- ✅ Quota tracking system
- ✅ Trial auto-activation su registrazione

**Validation**:

```bash
# Get plans
curl http://localhost:8012/api/v2/billing/plans

# Check quota (requires auth token)
TOKEN="..." # From auth service
curl http://localhost:8012/api/v2/billing/usage \
  -H "Authorization: Bearer $TOKEN"

# Tests
cd services/billing && pytest tests/ --cov=app
```

#### Agent 3: Notification Service Developer (Parallelo)

**Inputs**:

- `/services/notification/DEVELOPMENT.md`
- Auth Service events

**Tasks**:

1. Email Templates

   - [ ] Template model + migrations
   - [ ] Seed templates (welcome, verification, password_reset)
   - [ ] Template rendering con Jinja2

2. Email Sending

   - [ ] SMTP service wrapper
   - [ ] Queue management
   - [ ] Retry logic
   - [ ] Delivery tracking

3. Event Consumers
   - [ ] RabbitMQ consumer setup
   - [ ] Handler: user.registered → welcome email
   - [ ] Handler: user.password_changed → notification
   - [ ] Handler: subscription.created → confirmation

**Outputs**:

- ✅ Notification Service funzionante
- ✅ Email templates configurati
- ✅ Event-driven notifications

**Validation**:

```bash
# Check MailHog (http://localhost:8025)
# Verify emails sent after user registration
```

---

### 🟡 Phase 3: Reports AI Processing (4-5 giorni)

**Priority**: HIGH
**Parallel Agents**: 2
**Dependencies**: Auth + Billing completati

#### Agent 4: Reports Service Developer

**Inputs**:

- `/services/reports/DEVELOPMENT.md`
- Auth Service (user validation)
- Billing Service (quota check API)

**Tasks**:

1. Database & Specialties

   - [ ] medical_specialties model + seed 19+ specialità
   - [ ] report_templates model
   - [ ] processing_metrics model
   - [ ] Migrations

2. PII Sanitization

   - [ ] Sanitizer service (regex + NER)
   - [ ] Test sanitization (CF, dates, names, phones)

3. Azure OpenAI Integration

   - [ ] OpenAI service wrapper
   - [ ] Streaming SSE implementation
   - [ ] Assistant management per specialty
   - [ ] Error handling + retries

4. Core Processing Endpoint

   - [ ] POST /process con streaming
   - [ ] Quota verification (call Billing Service)
   - [ ] Usage tracking
   - [ ] Medical disclaimer injection

5. Specialties & Templates

   - [ ] GET /specialties
   - [ ] GET /templates
   - [ ] POST /templates (custom, Professional+ only)

6. Events
   - [ ] Publish report.processed
   - [ ] Publish report.failed
   - [ ] Publish quota.exceeded

**Outputs**:

- ✅ Reports Service completo
- ✅ AI processing con streaming
- ✅ 19+ specializzazioni configurate
- ✅ Quota enforcement integrato

**Validation**:

```bash
# Process report (requires auth + active subscription)
curl -X POST http://localhost:8011/api/v2/reports/process \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "specialty": "RAD",
    "text": "Paziente di 45 anni presenta dolore toracico..."
  }'

# Tests
cd services/reports && pytest tests/ --cov=app
```

#### Agent 5: Analytics Service Developer (Parallelo)

**Inputs**:

- `/services/analytics/DEVELOPMENT.md`
- Events da tutti i servizi

**Tasks**:

1. MongoDB Setup

   - [ ] Events collection
   - [ ] Metrics collections (hourly, daily)
   - [ ] Indexes

2. Event Consumer

   - [ ] RabbitMQ consumer (bind a TUTTI gli eventi)
   - [ ] Anonymization logic
   - [ ] Event storage

3. Aggregation Logic

   - [ ] Hourly rollup job
   - [ ] Daily summary job
   - [ ] KPI calculation

4. Analytics API
   - [ ] GET /metrics con filtri temporali
   - [ ] GET /trends
   - [ ] GET /kpis

**Outputs**:

- ✅ Analytics Service funzionante
- ✅ Time-series metrics storage
- ✅ Real-time aggregation

---

### 🔴 Phase 4: Audit & Compliance (5-6 giorni)

**Priority**: CRITICAL (Legal requirement)
**Parallel Agents**: 1
**Dependencies**: Tutti i servizi precedenti (per events)

#### Agent 6: Audit Service Developer

**Inputs**:

- `/services/audit/DEVELOPMENT.md`
- Events da TUTTI i servizi

**Tasks**:

1. Database Setup

   - [ ] audit_logs table con partitioning mensile
   - [ ] ai_decision_logs table
   - [ ] gdpr_requests table
   - [ ] consent_log table
   - [ ] data_retention_schedule table
   - [ ] Append-only enforcement
   - [ ] Encryption at rest

2. Audit Logging

   - [ ] RabbitMQ consumer (TUTTI gli eventi)
   - [ ] POST /audit/log endpoint (internal)
   - [ ] Partition management automation
   - [ ] Query API con filtri

3. GDPR Compliance

   - [ ] POST /gdpr/export (data export)
   - [ ] POST /gdpr/delete (anonymization)
   - [ ] POST /gdpr/rectify
   - [ ] GET /gdpr/status
   - [ ] Export generation (ZIP con tutti i dati)
   - [ ] Anonymization logic

4. AI Act Compliance

   - [ ] AI decision logging
   - [ ] Confidence score tracking
   - [ ] Human oversight logging
   - [ ] Compliance reports

5. Data Retention
   - [ ] Retention policy configuration
   - [ ] Automated cleanup job (daily cron)
   - [ ] Archive old records

**Outputs**:

- ✅ Audit Service completo
- ✅ Immutable audit trail
- ✅ GDPR compliance APIs
- ✅ AI Act compliance
- ✅ Automated retention enforcement

**Validation**:

```bash
# Check audit trail
curl http://localhost:8016/api/v2/audit/trail/{user_id} \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Request data export (GDPR)
curl -X POST http://localhost:8016/api/v2/audit/gdpr/export \
  -H "Authorization: Bearer $TOKEN"

# Tests
cd services/audit && pytest tests/ --cov=app
```

---

### 🟢 Phase 5: Admin Dashboard (3-4 giorni)

**Priority**: LOW
**Parallel Agents**: 1
**Dependencies**: Tutti i servizi (read-only access)

#### Agent 7: Admin Service Developer

**Inputs**:

- `/services/admin/DEVELOPMENT.md`
- API di tutti i servizi

**Tasks**:

1. Dashboard API

   - [ ] GET /dashboard (aggregated metrics)
   - [ ] Service health checks aggregation

2. User Management

   - [ ] GET /users con filtri + pagination
   - [ ] GET /users/{id} con dettagli completi
   - [ ] POST /users/{id}/suspend
   - [ ] POST /users/{id}/activate

3. Integration con altri servizi
   - [ ] HTTP clients per Auth, Billing, Reports, Analytics
   - [ ] Data aggregation logic
   - [ ] Read replica connections (se configurato)

**Outputs**:

- ✅ Admin Service completo
- ✅ Dashboard API
- ✅ User management tools

---

## 🔧 Shared Components da Creare

### Before Phase 1

#### `/shared/python/` Common Library

```python
# shared/python/
├── auth/
│   ├── jwt_validator.py       # Shared JWT validation
│   └── dependencies.py        # FastAPI dependencies
├── models/
│   ├── enums.py              # UserRole, MedicalSpecialty, etc.
│   └── base.py               # Base SQLAlchemy models
├── events/
│   ├── publisher.py          # RabbitMQ publisher
│   ├── consumer.py           # RabbitMQ consumer base
│   └── schemas.py            # Event schemas
├── utils/
│   ├── logging.py            # Structured logging setup
│   ├── exceptions.py         # Custom exceptions
│   └── validators.py         # Common validators
└── setup.py
```

**Responsible**: Agent 1 (durante Phase 1)

---

## 🎬 Execution Plan

### Week 1: Foundation

```
Day 1-4: Phase 1 (Auth Service)
  └─ Agent 1: Auth Service complete
```

### Week 2: Core Features

```
Day 5-9: Phase 2 (Billing + Notifications)
  ├─ Agent 2: Billing Service
  └─ Agent 3: Notification Service (parallel)

Day 10-14: Phase 3 (Reports + Analytics)
  ├─ Agent 4: Reports Service
  └─ Agent 5: Analytics Service (parallel)
```

### Week 3: Compliance & Admin

```
Day 15-20: Phase 4 (Audit)
  └─ Agent 6: Audit Service

Day 21-24: Phase 5 (Admin)
  └─ Agent 7: Admin Service
```

---

## 🧪 Integration Testing Plan

### After Each Phase

#### Phase 1 Complete: Auth Integration Tests

```bash
# Test full registration flow
scripts/test/integration/test_auth_flow.sh

# Test token validation between services
scripts/test/integration/test_service_auth.sh
```

#### Phase 2 Complete: Billing Integration Tests

```bash
# Test trial activation on registration
scripts/test/integration/test_trial_flow.sh

# Test quota enforcement
scripts/test/integration/test_quota_flow.sh
```

#### Phase 3 Complete: Reports Integration Tests

```bash
# Test full report processing with quota
scripts/test/integration/test_report_flow.sh

# Test quota exceeded handling
scripts/test/integration/test_quota_exceeded.sh
```

#### Phase 4 Complete: Audit Integration Tests

```bash
# Test GDPR export flow
scripts/test/integration/test_gdpr_export.sh

# Test audit trail completeness
scripts/test/integration/test_audit_trail.sh
```

#### Phase 5 Complete: Full System Integration

```bash
# End-to-end flow
scripts/test/e2e/test_full_user_journey.sh
```

---

## 📊 Progress Tracking

### Checklist per Ogni Servizio

**Definition of Done**:

- [ ] Database models + migrations complete
- [ ] All API endpoints implemented
- [ ] Unit tests >= 80% coverage
- [ ] Integration tests passing
- [ ] OpenAPI schema documented
- [ ] README con esempi
- [ ] Health checks implemented
- [ ] Prometheus metrics exported
- [ ] RabbitMQ events (pub/sub) working
- [ ] Docker container building
- [ ] Local docker-compose testing passed

---

## 🚨 Blockers & Dependencies

### Critical Path

```
Auth → Billing → Reports → Audit
```

Se un servizio nel critical path è bloccato, tutto il downstream è bloccato.

### Parallel Tracks (No blockers)

- Notification Service (dipende solo da Auth)
- Analytics Service (dipende da eventi, può lavorare con mocks)
- Admin Service (può iniziare con stubs)

---

## 📞 Communication & Coordination

### Daily Sync (se agenti multipli attivi)

- Stato progress per fase
- Blockers identificati
- API contracts changes
- Event schema updates

### Shared Resources

- PostgreSQL: Ogni servizio ha DB dedicato (no conflicts)
- RabbitMQ: Exchange condiviso (no conflicts con routing keys)
- Redis: Namespace per servizio (no conflicts)

---

## 🎯 Success Criteria

### Phase Completion Gates

**Phase 1 Gate**:

- ✅ Auth Service health check passing
- ✅ User can register, login, logout
- ✅ JWT tokens validating correctly
- ✅ Events publishing to RabbitMQ

**Phase 2 Gate**:

- ✅ Trial subscription auto-created on registration
- ✅ Quota check API working
- ✅ Stripe payment flow working (test mode)

**Phase 3 Gate**:

- ✅ Report processing with AI working
- ✅ Quota enforcement blocking over-limit requests
- ✅ All 19+ specialties configured

**Phase 4 Gate**:

- ✅ All events being logged to audit trail
- ✅ GDPR export generating ZIP file
- ✅ Data retention policy enforcing

**Phase 5 Gate**:

- ✅ Admin dashboard showing live metrics
- ✅ User management operations working

---

## 📝 Agent Onboarding Instructions

### For Each Agent

**When starting your assigned phase**:

1. **Read Documentation**

   - `/services/{your-service}/DEVELOPMENT.md`
   - `/docs/development/MICROSERVICES_OVERVIEW.md`
   - This orchestration document

2. **Check Dependencies**

   - Ensure required services from previous phases are complete
   - Test dependency APIs with curl/Postman

3. **Setup Local Environment**

   ```bash
   cd services/{your-service}
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Database Migrations**

   ```bash
   alembic revision --autogenerate -m "Initial schema"
   alembic upgrade head
   ```

5. **Start Development**

   - Follow tasks in your phase section above
   - Run tests frequently: `pytest tests/`
   - Update progress in `/history.md`

6. **Before Marking Complete**
   - Run full test suite: `pytest tests/ --cov=app --cov-report=html`
   - Verify health checks: `curl http://localhost:{PORT}/health`
   - Test with other services via docker-compose
   - Update OpenAPI docs
   - Commit & push to feature branch

---

## 📄 Final Deliverables

### End of All Phases

**Code**:

- ✅ 7 microservizi completamente funzionanti
- ✅ Docker Compose orchestration
- ✅ Database migrations
- ✅ Shared libraries

**Documentation**:

- ✅ OpenAPI schemas per ogni servizio
- ✅ README con quick start
- ✅ Architecture diagrams
- ✅ API examples (Postman collections)

**Testing**:

- ✅ Unit tests (>80% coverage per servizio)
- ✅ Integration tests
- ✅ End-to-end tests
- ✅ Load testing results

**Compliance**:

- ✅ GDPR compliance checklist completed
- ✅ AI Act requirements met
- ✅ Medical disclaimer in place
- ✅ Audit trail operational

---

**Last Updated**: 2024-11-21
**Version**: 1.0.0
**Status**: Ready for Execution

**Next Action**: Assign Agent 1 to Phase 1 (Auth Service)
