# 🚀 PROMPT PER FRESH START - MIGRAZIONE ENDPOINT REFERTOSICURO V2

## CONTESTO
Sto migrando RefertoSicuro da un'architettura monolitica (v0) a microservizi (v2). Il frontend è stato già copiato dalla v0 ma tutti gli endpoint API puntano ancora ai vecchi URL. Devo aggiornarli sistematicamente.

## SITUAZIONE ATTUALE
- **Frontend**: Migrato in `/frontend` con 50+ componenti React
- **Backend**: 6 microservizi (Auth, Reports, Billing, Admin, Analytics, Notification)
- **Problema**: Gli endpoint nel frontend puntano ancora a `/auth/login`, `/reports/improve`, etc.
- **Soluzione**: Devono puntare a `/api/v1/auth/login`, `/api/v1/reports/improve`, etc.

## ARCHITETTURA MICROSERVIZI
```
Auth Service (8010)       → /api/v1/auth/*
Reports Service (8011)    → /api/v1/reports/*, /api/v1/specialties/*, /api/v1/templates/*
Billing Service (8012)    → /api/v1/billing/*
Admin Service (8013)      → /api/v1/admin/*
Analytics Service (8014)  → /api/v1/analytics/*
Notification Service (8015) → /api/v1/notifications/*
```

## FILE DA MODIFICARE
Percorso base: `/Users/stefano/DEV/RefertoSicuro_v2/frontend/src/`

### Priorità 1 - Service Files
- `services/api.js` (446 righe) - contiene reportsAPI, specialtiesAPI, consentAPI, etc.
- `services/authService.js` (526 righe) - tutti gli endpoint di autenticazione

### Priorità 2 - Components che chiamano API direttamente
- `components/auth/LoginForm.jsx`
- `components/auth/RegisterForm.jsx`
- `components/reports/ReportValidatorStreaming.jsx`
- `components/profile/SubscriptionTab.jsx`
- `components/profile/InputTemplatesTab.jsx`

## MAPPATURA ENDPOINT (v0 → v2)

### AUTH SERVICE
```
/auth/login                → /api/v1/auth/login
/auth/logout               → /api/v1/auth/logout
/auth/csrf-token          → /api/v1/auth/csrf-token
/auth/verify-token        → /api/v1/auth/verify
/auth/me                  → /api/v1/users/me
/auth/b2c/verify-email    → /api/v1/auth/register/verify-email
/auth/b2c/confirm-email   → /api/v1/auth/register/confirm-email
/auth/b2c/register        → /api/v1/auth/register/complete
/users/profile            → /api/v1/users/profile
/users/subscription       → /api/v1/billing/subscription
```

### REPORTS SERVICE
```
/reports/validate         → /api/v1/reports/validate
/reports/improve          → /api/v1/reports/improve
/reports/improve-streaming → /api/v1/reports/improve-streaming
/reports/improve-streaming-sse → /api/v1/reports/improve-sse
/reports/suggestions      → /api/v1/reports/suggestions
/reports/transcribe       → /api/v1/reports/transcribe
/specialties/             → /api/v1/specialties
/specialties/user/me      → /api/v1/specialties/user
/input-templates/         → /api/v1/templates
```

### BILLING SERVICE
```
/billing/cancel-subscription → /api/v1/billing/subscription/cancel
/billing/invoices           → /api/v1/billing/invoices
```

## TASK DA ESEGUIRE

1. **Esegui lo script di migrazione**:
   ```bash
   cd /Users/stefano/DEV/RefertoSicuro_v2
   python scripts/migrate_endpoints.py
   ```

2. **Verifica il tracking file**:
   ```bash
   cat frontend/ENDPOINT_MIGRATION_TRACKER.json
   ```

3. **Crea service client separati per ogni microservizio**:
   - `frontend/src/services/auth/authClient.js`
   - `frontend/src/services/reports/reportsClient.js`
   - `frontend/src/services/billing/billingClient.js`

4. **Configura le variabili d'ambiente**:
   ```bash
   # frontend/.env.development
   VITE_AUTH_SERVICE_URL=http://localhost:8010
   VITE_REPORTS_SERVICE_URL=http://localhost:8011
   VITE_BILLING_SERVICE_URL=http://localhost:8012
   ```

5. **Test delle modifiche**:
   - Verifica che ogni endpoint sia stato aggiornato
   - Controlla che non ci siano riferimenti ai vecchi path
   - Testa almeno login e report improvement

## COMANDI UTILI

```bash
# Trova tutti gli endpoint vecchi nel codice
grep -r "'/auth/" frontend/src/
grep -r "'/reports/" frontend/src/
grep -r "'/billing/" frontend/src/

# Conta quanti endpoint devono essere migrati
grep -r "api\.(get\|post\|put\|delete\|patch)" frontend/src/ | wc -l

# Backup prima della migrazione
cp -r frontend/src frontend/src.backup
```

## NOTA IMPORTANTE
- NON modificare manualmente se lo script può farlo
- Tutti i messaggi devono essere in ITALIANO
- Mantieni httpOnly cookies e CSRF protection
- Il SSE streaming deve continuare a funzionare

## OUTPUT ATTESO
Al termine dovrai avere:
1. ✅ Tutti gli endpoint aggiornati a `/api/v1/*`
2. ✅ Service client separati per microservizio
3. ✅ File di tracking completo
4. ✅ Frontend pronto per connettersi ai microservizi

---

**INIZIA** eseguendo lo script di migrazione e mostrami il risultato del tracking file.