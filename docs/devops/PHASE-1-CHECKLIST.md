# FASE 1 - FONDAMENTA DEVOPS - CHECKLIST OPERATIVA

**Data Inizio**: 2025-11-22
**Durata Stimata**: 1 settimana (40 ore)
**Priorità**: 🔴 CRITICA

---

## 📋 Overview

Questa fase implementa le fondamenta essenziali per l'infrastruttura DevOps:

- ✅ Semantic versioning per tutti i microservizi
- ✅ Branching strategy documentata e protetta
- ✅ Ambiente staging configurato
- ✅ CI/CD pipeline base attiva

---

## 🎯 Task 1.1: SEMANTIC VERSIONING (8 ore)

### 1.1.1 Creare file `__version__.py` per ogni servizio

**Effort**: 2 ore

#### Auth Service

- [ ] Creare `services/auth/app/__version__.py`
- [ ] Contenuto:

```python
"""Version information for auth-service."""

__version__ = "1.0.0"
__service__ = "auth-service"
__author__ = "RefertoSicuro Team"
__email__ = "tech@refertosicuro.it"

# Build information (populated by CI/CD)
__build__ = "local"
__build_date__ = "unknown"
__git_commit__ = "unknown"
```

#### Reports Service

- [ ] Creare `services/reports/app/__version__.py`
- [ ] Stesso template con `__service__ = "reports-service"`

#### Billing Service

- [ ] Creare `services/billing/app/__version__.py`
- [ ] Stesso template con `__service__ = "billing-service"`

#### Admin Service

- [ ] Creare `services/admin/app/__version__.py`
- [ ] Stesso template con `__service__ = "admin-service"`

#### Analytics Service

- [ ] Creare `services/analytics/app/__version__.py`
- [ ] Stesso template con `__service__ = "analytics-service"`

#### Notification Service

- [ ] Creare `services/notification/app/__version__.py`
- [ ] Stesso template con `__service__ = "notification-service"`

---

### 1.1.2 Aggiornare Health Endpoints

**Effort**: 3 ore

#### Per ogni servizio (auth, reports, billing, admin, analytics, notification)

- [ ] Aprire `services/{service}/app/api/v1/health.py`
- [ ] Aggiungere import:

```python
from app.__version__ import __version__, __service__, __build__, __build_date__
from datetime import datetime
```

- [ ] Modificare endpoint `/health`:

```python
@router.get("/health")
async def health_check():
    """Health check endpoint with version info."""
    return {
        "status": "healthy",
        "service": __service__,
        "version": __version__,
        "build": __build__,
        "build_date": __build_date__,
        "timestamp": datetime.utcnow().isoformat()
    }
```

- [ ] Aggiungere endpoint `/version`:

```python
@router.get("/version")
async def version_info():
    """Detailed version information."""
    return {
        "service": __service__,
        "version": __version__,
        "build": __build__,
        "build_date": __build_date__,
        "git_commit": __git_commit__
    }
```

#### Testing

- [ ] Avviare servizi: `make up`
- [ ] Test auth-service: `curl http://localhost:8010/health | jq`
- [ ] Test reports-service: `curl http://localhost:8011/health | jq`
- [ ] Test billing-service: `curl http://localhost:8012/health | jq`
- [ ] Test admin-service: `curl http://localhost:8013/health | jq`
- [ ] Test analytics-service: `curl http://localhost:8014/health | jq`
- [ ] Test notification-service: `curl http://localhost:8015/health | jq`
- [ ] Verificare che tutti rispondano con `version: "1.0.0"`

---

### 1.1.3 Frontend Versioning

**Effort**: 1 ora

- [ ] Creare `frontend/src/config/version.ts`:

```typescript
export const VERSION = {
  app: "2.0.0",
  build: import.meta.env.VITE_BUILD_NUMBER || "local",
  buildDate: import.meta.env.VITE_BUILD_DATE || "unknown",
  gitCommit: import.meta.env.VITE_GIT_COMMIT || "unknown",
};
```

- [ ] Aggiungere version nel footer (se esiste):

```typescript
// frontend/src/components/Footer.tsx o Layout.tsx
import { VERSION } from '@/config/version';

// Nel render:
<span className="text-xs text-gray-500">
  v{VERSION.app} ({VERSION.build})
</span>
```

