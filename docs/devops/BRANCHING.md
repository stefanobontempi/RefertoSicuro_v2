# Git Branching Strategy - RefertoSicuro v2

**Versione Documento**: 1.0.0
**Data Creazione**: 2025-11-22
**Strategia**: GitFlow Medicale (customizzato per compliance)

---

## 📊 Overview

RefertoSicuro v2 adotta una **GitFlow strategy customizzata** per il settore medicale, con particolare attenzione a compliance, sicurezza e tracciabilità completa di ogni modifica.

**Perché GitFlow?**

- ✅ Separazione netta tra development e production
- ✅ Release controllate e verificabili
- ✅ Hotfix rapidi senza compromettere develop
- ✅ Audit trail completo per conformità medicale
- ✅ Code review obbligatorio su ogni modifica

---

## 🌳 Branch Structure

```
main (production)
  │
  ├─── tag: v1.0.0
  ├─── tag: v1.1.0
  ├─── tag: v2.0.0
  │
  └─── develop (integration)
         │
         ├─── feature/RS-123-user-2fa-authentication
         │      │
         │      └─── commits: feat, test, docs
         │
         ├─── feature/RS-456-report-export-pdf
         │      │
         │      └─── commits: feat, refactor, test
         │
         ├─── bugfix/RS-789-jwt-expiration-bug
         │      │
         │      └─── commits: fix, test
         │
         └─── hotfix/RS-999-critical-security-patch
                │
                └─── merge to: main + develop
```

---

## 📋 Branch Types

### 1. **main** - Production Branch

**Scopo**: Codice in produzione, sempre deployabile e stabile

**Caratteristiche**:

- 🔒 **Protected**: Force push disabilitato
- 👥 **Review**: 2 approvazioni obbligatorie
- ✅ **CI/CD**: Tutti i check devono passare
- 🏷️ **Tags**: Ogni merge crea un tag versione
- 🚀 **Deploy**: Automatico in produzione (dopo approval manuale)

**Commit Convention**:

```bash
# Solo merge commits da:
- release/vX.Y.Z
- hotfix/RS-XXX-description
```

**Non permesso**:

- ❌ Commit diretti
- ❌ Force push
- ❌ Branch deletion
- ❌ Merge senza review

---

### 2. **develop** - Integration Branch

**Scopo**: Integrazione continua di nuove feature, sempre stabile

**Caratteristiche**:

- 🔒 **Protected**: Force push disabilitato
- 👥 **Review**: 1 approvazione obbligatoria
- ✅ **CI/CD**: Test e security scan obbligatori
- 🚀 **Deploy**: Auto-deploy su staging environment
- 📊 **Metrics**: Monitoraggio performance continuo

**Commit Convention**:

```bash
# Solo merge commits da:
- feature/RS-XXX-description
- bugfix/RS-XXX-description
- release/vX.Y.Z (dopo merge in main)
```

**Regole**:

- ✅ Deve sempre compilare
- ✅ Test coverage >80%
- ✅ Nessun security vulnerability CRITICAL
- ✅ Code review completato

---

### 3. **feature/** - Feature Branches

**Scopo**: Sviluppo di nuove funzionalità

**Naming Convention**:

```
feature/RS-<ticket-number>-<short-description>

Esempi:
- feature/RS-123-user-2fa-authentication
- feature/RS-456-report-export-pdf
- feature/RS-789-gdpr-data-export
- feature/RS-101-new-specialty-oncology
```

**Workflow**:

```bash
# 1. Creare branch da develop
git checkout develop
git pull origin develop
git checkout -b feature/RS-123-user-2fa-authentication

# 2. Sviluppare con commit atomici
git add .
git commit -m "feat(auth): add TOTP secret generation"
git commit -m "test(auth): add 2FA unit tests"
git commit -m "docs(auth): update API documentation"

# 3. Push frequenti
git push origin feature/RS-123-user-2fa-authentication

# 4. Creare Pull Request
gh pr create --base develop \
  --title "feat: 2FA authentication with TOTP" \
  --body "Implements RS-123: Two-factor authentication

## Changes
- Added TOTP secret generation
- New endpoints: /api/v1/auth/2fa/enable, /api/v1/auth/2fa/verify
- QR code generation for authenticator apps

## Testing
- Unit tests coverage: 95%
- Manual testing with Google Authenticator
- Security review completed

## Checklist
- [x] Tests passing
- [x] Documentation updated
- [x] No security vulnerabilities
- [x] Code review requested"

# 5. Dopo merge, eliminare branch
git checkout develop
git pull origin develop
git branch -d feature/RS-123-user-2fa-authentication
git push origin --delete feature/RS-123-user-2fa-authentication
```

