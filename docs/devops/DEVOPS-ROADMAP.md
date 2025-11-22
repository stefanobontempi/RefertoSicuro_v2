# DevOps Implementation Roadmap - RefertoSicuro v2

**Versione**: 1.0.0
**Data Creazione**: 2025-11-22
**Ultima Revisione**: 2025-11-22
**Owner**: DevOps Team

---

## 🎯 Overview

Questo documento descrive il piano di implementazione completo per l'infrastruttura DevOps di RefertoSicuro v2, organizzato in 5 fasi progressive con milestone verificabili.

**Timeline Totale**: 10 settimane
**Effort Stimato**: ~200 ore
**Team Richiesto**: 1-2 DevOps Engineers

---

## 📊 Gantt Chart (ASCII)

```
Phase │ Week 1 │ Week 2 │ Week 3 │ Week 4 │ Week 5 │ Week 6 │ Week 7 │ Week 8 │ Week 9 │ Week 10│
──────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
  1   │ ██████ │        │        │        │        │        │        │        │        │        │
  2   │        │ ██████ │ ██████ │        │        │        │        │        │        │        │
  3   │        │        │        │ ██████ │ ██████ │        │        │        │        │        │
  4   │        │        │        │        │        │ ██████ │ ██████ │        │        │        │
  5   │        │        │        │        │        │        │        │ ██████ │ ██████ │ ██████ │
```

---

## 🚀 FASE 1: FONDAMENTA DEVOPS

**Durata**: 1 settimana (40 ore)
**Priorità**: 🔴 CRITICA
**Dipendenze**: Nessuna
**Blocca**: Tutte le fasi successive

### Obiettivi

- ✅ Implementare semantic versioning
- ✅ Documentare branching strategy
- ✅ Creare ambiente staging
- ✅ Configurare branch protection
- ✅ Setup base CI/CD

### Task Dettagliati

#### 1.1 Semantic Versioning (8 ore)

**Deliverable**: Ogni microservizio ha versioning funzionante

##### 1.1.1 Creare file versione

```bash
# Per ogni servizio: auth, reports, billing, admin, analytics, notification
File da creare: services/{service}/app/__version__.py
```

**Template**:

```python
"""Version information for {service}-service."""

__version__ = "1.0.0"
__service__ = "{service}-service"
__author__ = "RefertoSicuro Team"
__email__ = "tech@refertosicuro.it"

# Build information (populated by CI/CD)
__build__ = "local"
__build_date__ = "unknown"
__git_commit__ = "unknown"
```

**Checklist**:

- [ ] auth-service: `services/auth/app/__version__.py`
- [ ] reports-service: `services/reports/app/__version__.py`
- [ ] billing-service: `services/billing/app/__version__.py`
- [ ] admin-service: `services/admin/app/__version__.py`
- [ ] analytics-service: `services/analytics/app/__version__.py`
- [ ] notification-service: `services/notification/app/__version__.py`

##### 1.1.2 Aggiornare health endpoints

```python
# services/{service}/app/api/v1/health.py

from app.__version__ import __version__, __service__, __build__, __build_date__
from datetime import datetime

@router.get("/health", response_model=HealthResponse)
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

@router.get("/version", response_model=VersionResponse)
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

**Checklist**:

- [ ] Aggiornare tutti gli health endpoints
- [ ] Testare manualmente: `curl http://localhost:8010/health`
- [ ] Verificare response JSON contiene version

##### 1.1.3 Frontend versioning

```typescript
// frontend/src/config/version.ts

export const VERSION = {
  app: "2.0.0",
  build: import.meta.env.VITE_BUILD_NUMBER || "local",
  buildDate: import.meta.env.VITE_BUILD_DATE || "unknown",
  gitCommit: import.meta.env.VITE_GIT_COMMIT || "unknown",
};

// frontend/src/components/Footer.tsx
<span>v{VERSION.app} ({VERSION.build})</span>
```

**Checklist**:

- [ ] Creare `frontend/src/config/version.ts`
- [ ] Aggiungere version nel footer
- [ ] Testare build locale

##### 1.1.4 Documentare semantic versioning rules

