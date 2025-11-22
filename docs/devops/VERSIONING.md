# Semantic Versioning Guide - RefertoSicuro v2

**Versione Documento**: 1.0.0
**Data Creazione**: 2025-11-22
**Ultima Revisione**: 2025-11-22

---

## 📊 Overview

RefertoSicuro v2 utilizza **Semantic Versioning 2.0.0** per tutti i microservizi e il frontend. Ogni componente ha una versione indipendente che segue le regole descritte in questo documento.

**Formato**: `MAJOR.MINOR.PATCH`

Esempio: `1.2.3`

- **1** = MAJOR version
- **2** = MINOR version
- **3** = PATCH version

---

## 🎯 Semantic Versioning Rules

### MAJOR Version (X.0.0)

**Quando incrementare**:

- Breaking changes nell'API pubblica
- Modifiche incompatibili al database schema
- Cambiamenti al contratto tra servizi
- Rimozione di endpoint o funzionalità esistenti
- Modifiche che richiedono aggiornamenti client obbligatori

**Esempi**:

```
1.5.2 → 2.0.0

- Cambio da JWT HS256 a RS256 (breaking change auth)
- Rimozione endpoint deprecato /api/v1/old-reports
- Modifica response format da {data: ...} a {result: ...}
- Upgrade database da PostgreSQL 14 → 16 con schema changes
```

**⚠️ ATTENZIONE**:

- Richiede pianificazione e comunicazione al team
- Necessita migration path documentato
- Deve essere annunciato con almeno 2 settimane di anticipo

---

### MINOR Version (1.X.0)

**Quando incrementare**:

- Nuove funzionalità backward-compatible
- Nuovi endpoint API
- Nuovi parametri opzionali
- Miglioramenti delle performance significativi
- Nuove specializzazioni mediche

**Esempi**:

```
1.2.3 → 1.3.0

- Aggiunta nuovo endpoint POST /api/v1/reports/export
- Supporto per nuova specializzazione ONCOLOGIA
- Implementazione 2FA opzionale
- Aggiunta campo opzionale "notes" a User model
```

**Regole**:

- DEVE essere backward-compatible
- Client vecchi DEVONO continuare a funzionare
- Nuovi campi DB DEVONO avere default o essere nullable

---

### PATCH Version (1.0.X)

**Quando incrementare**:

- Bug fixes
- Security patches
- Refactoring interno (no API changes)
- Dependency updates (security o bugfix)
- Miglioramenti performance minori
- Correzioni documentazione codice

**Esempi**:

```
1.2.3 → 1.2.4

- Fix: JWT token expiration not validated correctly
- Security: Update dependency with CVE
- Fix: Memory leak in Redis connection pool
- Refactor: Extract validation logic to separate function
```

**Regole**:

- NO cambiamenti funzionali
- NO nuovi endpoint
- NO modifiche al database schema
- Solo correzioni e ottimizzazioni

---

## 📦 Versioning per Componente

### Backend Services

Ogni microservizio ha il proprio `__version__.py`:

```python
# services/auth/app/__version__.py
__version__ = "1.0.0"
__service__ = "auth-service"
__build__ = "local"  # Popolato da CI/CD
__build_date__ = "unknown"  # Popolato da CI/CD
__git_commit__ = "unknown"  # Popolato da CI/CD
```

**Location**:

- `/services/auth/app/__version__.py`
- `/services/reports/app/__version__.py`
- `/services/billing/app/__version__.py`
- `/services/admin/app/__version__.py`
- `/services/analytics/app/__version__.py`
- `/services/notification/app/__version__.py`

### Frontend

```typescript
// frontend/src/config/version.ts
export const VERSION = {
  app: "2.0.0",
  build: import.meta.env.VITE_BUILD_NUMBER || "local",
  buildDate: import.meta.env.VITE_BUILD_DATE || "unknown",
  gitCommit: import.meta.env.VITE_GIT_COMMIT || "unknown",
};
```

---

## 🔄 Release Process

### 1. Decidere il Tipo di Release

