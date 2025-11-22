# Billing Service - Development Specification

## 📋 Overview

**Service Name**: Billing Service
**Port**: 8012
**Database**: PostgreSQL (Dedicated)
**Dependencies**: Redis, RabbitMQ, Stripe API ⚠️ (PayPal v2 future)

## 🎯 Responsabilità

1. **Subscription Management**

   - Gestione piani (Trial 7gg, Basic, Medium, Professional, Enterprise)
   - Create/Update/Cancel subscriptions
   - Upgrade (proration) / Downgrade (end of cycle)
   - Trial period: 7 giorni senza carta credito ⚠️

2. **Payment Processing**

   - Stripe integration (carte credito) v1 MVP
   - PayPal integration (v2 future) ❌
   - Webhook handlers (Stripe)
   - Fattura elettronica PDF + XML (IVA 22%)

3. **Quota Management**

   - Track usage referti processati
   - Enforce: Hard block default, Soft limit con overage opt-in ⚠️
   - Reset mensile (anniversary date)
   - Usage alerts (80%, 90%, 100%)

4. **Invoicing**
   - Generazione fatture PDF
   - Storico pagamenti
   - Email invio fatture

## 📁 Struttura Directory

```
services/billing/
├── app/
│   ├── main.py
│   ├── api/v2/
│   │   ├── subscriptions.py      # CRUD subscriptions
│   │   ├── payments.py           # Payment processing
│   │   ├── webhooks.py           # Stripe/PayPal webhooks
│   │   ├── invoices.py           # Invoice management
│   │   └── usage.py              # Quota tracking
│   ├── domain/
│   │   ├── subscription_manager.py
│   │   ├── payment_processor.py
│   │   └── quota_manager.py
│   ├── models/
│   │   ├── subscription_plan.py
│   │   ├── user_subscription.py
│   │   ├── payment.py
│   │   ├── invoice.py
│   │   └── usage_quota.py
│   ├── services/
│   │   ├── stripe_service.py
│   │   ├── paypal_service.py
│   │   ├── invoice_generator.py
│   │   └── quota_service.py
│   └── utils/
│       ├── pdf_generator.py
│       └── validators.py
├── tests/
├── alembic/
└── DEVELOPMENT.md
```

## 📊 Database Schema

### subscription_plans

```sql
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,     -- trial, basic, medium, professional, enterprise
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2),
    reports_quota INTEGER NOT NULL,       -- Reports per month
    specializations_limit INTEGER,        -- NULL = unlimited
    features JSONB DEFAULT '{}',          -- {"voice_input": true, "api_access": false}
    is_active BOOLEAN DEFAULT TRUE,
    stripe_price_id_monthly VARCHAR(100),
    stripe_price_id_yearly VARCHAR(100),
    paypal_plan_id_monthly VARCHAR(100),
    paypal_plan_id_yearly VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### user_subscriptions

```sql
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) NOT NULL,          -- active, canceled, past_due, trialing
    billing_cycle VARCHAR(20) NOT NULL,   -- monthly, yearly
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP,
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    stripe_subscription_id VARCHAR(100),
    stripe_customer_id VARCHAR(100),
    paypal_subscription_id VARCHAR(100),
    payment_method VARCHAR(20),           -- stripe, paypal
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)                       -- One active subscription per user
);

CREATE INDEX idx_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON user_subscriptions(status);
```

### payments

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    subscription_id UUID REFERENCES user_subscriptions(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) NOT NULL,          -- succeeded, failed, pending, refunded
    payment_method VARCHAR(20) NOT NULL,  -- stripe, paypal
    stripe_payment_intent_id VARCHAR(100),
    paypal_order_id VARCHAR(100),
    invoice_id UUID,
    failure_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
```

### invoices

```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    subscription_id UUID REFERENCES user_subscriptions(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,  -- INV-2024-001234
    amount_subtotal DECIMAL(10,2) NOT NULL,
    amount_tax DECIMAL(10,2) DEFAULT 0,
    amount_total DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) NOT NULL,          -- draft, open, paid, void
    due_date TIMESTAMP,
    paid_at TIMESTAMP,
    pdf_url TEXT,                         -- S3/MinIO URL
    stripe_invoice_id VARCHAR(100),
    items JSONB,                          -- Line items
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
```

### usage_quotas

```sql
CREATE TABLE usage_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    subscription_id UUID REFERENCES user_subscriptions(id),
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    reports_quota INTEGER NOT NULL,       -- From plan
    reports_used INTEGER DEFAULT 0,
    specializations_used JSONB DEFAULT '[]',  -- ["RAD", "CARD"]
    last_reset_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, period_start)
);

CREATE INDEX idx_quotas_user_id ON usage_quotas(user_id);
```