```markdown
# File da creare: docs/devops/VERSIONING.md

## Semantic Versioning Rules

MAJOR.MINOR.PATCH

### MAJOR (X.0.0)

- Breaking API changes
- Database schema incompatibilities
- Service contract changes
  Example: v1.0.0 → v2.0.0

### MINOR (1.X.0)

- New features (backward compatible)
- New API endpoints
- Enhanced functionality
  Example: v1.1.0 → v1.2.0

### PATCH (1.0.X)

- Bug fixes
- Security patches
- Performance improvements
  Example: v1.0.1 → v1.0.2

### Release Process

1. Update `__version__.py` in service
2. Update `CHANGELOG.md`
3. Commit: `git commit -m "chore: bump version to X.Y.Z"`
4. Tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
5. Push: `git push origin vX.Y.Z`
```

**Checklist**:

- [ ] Creare `docs/devops/VERSIONING.md`
- [ ] Aggiungere esempi pratici
- [ ] Linkare da CLAUDE.md

---

#### 1.2 Branching Strategy (4 ore)

**Deliverable**: GitFlow documentato e configurato

##### 1.2.1 Documentare strategia

````markdown
# File da creare: docs/devops/BRANCHING.md

## GitFlow Strategy

### Branch Types

1. **main** (production)

   - Deploy: Production environment
   - Protection: Max security
   - Access: Only via PR from release/\*

2. **develop** (integration)

   - Deploy: Staging environment (auto)
   - Protection: Require review
   - Access: Via PR from feature/bugfix

3. **feature/RS-XXX-description**

   - Purpose: New features
   - Base: develop
   - Merge to: develop
   - Naming: feature/RS-123-user-2fa

4. **bugfix/RS-XXX-description**

   - Purpose: Bug fixes
   - Base: develop
   - Merge to: develop
   - Naming: bugfix/RS-456-jwt-refresh

5. **hotfix/RS-XXX-description**

   - Purpose: Critical production fixes
   - Base: main
   - Merge to: main + develop
   - Naming: hotfix/RS-789-security-patch

6. **release/vX.Y.Z**
   - Purpose: Release preparation
   - Base: develop
   - Merge to: main + develop
   - Naming: release/v1.0.0

### Workflow Example

```bash
# Start new feature
git checkout develop
git pull origin develop
git checkout -b feature/RS-123-2fa-implementation

# Work on feature
git add .
git commit -m "feat(auth): implement 2FA with TOTP"

# Push and create PR
git push origin feature/RS-123-2fa-implementation
gh pr create --base develop --title "feat: 2FA implementation"

# After review and merge, delete branch
git checkout develop
git pull origin develop
git branch -d feature/RS-123-2fa-implementation
```
````

````

**Checklist**:
- [ ] Creare `docs/devops/BRANCHING.md`
- [ ] Aggiungere workflow examples
- [ ] Documentare commit conventions

##### 1.2.2 Configurare branch protection

**GitHub Settings da applicare**:

```yaml
# main branch
Settings > Branches > Add rule

Branch name pattern: main

Protection rules:
  ✅ Require pull request reviews before merging
     Number of required approvals: 2
  ✅ Require status checks to pass before merging
     Status checks:
       - security-scan
       - test-services
       - build-images
  ✅ Require conversation resolution before merging
  ✅ Require signed commits
  ✅ Include administrators
  ✅ Restrict who can push to matching branches
  ❌ Allow force pushes
  ❌ Allow deletions

# develop branch
Branch name pattern: develop

Protection rules:
  ✅ Require pull request reviews before merging
     Number of required approvals: 1
  ✅ Require status checks to pass before merging
     Status checks:
       - security-scan
       - test-services
  ✅ Require conversation resolution before merging
  ❌ Allow force pushes
  ❌ Allow deletions
````

**Checklist**:

- [ ] Configurare protezione `main`
- [ ] Configurare protezione `develop`
- [ ] Testare: tentare force push (deve fallire)
- [ ] Documentare regole in BRANCHING.md

---

#### 1.3 Staging Environment (12 ore)

**Deliverable**: `docker-compose.staging.yml` funzionante

##### 1.3.1 Creare docker-compose.staging.yml

```yaml
# File da creare: docker-compose.staging.yml

version: "3.9"

x-common-variables: &common-variables
  ENVIRONMENT: staging
  LOG_LEVEL: info
  TZ: Europe/Rome

x-postgres-variables: &postgres-variables
  POSTGRES_HOST: postgres-staging.internal
  POSTGRES_PORT: 5432
  POSTGRES_DB: refertosicuro_staging
  POSTGRES_USER: refertosicuro_staging
  # Password from Vault

