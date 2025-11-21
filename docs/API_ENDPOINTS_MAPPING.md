# API Endpoints Mapping: Frontend v0 → Microservizi v2

## 📊 Analisi Completa Endpoint v0

Ho analizzato tutti gli endpoint utilizzati dal frontend v0. Ecco la situazione attuale:

### Statistiche
- **Totale endpoint v0**: 45+
- **Endpoint confusi/duplicati**: 8
- **Endpoint mancanti**: 12 (da aggiungere per completezza)
- **Microservizi target**: 6

---

## 🎯 MAPPATURA COMPLETA v0 → v2

### 1️⃣ AUTH SERVICE (Porta: 8010)

#### Autenticazione Base
```yaml
# LOGIN
v0: POST /auth/login
v2: POST /api/v1/auth/login
Body: { email, password, sub_account_id? }
Response: { access_token, refresh_token, user }

# LOGOUT
v0: POST /auth/logout
v2: POST /api/v1/auth/logout
Response: { message: "Disconnessione completata" }

# REFRESH TOKEN
v0: (mancante - gestito automaticamente)
v2: POST /api/v1/auth/refresh
Body: { refresh_token }
Response: { access_token, refresh_token }

# CSRF TOKEN
v0: GET /auth/csrf-token
v2: GET /api/v1/auth/csrf-token
Response: { csrf_token, expires_at }

# VERIFY TOKEN
v0: GET /auth/verify-token
v2: GET /api/v1/auth/verify
Response: { valid: boolean, user_id }
```

#### Registrazione B2C (Multi-step)
```yaml
# STEP 1: VERIFY EMAIL
v0: POST /auth/b2c/verify-email
v2: POST /api/v1/auth/register/verify-email
Body: { email, terms_accepted, fnomceo_data? }
Response: { message: "Email di verifica inviata" }

# STEP 2: CONFIRM EMAIL
v0: POST /auth/b2c/confirm-email
v2: POST /api/v1/auth/register/confirm-email
Body: { token, email }
Response: { verified: true, temp_token }

# STEP 3: COMPLETE REGISTRATION
v0: POST /auth/b2c/register
v2: POST /api/v1/auth/register/complete
Body: {
  temp_token,
  password,
  full_name,
  phone,
  vat_number,
  company_name,
  billing_address,
  stripe_token,
  selected_plan
}
Response: { user_id, auto_login: true }
```

#### Registrazione Standard
```yaml
# REGISTER (non usato nel frontend, ma necessario per API)
v0: POST /auth/register
v2: POST /api/v1/auth/register
Body: { email, password, full_name, phone }
Response: { user_id, message }
```

#### User Management
```yaml
# GET CURRENT USER
v0: GET /auth/me
v2: GET /api/v1/users/me
Response: { id, email, full_name, roles, subscription, organization }

# UPDATE PROFILE
v0: PUT /users/profile
v2: PUT /api/v1/users/profile
Body: { full_name, phone, vat_number, company_name }
Response: { user: {...} }

# CHANGE PASSWORD
v0: (mancante)
v2: POST /api/v1/users/change-password
Body: { current_password, new_password }
Response: { message: "Password modificata con successo" }

# DELETE ACCOUNT (GDPR)
v0: (mancante)
v2: DELETE /api/v1/users/me
Response: { scheduled_deletion: "2024-12-21" }
```

#### Password Reset
```yaml
# REQUEST RESET
v0: (mancante nel codice analizzato)
v2: POST /api/v1/auth/forgot-password
Body: { email }
Response: { message: "Email di reset inviata" }

# CONFIRM RESET
v0: (mancante nel codice analizzato)
v2: POST /api/v1/auth/reset-password
Body: { token, new_password }
Response: { message: "Password reimpostata" }
```

#### Sessions Management
```yaml
# LIST SESSIONS
v0: (mancante)
v2: GET /api/v1/sessions
Response: [{ id, device, ip, last_activity, current }]

# REVOKE SESSION
v0: (mancante)
v2: DELETE /api/v1/sessions/{session_id}
Response: { message: "Sessione revocata" }

# REVOKE ALL SESSIONS
v0: (mancante)
v2: DELETE /api/v1/sessions/all
Response: { message: "Tutte le sessioni revocate" }
```