**Lifespan**: Breve (max 2 settimane), poi merge o chiusura

---

### 4. **bugfix/** - Bug Fix Branches

**Scopo**: Correzione bug non critici trovati in develop

**Naming Convention**:

```
bugfix/RS-<ticket-number>-<short-description>

Esempi:
- bugfix/RS-234-jwt-refresh-token-rotation
- bugfix/RS-567-email-validation-regex
- bugfix/RS-890-memory-leak-redis-pool
```

**Workflow**:

```bash
# Simile a feature/ ma con prefix "fix:"
git commit -m "fix(auth): correct JWT expiration validation"
git commit -m "test(auth): add test for expired tokens"
```

**Differenza con feature/**:

- 🐛 Corregge comportamento esistente (non aggiunge feature)
- ⚡ Priorità più alta per merge
- 🔍 Review focus su regression testing

---

### 5. **hotfix/** - Critical Production Fixes

**Scopo**: Fix critici in produzione che non possono aspettare

**Naming Convention**:

```
hotfix/RS-<ticket-number>-<short-description>

Esempi:
- hotfix/RS-999-security-cve-jwt-library
- hotfix/RS-888-critical-data-loss-bug
- hotfix/RS-777-payment-processing-failure
```

**Workflow**:

```bash
# 1. Creare da MAIN (non develop!)
git checkout main
git pull origin main
git checkout -b hotfix/RS-999-security-cve-jwt-library

# 2. Fix rapido e mirato
git commit -m "fix(auth): update python-jose to 3.3.1 (CVE-2024-XXXXX)"

# 3. Creare PR verso MAIN
gh pr create --base main \
  --title "hotfix: security patch CVE-2024-XXXXX" \
  --label "critical,security"

# 4. Dopo merge in main, anche in develop
git checkout develop
git merge hotfix/RS-999-security-cve-jwt-library
git push origin develop

# 5. Tag immediato
git checkout main
git pull origin main
git tag -a v1.2.1 -m "Security hotfix: CVE-2024-XXXXX"
git push origin v1.2.1
```

**Caratteristiche**:

- 🚨 **Urgenza**: Deploy in produzione entro 4 ore
- 🔍 **Review**: Minimo 1 reviewer senior
- ✅ **Testing**: Regression test obbligatori
- 📢 **Communication**: Notifica team immediata
- 🏷️ **Versioning**: PATCH version bump

---

### 6. **release/** - Release Preparation

**Scopo**: Preparare una nuova release per produzione

**Naming Convention**:

```
release/v<major>.<minor>.<patch>

Esempi:
- release/v1.0.0
- release/v1.5.0
- release/v2.0.0
```

**Workflow**:

```bash
# 1. Creare da develop quando pronto per release
git checkout develop
git pull origin develop
git checkout -b release/v1.5.0

# 2. Bump version in tutti i servizi
./scripts/bump-version.sh 1.5.0

# 3. Update CHANGELOG
nano CHANGELOG.md
# Aggiungere:
# ## [1.5.0] - 2025-11-22
# ### Added
# - 2FA authentication
# - GDPR data export
# ### Changed
# - Improved performance
# ### Security
# - Updated dependencies

# 4. Commit finale
git add .
git commit -m "chore: prepare release v1.5.0"

# 5. Testing completo
make test
make test-e2e
make security-scan

# 6. Merge in main
gh pr create --base main \
  --title "release: v1.5.0" \
  --body "Release v1.5.0

## Highlights
- 2FA authentication
- GDPR compliance endpoints
- Performance improvements

## Testing
- All tests passing ✅
- E2E tests completed ✅
- Security scan clean ✅
- Manual QA completed ✅"

# 7. Dopo merge, tag
git checkout main
git pull origin main
git tag -a v1.5.0 -m "Release v1.5.0"
git push origin v1.5.0

# 8. Merge back to develop
git checkout develop
git merge release/v1.5.0
git push origin develop

# 9. Delete release branch
git branch -d release/v1.5.0
git push origin --delete release/v1.5.0
```

**Lifespan**: 1-3 giorni (testing e stabilizzazione)

---

## 📝 Commit Message Convention

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type         | Descrizione         | Esempio                                    |
| ------------ | ------------------- | ------------------------------------------ |
| **feat**     | Nuova feature       | `feat(auth): add 2FA support`              |
| **fix**      | Bug fix             | `fix(reports): handle unicode characters`  |
| **docs**     | Solo documentazione | `docs(api): update OpenAPI spec`           |
| **style**    | Formattazione       | `style(auth): fix linting warnings`        |
| **refactor** | Refactoring         | `refactor(billing): extract payment logic` |
| **test**     | Aggiunta test       | `test(auth): add JWT validation tests`     |
| **chore**    | Maintenance         | `chore(deps): update dependencies`         |
| **perf**     | Performance         | `perf(reports): optimize AI processing`    |
| **ci**       | CI/CD changes       | `ci(actions): add security scanning`       |
| **security** | Security fix        | `security(auth): fix XSS vulnerability`    |

### Scope

Indica il servizio o componente modificato:

- `auth` - Auth Service
- `reports` - Reports Service
- `billing` - Billing Service
- `admin` - Admin Service
- `analytics` - Analytics Service
- `notification` - Notification Service
- `frontend` - Frontend
- `infra` - Infrastructure
- `docs` - Documentation
- `api` - API changes
- `db` - Database

### Esempi Completi

```bash
# Feature
git commit -m "feat(auth): implement JWT refresh token rotation

Implements automatic rotation of refresh tokens on each use
to improve security and prevent token replay attacks.

Closes RS-123"

# Bug Fix
git commit -m "fix(reports): prevent memory leak in AI service client

Redis connection pool was not being properly closed after
each request, causing gradual memory increase.

Fixes RS-456"

# Breaking Change
git commit -m "feat(api)!: change response format to envelope pattern

BREAKING CHANGE: All API responses now wrapped in envelope:
{
  \"data\": {...},
  \"meta\": {...}
}

Clients must update to handle new format.

Closes RS-789"

# Security Fix
git commit -m "security(auth): update python-jose to fix CVE-2024-XXXXX

Updates python-jose from 3.2.0 to 3.3.1 to address
critical JWT signature validation vulnerability.

CVE-2024-XXXXX
CVSS: 9.8 (Critical)"
```

---

## 🔐 Branch Protection Rules

### main Branch

**GitHub Settings > Branches > Add rule: `main`**

```yaml
Protection Rules:
  ✅ Require pull request reviews before merging
     - Required approvals: 2
     - Dismiss stale PR approvals when new commits are pushed
     - Require review from Code Owners (if CODEOWNERS file exists)

  ✅ Require status checks to pass before merging
     Required checks:
       - security-scan
       - test-auth-service
       - test-reports-service
       - test-billing-service
       - build-images
     - Require branches to be up to date before merging

  ✅ Require conversation resolution before merging

  ✅ Require signed commits

  ✅ Include administrators (anche admin devono seguire regole)

  ✅ Restrict who can push to matching branches
     - Only designated maintainers

  ❌ Allow force pushes (DISABLED)

  ❌ Allow deletions (DISABLED)
```

### develop Branch

**GitHub Settings > Branches > Add rule: `develop`**

```yaml
Protection Rules:
  ✅ Require pull request reviews before merging
     - Required approvals: 1
     - Dismiss stale PR approvals when new commits are pushed

  ✅ Require status checks to pass before merging
     Required checks:
       - security-scan
       - test-services
       - lint
     - Require branches to be up to date before merging

  ✅ Require conversation resolution before merging

  ❌ Allow force pushes (DISABLED)

  ❌ Allow deletions (DISABLED)
```

---

## 🔄 Pull Request Process

### 1. Creare Pull Request

```bash
# Template PR
Title: <type>: <short description>

Body:
## Description
Descrizione dettagliata delle modifiche

## Changes
- Elenco modifiche principali
- Con bullet points

## Testing
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] Security scan clean

## Checklist
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped (if needed)
- [ ] No breaking changes (or documented)
- [ ] Code reviewed by self

## Related Issues
Closes RS-XXX
Relates to RS-YYY
```

### 2. Code Review Checklist

**Reviewer deve verificare**:

- ✅ **Functionality**: Codice fa quello che deve
- ✅ **Tests**: Coverage >80%, test significativi
- ✅ **Security**: Nessuna vulnerabilità introdotta
- ✅ **Performance**: Nessun bottleneck evidente
- ✅ **Documentation**: API/funzioni documentate
- ✅ **Style**: Linting passed, stile consistente
- ✅ **Medical Compliance**: Rispetta GDPR/AI Act
- ✅ **Audit Logging**: Operazioni mediche loggano
- ✅ **Error Handling**: Gestione errori corretta
- ✅ **Backwards Compatibility**: Nessun breaking change

### 3. Approval e Merge

```bash
# Reviewer approva
gh pr review <PR-number> --approve --body "LGTM!
- Tests passing ✅
- Security scan clean ✅
- Code quality excellent ✅"

# Author fa merge (dopo approval)
gh pr merge <PR-number> --squash --delete-branch
```

---

## 🚀 Workflow Examples

### Scenario 1: Sviluppare Nuova Feature

```bash
# 1. Sincronizza develop
git checkout develop
git pull origin develop

# 2. Crea feature branch
git checkout -b feature/RS-123-gdpr-export

# 3. Sviluppa
# ... codice ...
git add .
git commit -m "feat(admin): add GDPR data export endpoint"
git commit -m "test(admin): add export tests"
git commit -m "docs(admin): document export API"

# 4. Push
git push origin feature/RS-123-gdpr-export

# 5. Crea PR
gh pr create --base develop --fill

# 6. Dopo approval e merge
git checkout develop
git pull origin develop
git branch -d feature/RS-123-gdpr-export
```

### Scenario 2: Hotfix Critico in Produzione

```bash
# 1. Da main
git checkout main
git pull origin main

# 2. Crea hotfix
git checkout -b hotfix/RS-999-payment-bug

# 3. Fix rapido
git commit -m "fix(billing): prevent duplicate payments"

# 4. PR verso main
gh pr create --base main --label "critical"

# 5. Dopo merge, anche in develop
git checkout develop
git merge hotfix/RS-999-payment-bug
git push origin develop

# 6. Tag versione
git checkout main
git pull origin main
git tag -a v1.2.1 -m "Hotfix: payment duplicate prevention"
git push origin v1.2.1
```

### Scenario 3: Preparare Release

```bash
# 1. Da develop quando ready
git checkout develop
git pull origin develop
git checkout -b release/v1.5.0

# 2. Bump version
./scripts/bump-version.sh 1.5.0

# 3. Update CHANGELOG
nano CHANGELOG.md

# 4. Commit
git commit -am "chore: prepare release v1.5.0"

# 5. Testing
make test-all

# 6. PR verso main
gh pr create --base main --title "release: v1.5.0"

# 7. Dopo merge
git checkout main
git pull origin main
git tag -a v1.5.0 -m "Release v1.5.0"
git push origin v1.5.0

# 8. Merge back develop
git checkout develop
git merge release/v1.5.0
git push origin develop
```

---

## 📊 Branch Lifecycle

```
feature/RS-123  │  Created │ Development │ PR Review │ Merged │ Deleted │
                └──────────┴─────────────┴───────────┴────────┴─────────┘
                  Day 0      Day 1-7       Day 8-9     Day 10   Day 10
                            (max 14 days)

release/v1.5.0  │  Created │  Testing   │ PR Review │ Merged │ Deleted │
                └──────────┴────────────┴───────────┴────────┴─────────┘
                  Day 0      Day 1-2      Day 3       Day 3    Day 3

hotfix/RS-999   │  Created │    Fix     │ PR Review │ Merged │ Deleted │
                └──────────┴────────────┴───────────┴────────┴─────────┘
                  Hour 0     Hour 0-2     Hour 2-3    Hour 4   Hour 4
```

---

## 🆘 Troubleshooting

### Merge Conflict

```bash
# Update branch con develop
git checkout feature/RS-123
git fetch origin
git merge origin/develop

# Risolvi conflitti
# ... edit files ...
git add .
git commit -m "chore: resolve merge conflicts"
git push origin feature/RS-123
```

### Branch Diverged

```bash
# Se branch locale e remote divergono
git fetch origin
git rebase origin/develop

# Se ci sono conflitti, risolvi e:
git rebase --continue
git push --force-with-lease origin feature/RS-123
```

### Accidental Commit on Wrong Branch

```bash
# Spostare commit su branch corretto
git checkout main  # branch sbagliato
git log  # trova SHA commit

git checkout -b feature/RS-123  # branch corretto
git cherry-pick <commit-sha>

git checkout main
git reset --hard HEAD~1  # rimuovi da main
```

---

## 📚 References

- [GitFlow Original](https://nvie.com/posts/a-successful-git-branching-model/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Protected Branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [VERSIONING.md](/docs/devops/VERSIONING.md)
- [DEVOPS-ROADMAP.md](/docs/devops/DEVOPS-ROADMAP.md)

---

**Ultima Modifica**: 2025-11-22
**Maintainer**: DevOps Team
**Status**: Active - Enforced con Branch Protection
