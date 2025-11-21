# 📋 Lista Completa 96 Endpoint API v2

## 🔐 AUTH SERVICE (25 endpoint)
```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/csrf-token
GET    /api/v1/auth/verify
POST   /api/v1/auth/register/verify-email
POST   /api/v1/auth/register/confirm-email
POST   /api/v1/auth/register/complete
POST   /api/v1/auth/register
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/users/me
PUT    /api/v1/users/profile
POST   /api/v1/users/change-password
DELETE /api/v1/users/me
GET    /api/v1/sessions
DELETE /api/v1/sessions/{id}
DELETE /api/v1/sessions/all
GET    /api/v1/consent/templates
GET    /api/v1/consent/templates/{type}
POST   /api/v1/consent/accept
GET    /api/v1/consent/user
POST   /api/v1/consent/withdraw
GET    /health
GET    /ready
GET    /metrics
```

## 📝 REPORTS SERVICE (32 endpoint)
```
POST   /api/v1/reports/validate
POST   /api/v1/reports/improve
POST   /api/v1/reports/improve-streaming
POST   /api/v1/reports/improve-sse
POST   /api/v1/reports/suggestions
POST   /api/v1/reports/transcribe
GET    /api/v1/reports
GET    /api/v1/reports/{id}
DELETE /api/v1/reports/{id}
GET    /api/v1/reports/{id}/export
POST   /api/v1/reports/{id}/feedback
GET    /api/v1/specialties
GET    /api/v1/specialties/{id}
GET    /api/v1/specialties/user
PUT    /api/v1/specialties/user/{id}
GET    /api/v1/specialties/assistants
GET    /api/v1/templates
GET    /api/v1/templates/{id}
POST   /api/v1/templates
PUT    /api/v1/templates/{id}
DELETE /api/v1/templates/{id}
PATCH  /api/v1/templates/{id}/toggle
POST   /api/v1/templates/{id}/duplicate
GET    /api/v1/templates/by-specialty
GET    /api/v1/templates/stats
GET    /health
GET    /ready
GET    /metrics
```

## 💳 BILLING SERVICE (16 endpoint)
```
GET    /api/v1/billing/subscription
POST   /api/v1/billing/subscription/cancel
POST   /api/v1/billing/subscription/reactivate
POST   /api/v1/billing/subscription/change-plan
GET    /api/v1/billing/plans
GET    /api/v1/billing/plans/{id}
POST   /api/v1/billing/checkout/stripe
POST   /api/v1/billing/checkout/paypal
POST   /api/v1/billing/payment/confirm
GET    /api/v1/billing/invoices
GET    /api/v1/billing/invoices/{id}
GET    /api/v1/billing/invoices/{id}/download
POST   /api/v1/billing/webhooks/stripe
POST   /api/v1/billing/webhooks/paypal
GET    /health
GET    /ready
GET    /metrics
```

## 👨‍💼 ADMIN SERVICE (9 endpoint)
```
GET    /api/v1/admin/dashboard
GET    /api/v1/admin/users
GET    /api/v1/admin/users/{id}
PUT    /api/v1/admin/users/{id}
POST   /api/v1/admin/users/{id}/impersonate
GET    /api/v1/admin/logs
GET    /api/v1/admin/analytics/reports
GET    /health
GET    /ready
GET    /metrics
```

## 📊 ANALYTICS SERVICE (6 endpoint)
```
GET    /api/v1/analytics/user/metrics
POST   /api/v1/analytics/events
GET    /api/v1/analytics/export
GET    /health
GET    /ready
GET    /metrics
```

## 📧 NOTIFICATION SERVICE (8 endpoint)
```
POST   /api/v1/notifications/email
POST   /api/v1/notifications/sms
GET    /api/v1/notifications/preferences
PUT    /api/v1/notifications/preferences
POST   /api/v1/notifications/unsubscribe
GET    /health
GET    /ready
GET    /metrics
```

## 🎯 FEATURES (2 endpoint - parte di Auth/Admin)
```
GET    /api/v1/features/public
GET    /api/v1/features/user
```

---

## 📊 RIEPILOGO TOTALE: 96 ENDPOINT

| Servizio | Endpoint | Porta |
|----------|----------|-------|
| Auth | 25 | 8010 |
| Reports | 32 | 8011 |
| Billing | 16 | 8012 |
| Admin | 9 | 8013 |
| Analytics | 6 | 8014 |
| Notification | 8 | 8015 |
| **TOTALE** | **96** | |

---

## ✅ STATO IMPLEMENTAZIONE FRONTEND

### Implementati (44 endpoint)
- Auth: 10/25
- Reports: 15/32
- Billing: 6/16
- Templates: 9 (inclusi in Reports)
- Features: 2/2
- Consent: 2 (inclusi in Auth)

### Da Implementare (52 endpoint)
- Sessions management (3)
- Report management completo (5)
- Admin (tutti i 9)
- Analytics (tutti i 6)
- Notification (tutti gli 8)
- Health/Ready/Metrics per ogni servizio (18)
- Altri endpoint mancanti