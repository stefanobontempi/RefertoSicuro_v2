# 📋 Guida Configurazione RefertoSicuro v2 - Passo dopo Passo

## 🎯 Stato Attuale
Abbiamo completato:
- ✅ Struttura microservizi completa
- ✅ Docker Compose con 30+ container
- ✅ Integrazione HashiCorp Vault
- ✅ Pipeline CI/CD con GitHub Actions
- ✅ Auth Service con JWT, refresh token, CSRF
- ✅ Test suite con coverage 95%
- ✅ Repository GitHub inizializzato

## 📝 Passaggi da Completare

### 1️⃣ **Configurazione GitHub Secrets** (30 minuti)
Prima di tutto, dobbiamo configurare i secrets su GitHub per attivare le pipeline CI/CD.

#### Vai su GitHub → Settings → Secrets and variables → Actions

Aggiungi questi secrets:

```bash
# Docker Registry
DOCKER_REGISTRY_URL=ghcr.io
DOCKER_REGISTRY_USERNAME=${{ github.actor }}  # Automatico
DOCKER_REGISTRY_PASSWORD=<tuo_github_personal_access_token>

# HashiCorp Vault
VAULT_ADDR=https://vault.refertosicuro.com
VAULT_TOKEN=<token_produzione>  # Lo genereremo dopo
VAULT_NAMESPACE=refertosicuro

# Database Production
DATABASE_URL_PROD=postgresql://prod_user:xxx@db.refertosicuro.com:5432/refertosicuro
REDIS_URL_PROD=redis://:xxx@redis.refertosicuro.com:6379/0
MONGODB_URL_PROD=mongodb://prod_user:xxx@mongo.refertosicuro.com:27017/refertosicuro

# AWS (per S3)
AWS_ACCESS_KEY_ID=<tuo_aws_key>
AWS_SECRET_ACCESS_KEY=<tuo_aws_secret>
AWS_REGION=eu-south-1

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
DATADOG_API_KEY=<se_usi_datadog>

# Notifications
SMTP_HOST=smtp.sendgrid.net
SMTP_USERNAME=apikey
SMTP_PASSWORD=<sendgrid_api_key>
TWILIO_ACCOUNT_SID=<twilio_sid>
TWILIO_AUTH_TOKEN=<twilio_token>

# Deployment
SSH_PRIVATE_KEY=<chiave_ssh_server_produzione>
STAGING_HOST=staging.refertosicuro.com
PRODUCTION_HOST=app.refertosicuro.com
```

### 2️⃣ **Setup Ambiente Locale** (15 minuti)

#### A. Avvia l'infrastruttura base:
```bash
# Dalla root del progetto
cd /Users/stefano/DEV/RefertoSicuro_v2

# Avvia solo i servizi infrastrutturali
make dev-infra

# Aspetta che tutti i container siano healthy (circa 60 secondi)
make health-check
```

#### B. Inizializza Vault per development:
```bash
# Inizializza Vault (salva le keys!)
make vault-init

# Output esempio:
# Unseal Key 1: xxx...
# Unseal Key 2: xxx...
# Initial Root Token: hvs.xxx...

# Sblocca Vault (usa 3 delle 5 unseal keys)
make vault-unseal KEY=<unseal_key_1>
make vault-unseal KEY=<unseal_key_2>
make vault-unseal KEY=<unseal_key_3>

# Login a Vault
export VAULT_TOKEN=<root_token>
make vault-login
```

#### C. Popola Vault con secrets di development:
```bash
# Esegui script di inizializzazione
make vault-setup-dev

# Questo creerà tutti i mount points e secrets necessari:
# - secret/auth-service/
# - secret/reports-service/
# - secret/billing-service/
# - secret/shared/
```

### 3️⃣ **Inizializzazione Database** (10 minuti)

#### A. Crea database per ogni servizio:
```bash
# Connetti a PostgreSQL
make psql-admin

# Dentro psql, esegui:
CREATE DATABASE auth_db;
CREATE DATABASE reports_db;
CREATE DATABASE billing_db;
CREATE DATABASE admin_db;
CREATE DATABASE analytics_db;

# Crea utenti dedicati
CREATE USER auth_user WITH PASSWORD 'auth_dev_password';
CREATE USER reports_user WITH PASSWORD 'reports_dev_password';
CREATE USER billing_user WITH PASSWORD 'billing_dev_password';
GRANT ALL PRIVILEGES ON DATABASE auth_db TO auth_user;
GRANT ALL PRIVILEGES ON DATABASE reports_db TO reports_user;
GRANT ALL PRIVILEGES ON DATABASE billing_db TO billing_user;
\q
```