- [ ] Test: `cd frontend && npm run dev`
- [ ] Verificare versione visibile nell'UI

---

### 1.1.4 Documentare Versioning Rules

**Effort**: 2 ore

- [ ] Creare `docs/devops/VERSIONING.md` (contenuto completo nella roadmap)
- [ ] Aggiungere sezioni:

  - Semantic Versioning Rules (MAJOR.MINOR.PATCH)
  - Quando incrementare MAJOR
  - Quando incrementare MINOR
  - Quando incrementare PATCH
  - Release process con git tag
  - Esempi pratici

- [ ] Linkare da CLAUDE.md (già fatto ✅)

---

## 🎯 Task 1.2: BRANCHING STRATEGY (4 ore)

### 1.2.1 Documentare Strategia

**Effort**: 2 ore

- [ ] Creare `docs/devops/BRANCHING.md`
- [ ] Contenuto:
  - GitFlow overview
  - Branch types (main, develop, feature, bugfix, hotfix, release)
  - Naming conventions
  - Workflow examples
  - Commit message conventions
  - PR process

### 1.2.2 Configurare Branch Protection su GitHub

**Effort**: 1 ora

#### Protezione `main` branch

- [ ] Andare su GitHub → Settings → Branches
- [ ] Add rule per pattern: `main`
- [ ] Selezionare:
  - [x] Require pull request reviews before merging
  - [x] Required approvals: 2
  - [x] Dismiss stale PR approvals when new commits are pushed
  - [x] Require review from Code Owners (se disponibile)
  - [x] Require status checks to pass before merging
  - [x] Require branches to be up to date before merging
  - [x] Require conversation resolution before merging
  - [x] Require signed commits
  - [x] Include administrators
  - [x] Restrict who can push to matching branches
  - [ ] Allow force pushes (DISABLED)
  - [ ] Allow deletions (DISABLED)

#### Protezione `develop` branch

- [ ] Add rule per pattern: `develop`
- [ ] Selezionare:
  - [x] Require pull request reviews before merging
  - [x] Required approvals: 1
  - [x] Require status checks to pass before merging
  - [x] Require conversation resolution before merging
  - [ ] Allow force pushes (DISABLED)
  - [ ] Allow deletions (DISABLED)

### 1.2.3 Testing Branch Protection

**Effort**: 1 ora

- [ ] Tentare force push su `main`: `git push -f origin main` (deve fallire)
- [ ] Tentare force push su `develop`: `git push -f origin develop` (deve fallire)
- [ ] Creare test PR senza approval (deve essere bloccata)
- [ ] Documentare screenshot delle configurazioni

---

## 🎯 Task 1.3: STAGING ENVIRONMENT (12 ore)

### 1.3.1 Creare docker-compose.staging.yml

**Effort**: 6 ore

- [ ] Copiare `docker-compose.dev.yml` → `docker-compose.staging.yml`
- [ ] Modificare per staging:
  - [ ] `ENVIRONMENT: staging`
  - [ ] `LOG_LEVEL: info` (non debug)
  - [ ] Rimuovere tutti i dev tools (pgAdmin, Adminer, etc.)
  - [ ] Usare immagini taggate invece di build locali
  - [ ] Configurare restart policies: `unless-stopped`
  - [ ] Aggiungere resource limits
  - [ ] Configurare health checks per tutti i servizi

#### Esempio per auth-service

```yaml
auth-service:
  image: ghcr.io/refertosicuro/auth-service:${VERSION:-latest}
  container_name: rs_auth_staging
  environment:
    ENVIRONMENT: staging
    LOG_LEVEL: info
    # Altri env da Vault
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8010/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
  deploy:
    resources:
      limits:
        cpus: "0.5"
        memory: 512M
      reservations:
        cpus: "0.25"
        memory: 256M
```

- [ ] Ripetere per tutti i 6 microservizi
- [ ] Configurare database con credenziali staging
- [ ] Configurare Redis con password
- [ ] Configurare RabbitMQ con credenziali staging

---

### 1.3.2 Creare .env.staging.example

**Effort**: 2 ore

