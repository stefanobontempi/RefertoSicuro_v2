# API Specification v2 - RefertoSicuro

## 🎯 Endpoint Completi per Microservizi

Questa è la specifica **definitiva e implementabile** di tutti gli endpoint necessari per il frontend.

---

## AUTH SERVICE (Porta 8010)

### Authentication
| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/v1/auth/login` | Login utente | `{email, password, sub_account_id?}` | `{access_token, refresh_token, user}` |
| POST | `/api/v1/auth/logout` | Logout utente | - | `{message}` |
| POST | `/api/v1/auth/refresh` | Refresh token | `{refresh_token}` | `{access_token, refresh_token}` |
| GET | `/api/v1/auth/csrf-token` | Ottieni CSRF token | - | `{csrf_token, expires_at}` |
| GET | `/api/v1/auth/verify` | Verifica token validità | - | `{valid, user_id}` |

### Registration Flow (B2C)
| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/v1/auth/register/verify-email` | Step 1: Invia email verifica | `{email, terms_accepted, fnomceo_data?}` | `{message}` |
| POST | `/api/v1/auth/register/confirm-email` | Step 2: Conferma email | `{token, email}` | `{verified, temp_token}` |
| POST | `/api/v1/auth/register/complete` | Step 3: Completa registrazione | `{temp_token, password, full_name, phone, vat_number, company_name, billing_address, stripe_token, selected_plan}` | `{user_id, auto_login}` |

### Registration (Standard)
| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/v1/auth/register` | Registrazione diretta | `{email, password, full_name, phone}` | `{user_id, message}` |

### Password Reset
| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/v1/auth/forgot-password` | Richiedi reset password | `{email}` | `{message}` |
| POST | `/api/v1/auth/reset-password` | Reset password con token | `{token, new_password}` | `{message}` |

### User Profile
| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/v1/users/me` | Ottieni profilo corrente | - | `{id, email, full_name, roles, subscription, organization}` |
| PUT | `/api/v1/users/profile` | Aggiorna profilo | `{full_name, phone, vat_number, company_name}` | `{user}` |
| POST | `/api/v1/users/change-password` | Cambia password | `{current_password, new_password}` | `{message}` |
| DELETE | `/api/v1/users/me` | Elimina account (GDPR) | - | `{scheduled_deletion}` |

### Sessions
| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/v1/sessions` | Lista sessioni attive | - | `[{id, device, ip, last_activity, current}]` |
| DELETE | `/api/v1/sessions/{id}` | Revoca sessione | - | `{message}` |
| DELETE | `/api/v1/sessions/all` | Revoca tutte le sessioni | - | `{message}` |

### Consent (GDPR)
| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/v1/consent/templates` | Lista template consent | - | `[{type, version, text}]` |
| GET | `/api/v1/consent/templates/{type}` | Ottieni template | - | `{type, version, text}` |
| POST | `/api/v1/consent/accept` | Accetta consent | `{type, version, accepted}` | `{saved}` |
| GET | `/api/v1/consent/user` | Consent utente | - | `[{type, version, accepted_at}]` |
| POST | `/api/v1/consent/withdraw` | Ritira consent | `{type}` | `{withdrawn}` |

### Health
| Method | Endpoint | Descrizione | Response |
|--------|----------|-------------|----------|
| GET | `/health` | Health check | `{status, database}` |
| GET | `/ready` | Readiness probe | `{ready, checks}` |
| GET | `/metrics` | Prometheus metrics | Metrics format |

---

## REPORTS SERVICE (Porta 8011)

### Report Processing
| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/v1/reports/validate` | Valida referto | `{content, specialty_id}` | `{is_valid, issues}` |
| POST | `/api/v1/reports/improve` | Migliora referto | `{content, specialty_id, assistant_id?}` | `{original_text, improved_text, suggestions, tokens_used, processing_time_ms}` |
| POST | `/api/v1/reports/improve-streaming` | Migliora (JSON stream) | `{content, specialty_id, assistant_id?}` | JSON stream |
| POST | `/api/v1/reports/improve-sse` | Migliora (SSE) | `{content, report_type, assistant_id?}` | SSE events |
| POST | `/api/v1/reports/suggestions` | Ottieni suggerimenti | `{content, specialty_id}` | `{suggestions}` |
| POST | `/api/v1/reports/transcribe` | Trascrivi audio | `FormData{audio_file}` | `{text, duration_seconds, confidence}` |

### Report Management
| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/v1/reports` | Lista referti utente | `?page&limit&specialty_id` | `{reports, total, pages}` |
| GET | `/api/v1/reports/{id}` | Ottieni referto | - | `{id, content, improved_text, created_at}` |
| DELETE | `/api/v1/reports/{id}` | Elimina referto | - | `{message}` |
| GET | `/api/v1/reports/{id}/export` | Esporta referto | `?format=pdf\|docx\|txt` | File |
| POST | `/api/v1/reports/{id}/feedback` | Invia feedback | `{rating, comment?}` | `{message}` |

### Specialties
| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/v1/specialties` | Lista specialità | - | `[{id, code, name, assistant_id, is_active, icon_url}]` |
| GET | `/api/v1/specialties/{id}` | Dettaglio specialità | - | `{id, code, name, description, templates}` |
| GET | `/api/v1/specialties/user` | Specialità utente | - | `[{specialty_id, enabled, custom_settings}]` |
| PUT | `/api/v1/specialties/user/{id}` | Aggiorna settings | `{enabled, custom_settings}` | `{updated}` |
| GET | `/api/v1/specialties/assistants` | Assistenti utente | - | `[{id, name, model, specialty_id}]` |