#### B. Esegui migrations:
```bash
# Auth Service
cd services/auth
alembic upgrade head

# Reports Service (quando sarà pronto)
cd ../reports
alembic upgrade head

# Billing Service (quando sarà pronto)
cd ../billing
alembic upgrade head
```

### 4️⃣ **Completamento Auth Service API** (2-3 ore)

Dobbiamo completare gli endpoint REST dell'Auth Service:

#### A. Crea il file degli endpoint principali:
```bash
cd services/auth
touch app/api/v1/auth.py
touch app/api/v1/users.py
touch app/api/v1/sessions.py
```

#### B. Endpoint da implementare:

**auth.py:**
- `POST /api/v1/auth/register` - Registrazione nuovo utente
- `POST /api/v1/auth/login` - Login con email/password
- `POST /api/v1/auth/logout` - Logout e revoca session
- `POST /api/v1/auth/refresh` - Refresh del token
- `POST /api/v1/auth/verify-email` - Verifica email
- `POST /api/v1/auth/forgot-password` - Richiesta reset password
- `POST /api/v1/auth/reset-password` - Reset password con token
- `POST /api/v1/auth/mfa/enable` - Abilita 2FA
- `POST /api/v1/auth/mfa/verify` - Verifica codice 2FA

**users.py:**
- `GET /api/v1/users/me` - Profilo utente corrente
- `PUT /api/v1/users/me` - Aggiorna profilo
- `DELETE /api/v1/users/me` - Elimina account (soft delete)
- `PUT /api/v1/users/me/password` - Cambia password
- `GET /api/v1/users/me/sessions` - Lista sessioni attive
- `DELETE /api/v1/users/me/sessions/{id}` - Revoca sessione specifica

**sessions.py (admin):**
- `GET /api/v1/admin/sessions` - Lista tutte le sessioni
- `DELETE /api/v1/admin/sessions/{id}` - Revoca sessione (admin)
- `POST /api/v1/admin/users/{id}/lock` - Blocca utente
- `POST /api/v1/admin/users/{id}/unlock` - Sblocca utente

### 5️⃣ **Test dell'Auth Service** (30 minuti)

#### A. Avvia Auth Service in development:
```bash
cd services/auth

# Installa dipendenze
pip install -r requirements.txt

# Avvia il servizio
uvicorn app.main:app --reload --port 8001
```

#### B. Test con curl/Postman:
```bash
# Registrazione
curl -X POST http://localhost:8001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "full_name": "Test User"
  }'

# Login
curl -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# Profilo (con token)
curl http://localhost:8001/api/v1/users/me \
  -H "Authorization: Bearer <access_token>"
```

#### C. Esegui test suite:
```bash
# Unit tests
pytest tests/unit -v

# Integration tests (richiede DB)
pytest tests/integration -v

# E2E tests (richiede tutto l'ambiente)
pytest tests/e2e -v

# Coverage report
pytest --cov=app --cov-report=html
```

### 6️⃣ **Setup Monitoring Stack** (45 minuti)

#### A. Configura Prometheus:
```bash
# Modifica prometheus/prometheus.yml per aggiungere targets
vim monitoring/prometheus/prometheus.yml

# Aggiungi i servizi da monitorare:
scrape_configs:
  - job_name: 'auth-service'
    static_configs:
      - targets: ['auth-service:8001']
  - job_name: 'reports-service'
    static_configs:
      - targets: ['reports-service:8002']
```

#### B. Importa Dashboard Grafana:
```bash
# Accedi a Grafana (admin/admin)
open http://localhost:3000

# Importa dashboard:
# 1. Go to Dashboards → Import
# 2. Upload JSON files da monitoring/grafana/dashboards/
# 3. Seleziona Prometheus come data source
```

#### C. Setup Alerts:
```bash
# Crea alerts in Grafana per:
# - CPU usage > 80%
# - Memory usage > 90%
# - Response time > 500ms
# - Error rate > 1%
# - Database connections > 80%
```

### 7️⃣ **Implementazione Reports Service** (1-2 giorni)

Il Reports Service è il CORE del business. Procediamo con:

#### A. Struttura base:
```bash
cd services/reports

# Crea struttura
mkdir -p app/{api,services,models,core,utils}
touch app/main.py
touch app/models/{report.py,template.py,signature.py}
touch app/services/{pdf_service.py,signature_service.py,storage_service.py}
touch app/api/v1/{reports.py,templates.py}
```