```bash
# Esempio decision tree:
Breaking change? → MAJOR
New feature? → MINOR
Bug fix? → PATCH
```

### 2. Aggiornare Versione

```bash
# Per un servizio (es: auth-service)
cd services/auth/app
nano __version__.py

# Cambiare:
__version__ = "1.2.3"  # OLD
__version__ = "1.3.0"  # NEW (se MINOR)
```

### 3. Aggiornare CHANGELOG

```bash
# Creare/aggiornare CHANGELOG.md per il servizio
cd services/auth
nano CHANGELOG.md
```

```markdown
# Changelog - Auth Service

## [1.3.0] - 2025-11-22

### Added

- 2FA support with TOTP
- New endpoint POST /api/v1/auth/2fa/enable
- JWT refresh token rotation

### Changed

- Improved session management performance

### Security

- Updated `python-jose` to fix CVE-2024-XXXXX
```

### 4. Commit e Tag

```bash
# Commit versione
git add services/auth/app/__version__.py
git add services/auth/CHANGELOG.md
git commit -m "chore(auth): bump version to 1.3.0"

# Creare tag annotato
git tag -a auth-service-v1.3.0 -m "Auth Service v1.3.0

- 2FA support with TOTP
- JWT refresh token rotation
- Performance improvements"

# Push commit e tag
git push origin develop
git push origin auth-service-v1.3.0
```

---

## 🏷️ Git Tagging Convention

### Formato Tag

```
<service-name>-v<version>

Esempi:
- auth-service-v1.0.0
- reports-service-v2.1.3
- frontend-v2.0.0
```

### Comandi Git Tag

```bash
# Creare tag annotato
git tag -a auth-service-v1.0.0 -m "Initial release

- JWT authentication
- User registration
- Session management"

# Visualizzare tag
git tag -l "auth-service-*"

# Visualizzare dettagli tag
git show auth-service-v1.0.0

# Eliminare tag (se errore)
git tag -d auth-service-v1.0.0  # Local
git push --delete origin auth-service-v1.0.0  # Remote

# Checkout su versione specifica
git checkout tags/auth-service-v1.0.0
```

---

## 🤖 CI/CD Integration

### Build Number Injection

Durante la build CI/CD, le informazioni di build vengono iniettate:

```yaml
# .github/workflows/ci-base.yml

- name: Inject build info
  run: |
    BUILD_NUMBER="${GITHUB_RUN_NUMBER}"
    BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    GIT_COMMIT="${GITHUB_SHA}"

    # Update __version__.py
    sed -i "s/__build__ = \"local\"/__build__ = \"${BUILD_NUMBER}\"/" services/auth/app/__version__.py
    sed -i "s/__build_date__ = \"unknown\"/__build_date__ = \"${BUILD_DATE}\"/" services/auth/app/__version__.py
    sed -i "s/__git_commit__ = \"unknown\"/__git_commit__ = \"${GIT_COMMIT}\"/" services/auth/app/__version__.py
```

### Docker Image Tagging

```bash
# Tag images con versione semver
ghcr.io/refertosicuro/auth-service:1.0.0
ghcr.io/refertosicuro/auth-service:1.0
ghcr.io/refertosicuro/auth-service:1
ghcr.io/refertosicuro/auth-service:latest

# Tag con build info
ghcr.io/refertosicuro/auth-service:1.0.0-build.123
ghcr.io/refertosicuro/auth-service:1.0.0-sha.abc123f

# Tag per branch
ghcr.io/refertosicuro/auth-service:develop
ghcr.io/refertosicuro/auth-service:develop-sha.abc123f
```

---

## ✅ Version Compatibility Matrix

### Inter-Service Compatibility

| Auth  | Reports | Billing | Compatible         |
| ----- | ------- | ------- | ------------------ |
| 1.0.x | 1.0.x   | 1.0.x   | ✅                 |
| 1.0.x | 1.1.x   | 1.0.x   | ✅                 |
| 2.0.x | 1.x.x   | 1.x.x   | ❌ (breaking auth) |
| 1.x.x | 2.0.x   | 1.x.x   | ⚠️ (test required) |

