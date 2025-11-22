# GitHub Workflows - RefertoSicuro v2

## Active Workflows

### 1. `ci-base.yml` - CI/CD Base Pipeline

**Trigger**: Push su `main` o `develop`, Pull Requests

**Jobs**:

1. **security-scan** - Trivy filesystem scan (CRITICAL/HIGH)
2. **lint** - Ruff + Black linting (non-blocking)
3. **version-check** - Verifica `__version__.py` in tutti i servizi
4. **structure-check** - Verifica presenza file critici
5. **ci-summary** - Riepilogo risultati

**Durata**: ~2-3 minuti

**Status**:

- ✅ Version check: BLOCKING (fail se manca version)
- ✅ Structure check: BLOCKING (fail se manca file critico)
- ⚠️ Security scan: NON-BLOCKING (solo report)
- ⚠️ Linting: NON-BLOCKING (solo report)

---

### 2. `minimal.yml` - Minimal Check (DEPRECATED)

**Status**: Da rimuovere dopo verifica ci-base.yml

---

## Disabled Workflows

### `workflows.disabled/security-audit.yml`

**Descrizione**: Security audit completo (daily)

**Jobs**:

- Dependency check (OWASP)
- Container scan (Trivy)
- Vault audit
- Compliance check (GDPR/AI Act)
- SAST (CodeQL)
- Secrets scan (TruffleHog, GitGuardian)

**Status**: Pronto ma disabilitato - attivare in Fase 2

---

### `workflows.disabled/ci-cd.yml`

**Descrizione**: CI/CD completo con tests

**Jobs**:

- Security scanning
- Test Python services (matrix)
- Test frontend
- Build Docker images
- Deploy staging/production

**Status**: Pronto ma disabilitato - attivare gradualmente

---

## Roadmap Attivazione

### ✅ Fase 1 (Attuale)

- [x] `ci-base.yml` - Security + version + structure check

### 🔄 Fase 2 (Prossima)

- [ ] Aggiungere test job per auth-service
- [ ] Aggiungere build job base

### 🔜 Fase 3 (Futura)

- [ ] Attivare `security-audit.yml` (daily)
- [ ] Test completi per tutti i servizi
- [ ] Docker image build e push

### 🚀 Fase 4 (Produzione)

- [ ] Deploy automation
- [ ] Full CI/CD pipeline

---

## Badge Status

Aggiungere a README.md:

```markdown
![CI Status](https://github.com/YOUR_ORG/RefertoSicuro_v2/workflows/CI%2FCD%20Base/badge.svg)
```

---

**Ultima Modifica**: 2025-11-22