services:
  # Core Infrastructure
  postgres:
    image: postgres:16-alpine
    container_name: rs_postgres_staging
    environment:
      <<: *postgres-variables
      POSTGRES_PASSWORD: ${STAGING_POSTGRES_PASSWORD}
    volumes:
      - postgres_staging_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U refertosicuro_staging"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: rs_redis_staging
    command: redis-server --requirepass ${STAGING_REDIS_PASSWORD} --maxmemory 1gb
    volumes:
      - redis_staging_data:/data
    restart: unless-stopped

  # Microservices (production images)
  auth-service:
    image: ghcr.io/refertosicuro/auth-service:${VERSION}
    container_name: rs_auth_staging
    environment:
      <<: [*common-variables, *postgres-variables]
      SERVICE_NAME: auth-service
      PORT: 8010
      VAULT_ADDR: https://vault.internal:8200
      VAULT_TOKEN: ${STAGING_VAULT_TOKEN}
    ports:
      - "8010:8010"
    restart: unless-stopped
    depends_on:
      - postgres
      - redis

  # ... altri servizi ...

volumes:
  postgres_staging_data:
  redis_staging_data:

networks:
  staging_net:
    driver: bridge
```

**Checklist**:

- [ ] Creare `docker-compose.staging.yml`
- [ ] Configurare tutte le variabili d'ambiente
- [ ] Usare immagini taggate (non `latest`)
- [ ] Configurare restart policies
- [ ] Aggiungere health checks

##### 1.3.2 Creare .env.staging.example

```bash
# File da creare: .env.staging.example

# Environment
ENVIRONMENT=staging
VERSION=1.0.0

# Database (actual passwords in Vault)
STAGING_POSTGRES_PASSWORD=from-vault
STAGING_REDIS_PASSWORD=from-vault

# Vault
STAGING_VAULT_ADDR=https://vault.internal:8200
STAGING_VAULT_TOKEN=from-vault

# External Services (test credentials)
AZURE_OPENAI_ENDPOINT=https://staging-openai.azure.com/
STRIPE_SECRET_KEY=sk_test_...
```

**Checklist**:

- [ ] Creare `.env.staging.example`
- [ ] Documentare tutte le variabili necessarie
- [ ] Aggiungere `.env.staging` a `.gitignore`

##### 1.3.3 Script di deployment staging

```bash
# File da creare: scripts/deployment/deploy-staging.sh

#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🚀 Deploying to STAGING environment"

# Load Vault secrets
export VAULT_ADDR="https://vault.internal:8200"
export VAULT_TOKEN="${STAGING_VAULT_TOKEN}"

echo "📦 Pulling latest images..."
docker-compose -f docker-compose.staging.yml pull

echo "🔄 Restarting services..."
docker-compose -f docker-compose.staging.yml up -d

echo "⏳ Waiting for services to be healthy..."
sleep 10

echo "🏥 Running health checks..."
for service in auth reports billing admin analytics notification; do
  echo "Checking ${service}-service..."
  curl -f "http://localhost:801${service:0:1}/health" || exit 1
done

echo "✅ Staging deployment complete!"
echo "📊 Check status: https://staging.refertosicuro.it"
```

**Checklist**:

- [ ] Creare `scripts/deployment/deploy-staging.sh`
- [ ] Rendere eseguibile: `chmod +x`
- [ ] Testare localmente
- [ ] Aggiungere documentazione

---

#### 1.4 CI/CD Base (16 ore)

**Deliverable**: Pipeline funzionante con tests e security

##### 1.4.1 Riattivare workflow base

```yaml
# File da modificare: .github/workflows/ci-base.yml (rinominare minimal.yml)

name: CI/CD Base

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  PYTHON_VERSION: "3.12"
  NODE_VERSION: "20"

jobs:
  # 1. Security Scanning
  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: "fs"
          scan-ref: "."
          format: "sarif"
          output: "trivy-results.sarif"
          severity: "CRITICAL,HIGH"

      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: "trivy-results.sarif"

  # 2. Test Python Services
  test-services:
    name: Test ${{ matrix.service }}
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        service: [auth, reports, billing]

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: "pip"

      - name: Install dependencies
        working-directory: ./services/${{ matrix.service }}
        run: |
          pip install -r requirements.txt
          pip install -r requirements-test.txt

      - name: Run linting
        working-directory: ./services/${{ matrix.service }}
        run: |
          ruff check .
          black --check .
          mypy .

      - name: Run tests
        working-directory: ./services/${{ matrix.service }}
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379/0
        run: |
          pytest tests/ -v --cov=app --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./services/${{ matrix.service }}/coverage.xml
          flags: ${{ matrix.service }}

  # 3. Test Frontend
  test-frontend:
    name: Test Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run linting
        working-directory: ./frontend
        run: npm run lint

      - name: Run tests
        working-directory: ./frontend
        run: npm run test:coverage

      - name: Build
        working-directory: ./frontend
        run: npm run build

  # 4. Build Docker Images
  build-images:
    name: Build ${{ matrix.service }}
    runs-on: ubuntu-latest
    needs: [security-scan, test-services]
    if: github.event_name == 'push'
    strategy:
      matrix:
        service: [auth, reports, billing]

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}/${{ matrix.service }}-service
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./services/${{ matrix.service }}
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

