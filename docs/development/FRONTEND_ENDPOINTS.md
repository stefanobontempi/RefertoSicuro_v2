# 📋 Frontend API Endpoints

## 🔐 AUTH SERVICE
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/verify
GET    /api/v1/auth/csrf-token
POST   /api/v1/auth/register/verify-email
POST   /api/v1/auth/register/confirm-email
POST   /api/v1/auth/register/complete
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
```

## 👤 USER SERVICE
```
GET    /api/v1/users/me
GET    /api/v1/users/profile
PUT    /api/v1/users/profile
POST   /api/v1/users/change-password
```

## 📝 REPORTS SERVICE
```
POST   /api/v1/reports/validate
POST   /api/v1/reports/improve
POST   /api/v1/reports/improve-streaming
POST   /api/v1/reports/improve-streaming-sse
POST   /api/v1/reports/suggestions
POST   /api/v1/reports/transcribe
GET    /api/v1/reports/health
```

## 🏥 SPECIALTIES SERVICE
```
GET    /api/v1/specialties
GET    /api/v1/specialties/{id}
GET    /api/v1/specialties/user
GET    /api/v1/specialties/user/me
GET    /api/v1/specialties/user/me/assistants
GET    /api/v1/specialties/assistants
```

## 📄 TEMPLATES SERVICE
```
GET    /api/v1/templates
GET    /api/v1/templates/{id}
POST   /api/v1/templates
PUT    /api/v1/templates/{id}
DELETE /api/v1/templates/{id}
PATCH  /api/v1/templates/{id}/toggle
POST   /api/v1/templates/{id}/duplicate
GET    /api/v1/templates/by-specialty
GET    /api/v1/templates/stats
```

## 💳 BILLING SERVICE
```
GET    /api/v1/billing/subscription
POST   /api/v1/billing/subscription/cancel
GET    /api/v1/billing/invoices
GET    /api/v1/billing/plans
POST   /api/v1/billing/checkout/stripe
POST   /api/v1/billing/checkout/paypal
```

## ✅ CONSENT SERVICE
```
GET    /api/v1/consent/templates
GET    /api/v1/consent/templates/{consentType}
```

## 🎯 FEATURES SERVICE
```
GET    /api/v1/features/public
GET    /api/v1/features/user
```

## ℹ️ GENERAL
```
GET    /api/v1/info
GET    /health
```

---
**Total: 44 endpoints**