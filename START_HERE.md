# 🚀 RefertoSicuro v2 - Development Start Guide

## 📋 Panoramica

Questo progetto è pronto per lo sviluppo parallelo orchestrato di 7 microservizi tramite agenti AI specializzati.

## 📚 Documentazione Chiave

### 1. **Lettura Obbligatoria Prima di Iniziare**

| Documento                                                                                    | Scopo                                           | Priorità    |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------- |
| [`CLAUDE.md`](./CLAUDE.md)                                                                   | Project instructions, architettura, convenzioni | 🔴 CRITICAL |
| [`DEVELOPMENT_ORCHESTRATION.md`](./DEVELOPMENT_ORCHESTRATION.md)                             | Piano orchestrazione, fasi, dipendenze          | 🔴 CRITICAL |
| [`docs/development/MICROSERVICES_OVERVIEW.md`](./docs/development/MICROSERVICES_OVERVIEW.md) | Convenzioni comuni, API standards               | 🟠 HIGH     |

### 2. **Specifiche per Microservizio**

Ogni servizio ha un documento `DEVELOPMENT.md` dettagliato:

| Servizio             | Path                                                                             | Status      | Priority    |
| -------------------- | -------------------------------------------------------------------------------- | ----------- | ----------- |
| Auth Service         | [`services/auth/DEVELOPMENT.md`](./services/auth/DEVELOPMENT.md)                 | ✅ Partial  | 🔴 CRITICAL |
| Billing Service      | [`services/billing/DEVELOPMENT.md`](./services/billing/DEVELOPMENT.md)           | ⚠️ Skeleton | 🟠 HIGH     |
| Reports Service      | [`services/reports/DEVELOPMENT.md`](./services/reports/DEVELOPMENT.md)           | ⚠️ Skeleton | 🟠 HIGH     |
| Audit Service        | [`services/audit/DEVELOPMENT.md`](./services/audit/DEVELOPMENT.md)               | ❌ Missing  | 🔴 CRITICAL |
| Notification Service | [`services/notification/DEVELOPMENT.md`](./services/notification/DEVELOPMENT.md) | ⚠️ Skeleton | 🟡 MEDIUM   |
| Analytics Service    | [`services/analytics/DEVELOPMENT.md`](./services/analytics/DEVELOPMENT.md)       | ⚠️ Skeleton | 🟡 MEDIUM   |
| Admin Service        | [`services/admin/DEVELOPMENT.md`](./services/admin/DEVELOPMENT.md)               | ⚠️ Skeleton | 🟢 LOW      |

## 🎯 Quick Start per Nuova Sessione

### Scenario 1: Voglio lanciare agenti paralleli per sviluppo orchestrato

```
1. Leggere: DEVELOPMENT_ORCHESTRATION.md
2. Identificare fase corrente (es: Phase 1 - Auth Service)
3. Lanciare agenti secondo piano:

   Esempio per Phase 1:
   - Agent 1: "Develop Auth Service following services/auth/DEVELOPMENT.md"

   Esempio per Phase 2 (parallelo):
   - Agent 2: "Develop Billing Service following services/billing/DEVELOPMENT.md"
   - Agent 3: "Develop Notification Service following services/notification/DEVELOPMENT.md"
```

### Scenario 2: Voglio sviluppare un singolo servizio

```
1. Scegli servizio da DEVELOPMENT_ORCHESTRATION.md
2. Leggi services/{servizio}/DEVELOPMENT.md
3. Verifica dipendenze sono soddisfatte
4. Segui tasks nella sezione "Development Tasks"
```

### Scenario 3: Voglio vedere lo stato del progetto

```
1. Leggi: history.md (tracking task completati)
2. Controlla: DEVELOPMENT_ORCHESTRATION.md (progress per fase)
3. Run: docker-compose ps (servizi attivi)
```

## 📊 Struttura Progetto

```
RefertoSicuro_v2/
├── START_HERE.md                    # ← Questo file
├── CLAUDE.md                        # Project instructions
├── DEVELOPMENT_ORCHESTRATION.md     # Piano orchestrazione agenti
├── history.md                       # Task tracking
│
├── docs/
│   └── development/
│       └── MICROSERVICES_OVERVIEW.md  # Convenzioni comuni
│
├── services/                        # Microservizi
│   ├── auth/
│   │   ├── DEVELOPMENT.md          # Spec completa Auth Service
│   │   ├── app/                    # Codice (parziale)
│   │   └── tests/
│   ├── billing/
│   │   ├── DEVELOPMENT.md
│   │   └── ...
│   ├── reports/
│   ├── audit/                      # ← Da creare
│   ├── notification/
│   ├── analytics/
│   └── admin/
│
├── frontend/                        # React app
│   └── src/
│       └── services/               # API clients (già aggiornati a v2)
│
├── infrastructure/                  # Docker, K8s, Terraform
├── scripts/                         # Utility scripts
└── docker-compose.dev.yml          # Local development
```

## 🔄 Development Workflow

### Per Ogni Microservizio

```bash
# 1. Setup environment
cd services/{service-name}
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
pip install -r requirements.txt

# 2. Database migrations
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head

# 3. Run tests
pytest tests/ --cov=app --cov-report=html

# 4. Start development server
uvicorn app.main:app --host 0.0.0.0 --port {PORT} --reload

# 5. Health check
curl http://localhost:{PORT}/health
curl http://localhost:{PORT}/ready
```

