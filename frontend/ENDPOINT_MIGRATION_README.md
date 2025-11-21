# 📋 Guida Migrazione Endpoint v0 → v2

## 🎯 Obiettivo
Migrare tutti gli endpoint API nel frontend dal formato v0 (monolitico) al formato v2 (microservizi).

## 🔄 Trasformazioni Principali

### Prima (v0 - Monolitico)
```javascript
api.post('/auth/login', credentials)
api.get('/reports/improve', data)
api.get('/specialties/')
```

### Dopo (v2 - Microservizi)
```javascript
api.post('/api/v1/auth/login', credentials)
api.get('/api/v1/reports/improve', data)
api.get('/api/v1/specialties')
```

## 🚀 Come Eseguire la Migrazione

### 1. Backup (IMPORTANTE!)
```bash
# Fai un backup prima di iniziare
cp -r frontend/src frontend/src.backup
```

### 2. Dry Run (Test senza modifiche)
```bash
# Vedi cosa verrà modificato senza toccare i file
python scripts/migrate_endpoints.py --dry-run --verbose
```

### 3. Esecuzione Reale
```bash
# Esegui la migrazione effettiva
python scripts/migrate_endpoints.py
```

### 4. Verifica il Risultato
```bash
# Controlla il file di tracking
cat frontend/src/ENDPOINT_MIGRATION_TRACKER.json | jq .

# Verifica che non ci siano endpoint vecchi rimasti
grep -r "'/auth/" frontend/src/ | grep -v "api/v1"
grep -r "'/reports/" frontend/src/ | grep -v "api/v1"
```

## 📊 File di Tracking

Il file `ENDPOINT_MIGRATION_TRACKER.json` contiene:
- `files_processed`: Numero totale di file analizzati
- `files_modified`: File che sono stati modificati
- `endpoints_replaced`: Totale sostituzioni effettuate
- `endpoint_details`: Dettaglio per ogni file
- `errors`: Eventuali errori durante la migrazione

## 🗂️ File Principali da Modificare

### Service Files (Priorità Alta)
| File | Endpoint Count | Descrizione |
|------|----------------|-------------|
| `services/api.js` | ~25 | API principale con axios |
| `services/authService.js` | ~15 | Servizio autenticazione |
| `services/configService.js` | ~3 | Configurazione |

### Component Files (Priorità Media)
| File | Endpoint Count | Descrizione |
|------|----------------|-------------|
| `components/auth/RegisterForm.jsx` | ~3 | Form registrazione B2C |
| `components/reports/ReportValidatorStreaming.jsx` | ~2 | SSE streaming |
| `components/profile/SubscriptionTab.jsx` | ~2 | Gestione abbonamento |

## 🔍 Verifica Manuale Post-Migrazione

### 1. Test Login Flow
```javascript
// Verifica che funzioni:
POST /api/v1/auth/login
GET /api/v1/auth/csrf-token
GET /api/v1/users/me
```

### 2. Test Report Flow
```javascript
// Verifica che funzioni:
GET /api/v1/specialties
POST /api/v1/reports/improve
POST /api/v1/reports/improve-sse (SSE streaming)
```

### 3. Test Billing Flow
```javascript
// Verifica che funzioni:
GET /api/v1/billing/subscription
GET /api/v1/billing/plans
```

## ⚠️ Attenzione Particolare

### SSE Streaming
Il componente `ReportValidatorStreaming.jsx` usa Server-Sent Events. Verifica che:
```javascript
// Prima
fetch(`${API_CONFIG.baseURL}/reports/improve-streaming-sse`, ...)

// Dopo
fetch(`${API_CONFIG.baseURL}/api/v1/reports/improve-sse`, ...)
```

### CSRF Token
Assicurati che l'endpoint CSRF funzioni:
```javascript
// Prima
await axios.get(`${API_CONFIG.backendURL}/auth/csrf-token`)

// Dopo
await axios.get(`${API_CONFIG.backendURL}/api/v1/auth/csrf-token`)
```

### Dynamic Endpoints
Alcuni endpoint hanno parametri dinamici:
```javascript
// Prima
api.get(`/specialties/${id}`)
api.put(`/input-templates/${id}`)

// Dopo
api.get(`/api/v1/specialties/${id}`)
api.put(`/api/v1/templates/${id}`)
```

## 🔧 Configurazione Environment

Dopo la migrazione, aggiorna `.env.development`:
```env
# Microservizi locali
VITE_AUTH_SERVICE_URL=http://localhost:8010
VITE_REPORTS_SERVICE_URL=http://localhost:8011
VITE_BILLING_SERVICE_URL=http://localhost:8012
VITE_ADMIN_SERVICE_URL=http://localhost:8013
VITE_ANALYTICS_SERVICE_URL=http://localhost:8014
VITE_NOTIFICATION_SERVICE_URL=http://localhost:8015

# O API Gateway (produzione)
VITE_API_GATEWAY_URL=http://localhost:8000
```

## 📝 Modifiche Manuali Necessarie

Dopo lo script automatico, dovrai:

1. **Creare service client separati**:
   ```javascript
   // frontend/src/services/auth/authClient.js
   import axios from 'axios';
   const AUTH_API = import.meta.env.VITE_AUTH_SERVICE_URL;

   // frontend/src/services/reports/reportsClient.js
   import axios from 'axios';
   const REPORTS_API = import.meta.env.VITE_REPORTS_SERVICE_URL;
   ```

2. **Aggiornare le importazioni nei componenti**:
   ```javascript
   // Prima
   import { reportsAPI, specialtiesAPI } from '../services/api';

   // Dopo
   import { reportsAPI } from '../services/reports/reportsClient';
   import { specialtiesAPI } from '../services/reports/specialtiesClient';
   ```

3. **Uniformare le notifiche in italiano**:
   - Cerca tutti i messaggi in inglese
   - Sostituisci con messaggi in italiano
   - Centralizza in `constants/messages.js`

## ✅ Checklist Post-Migrazione

- [ ] Backup creato prima della migrazione
- [ ] Script eseguito con successo
- [ ] Nessun errore nel tracking file
- [ ] Login funzionante
- [ ] Report improvement funzionante
- [ ] SSE streaming funzionante
- [ ] Subscription info visibile
- [ ] CSRF token funzionante
- [ ] Nessun endpoint v0 residuo
- [ ] Environment variables configurate
- [ ] Test E2E passati

## 🆘 Troubleshooting

### Problema: Script non trova i file
```bash
# Assicurati di essere nella directory giusta
cd /Users/stefano/DEV/RefertoSicuro_v2
python scripts/migrate_endpoints.py --path frontend/src
```

### Problema: Endpoint non sostituito
```bash
# Cerca manualmente
grep -n "vecchio_endpoint" frontend/src/services/api.js

# Modifica manualmente se necessario
sed -i '' 's|/auth/login|/api/v1/auth/login|g' frontend/src/services/api.js
```

### Problema: Rollback necessario
```bash
# Ripristina dal backup
rm -rf frontend/src
mv frontend/src.backup frontend/src
```

## 📅 Timeline Stimata

1. **Backup**: 1 minuto
2. **Dry run**: 2 minuti
3. **Migrazione**: 5 minuti
4. **Verifica**: 10 minuti
5. **Test manuali**: 15 minuti

**Totale**: ~30 minuti

---

Ultimo aggiornamento: 21 Novembre 2024
Versione script: 1.0.0