### Templates
| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/v1/templates` | Lista template | `?specialty_id&is_active` | `[{id, name, content, specialty_id, is_active}]` |
| GET | `/api/v1/templates/{id}` | Ottieni template | - | `{id, name, content}` |
| POST | `/api/v1/templates` | Crea template | `{name, content, specialty_id}` | `{id}` |
| PUT | `/api/v1/templates/{id}` | Aggiorna template | `{name, content, is_active}` | `{updated}` |
| DELETE | `/api/v1/templates/{id}` | Elimina template | - | `{deleted}` |
| PATCH | `/api/v1/templates/{id}/toggle` | Toggle attivo | - | `{is_active}` |
| POST | `/api/v1/templates/{id}/duplicate` | Duplica template | - | `{new_id}` |
| GET | `/api/v1/templates/by-specialty` | Template per specialità | - | `{RAD: [], CARD: []}` |
| GET | `/api/v1/templates/stats` | Statistiche template | - | `{total, by_specialty, most_used}` |

### Health
| Method | Endpoint | Descrizione | Response |
|--------|----------|-------------|----------|
| GET | `/health` | Health check | `{status}` |
| GET | `/ready` | Readiness probe | `{ready}` |
| GET | `/metrics` | Prometheus metrics | Metrics |

---

## BILLING SERVICE (Porta 8012)

### Subscription
| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/v1/billing/subscription` | Info abbonamento | - | `{plan, status, current_period_start, current_period_end, usage}` |
| POST | `/api/v1/billing/subscription/cancel` | Cancella abbonamento | - | `{cancel_at_period_end}` |
| POST | `/api/v1/billing/subscription/reactivate` | Riattiva abbonamento | - | `{status}` |
| POST | `/api/v1/billing/subscription/change-plan` | Cambia piano | `{new_plan_id}` | `{message}` |

### Plans
| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/v1/billing/plans` | Lista piani | - | `[{id, name, monthly_price, yearly_price, features, report_quota}]` |
| GET | `/api/v1/billing/plans/{id}` | Dettaglio piano | - | `{id, name, prices, features}` |

### Checkout
| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/v1/billing/checkout/stripe` | Crea sessione Stripe | `{plan_id, billing_cycle}` | `{checkout_url, session_id}` |
| POST | `/api/v1/billing/checkout/paypal` | Crea ordine PayPal | `{plan_id, billing_cycle}` | `{order_id, approve_url}` |
| POST | `/api/v1/billing/payment/confirm` | Conferma pagamento | `{payment_intent_id, payment_method}` | `{success, subscription_id}` |

### Invoices
| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/v1/billing/invoices` | Lista fatture | - | `[{id, number, date, amount, status, pdf_url}]` |
| GET | `/api/v1/billing/invoices/{id}` | Dettaglio fattura | - | `{id, number, line_items, total}` |
| GET | `/api/v1/billing/invoices/{id}/download` | Scarica fattura | - | PDF file |

### Webhooks (Backend only)
| Method | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/v1/billing/webhooks/stripe` | Webhook Stripe |
| POST | `/api/v1/billing/webhooks/paypal` | Webhook PayPal |

### Health
| Method | Endpoint | Descrizione | Response |
|--------|----------|-------------|----------|
| GET | `/health` | Health check | `{status}` |
| GET | `/ready` | Readiness probe | `{ready}` |
| GET | `/metrics` | Prometheus metrics | Metrics |

---

## ADMIN SERVICE (Porta 8013)

### Dashboard
| Method | Endpoint | Descrizione | Response |
|--------|----------|-------------|----------|
| GET | `/api/v1/admin/dashboard` | Statistiche dashboard | `{users_total, users_active, revenue_month, reports_processed}` |

### User Management
| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/v1/admin/users` | Lista utenti | `?page&search&role` | `{users, total}` |
| GET | `/api/v1/admin/users/{id}` | Dettaglio utente | - | `{user}` |
| PUT | `/api/v1/admin/users/{id}` | Aggiorna utente | `{is_active, roles, subscription_override}` | `{updated}` |
| POST | `/api/v1/admin/users/{id}/impersonate` | Impersona utente | - | `{temp_token}` |

### System
| Method | Endpoint | Descrizione | Response |
|--------|----------|-------------|----------|
| GET | `/api/v1/admin/logs` | Log sistema | `{logs}` |
| GET | `/api/v1/admin/analytics/reports` | Analytics report | `{data}` |

### Health
| Method | Endpoint | Descrizione | Response |
|--------|----------|-------------|----------|
| GET | `/health` | Health check | `{status}` |
| GET | `/ready` | Readiness probe | `{ready}` |
| GET | `/metrics` | Prometheus metrics | Metrics |

---

## ANALYTICS SERVICE (Porta 8014)

| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/v1/analytics/user/metrics` | Metriche utente | - | `{reports_total, reports_month, avg_processing_time}` |
| POST | `/api/v1/analytics/events` | Traccia evento | `{event_type, metadata}` | `{recorded}` |
| GET | `/api/v1/analytics/export` | Esporta analytics | `?format&period` | File |
| GET | `/health` | Health check | - | `{status}` |
| GET | `/ready` | Readiness probe | - | `{ready}` |
| GET | `/metrics` | Prometheus metrics | - | Metrics |