## 🔌 API Endpoints

### Subscription Plans

#### GET /api/v2/billing/plans

Lista piani disponibili.

**Response** (200):

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "basic",
      "display_name": "Basic",
      "price_monthly": 19.0,
      "price_yearly": 190.0,
      "reports_quota": 300,
      "specializations_limit": 1,
      "features": {
        "voice_input": false,
        "api_access": false,
        "priority_support": false
      }
    }
  ]
}
```

### User Subscriptions

#### GET /api/v2/billing/subscription

Dettagli subscription utente corrente.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "plan": {
      "name": "professional",
      "display_name": "Professional",
      "price_monthly": 99.0
    },
    "status": "active",
    "billing_cycle": "monthly",
    "current_period_start": "2024-11-01T00:00:00Z",
    "current_period_end": "2024-12-01T00:00:00Z",
    "cancel_at_period_end": false,
    "payment_method": "stripe",
    "usage": {
      "reports_used": 450,
      "reports_quota": 1500,
      "remaining": 1050
    }
  }
}
```

#### POST /api/v2/billing/subscribe

Crea nuova subscription.

**Headers**: `Authorization: Bearer <token>`

**Request**:

```json
{
  "plan_id": "uuid",
  "billing_cycle": "monthly",
  "payment_method": "stripe",
  "payment_method_id": "pm_abc123" // Stripe PaymentMethod ID
}
```

**Response** (201):

```json
{
  "success": true,
  "data": {
    "subscription_id": "uuid",
    "status": "active",
    "client_secret": "seti_abc123" // Per conferma pagamento
  }
}
```

#### PUT /api/v2/billing/subscription/upgrade

Upgrade piano.

**Headers**: `Authorization: Bearer <token>`

**Request**:

```json
{
  "new_plan_id": "uuid",
  "prorate": true // Prorate payment for current period
}
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "subscription_id": "uuid",
    "new_plan": "professional",
    "effective_date": "2024-11-21T10:00:00Z",
    "prorated_amount": 45.5
  }
}
```

#### POST /api/v2/billing/subscription/cancel

Cancella subscription.

**Headers**: `Authorization: Bearer <token>`

**Request**:

```json
{
  "cancel_immediately": false, // If false, cancels at period end
  "reason": "too_expensive"
}
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "subscription_id": "uuid",
    "status": "active",
    "cancel_at_period_end": true,
    "ends_at": "2024-12-01T00:00:00Z"
  }
}
```

### Payment Methods

#### POST /api/v2/billing/payment-methods

Aggiungi payment method.

**Headers**: `Authorization: Bearer <token>`

**Request**:

```json
{
  "type": "stripe",
  "payment_method_id": "pm_abc123"
}
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "id": "pm_abc123",
    "type": "card",
    "card": {
      "brand": "visa",
      "last4": "4242",
      "exp_month": 12,
      "exp_year": 2025
    }
  }
}
```

### Invoices

#### GET /api/v2/billing/invoices

Lista fatture utente.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):

```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": "uuid",
        "invoice_number": "INV-2024-001234",
        "amount_total": 99.0,
        "currency": "EUR",
        "status": "paid",
        "paid_at": "2024-11-01T10:00:00Z",
        "pdf_url": "https://s3.../invoice.pdf"
      }
    ],
    "pagination": {
      "page": 1,
      "total_pages": 1
    }
  }
}
```

#### GET /api/v2/billing/invoices/{id}/download

Download fattura PDF.

**Headers**: `Authorization: Bearer <token>`

**Response** (200): PDF file

### Usage & Quota

#### GET /api/v2/billing/usage

Statistiche utilizzo utente.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):

```json
{
  "success": true,
  "data": {
    "current_period": {
      "start": "2024-11-01",
      "end": "2024-12-01",
      "reports_used": 450,
      "reports_quota": 1500,
      "remaining": 1050,
      "percentage_used": 30
    },
    "by_specialty": {
      "RAD": 200,
      "CARD": 150,
      "NEUR": 100
    },
    "alerts": [
      {
        "type": "warning",
        "message": "You've used 80% of your monthly quota"
      }
    ]
  }
}
```

#### POST /api/v2/billing/usage/increment (Internal)

Incrementa usage (chiamato da Reports Service).

**Headers**: `X-Service-Token: <service_token>`

**Request**:

```json
{
  "user_id": "uuid",
  "specialty": "RAD",
  "count": 1
}
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "reports_used": 451,
    "reports_quota": 1500,
    "can_process": true
  }
}
```

### Webhooks

#### POST /api/v2/billing/webhooks/stripe