**Regole**:

- MINOR version bumps: SEMPRE compatibili
- PATCH version bumps: SEMPRE compatibili
- MAJOR version bumps: Richiedono coordinamento

### Frontend-Backend Compatibility

| Frontend | Backend API | Compatible |
| -------- | ----------- | ---------- |
| 2.0.x    | v2          | ✅         |
| 2.0.x    | v1          | ❌         |
| 2.1.x    | v2          | ✅         |

---

## 📊 Health Endpoint Version Info

Ogni servizio espone versione in health endpoint:

```bash
# Request
curl http://localhost:8010/health

# Response
{
  "status": "healthy",
  "service": "auth-service",
  "version": "1.0.0",
  "build": "123",
  "build_date": "2025-11-22T10:00:00Z",
  "timestamp": "2025-11-22T12:34:56Z",
  "database": "connected",
  "vault": "connected"
}
```

Endpoint dedicato `/version`:

```bash
# Request
curl http://localhost:8010/version

# Response
{
  "service": "auth-service",
  "version": "1.0.0",
  "build": "123",
  "build_date": "2025-11-22T10:00:00Z",
  "git_commit": "abc123f"
}
```

---

## 🔍 Verificare Versioni Deployment

### Script di verifica

```bash
#!/bin/bash
# scripts/verify-versions.sh

echo "=== RefertoSicuro Services Versions ==="

SERVICES=(8010 8011 8012 8013 8014 8015)
NAMES=("auth" "reports" "billing" "admin" "analytics" "notification")

for i in "${!SERVICES[@]}"; do
  port="${SERVICES[$i]}"
  name="${NAMES[$i]}"

  version=$(curl -s "http://localhost:${port}/version" | jq -r '.version')
  build=$(curl -s "http://localhost:${port}/version" | jq -r '.build')

  echo "${name}-service: v${version} (build ${build})"
done

echo ""
echo "Frontend version:"
curl -s "http://localhost:5173" | grep -o 'Version: [0-9.]*' || echo "Check browser console"
```

---

## 📚 Best Practices

### DO ✅

- ✅ Incrementa versione PRIMA del merge
- ✅ Aggiorna sempre CHANGELOG.md
- ✅ Crea tag Git annotato
- ✅ Testa compatibilità prima di release MAJOR
- ✅ Documenta breaking changes
- ✅ Mantieni consistency tra servizi

### DON'T ❌

- ❌ NON saltare versioni (1.0.0 → 1.2.0 senza 1.1.0)
- ❌ NON modificare tag esistenti
- ❌ NON fare breaking changes in MINOR/PATCH
- ❌ NON deployare senza version bump
- ❌ NON usare version 0.x.x in produzione

---

## 🆘 Troubleshooting

### Version Mismatch tra Servizi

**Problema**: Auth service v2.0.0 ma Reports service v1.0.0

**Soluzione**:

```bash
# 1. Verificare compatibility matrix
# 2. Aggiornare servizi dipendenti
# 3. Deploy coordinato

# Esempio rollback
docker-compose -f docker-compose.staging.yml down
git checkout tags/auth-service-v1.5.0
docker-compose -f docker-compose.staging.yml up -d
```

### Tag Git Sbagliato

**Problema**: Creato tag su commit sbagliato

**Soluzione**:

```bash
# Eliminare tag locale e remote
git tag -d auth-service-v1.0.0
git push --delete origin auth-service-v1.0.0

# Creare nuovo tag su commit corretto
git checkout <correct-commit-sha>
git tag -a auth-service-v1.0.0 -m "Correct release"
git push origin auth-service-v1.0.0
```

---

## 📖 References

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Git Tagging](https://git-scm.com/book/en/v2/Git-Basics-Tagging)
- [DEVOPS-ROADMAP.md](/docs/devops/DEVOPS-ROADMAP.md)
- [CLAUDE.md - DevOps Section](/CLAUDE.md#devops--deployment---regole-critiche)

---

**Ultima Modifica**: 2025-11-22
**Maintainer**: DevOps Team
