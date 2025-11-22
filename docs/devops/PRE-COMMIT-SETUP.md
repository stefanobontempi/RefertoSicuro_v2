# Pre-commit Hooks Setup Guide

**Versione**: 1.0.0
**Data**: 2025-11-22
**Tempo Setup**: 2 minuti

---

## 🎯 Cosa Sono i Pre-commit Hooks?

I pre-commit hooks sono script che vengono eseguiti **automaticamente** prima di ogni commit Git. Verificano il codice e lo sistemano automaticamente quando possibile.

### Vantaggi

✅ **Qualità**: Codice sempre formattato e pulito
✅ **Sicurezza**: Previene commit di secrets/passwords
✅ **Velocità**: Fix automatici (non devi pensarci)
✅ **Consistenza**: Tutto il team usa gli stessi standard
✅ **CI/CD**: Meno fallimenti in pipeline (problemi risolti localmente)

---

## 🚀 Setup Iniziale (Una Volta Sola)

### Prerequisiti

```bash
# Python 3.12 installato
python --version  # Deve essere >= 3.12

# Node.js installato (per frontend hooks)
node --version  # Deve essere >= 20
```

### Step 1: Installare pre-commit

```bash
# Con pip
pip install pre-commit

# Oppure con pipx (raccomandato)
pipx install pre-commit

# Verifica installazione
pre-commit --version
# Output: pre-commit 3.x.x
```

### Step 2: Installare hooks nel repository

```bash
# Dalla root del progetto
cd /path/to/RefertoSicuro_v2

# Installa hooks
pre-commit install

# Output:
# pre-commit installed at .git/hooks/pre-commit
```

### Step 3: (Opzionale) Prima esecuzione completa

```bash
# Esegui su tutti i file esistenti (la prima volta)
pre-commit run --all-files

# Può richiedere 2-3 minuti la prima volta
# (scarica le dipendenze e controlla tutto il codice)
```

**✅ Setup completato!** Ora funziona automaticamente ad ogni commit.

---

## 📖 Come Funziona

### Commit Normale (con hooks attivi)

```bash
# 1. Modifichi file
nano services/auth/app/main.py

# 2. Aggiungi al commit
git add services/auth/app/main.py

# 3. Fai commit
git commit -m "feat(auth): add new endpoint"

# 🔄 PRE-COMMIT HOOKS ESEGUITI AUTOMATICAMENTE:

Trim Trailing Whitespace.............................Passed
Fix End of Files.....................................Passed
Check YAML...........................................Passed
Black Code Formatter.................................Passed
Sort Python Imports..................................Passed
Ruff Linter..........................................Passed
Bandit Security Scan.................................Passed
Gitleaks Secret Scanner..............................Passed

# ✅ Se tutto OK → Commit creato!
[develop abc123] feat(auth): add new endpoint
 1 file changed, 10 insertions(+)
```

### Commit con Problemi (hooks fixano automaticamente)

```bash
git commit -m "feat: test"

# Output:
Trim Trailing Whitespace.............................Failed
- hook id: trailing-whitespace
- exit code: 1
- files were modified by this hook

Fixing services/auth/app/main.py

Black Code Formatter.................................Failed
- hook id: black
- files were modified by this hook

reformatted services/auth/app/main.py

# ⚠️ Commit NON creato (file modificati dagli hooks)
# Devi rifare il commit:

git add services/auth/app/main.py
git commit -m "feat: test"

# Ora passa:
Trim Trailing Whitespace.............................Passed
Black Code Formatter.................................Passed
[develop abc123] feat: test
```

### Commit Bloccato (problema serio)

```bash
# Se hai un secret hardcoded:
echo "API_KEY=sk_test_123456" >> .env
git add .env
git commit -m "chore: add env"

# Output:
Gitleaks Secret Scanner..............................Failed
- hook id: gitleaks
- exit code: 1

Finding:     API_KEY=sk_test_123456
Secret:      sk_test_123456
File:        .env
Line:        1

❌ COMMIT BLOCCATO!

# Fix:
rm .env
# Aggiungi a .gitignore se non c'è già
echo ".env" >> .gitignore
git add .gitignore
git commit -m "chore: add .env to gitignore"
```

---

## 🛠️ Comandi Utili

### Eseguire manualmente (senza commit)

```bash
# Su tutti i file
pre-commit run --all-files

# Su file staged
pre-commit run

# Su file specifico
pre-commit run --files services/auth/app/main.py

# Solo uno specifico hook
pre-commit run black --all-files
pre-commit run ruff --all-files
pre-commit run gitleaks --all-files
```

### Aggiornare hooks

```bash
# Aggiorna tutte le versioni degli hook
pre-commit autoupdate

# Output:
# Updating https://github.com/psf/black ... updating v24.8.0 -> v24.10.0
# Updating https://github.com/astral-sh/ruff-pre-commit ... already up to date.
```

### Disabilitare temporaneamente

```bash
# Skip hooks per un singolo commit (NON RACCOMANDATO)
git commit -m "feat: test" --no-verify

# ⚠️ Usare SOLO in emergenze!
# CI/CD su GitHub controllerà comunque
```

### Disinstallare hooks