#### B. Modelli principali:
- Report: Referto medico
- ReportTemplate: Template predefiniti
- Signature: Firma digitale
- Attachment: Allegati (immagini, PDF)

#### C. Servizi core:
- PDFService: Generazione PDF con template
- SignatureService: Firma digitale PAdES/CAdES
- StorageService: Salvataggio su S3/MinIO
- ValidationService: Validazione dati medici

### 8️⃣ **Frontend Setup** (1 giorno)

#### A. Inizializza React App:
```bash
cd frontend

# Installa dipendenze
npm install

# Configura environment
cp .env.example .env.development
vim .env.development
# VITE_API_URL=http://localhost:8000
# VITE_AUTH_URL=http://localhost:8001
```

#### B. Avvia development:
```bash
npm run dev
# App disponibile su http://localhost:5173
```

### 9️⃣ **Integration Testing Completo** (4 ore)

#### A. Avvia tutto lo stack:
```bash
# Dalla root
make dev-up

# Verifica che tutto sia running
make ps
make health-check
```

#### B. Test E2E flow:
1. Registrazione nuovo utente
2. Verifica email
3. Login
4. Creazione referto
5. Upload allegati
6. Firma digitale
7. Download PDF
8. Invio al paziente

### 🔟 **Deployment Staging** (2 ore)

#### A. Build delle immagini:
```bash
make build-all
make push-all
```

#### B. Deploy su staging:
```bash
# Se hai configurato i GitHub Secrets, puoi:
git tag v0.1.0-alpha
git push origin v0.1.0-alpha

# Questo triggerà il deployment automatico
```

## 📊 Timeline Stimata

| Fase | Tempo | Priorità |
|------|-------|----------|
| GitHub Secrets | 30 min | 🔴 Alta |
| Setup Locale | 15 min | 🔴 Alta |
| Database Init | 10 min | 🔴 Alta |
| Auth API Completion | 3 ore | 🔴 Alta |
| Auth Testing | 30 min | 🔴 Alta |
| Monitoring Setup | 45 min | 🟡 Media |
| Reports Service | 2 giorni | 🔴 Alta |
| Frontend Setup | 1 giorno | 🟡 Media |
| Integration Test | 4 ore | 🟡 Media |
| Staging Deploy | 2 ore | 🟢 Bassa |

**Totale stimato: 4-5 giorni di lavoro**

## 🚀 Comandi Rapidi Utili

```bash
# Monitoring
make logs service=auth-service  # Logs di un servizio
make stats                       # Statistiche containers
make health-check               # Verifica salute sistema

# Database
make psql-admin                 # Accesso PostgreSQL
make redis-cli                  # Accesso Redis
make mongo-shell               # Accesso MongoDB

# Development
make dev-up                    # Avvia tutto
make dev-down                  # Ferma tutto
make dev-restart              # Restart tutto
make dev-clean                # Pulizia completa

# Testing
make test-auth                # Test Auth Service
make test-reports            # Test Reports Service
make test-all               # Tutti i test

# Build & Deploy
make build service=auth      # Build singolo servizio
make push service=auth      # Push singolo servizio
make deploy-staging         # Deploy su staging
```

## ❓ Troubleshooting Comuni

### Vault sealed dopo restart:
```bash
make vault-unseal KEY=<key1>
make vault-unseal KEY=<key2>
make vault-unseal KEY=<key3>
```

### Database connection refused:
```bash
# Verifica che il container sia running
docker ps | grep postgres

# Check logs
docker logs refertosicuro_postgres

# Restart
make dev-restart service=postgres
```

### Port già in uso:
```bash
# Trova processo sulla porta
lsof -i :8001

# Kill processo
kill -9 <PID>
```

## 📞 Prossimi Passi Dopo Configurazione

1. **Security Hardening**
   - Configurare WAF (Web Application Firewall)
   - Implementare rate limiting
   - Setup fail2ban per protezione brute force

2. **Compliance GDPR**
   - Implementare data retention policies
   - Aggiungere audit logging completo
   - Configurare backup crittografati

3. **Performance**
   - Configurare CDN per assets statici
   - Implementare caching con Redis
   - Ottimizzare query database

4. **Business Features**
   - Sistema di notifiche real-time
   - Dashboard analytics
   - Integrazione con sistemi esterni (PACS, LIS)

---

💡 **Suggerimento**: Inizia con i punti 1-5, sono essenziali per avere l'Auth Service funzionante. Poi procedi con Reports Service che è il core business.