Stripe webhook handler.

**Headers**: `Stripe-Signature: <signature>`

**Events Handled**:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `payment_intent.succeeded`

#### POST /api/v2/billing/webhooks/paypal

PayPal webhook handler.

**Events Handled**:

- `BILLING.SUBSCRIPTION.CREATED`
- `BILLING.SUBSCRIPTION.CANCELLED`
- `PAYMENT.SALE.COMPLETED`

## 📤 Events Pubblicati (RabbitMQ)

### subscription.created

```json
{
  "event_type": "subscription.created",
  "payload": {
    "user_id": "uuid",
    "plan": "professional",
    "billing_cycle": "monthly",
    "trial_end": "2024-11-28T00:00:00Z"
  }
}
```

### subscription.cancelled

```json
{
  "event_type": "subscription.cancelled",
  "payload": {
    "user_id": "uuid",
    "plan": "professional",
    "reason": "user_request",
    "ends_at": "2024-12-01T00:00:00Z"
  }
}
```

### payment.successful

```json
{
  "event_type": "payment.successful",
  "payload": {
    "user_id": "uuid",
    "amount": 99.0,
    "currency": "EUR",
    "payment_method": "stripe",
    "invoice_id": "uuid"
  }
}
```

### quota.warning

```json
{
  "event_type": "quota.warning",
  "payload": {
    "user_id": "uuid",
    "percentage_used": 80,
    "reports_remaining": 300
  }
}
```

**Consumatori**: Notification Service (alert email)

## 🚀 Development Tasks

### Phase 1: Core Subscription (Priority: HIGH)

- [ ] Setup models + migrations
- [ ] Seed subscription plans
- [ ] Implement GET /plans endpoint
- [ ] Implement GET /subscription endpoint
- [ ] Implement quota check logic
- [ ] Tests subscription CRUD

### Phase 2: Stripe Integration (Priority: HIGH)

- [ ] Stripe service wrapper
- [ ] POST /subscribe con Stripe
- [ ] Webhook handler
- [ ] Payment intent flow
- [ ] Tests Stripe integration (mocked)

### Phase 3: Quota Management (Priority: HIGH)

- [ ] Usage tracking logic
- [ ] Increment endpoint per Reports Service
- [ ] Monthly reset job
- [ ] Quota exceeded enforcement
- [ ] Tests quota tracking

### Phase 4: PayPal Integration (Priority: MEDIUM)

- [ ] PayPal service wrapper
- [ ] PayPal subscription flow
- [ ] PayPal webhooks
- [ ] Tests PayPal integration

### Phase 5: Invoicing (Priority: MEDIUM)

- [ ] Invoice generation logic
- [ ] PDF generation con ReportLab
- [ ] S3/MinIO storage
- [ ] Email delivery integration
- [ ] Tests invoice generation

---

**Status**: ✅ Ready for Development
**Assigned Agent**: TBD
**Estimated Time**: 4-5 giorni
**Dependencies**: Auth Service, Reports Service (usage tracking)

---

## ⚠️ DECISIONI APPROVATE (2024-11-22)

### Trial Period

- **Durata**: 7 giorni
- **NO carta credito richiesta**
- **Auto-convert**: Manual upgrade (no auto-billing)
- **Scadenza**: Account suspended (read-only)
- Warnings: 3 giorni e 1 giorno prima scadenza

### Subscription Plans

- Trial: 0€, 20 referti, tutte specialità
- Basic: ~19€/mese, 300 referti, 1 specialità
- Medium: ~49€/mese, 800 referti, 3 specialità, voice
- Professional: ~99€/mese, 1500 referti, unlimited, voice+API+templates
- Enterprise: Custom pricing

### Quota Enforcement

- **Default**: Hard block a 100%
- **Overage**: Opt-in user-configurable (~1€/referto extra)
- **Warnings**: Email + UI a 80%, 90%, 100%
- **Reset**: Anniversary date (es. subscribed 15th → reset 15 ogni mese)

### Payment Methods (v1)

- **Stripe only** (v1 MVP)
- PayPal postponed to v2
- Fattura elettronica: PDF + XML (IVA 22%)

### Upgrade/Downgrade

- **Upgrade mid-cycle**: Proration (credita giorni non usati)
- **Downgrade mid-cycle**: Effective next cycle

### Testing

- **Coverage minimum**: 90% (medical-grade)
- Stripe webhooks mocking
- Load testing per 100-1000 utenti

### Reference

- See [REQUIREMENTS_DECISIONS.md](../../REQUIREMENTS_DECISIONS.md)

**Status**: ✅ Ready for Development
**Estimated Time**: 4 giorni
**Dependencies**: Auth Service