- [ ] Creare `.env.staging.example`
- [ ] Documentare tutte le variabili necessarie
- [ ] Aggiungere commenti per secrets da Vault
- [ ] Aggiungere `.env.staging` a `.gitignore`

Contenuto minimo:

```bash
# Environment
ENVIRONMENT=staging
VERSION=1.0.0

# Database
STAGING_POSTGRES_PASSWORD=<from-vault>
STAGING_REDIS_PASSWORD=<from-vault>

# External Services (test credentials)
AZURE_OPENAI_ENDPOINT=https://staging-openai.azure.com/
AZURE_OPENAI_KEY=<from-vault>
STRIPE_SECRET_KEY=sk_test_<from-vault>
```

---

### 1.3.3 Script di Deployment Staging

**Effort**: 4 ore

- [ ] Creare directory: `mkdir -p scripts/deployment`
- [ ] Creare `scripts/deployment/deploy-staging.sh`:

```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🚀 Deploying to STAGING environment"
echo "=================================="

# Load environment
if [ ! -f "$PROJECT_ROOT/.env.staging" ]; then
    echo "❌ Error: .env.staging not found"
    exit 1
fi

source "$PROJECT_ROOT/.env.staging"

# Verify VERSION is set
if [ -z "${VERSION:-}" ]; then
    echo "❌ Error: VERSION not set in .env.staging"
    exit 1
fi

echo "📦 Version: $VERSION"

# Pull latest images
echo "📥 Pulling Docker images..."
docker-compose -f "$PROJECT_ROOT/docker-compose.staging.yml" pull

# Stop old containers
echo "🛑 Stopping old containers..."
docker-compose -f "$PROJECT_ROOT/docker-compose.staging.yml" down

# Start new containers
echo "🔄 Starting new containers..."
docker-compose -f "$PROJECT_ROOT/docker-compose.staging.yml" up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Health checks
echo "🏥 Running health checks..."
SERVICES=("auth" "reports" "billing" "admin" "analytics" "notification")
PORTS=(8010 8011 8012 8013 8014 8015)

for i in "${!SERVICES[@]}"; do
    service="${SERVICES[$i]}"
    port="${PORTS[$i]}"
    echo "Checking ${service}-service on port ${port}..."

    if curl -sf "http://localhost:${port}/health" > /dev/null; then
        echo "  ✅ ${service}-service is healthy"
    else
        echo "  ❌ ${service}-service failed health check"
        exit 1
    fi
done

echo ""
echo "✅ Staging deployment complete!"
echo "📊 Services available at:"
for i in "${!SERVICES[@]}"; do
    echo "  - ${SERVICES[$i]}: http://localhost:${PORTS[$i]}"
done
```

- [ ] Rendere eseguibile: `chmod +x scripts/deployment/deploy-staging.sh`
- [ ] Test locale: `./scripts/deployment/deploy-staging.sh`

---

## 🎯 Task 1.4: CI/CD PIPELINE BASE (16 ore)

### 1.4.1 Rinominare e Attivare Workflow Base

**Effort**: 2 ore

- [ ] Rinominare `.github/workflows/minimal.yml` → `.github/workflows/ci-base.yml`
- [ ] Aggiornare contenuto del workflow (vedi DEVOPS-ROADMAP.md)
- [ ] Commit e push:

```bash
git add .github/workflows/ci-base.yml
git commit -m "ci: activate base CI/CD pipeline"
git push origin develop
```

- [ ] Verificare esecuzione su GitHub Actions

---

### 1.4.2 Configurare Security Scanning

**Effort**: 4 ore

- [ ] Verificare job `security-scan` nel workflow
- [ ] Aggiungere Trivy action
- [ ] Configurare SARIF upload a GitHub Security
- [ ] Test manualmente: `act -j security-scan` (se act installato)
- [ ] Verificare risultati nella Security tab di GitHub

---

### 1.4.3 Configurare Test Matrix

**Effort**: 6 ore

- [ ] Job `test-services` con matrix per [auth, reports, billing]
- [ ] Setup PostgreSQL service container
- [ ] Setup Redis service container
- [ ] Installare dipendenze Python
- [ ] Eseguire linting (ruff, black, mypy)
- [ ] Eseguire test con coverage
- [ ] Upload coverage a Codecov

Test locale per auth-service:

```bash
cd services/auth
pytest tests/ -v --cov=app --cov-report=xml
```

---

### 1.4.4 Configurare Build e Push Immagini

**Effort**: 4 ore

- [ ] Setup Docker Buildx
- [ ] Login a GitHub Container Registry (GHCR)
- [ ] Build images per matrix [auth, reports, billing]
- [ ] Tag images con SHA e branch name
- [ ] Push a ghcr.io
- [ ] Configurare layer caching

Verificare images su: <https://github.com/orgs/YOUR_ORG/packages>

---

## ✅ Milestone 1 - Definition of Done

### Checklist Finale

#### Versioning

- [ ] Tutti i 6 microservizi hanno `__version__.py`
- [ ] Tutti gli health endpoints ritornano version
- [ ] Frontend mostra versione nell'UI
- [ ] `docs/devops/VERSIONING.md` creato e completo
- [ ] Test: `curl http://localhost:8010/health | jq '.version'` ritorna "1.0.0"

#### Branching

- [ ] `docs/devops/BRANCHING.md` creato e completo
- [ ] Branch protection su `main` attiva (2 reviewers)
- [ ] Branch protection su `develop` attiva (1 reviewer)
- [ ] Test force push fallisce su main/develop
- [ ] Screenshot configurazioni salvati in docs/devops/

#### Staging Environment

- [ ] `docker-compose.staging.yml` creato
- [ ] `.env.staging.example` documentato
- [ ] `.env.staging` in `.gitignore`
- [ ] Script `deploy-staging.sh` funzionante
- [ ] Test: `docker-compose -f docker-compose.staging.yml config` valido
- [ ] Test: Deploy staging eseguito con successo

#### CI/CD

- [ ] Workflow `.github/workflows/ci-base.yml` attivo
- [ ] Security scan funzionante (Trivy)
- [ ] Test pipeline passing per almeno auth-service
- [ ] Coverage report generato
- [ ] Docker images pubblicate su GHCR
- [ ] Nessun CRITICAL vulnerability rilevata

### Test di Accettazione

```bash
# 1. Versioning
for port in 8010 8011 8012 8013 8014 8015; do
  echo "Testing port $port..."
  curl -sf http://localhost:$port/health | jq '.version' || echo "FAILED"
done

# 2. Staging environment
docker-compose -f docker-compose.staging.yml config
docker-compose -f docker-compose.staging.yml up -d
sleep 30
curl -sf http://localhost:8010/health
docker-compose -f docker-compose.staging.yml down

# 3. CI/CD
git checkout -b test/phase-1-verification
git commit --allow-empty -m "test: verify Phase 1 completion"
git push origin test/phase-1-verification
gh pr create --base develop --title "test: Phase 1 verification"
# Verificare che tutti i check passano su GitHub

# 4. Branch protection
git checkout main
git commit --allow-empty -m "test: should fail"
git push -f origin main  # Deve fallire
```

### Deliverable

Al completamento della Fase 1, devono esistere:

1. **6 file** `__version__.py` (uno per servizio)
2. **2 file** documentazione (`VERSIONING.md`, `BRANCHING.md`)
3. **1 file** `docker-compose.staging.yml`
4. **1 file** `.env.staging.example`
5. **1 file** `scripts/deployment/deploy-staging.sh`
6. **1 file** `.github/workflows/ci-base.yml`
7. **Branch protection** configurata su GitHub
8. **Docker images** pubblicate su GHCR

### Sign-off

- [ ] Tutti i task completati
- [ ] Tutti i test di accettazione passati
- [ ] Documentazione aggiornata
- [ ] History.md aggiornato
- [ ] Code review completato
- [ ] Approvazione Stefano

---

## 📊 Tracking Progress

**Data Inizio**: \***\*\_\_\_\*\***
**Data Completamento Prevista**: \***\*\_\_\_\*\***
**Data Completamento Effettiva**: \***\*\_\_\_\*\***

**Ore Stimate**: 40
**Ore Effettive**: \***\*\_\_\_\*\***

**Blockers Incontrati**:

- [ ] Nessuno
- [ ] ***

**Note**:

---

---

---

**Prossima Fase**: [FASE 2 - Security & Compliance](./PHASE-2-CHECKLIST.md)