---

### 2️⃣ REPORTS SERVICE (Porta: 8011)

#### Report Processing
```yaml
# VALIDATE REPORT
v0: POST /reports/validate
v2: POST /api/v1/reports/validate
Body: { content, specialty_id }
Response: { is_valid, issues: [] }

# IMPROVE REPORT (standard)
v0: POST /reports/improve
v2: POST /api/v1/reports/improve
Body: { content, specialty_id, assistant_id? }
Response: {
  original_text,
  improved_text,
  suggestions: [],
  tokens_used,
  processing_time_ms
}

# IMPROVE STREAMING (JSON streaming)
v0: POST /reports/improve-streaming
v2: POST /api/v1/reports/improve-streaming
Body: { content, specialty_id, assistant_id? }
Response: Stream of JSON chunks

# IMPROVE SSE (Server-Sent Events)
v0: POST /reports/improve-streaming-sse
v2: POST /api/v1/reports/improve-sse
Body: { content, report_type, assistant_id? }
Response: SSE stream with events:
  - event: ttft, data: { ttft: 250 }
  - event: delta, data: { delta: "text chunk" }
  - event: done, data: { complete_text, tokens }

# GET SUGGESTIONS
v0: POST /reports/suggestions
v2: POST /api/v1/reports/suggestions
Body: { content, specialty_id }
Response: { suggestions: ["sugg1", "sugg2"] }

# TRANSCRIBE AUDIO
v0: POST /reports/transcribe
v2: POST /api/v1/reports/transcribe
Body: FormData { audio_file }
Response: { text, duration_seconds, confidence }
```

#### Report History
```yaml
# LIST USER REPORTS
v0: (mancante)
v2: GET /api/v1/reports
Query: ?page=1&limit=20&specialty_id=xxx
Response: { reports: [], total, pages }

# GET REPORT
v0: (mancante)
v2: GET /api/v1/reports/{report_id}
Response: { id, content, improved_text, created_at }

# DELETE REPORT
v0: (mancante)
v2: DELETE /api/v1/reports/{report_id}
Response: { message: "Report eliminato" }

# EXPORT REPORT
v0: (mancante)
v2: GET /api/v1/reports/{report_id}/export
Query: ?format=pdf|docx|txt
Response: File download
```

#### Feedback
```yaml
# SUBMIT FEEDBACK
v0: (mancante ma necessario)
v2: POST /api/v1/reports/{report_id}/feedback
Body: { rating: 1-5, comment? }
Response: { message: "Feedback ricevuto" }
```

---

### 3️⃣ SPECIALTIES SERVICE (Parte di Reports Service)

```yaml
# LIST SPECIALTIES
v0: GET /specialties/
v2: GET /api/v1/specialties
Response: [{
  id, code: "RAD", name: "Radiologia",
  assistant_id, is_active, icon_url
}]

# GET USER SPECIALTIES
v0: GET /specialties/user/me
v2: GET /api/v1/specialties/user
Response: [{ specialty_id, enabled, custom_settings }]

# GET USER ASSISTANTS
v0: GET /specialties/user/me/assistants
v2: GET /api/v1/specialties/assistants
Response: [{
  id, name, model, specialty_id,
  custom_prompt, is_default
}]

# GET SPECIALTY BY ID
v0: GET /specialties/{id}
v2: GET /api/v1/specialties/{id}
Response: { id, code, name, description, templates }

# UPDATE USER SPECIALTY SETTINGS
v0: (mancante)
v2: PUT /api/v1/specialties/user/{specialty_id}
Body: { enabled, custom_settings }
Response: { updated: true }
```

---

### 4️⃣ TEMPLATES SERVICE (Parte di Reports Service)