### Con Docker Compose

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f {service-name}

# Restart service
docker-compose -f docker-compose.dev.yml restart {service-name}

# Stop all
docker-compose -f docker-compose.dev.yml down
```

## 🎬 Execution Plan Summary

### Phase 1: Auth Service (3-4 giorni) 🔴 CRITICAL

- **Agent**: 1
- **Dependencies**: None
- **Deliverable**: Auth completo, JWT working, events publishing

### Phase 2: Billing + Notifications (4-5 giorni) 🟠 HIGH

- **Agents**: 2 (paralleli)
- **Dependencies**: Auth complete
- **Deliverables**: Billing + quota, Notification emails

### Phase 3: Reports + Analytics (4-5 giorni) 🟠 HIGH

- **Agents**: 2 (paralleli)
- **Dependencies**: Auth + Billing complete
- **Deliverables**: AI processing, Analytics dashboard

### Phase 4: Audit Service (5-6 giorni) 🔴 CRITICAL

- **Agent**: 1
- **Dependencies**: All previous phases
- **Deliverable**: GDPR + AI Act compliance

### Phase 5: Admin Service (3-4 giorni) 🟢 LOW

- **Agent**: 1
- **Dependencies**: All services
- **Deliverable**: Admin dashboard

**Total Timeline**: ~2-3 settimane con sviluppo parallelo

## 🧪 Testing Strategy

### Unit Tests (per ogni servizio)

```bash
pytest tests/unit/ --cov=app --cov-report=html
# Target: >= 80% coverage
```

### Integration Tests

```bash
pytest tests/integration/
# Test API endpoints, database, external services
```

### End-to-End Tests

```bash
scripts/test/e2e/test_full_user_journey.sh
# Test complete user flow across services
```

## 📝 Tracking Progress

### Update history.md After Each Task

```markdown
| Date       | Task                       | Status      | Notes                     |
| ---------- | -------------------------- | ----------- | ------------------------- |
| 2024-11-21 | Auth Service JWT           | completed   | All tests passing         |
| 2024-11-22 | Billing Stripe Integration | in_progress | Webhook handler remaining |
```

**Status Values**:

- `pending`: Pianificato ma non iniziato
- `in_progress`: Lavoro in corso
- `completed`: Completato e testato
- `validated_from_stefano`: Revisionato e approvato
- `blocked`: In attesa di dipendenze

## 🚨 Important Notes

### Security First

- ✅ NO secrets hardcoded (use Vault)
- ✅ SEMPRE input validation
- ✅ SEMPRE PII sanitization (medical data)
- ✅ Encryption at rest per dati sensibili

### Medical Compliance

- ✅ Medical disclaimer su OGNI response AI
- ✅ NO storage referti processati (privacy by design)
- ✅ Audit log TUTTE le operazioni mediche
- ✅ GDPR compliance da Day 1

### Code Quality

- ✅ Type hints su tutto
- ✅ Docstrings Google style
- ✅ Tests >= 80% coverage
- ✅ Black + Ruff formatting

## 🔗 Useful Links

### Local Development URLs

- Frontend: <http://localhost:5173>
- Auth Service: <http://localhost:8010>
- Reports Service: <http://localhost:8011>
- Billing Service: <http://localhost:8012>
- Admin Service: <http://localhost:8013>
- Analytics Service: <http://localhost:8014>
- Notification Service: <http://localhost:8015>
- Audit Service: <http://localhost:8016>

### Infrastructure

- PostgreSQL: localhost:5432
- MongoDB: localhost:27017
- Redis: localhost:6379
- RabbitMQ: localhost:5672 (Management UI: localhost:15672)
- Vault: <http://localhost:8200>

### Monitoring

- Prometheus: <http://localhost:9090>
- Grafana: <http://localhost:3000>
- Jaeger: <http://localhost:16686>

### Development Tools

- pgAdmin: <http://localhost:5050>
- Mongo Express: <http://localhost:8081>
- RedisInsight: <http://localhost:8001>
- Adminer: <http://localhost:8080>

## 🤖 AI Agent Instructions

### When You Start Working

1. **Read these files first**:

   - This file (START_HERE.md)
   - DEVELOPMENT_ORCHESTRATION.md
   - services/{your-service}/DEVELOPMENT.md
   - docs/development/MICROSERVICES_OVERVIEW.md

2. **Check dependencies**:

   - Verify required services are completed
   - Test dependency APIs

3. **Follow the spec exactly**:

   - Database schema as documented
   - API endpoints as specified
   - Naming conventions from MICROSERVICES_OVERVIEW.md
   - Event schemas as defined

4. **Test thoroughly**:

   - Unit tests >= 80% coverage
   - Integration tests for all endpoints
   - Health checks working

5. **Update documentation**:
   - OpenAPI schema
   - README examples
   - history.md with progress

## 📞 Questions?

Se hai dubbi durante lo sviluppo:

1. Controlla DEVELOPMENT.md del servizio
2. Controlla MICROSERVICES_OVERVIEW.md per convenzioni
3. Controlla CLAUDE.md per architettura generale
4. Usa AskUserQuestion tool se necessario

---

**Ready to Start?** → Go to [`DEVELOPMENT_ORCHESTRATION.md`](./DEVELOPMENT_ORCHESTRATION.md) per il piano dettagliato!

**Last Updated**: 2024-11-21
**Version**: 1.0.0