**Checklist**:

- [ ] Rinominare `minimal.yml` → `ci-base.yml`
- [ ] Configurare tutti i job
- [ ] Aggiungere matrix per servizi
- [ ] Testare pipeline su PR
- [ ] Verificare artifacts

---

### Milestone 1 - Definition of Done

**Criteri di Completamento**:

- [ ] Tutti i 6 microservizi hanno `__version__.py`
- [ ] Health endpoints ritornano version info
- [ ] Frontend mostra versione nell'UI
- [ ] `docs/devops/VERSIONING.md` creato
- [ ] `docs/devops/BRANCHING.md` creato
- [ ] Branch protection su `main` e `develop` attiva
- [ ] `docker-compose.staging.yml` creato e testato
- [ ] `.env.staging.example` documentato
- [ ] Script `deploy-staging.sh` funzionante
- [ ] Pipeline CI/CD base attiva e passing
- [ ] Security scan funzionante
- [ ] Test coverage >80% per auth-service
- [ ] Docker images pubblicate su GHCR

**Testing**:

```bash
# Test versioning
curl http://localhost:8010/health | jq '.version'
curl http://localhost:8011/health | jq '.version'

# Test staging environment
docker-compose -f docker-compose.staging.yml config
docker-compose -f docker-compose.staging.yml up -d
curl http://localhost:8010/health

# Test CI/CD
git checkout -b test/pipeline-verification
git commit --allow-empty -m "test: verify CI pipeline"
git push origin test/pipeline-verification
gh pr create --base develop --title "test: CI verification"
# Verificare che tutti i check passano
```

**Deliverable**:

- ✅ Versioning completo
- ✅ Branching strategy documentata
- ✅ Staging environment pronto
- ✅ CI/CD pipeline base attiva

---

## 🔒 FASE 2: SECURITY & COMPLIANCE

**Durata**: 2 settimane (80 ore)
**Priorità**: 🔴 CRITICA
**Dipendenze**: Fase 1 completata
**Blocca**: Deploy in produzione

### Obiettivi

- ✅ Attivare security scanning automatico
- ✅ Implementare secrets rotation
- ✅ Setup GDPR compliance tracking
- ✅ Configurare audit logging
- ✅ Medical compliance checks

### Task Dettagliati

#### 2.1 Automated Security Scanning (20 ore)

##### 2.1.1 Attivare workflow security completo

```yaml
# File: .github/workflows/security-audit.yml
# (Spostare da workflows.disabled/)

# Aggiungere schedule:
on:
  schedule:
    - cron: "0 2 * * *" # Daily at 2 AM UTC
  workflow_dispatch:
  push:
    branches: [main, develop]
# Tutti i job già configurati
```

**Checklist**:

- [ ] Spostare `security-audit.yml` in `workflows/`
- [ ] Configurare secrets GitHub (GITGUARDIAN_API_KEY)
- [ ] Testare manualmente workflow
- [ ] Verificare SARIF upload a Security tab
- [ ] Configurare notifiche Slack per failure

##### 2.1.2 Pre-commit hooks

```yaml
# File da creare: .pre-commit-config.yaml

repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-merge-conflict

  - repo: https://github.com/psf/black
    rev: 23.12.1
    hooks:
      - id: black
        language_version: python3.12

  - repo: https://github.com/pycqa/isort
    rev: 5.13.2
    hooks:
      - id: isort

  - repo: https://github.com/charliermarsh/ruff-pre-commit
    rev: v0.1.9
    hooks:
      - id: ruff

  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.1
    hooks:
      - id: gitleaks
# Setup: pre-commit install
```

**Checklist**:

- [ ] Creare `.pre-commit-config.yaml`
- [ ] Installare: `pre-commit install`
- [ ] Testare su commit
- [ ] Documentare in README.md

---

#### 2.2 Secrets Rotation (16 ore)