```yaml
# LIST TEMPLATES
v0: GET /input-templates/
v2: GET /api/v1/templates
Query: ?specialty_id=xxx&is_active=true
Response: [{ id, name, content, specialty_id, is_active }]

# GET TEMPLATES BY SPECIALTY
v0: GET /input-templates/by-specialty
v2: GET /api/v1/templates/by-specialty
Response: {
  "RAD": [templates],
  "CARD": [templates]
}

# TEMPLATE STATS
v0: GET /input-templates/stats
v2: GET /api/v1/templates/stats
Response: {
  total: 45,
  by_specialty: { RAD: 10, CARD: 5 },
  most_used: []
}

# GET TEMPLATE
v0: GET /input-templates/{id}
v2: GET /api/v1/templates/{id}

# CREATE TEMPLATE
v0: POST /input-templates/
v2: POST /api/v1/templates
Body: { name, content, specialty_id }

# UPDATE TEMPLATE
v0: PUT /input-templates/{id}
v2: PUT /api/v1/templates/{id}
Body: { name, content, is_active }

# DELETE TEMPLATE
v0: DELETE /input-templates/{id}
v2: DELETE /api/v1/templates/{id}

# TOGGLE ACTIVE
v0: PATCH /input-templates/{id}/toggle
v2: PATCH /api/v1/templates/{id}/toggle

# DUPLICATE TEMPLATE
v0: POST /input-templates/{id}/duplicate
v2: POST /api/v1/templates/{id}/duplicate
```

---

### 5️⃣ BILLING SERVICE (Porta: 8012)

#### Subscription Management
```yaml
# GET SUBSCRIPTION
v0: GET /users/subscription
v2: GET /api/v1/billing/subscription
Response: {
  plan: { id, name, price },
  status: "active",
  current_period_start,
  current_period_end,
  cancel_at_period_end: false,
  usage: { reports_used: 45, reports_limit: 100 }
}

# CANCEL SUBSCRIPTION
v0: POST /billing/cancel-subscription
v2: POST /api/v1/billing/subscription/cancel
Response: { cancel_at_period_end: true }

# REACTIVATE SUBSCRIPTION
v0: (mancante)
v2: POST /api/v1/billing/subscription/reactivate
Response: { status: "active" }

# CHANGE PLAN
v0: (mancante)
v2: POST /api/v1/billing/subscription/change-plan
Body: { new_plan_id }
Response: { message: "Piano aggiornato" }
```

#### Plans & Pricing
```yaml
# GET PLANS
v0: (mancante ma necessario)
v2: GET /api/v1/billing/plans
Response: [{
  id, name,
  monthly_price, yearly_price,
  features: [],
  report_quota, max_specialties
}]

# GET PLAN DETAILS
v0: (mancante)
v2: GET /api/v1/billing/plans/{plan_id}
```

#### Payments
```yaml
# CREATE CHECKOUT SESSION (Stripe)
v0: (mancante nel codice ma necessario)
v2: POST /api/v1/billing/checkout/stripe
Body: { plan_id, billing_cycle: "monthly|yearly" }
Response: { checkout_url, session_id }

# CREATE PAYPAL ORDER
v0: (mancante)
v2: POST /api/v1/billing/checkout/paypal
Body: { plan_id, billing_cycle }
Response: { order_id, approve_url }

# CONFIRM PAYMENT
v0: (mancante)
v2: POST /api/v1/billing/payment/confirm
Body: { payment_intent_id, payment_method }
Response: { success: true, subscription_id }
```

#### Invoices
```yaml
# LIST INVOICES
v0: GET /billing/invoices
v2: GET /api/v1/billing/invoices
Response: [{
  id, number: "2024-001",
  date, amount, status,
  pdf_url
}]

# GET INVOICE
v0: (mancante)
v2: GET /api/v1/billing/invoices/{invoice_id}

# DOWNLOAD INVOICE
v0: (mancante)
v2: GET /api/v1/billing/invoices/{invoice_id}/download
Response: PDF file
```

#### Webhooks
```yaml
# STRIPE WEBHOOK
v0: (backend only)
v2: POST /api/v1/billing/webhooks/stripe

# PAYPAL WEBHOOK
v0: (backend only)
v2: POST /api/v1/billing/webhooks/paypal
```

---

### 6️⃣ ADMIN SERVICE (Porta: 8013)

