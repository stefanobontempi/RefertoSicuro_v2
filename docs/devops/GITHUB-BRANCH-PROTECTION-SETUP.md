# GitHub Branch Protection Setup Guide

**Data Creazione**: 2025-11-22
**Per Repository**: RefertoSicuro_v2
**Tempo Stimato**: 15 minuti

---

## 📋 Prerequisites

- [ ] Accesso Admin al repository GitHub
- [ ] Repository esistente con branch `main` e `develop`
- [ ] CI/CD pipeline configurata (o placeholder)

---

## 🔐 Setup Branch Protection - main

### Step 1: Accedere alle Settings

1. Vai su GitHub repository: `https://github.com/<your-org>/RefertoSicuro_v2`
2. Click su **Settings** (tab in alto)
3. Nel menu laterale sinistro, click su **Branches** (sotto "Code and automation")

### Step 2: Creare Rule per `main`

1. Click su **Add branch protection rule** (o **Add rule**)
2. In "Branch name pattern" inserire: `main`

### Step 3: Configurare Protezioni

**Sezione: Protect matching branches**

#### ✅ Require a pull request before merging

- [x] Spunta questa checkbox
- **Required approvals**: Seleziona `2`
- [x] Spunta "Dismiss stale pull request approvals when new commits are pushed"
- [x] Spunta "Require review from Code Owners" (se hai file CODEOWNERS)

#### ✅ Require status checks to pass before merging

- [x] Spunta questa checkbox
- [x] Spunta "Require branches to be up to date before merging"

**Status checks to require**:
Nella search box, cerca e aggiungi (quando saranno disponibili dal CI/CD):

- `security-scan`
- `test-auth-service`
- `test-reports-service`
- `test-billing-service`
- `build-images`

**Nota**: Se i check non appaiono ancora (perché CI/CD non è stato eseguito), puoi aggiungerli dopo o procedere senza per ora.

#### ✅ Require conversation resolution before merging

- [x] Spunta questa checkbox
      (Tutti i commenti nelle PR devono essere risolti prima del merge)

#### ✅ Require signed commits

- [x] Spunta questa checkbox
      (Tutti i commit devono essere firmati con GPG)

#### ✅ Require linear history

- [ ] **NON** spuntare (permettiamo merge commits)

#### ✅ Include administrators

- [x] Spunta questa checkbox
      (Anche admin devono seguire le stesse regole)

#### ✅ Restrict who can push to matching branches

- [ ] Opzionale: Se vuoi limitare chi può fare PR verso main
- Se spunti, aggiungi solo maintainers autorizzati

#### ❌ Allow force pushes

- [ ] **NON** spuntare (force push disabilitato)

#### ❌ Allow deletions

- [ ] **NON** spuntare (impossibile eliminare il branch)

### Step 4: Salvare

- Click su **Create** (o **Save changes**)
- Verifica che la rule sia attiva (deve apparire in verde)

---

## 🔐 Setup Branch Protection - develop

### Step 1: Creare Second Rule

1. Sempre in **Settings > Branches**
2. Click su **Add branch protection rule**
3. In "Branch name pattern" inserire: `develop`

### Step 2: Configurare Protezioni (meno restrittive di main)

#### ✅ Require a pull request before merging

- [x] Spunta questa checkbox
- **Required approvals**: Seleziona `1` (meno di main)
- [x] Spunta "Dismiss stale pull request approvals when new commits are pushed"

#### ✅ Require status checks to pass before merging

- [x] Spunta questa checkbox
- [x] Spunta "Require branches to be up to date before merging"

**Status checks to require**:

- `security-scan`
- `test-services`
- `lint`

#### ✅ Require conversation resolution before merging

- [x] Spunta questa checkbox

#### ✅ Require signed commits

- [ ] Opzionale per develop (dipende dalla policy team)

#### ✅ Include administrators

- [x] Spunta questa checkbox

#### ❌ Allow force pushes

- [ ] **NON** spuntare

#### ❌ Allow deletions

- [ ] **NON** spuntare

### Step 3: Salvare

- Click su **Create**

---

## 🧪 Testing Branch Protection

### Test 1: Tentare Force Push (deve fallire)

```bash
# Sulla tua macchina locale
git checkout main
git commit --allow-empty -m "test: force push protection"

# Tentare force push
git push --force origin main
```

**Risultato Atteso**:

```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: error: Cannot force-push to a protected branch
To github.com:your-org/RefertoSicuro_v2.git
 ! [remote rejected] main -> main (protected branch hook declined)
error: failed to push some refs to 'github.com:your-org/RefertoSicuro_v2.git'
```

✅ **SUCCESS**: Force push bloccato

---

### Test 2: Tentare Commit Diretto (deve fallire)

```bash
git checkout main
echo "test" >> test.txt
git add test.txt
git commit -m "test: direct commit"

# Tentare push diretto
git push origin main
```

**Risultato Atteso**:

```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: error: Required status checks not met
```

✅ **SUCCESS**: Push diretto bloccato

---

### Test 3: PR senza Approval (deve bloccare merge)