##### 2.2.1 Script di rotazione automatica

```python
# File da creare: scripts/vault/rotate-secrets.py

#!/usr/bin/env python3
"""
Automatic secrets rotation script.
Rotates secrets in Vault every 90 days.
"""

import hvac
import os
from datetime import datetime, timedelta

VAULT_ADDR = os.getenv("VAULT_ADDR")
VAULT_TOKEN = os.getenv("VAULT_TOKEN")

SECRETS_TO_ROTATE = [
    "secret/auth-service/jwt_secret",
    "secret/auth-service/encryption_key",
    "secret/reports-service/api_key",
    # ... altri secrets
]

def rotate_secret(client, path):
    """Rotate a secret and keep old version."""
    print(f"Rotating {path}...")

    # Generate new secret
    new_secret = generate_random_secret(length=32)

    # Write new version
    client.secrets.kv.v2.create_or_update_secret(
        path=path,
        secret={"value": new_secret},
    )

    # Log rotation
    log_rotation(path)

def main():
    client = hvac.Client(url=VAULT_ADDR, token=VAULT_TOKEN)

    for secret_path in SECRETS_TO_ROTATE:
        rotate_secret(client, secret_path)

    print("✅ All secrets rotated successfully")

if __name__ == "__main__":
    main()
```

**Checklist**:

- [ ] Creare script rotazione
- [ ] Testare in development
- [ ] Schedulare in cron (ogni 90 giorni)
- [ ] Notificare team prima della rotazione

---

#### 2.3 GDPR Compliance (24 ore)

##### 2.3.1 Implementare GDPR endpoints

```python
# services/admin/app/api/v1/gdpr.py

from fastapi import APIRouter, Depends, HTTPException
from app.services.gdpr_service import GDPRService
from app.core.security import get_current_user

router = APIRouter()

@router.post("/gdpr/export")
async def export_user_data(
    user_id: str,
    current_user = Depends(get_current_user),
    gdpr_service: GDPRService = Depends()
):
    """
    Export all user data in machine-readable format.
    GDPR Article 20: Right to data portability
    """
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    data = await gdpr_service.export_user_data(user_id)

    # Log GDPR request for audit
    await gdpr_service.log_gdpr_request(
        user_id=user_id,
        request_type="data_export",
        requester_id=current_user.id
    )

    return {
        "user_data": data,
        "format": "JSON",
        "exported_at": datetime.utcnow(),
        "retention_info": "Data will be retained for 30 days"
    }

@router.post("/gdpr/delete")
async def delete_user_data(
    user_id: str,
    current_user = Depends(get_current_user),
    gdpr_service: GDPRService = Depends()
):
    """
    Delete all user data (right to be forgotten).
    GDPR Article 17: Right to erasure
    """
    # Verification process
    # Schedule deletion (30 day grace period)
    deletion_id = await gdpr_service.schedule_deletion(user_id)

    return {
        "deletion_id": deletion_id,
        "scheduled_date": datetime.utcnow() + timedelta(days=30),
        "status": "pending",
        "cancellable_until": datetime.utcnow() + timedelta(days=7)
    }

@router.post("/gdpr/rectify")
async def rectify_user_data(
    user_id: str,
    data: dict,
    current_user = Depends(get_current_user)
):
    """
    Rectify incorrect user data.
    GDPR Article 16: Right to rectification
    """
    # Implementation
    pass
```

**Checklist**:

- [ ] Implementare tutti gli endpoint GDPR
- [ ] Aggiungere audit logging
- [ ] Testare export completo
- [ ] Testare deletion process
- [ ] Documentare in OpenAPI

---

#### 2.4 Audit Logging (20 ore)

##### 2.4.1 Implementare sistema di audit completo

```python
# shared/audit/logger.py

from datetime import datetime
from typing import Optional
import json

class AuditLogger:
    """
    Immutable audit logger for compliance.
    All medical operations MUST be logged.
    """

    async def log_medical_operation(
        self,
        user_id: str,
        operation: str,
        resource_type: str,
        resource_id: str,
        input_data_hash: str,
        output_data_hash: str,
        ai_model: Optional[str] = None,
        confidence: Optional[float] = None,
        metadata: Optional[dict] = None
    ):
        """Log medical operation for AI Act compliance."""
        audit_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "operation": operation,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "input_hash": input_data_hash,
            "output_hash": output_data_hash,
            "ai_model": ai_model,
            "confidence": confidence,
            "metadata": metadata or {},
            "ip_address": self._get_client_ip(),
            "user_agent": self._get_user_agent()
        }

        # Write to append-only audit log
        await self._write_audit_log(audit_entry)

        # Send to centralized logging
        await self._send_to_loki(audit_entry)

        # Update compliance metrics
        await self._update_metrics(audit_entry)
```