```yaml
# DASHBOARD STATS
v2: GET /api/v1/admin/dashboard
Response: {
  users_total: 1234,
  users_active: 890,
  revenue_month: 45000,
  reports_processed: 12345
}

# LIST USERS
v2: GET /api/v1/admin/users
Query: ?page=1&search=john&role=customer

# GET USER DETAILS
v2: GET /api/v1/admin/users/{user_id}

# UPDATE USER
v2: PUT /api/v1/admin/users/{user_id}
Body: { is_active, roles, subscription_override }

# IMPERSONATE USER (support)
v2: POST /api/v1/admin/users/{user_id}/impersonate
Response: { temp_token }

# SYSTEM LOGS
v2: GET /api/v1/admin/logs
Query: ?level=error&service=auth&date=2024-11-21

# REPORTS ANALYTICS
v2: GET /api/v1/admin/analytics/reports
Query: ?period=month&specialty=RAD
```

---

### 7️⃣ ANALYTICS SERVICE (Porta: 8014)

```yaml
# USER METRICS
v2: GET /api/v1/analytics/user/metrics
Response: {
  reports_total: 234,
  reports_month: 45,
  avg_processing_time: 2.3,
  favorite_specialty: "RAD",
  usage_by_day: []
}

# USAGE EVENTS
v2: POST /api/v1/analytics/events
Body: {
  event_type: "report_improved",
  metadata: { specialty: "RAD", tokens: 450 }
}

# EXPORT ANALYTICS
v2: GET /api/v1/analytics/export
Query: ?format=csv&period=month
```

---

### 8️⃣ NOTIFICATION SERVICE (Porta: 8015)

```yaml
# SEND EMAIL
v2: POST /api/v1/notifications/email
Body: {
  to: "user@example.com",
  template: "welcome",
  variables: { name: "Mario" }
}

# SEND SMS
v2: POST /api/v1/notifications/sms
Body: {
  to: "+39123456789",
  message: "Il tuo codice: 123456"
}

# USER PREFERENCES
v2: GET /api/v1/notifications/preferences
v2: PUT /api/v1/notifications/preferences
Body: {
  email_reports: true,
  email_marketing: false,
  sms_alerts: true
}

# UNSUBSCRIBE
v2: POST /api/v1/notifications/unsubscribe
Body: { token, type: "marketing" }
```

---

### 9️⃣ PLATFORM/FEATURES (Parte di Admin o Auth)

```yaml
# GET PUBLIC FEATURES
v0: GET /platform-features/public
v2: GET /api/v1/features/public
Query: ?tier_id=pro&category=reports

# GET USER FEATURES
v0: GET /platform-features/user/me
v2: GET /api/v1/features/user
Response: {
  tier: "pro",
  features: {
    max_reports: 100,
    specialties: ["RAD", "CARD"],
    api_access: true,
    priority_support: false
  }
}
```

---

### 🔟 CONSENT/GDPR (Parte di Auth Service)

```yaml
# GET CONSENT TEMPLATE
v0: GET /consent/templates/{type}
v2: GET /api/v1/consent/templates/{type}
Types: privacy, terms, marketing

# GET ALL TEMPLATES
v0: GET /consent/templates
v2: GET /api/v1/consent/templates

# SAVE USER CONSENT
v0: (mancante)
v2: POST /api/v1/consent/accept
Body: {
  type: "privacy",
  version: "2024.1",
  accepted: true
}

# GET USER CONSENTS
v0: (mancante)
v2: GET /api/v1/consent/user

# WITHDRAW CONSENT
v0: (mancante)
v2: POST /api/v1/consent/withdraw
Body: { type: "marketing" }
```

---

### ➕ HEALTH & MONITORING (Tutti i servizi)

```yaml
# HEALTH CHECK (ogni servizio)
v0: GET /health
v0: GET /reports/health
v2: GET /health
Response: { status: "healthy", database: "connected" }

# READINESS CHECK (ogni servizio)
v0: (parziale)
v2: GET /ready
Response: { ready: true, checks: {} }

# METRICS (ogni servizio)
v0: (mancante)
v2: GET /metrics
Response: Prometheus format

# INFO/VERSION
v0: GET /info
v2: GET /api/v1/info
Response: { version: "2.0.0", environment: "production" }
```

---

## 📋 RIEPILOGO ENDPOINT PER MICROSERVIZIO

