# Notification Service - Development Specification

## 📋 Overview

**Service Name**: Notification Service
**Port**: 8015
**Database**: PostgreSQL (Dedicated)
**Dependencies**: Redis, RabbitMQ, SMTP, Twilio (SMS), FCM (Push)

## 🎯 Responsabilità

1. **Email Notifications**

   - Welcome emails
   - Password reset
   - Payment confirmations
   - Quota alerts
   - Template management

2. **SMS Notifications (Optional)**

   - 2FA codes
   - Critical alerts
   - Twilio integration

3. **Push Notifications (Future)**

   - Mobile app notifications
   - FCM integration

4. **Notification Queue**
   - Async sending
   - Retry logic
   - Delivery tracking

## 📊 Database Schema

### notification_templates

```sql
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL,  -- email, sms, push
    subject VARCHAR(200),
    body_html TEXT,
    body_text TEXT,
    variables JSONB,  -- ["user_name", "verification_link"]
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### notification_queue

```sql
CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES notification_templates(id),
    variables JSONB,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, sent, failed
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔌 API Endpoints

#### POST /api/v2/notifications/send (Internal)

Invia notifica.

**Request**:

```json
{
  "type": "email",
  "recipient": "user@example.com",
  "template": "welcome_email",
  "variables": {
    "user_name": "Mario",
    "verification_link": "https://..."
  }
}
```

## 📤 Events Consumati

- `user.registered` → Welcome email
- `subscription.created` → Confirmation email
- `payment.successful` → Receipt email
- `quota.warning` → Alert email

---

**Status**: ✅ Ready for Development
**Dependencies**: Tutti i servizi (event consumers)

---

## ⚠️ DECISIONI APPROVATE (2024-11-22)

### Email Templates (v1 MVP)

16 templates in italiano:

- welcome_email, email_verification, password_reset
- password_changed_alert
- trial_started, trial_ending_3days, trial_ending_1day, trial_expired
- payment_successful, payment_failed
- subscription_cancelled
- quota_warning_80, quota_warning_90, quota_exceeded
- invoice_receipt, gdpr_export_ready

### Email Provider

- **Development**: MailHog (già configurato)
- **Production**: TBD (SendGrid, Mailgun, SES)

### SMS & Push

- **SMS**: NO in v1 (v2 future per 2FA codes)
- **Push**: NO in v1 (v2 per mobile app)

### Event-Driven

Consuma eventi:

- user.registered → welcome email
- subscription.\* → conferme/alerts
- payment.\* → receipts
- quota.\* → warnings
- gdpr.export_ready → download link

### Testing

- **Coverage**: 90%
- Template rendering tests
- SMTP mock tests
- Event consumer tests

**Status**: ✅ Ready for Development
**Time**: 3 giorni
**Dependencies**: Auth (events), Billing (events)