```bash
# Creare branch di test
git checkout develop
git checkout -b test/branch-protection
echo "test" >> test.txt
git add test.txt
git commit -m "test: PR approval requirement"
git push origin test/branch-protection

# Creare PR
gh pr create --base main --title "test: branch protection" --body "Testing branch protection rules"
```

**Verificare su GitHub**:

1. Andare sulla PR creata
2. Tentare di cliccare "Merge pull request"

**Risultato Atteso**:

- Bottone "Merge" è disabilitato
- Messaggio: "Merging is blocked - Review required"
- Messaggio: "At least 2 approving reviews are required"

✅ **SUCCESS**: Merge bloccato senza approval

---

### Test 4: PR con 1 Approval su main (deve bloccare)

1. Chiedere a un collega di approvare la PR di test
2. Tentare merge

**Risultato Atteso**:

- Ancora bloccato
- "Merging is blocked - At least 2 approving reviews are required"

✅ **SUCCESS**: Richiede 2 approval come configurato

---

### Test 5: PR con 2 Approval (deve permettere merge)

1. Secondo collega approva
2. Verificare che status check siano passati (se configurati)
3. Tentare merge

**Risultato Atteso**:

- Bottone "Merge pull request" diventa verde e cliccabile
- Merge completato con successo

✅ **SUCCESS**: Merge permesso con requisiti soddisfatti

---

## 📸 Screenshots Configurazione

### main Branch Protection

Salvare screenshot di:

```
Settings > Branches > main

[Screenshot showing]:
- Require pull request reviews: ✅ (2 approvals)
- Require status checks: ✅
- Require conversation resolution: ✅
- Require signed commits: ✅
- Include administrators: ✅
- Allow force pushes: ❌
- Allow deletions: ❌
```

### develop Branch Protection

```
Settings > Branches > develop

[Screenshot showing]:
- Require pull request reviews: ✅ (1 approval)
- Require status checks: ✅
- Require conversation resolution: ✅
- Allow force pushes: ❌
- Allow deletions: ❌
```

Salvare screenshot in: `/docs/devops/screenshots/`

---

## 🔧 Troubleshooting

### Problema: Non vedo i Status Checks

**Causa**: CI/CD non è ancora stato eseguito

**Soluzione**:

1. Eseguire almeno una volta la pipeline CI/CD
2. Tornare in Settings > Branches
3. Edit rule
4. I check ora dovrebbero apparire nella search box

Oppure:

- Procedere senza per ora
- Aggiungere status check dopo quando CI/CD è attivo

---

### Problema: Admin non riesce a fare push

**Causa**: "Include administrators" è spuntato

**Soluzione**:

- Questo è **intenzionale** per sicurezza
- Anche admin devono seguire il processo di PR
- Se necessario bypass temporaneo:
  1. Settings > Branches
  2. Edit rule
  3. Deseleziona "Include administrators"
  4. Push
  5. **Riattivare subito** dopo

⚠️ **NON lasciare disabilitato in produzione**

---

### Problema: Merge bloccato anche con approval

**Possibili cause**:

1. Status check non passati → Verificare CI/CD
2. Conversations non risolte → Risolvere tutti i commenti
3. Branch non aggiornato → Rebase o merge develop

**Soluzione**:

- Controllare la PR per vedere esattamente cosa blocca
- GitHub mostra un messaggio chiaro del motivo

---

## ✅ Verification Checklist

Dopo setup completo, verificare:

### main Branch

- [ ] Force push fallisce
- [ ] Push diretto fallisce
- [ ] PR richiede 2 approvals
- [ ] PR richiede status check (se configurati)
- [ ] PR richiede conversazioni risolte
- [ ] Admin seguono stesse regole
- [ ] Branch non può essere eliminato

### develop Branch

- [ ] Force push fallisce
- [ ] Push diretto fallisce
- [ ] PR richiede 1 approval
- [ ] PR richiede status check (se configurati)
- [ ] PR richiede conversazioni risolte
- [ ] Branch non può essere eliminato

### Documentation

- [ ] Screenshot salvati in `/docs/devops/screenshots/`
- [ ] BRANCHING.md aggiornato con link a questo documento
- [ ] Team notificato delle nuove regole

---

## 📚 Next Steps

Dopo branch protection configurato:

1. ✅ Comunicare team delle nuove regole
2. ✅ Setup CI/CD pipeline (Task 1.4)
3. ✅ Configurare CODEOWNERS file (opzionale)
4. ✅ Training team su GitFlow workflow
5. ✅ Documentare eccezioni e emergency procedures

---

## 📞 Support

**Problemi o domande?**

- GitHub Docs: <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches>
- Team Contact: DevOps Team
- Emergency: Se branch protection blocca emergency hotfix, contattare repository admin

---

**Configurazione Completata**: \***\*\_\_\_\*\*** (data)
**Verificato da**: \***\*\_\_\_\*\*** (nome)
**Status**: ⬜ Not Started | ⬜ In Progress | ⬜ Completed | ⬜ Verified