### Auth Service (8010): 28 endpoints
- Authentication: 6
- Registration: 4
- User Management: 4
- Password Reset: 2
- Sessions: 3
- Consent/GDPR: 5
- Health: 4

### Reports Service (8011): 29 endpoints
- Report Processing: 6
- Report History: 4
- Feedback: 1
- Specialties: 5
- Templates: 9
- Health: 4

### Billing Service (8012): 18 endpoints
- Subscription: 4
- Plans: 2
- Payments: 3
- Invoices: 3
- Webhooks: 2
- Health: 4

### Admin Service (8013): 10 endpoints
- Dashboard: 1
- User Management: 4
- System: 1
- Health: 4

### Analytics Service (8014): 7 endpoints
- Metrics: 1
- Events: 1
- Export: 1
- Health: 4

### Notification Service (8015): 8 endpoints
- Send: 2
- Preferences: 2
- Health: 4

**TOTALE**: 100 endpoints

---

## 🚨 ENDPOINT CRITICI DA IMPLEMENTARE SUBITO

Per rendere il frontend funzionante, questi sono gli endpoint **MINIMI NECESSARI**:

### Auth Service (MUST HAVE)
1. POST /api/v1/auth/login
2. POST /api/v1/auth/logout
3. GET /api/v1/auth/csrf-token
4. GET /api/v1/users/me
5. POST /api/v1/auth/register/verify-email
6. POST /api/v1/auth/register/confirm-email
7. POST /api/v1/auth/register/complete

### Reports Service (MUST HAVE)
1. POST /api/v1/reports/improve
2. POST /api/v1/reports/improve-sse (streaming)
3. GET /api/v1/specialties
4. GET /api/v1/templates
5. POST /api/v1/templates

### Billing Service (MUST HAVE)
1. GET /api/v1/billing/subscription
2. GET /api/v1/billing/plans
3. POST /api/v1/billing/checkout/stripe

---

## 🔄 MODIFICHE AL FRONTEND NECESSARIE

### 1. Creare Service Client per Microservizio

```javascript
// src/services/auth/authClient.js
const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:8010';

// src/services/reports/reportsClient.js
const REPORTS_SERVICE_URL = import.meta.env.VITE_REPORTS_SERVICE_URL || 'http://localhost:8011';

// src/services/billing/billingClient.js
const BILLING_SERVICE_URL = import.meta.env.VITE_BILLING_SERVICE_URL || 'http://localhost:8012';
```

### 2. Aggiornare tutti gli import

```javascript
// Prima (v0)
import { reportsAPI, specialtiesAPI } from '../services/api';

// Dopo (v2)
import { reportsAPI } from '../services/reports/reportsClient';
import { specialtiesAPI } from '../services/reports/specialtiesClient';
```

### 3. Kong API Gateway Alternative

In produzione, tutti i servizi potrebbero essere esposti tramite Kong:
```
https://api.refertosicuro.it/auth/*     → Auth Service
https://api.refertosicuro.it/reports/*  → Reports Service
https://api.refertosicuro.it/billing/*  → Billing Service
```

---

## ✅ NEXT STEPS

1. **Implementare gli endpoint MUST HAVE** nei rispettivi microservizi
2. **Testare con Postman/Insomnia** ogni endpoint
3. **Aggiornare il frontend** con i nuovi service client
4. **Documentare con OpenAPI/Swagger** ogni servizio
5. **Implementare rate limiting** su Kong API Gateway
6. **Aggiungere monitoring** con Prometheus metrics

---

## 📝 NOTE IMPORTANTI

1. **Versionamento**: Tutti gli endpoint iniziano con `/api/v1/` per future versioni
2. **Autenticazione**: JWT in httpOnly cookies, NO Authorization header
3. **CSRF**: Token richiesto per tutte le operazioni POST/PUT/DELETE
4. **Rate Limiting**: Implementare per tier (Basic: 100/min, Pro: 300/min)
5. **Paginazione**: Usare sempre `?page=1&limit=20` dove applicabile
6. **Errori**: Rispondere sempre con `{ detail: "messaggio errore" }`
7. **Localizzazione**: Tutti i messaggi in ITALIANO

---

Ultimo aggiornamento: 21 Novembre 2024
Versione: 1.0.0