```bash
# Rimuove hooks dal repo locale
pre-commit uninstall

# Per reinstallare:
pre-commit install
```

---

## 🔍 Hooks Configurati

### 1. **General Checks** (Sempre Attivi)

- ✅ Rimuove trailing whitespace
- ✅ Fix end-of-file
- ✅ Valida YAML/JSON/TOML
- ✅ Blocca file >500KB
- ✅ Check merge conflicts
- ✅ Normalizza line endings (LF)

### 2. **Python Formatting** (Auto-fix)

- ✅ **Black** - Code formatter (line-length=100)
- ✅ **isort** - Sort imports alfabeticamente

### 3. **Python Linting** (Auto-fix quando possibile)

- ✅ **Ruff** - Fast linter (fix automatici)
- ⚠️ **Bandit** - Security scan (blocca solo severity medium+)

### 4. **Security** 🔒 (Critico!)

- 🚨 **Gitleaks** - Previene commit di secrets/API keys/passwords
  - Blocca commit se trova pattern sospetti
  - Fondamentale per compliance medicale

### 5. **JavaScript/TypeScript** (Frontend)

- ✅ **Prettier** - Formatta JS/TS/JSON/YAML/Markdown

### 6. **Documentation**

- ✅ **Markdownlint** - Linting per .md files

### 7. **Docker**

- ✅ **Hadolint** - Best practices per Dockerfile

---

## 🎯 Workflow Ottimale

### Scenario 1: Sviluppo Normale

```bash
# 1. Lavori sul codice (non pensare a formattazione)
nano services/auth/app/api/v1/users.py

# 2. Commit quando pronto
git add .
git commit -m "feat(auth): add user profile endpoint"

# 3. Hooks sistemano automaticamente
# → Black formatta
# → isort ordina imports
# → Ruff fix problemi minori
# → Gitleaks verifica secrets

# 4. Se tutto OK → commit fatto
# 5. Push quando pronto
git push origin feature/RS-123-user-profile
```

### Scenario 2: Fix Rapidi

```bash
# Se hooks modificano file:
git commit -m "fix: typo"
# → Hook modifica file
# → Commit fallisce

# Basta rifare:
git add .
git commit -m "fix: typo"
# → Ora passa (file già fixati)
```

### Scenario 3: Commit Urgente (Emergenza)

```bash
# Solo se VERAMENTE urgente e hai verificato tutto:
git commit -m "hotfix: critical bug" --no-verify

# ⚠️ CI/CD controllerà comunque su GitHub!
```

---

## 🐛 Troubleshooting

### Problema: "command not found: pre-commit"

**Soluzione**:

```bash
# Reinstalla
pip install --user pre-commit

# Oppure usa pipx
pipx install pre-commit

# Aggiungi al PATH se necessario
export PATH="$HOME/.local/bin:$PATH"
```

---

### Problema: Hook troppo lento

**Soluzione**:

```bash
# Skippa hook specifico per un commit
SKIP=hadolint-docker git commit -m "feat: test"

# Oppure disabilita permanentemente in .pre-commit-config.yaml
# Commenta l'hook che non vuoi
```

---

### Problema: "file was modified by hook"

**Normale!** Hook ha fixato il file automaticamente.

**Soluzione**:

```bash
# Rifare commit (ora passa)
git add .
git commit -m "same message"
```

---

### Problema: Gitleaks falso positivo

**Esempio**: Stringa che sembra una password ma non lo è

**Soluzione**:

```bash
# Creare .gitleaksignore
echo "path/to/file.py:variable_name" >> .gitleaksignore
```

---

## 📊 Performance

### Prima Esecuzione (Cold Start)

- **Tempo**: 2-3 minuti
- **Perché**: Scarica dipendenze e cache hooks

### Commit Successivi

- **Tempo**: 1-3 secondi (solo file modificati)
- **Impatto**: Trascurabile

### Commit Grandi (50+ file)

- **Tempo**: 5-10 secondi
- **Ottimizzazione**: Fa commit più piccoli e atomici

---

## ✅ Checklist Setup Team

**Per ogni developer**:

- [ ] `pip install pre-commit` eseguito
- [ ] `pre-commit install` eseguito nella repo
- [ ] Test commit fatto con successo
- [ ] Letto questo documento
- [ ] Compreso workflow con hooks

**Per il progetto**:

- [x] `.pre-commit-config.yaml` creato
- [x] Documentazione scritta
- [ ] Team training completato
- [ ] CI/CD verificato compatibile

---

## 🔗 References

- [Pre-commit Official Docs](https://pre-commit.com/)
- [Supported Hooks](https://pre-commit.com/hooks.html)
- [Ruff Documentation](https://docs.astral.sh/ruff/)
- [Black Documentation](https://black.readthedocs.io/)
- [Gitleaks](https://github.com/gitleaks/gitleaks)

---

## 🆘 Supporto

**Problemi?**

1. Controlla questa guida
2. Esegui `pre-commit run --all-files` per debug
3. Chiedi al team DevOps

**Emergency bypass** (solo se necessario):

```bash
git commit --no-verify
```

---

**Setup Completato**: \***\*\_\_\_\*\***
**Verificato da**: \***\*\_\_\_\*\***
**Note**: \***\*\_\_\_\*\***