**Checklist**:

- [ ] Implementare AuditLogger
- [ ] Integrare in tutti i servizi medici
- [ ] Setup append-only database table
- [ ] Configurare retention policy (7 anni)
- [ ] Testare immutabilità dei log

---

### Milestone 2 - Definition of Done

**Criteri di Completamento**:

- [ ] Security scan automatico daily attivo
- [ ] Pre-commit hooks installati su tutti i dev
- [ ] Secrets rotation script funzionante
- [ ] Tutti gli endpoint GDPR implementati
- [ ] Audit logging completo attivo
- [ ] Nessun CRITICAL vulnerability in Trivy
- [ ] Nessun secret hardcoded (Gitleaks clean)
- [ ] Test coverage GDPR >90%

---

## 📊 FASE 3: MONITORING & OBSERVABILITY

**Durata**: 2 settimane (80 ore)
**Priorità**: 🟡 ALTA
**Dipendenze**: Fase 1 completata

### Obiettivi

- ✅ Configurare Prometheus metrics
- ✅ Creare Grafana dashboards
- ✅ Setup distributed tracing
- ✅ Configurare alerting
- ✅ Log aggregation

### Task Summary (dettaglio in documento separato)

- **Prometheus Metrics**: Application, business, security metrics
- **Grafana Dashboards**: 5 dashboard principali
- **Jaeger Tracing**: OpenTelemetry integration
- **Alerting**: PagerDuty/Slack integration
- **Log Aggregation**: Structured logging con Loki

---

## 🚀 FASE 4: DEPLOYMENT AUTOMATION

**Durata**: 2 settimane (80 ore)
**Priorità**: 🟡 ALTA
**Dipendenze**: Fase 1, 2, 3 completate

### Obiettivi

- ✅ Auto-deploy staging
- ✅ Manual approval production
- ✅ Blue-green deployment
- ✅ Rollback automation
- ✅ Smoke tests

### Task Summary

- **Staging Auto-Deploy**: On merge to develop
- **Production Deploy**: Manual approval workflow
- **Health Checks**: Automated post-deploy verification
- **Rollback**: One-click rollback capability
- **Notifications**: Slack/email deploy notifications

---

## 🏗️ FASE 5: KUBERNETES & SCALE

**Durata**: 4 settimane (160 ore)
**Priorità**: 🟢 FUTURA
**Dipendenze**: Tutte le fasi precedenti

### Obiettivi

- ✅ Kubernetes cluster setup
- ✅ Helm charts per tutti i servizi
- ✅ Horizontal Pod Autoscaling
- ✅ Service mesh (Istio)
- ✅ Multi-region deployment

### Task Summary

- **K8s Setup**: Cluster configuration
- **Helm Charts**: Package management
- **Autoscaling**: HPA based on metrics
- **Service Mesh**: Istio for advanced routing
- **Multi-region**: EU compliance

---

## 📋 Quick Reference

### Fase 1 Checklist (Questa Settimana)

```bash
[ ] 1.1 Versioning (8h)
    [ ] Create __version__.py files
    [ ] Update health endpoints
    [ ] Frontend versioning
    [ ] Documentation

[ ] 1.2 Branching (4h)
    [ ] Document strategy
    [ ] Configure branch protection
    [ ] Test protections

[ ] 1.3 Staging Environment (12h)
    [ ] Create docker-compose.staging.yml
    [ ] Environment variables
    [ ] Deployment script
    [ ] Testing

[ ] 1.4 CI/CD Base (16h)
    [ ] Activate pipeline
    [ ] Security scanning
    [ ] Test automation
    [ ] Docker image publishing
```

### Commands Reference

```bash
# Start fase 1
make setup
git checkout develop

# Test versioning
curl http://localhost:8010/health

# Test staging
docker-compose -f docker-compose.staging.yml up -d

# Run CI locally
act -j security-scan
act -j test-services

# Deploy staging
./scripts/deployment/deploy-staging.sh
```

---

**Prossimo Step**: Implementare Fase 1
**Documento Correlato**: [DEVOPS-ANALYSIS.md](./DEVOPS-ANALYSIS.md)
**Ultima Modifica**: 2025-11-22