---

## NOTIFICATION SERVICE (Porta 8015)

| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/v1/notifications/email` | Invia email | `{to, template, variables}` | `{sent}` |
| POST | `/api/v1/notifications/sms` | Invia SMS | `{to, message}` | `{sent}` |
| GET | `/api/v1/notifications/preferences` | Ottieni preferenze | - | `{email_reports, email_marketing, sms_alerts}` |
| PUT | `/api/v1/notifications/preferences` | Aggiorna preferenze | `{email_reports, email_marketing, sms_alerts}` | `{updated}` |
| POST | `/api/v1/notifications/unsubscribe` | Disiscriviti | `{token, type}` | `{unsubscribed}` |
| GET | `/health` | Health check | - | `{status}` |
| GET | `/ready` | Readiness probe | - | `{ready}` |
| GET | `/metrics` | Prometheus metrics | - | Metrics |

---

## FEATURES/PLATFORM (Parte di Auth o Admin)

| Method | Endpoint | Descrizione | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/v1/features/public` | Feature pubbliche | `?tier_id&category` | `{features}` |
| GET | `/api/v1/features/user` | Feature utente | - | `{tier, features}` |

---

## 📊 RIEPILOGO TOTALE

| Microservizio | Endpoints | Porta |
|---------------|-----------|-------|
| Auth Service | 25 | 8010 |
| Reports Service | 32 | 8011 |
| Billing Service | 16 | 8012 |
| Admin Service | 9 | 8013 |
| Analytics Service | 6 | 8014 |
| Notification Service | 8 | 8015 |
| **TOTALE** | **96** | |

---

## 🚀 PRIORITÀ IMPLEMENTAZIONE

### FASE 1: MVP (Endpoints Essenziali)
**Auth Service (7 endpoints)**
- POST `/api/v1/auth/login`
- POST `/api/v1/auth/logout`
- GET `/api/v1/auth/csrf-token`
- GET `/api/v1/users/me`
- POST `/api/v1/auth/register/verify-email`
- POST `/api/v1/auth/register/confirm-email`
- POST `/api/v1/auth/register/complete`

**Reports Service (5 endpoints)**
- POST `/api/v1/reports/improve`
- POST `/api/v1/reports/improve-sse`
- GET `/api/v1/specialties`
- GET `/api/v1/templates`
- POST `/api/v1/templates`

**Billing Service (3 endpoints)**
- GET `/api/v1/billing/subscription`
- GET `/api/v1/billing/plans`
- POST `/api/v1/billing/checkout/stripe`

### FASE 2: Completamento Core (Endpoints Importanti)
- Tutti gli endpoint di User Profile
- Report Management completo
- Templates CRUD completo
- Invoices
- Password Reset

### FASE 3: Features Avanzate
- Admin Service completo
- Analytics Service
- Notification Service
- Sessions management
- Consent management

---

## 🔧 CONFIGURAZIONE FRONTEND

### Environment Variables (.env.development)
```env
VITE_AUTH_SERVICE_URL=http://localhost:8010
VITE_REPORTS_SERVICE_URL=http://localhost:8011
VITE_BILLING_SERVICE_URL=http://localhost:8012
VITE_ADMIN_SERVICE_URL=http://localhost:8013
VITE_ANALYTICS_SERVICE_URL=http://localhost:8014
VITE_NOTIFICATION_SERVICE_URL=http://localhost:8015
```

### Environment Variables (.env.production)
```env
# Con Kong API Gateway
VITE_API_GATEWAY_URL=https://api.refertosicuro.it

# O direttamente ai servizi
VITE_AUTH_SERVICE_URL=https://auth.refertosicuro.it
VITE_REPORTS_SERVICE_URL=https://reports.refertosicuro.it
VITE_BILLING_SERVICE_URL=https://billing.refertosicuro.it
```

---

## ⚠️ NOTE IMPORTANTI

1. **Autenticazione**: Tutti gli endpoint (tranne health e public) richiedono JWT in httpOnly cookies
2. **CSRF Protection**: Token richiesto per POST, PUT, DELETE, PATCH
3. **Rate Limiting**: Implementare per tier utente
4. **Paginazione**: Standard `?page=1&limit=20`
5. **Errori**: Formato standard `{detail: "messaggio errore"}`
6. **Timestamp**: Sempre in formato ISO 8601 UTC
7. **IDs**: Sempre UUID v4
8. **Localizzazione**: Tutti i messaggi in ITALIANO

---

Versione: 2.0.0
Data: 21 Novembre 2024