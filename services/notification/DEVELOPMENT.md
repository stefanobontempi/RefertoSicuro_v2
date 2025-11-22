# Notification Service - Development Specification

## 📋 Overview

**Service Name**: Notification Service
**Port**: 8015
**Database**: PostgreSQL (Dedicated)
**Dependencies**: Redis, RabbitMQ, SMTP (MailHog/SendGrid), Twilio (SMS - v2), FCM (Push - v2)
**Status**: ⚠️ Ready for Development
**Priority**: 🔴 HIGH (Auth Service events need consumer)
**Estimated Time**: 21 hours (3 days)

## 🏗️ Architecture & Event Flow

### Event-Driven Consumer Architecture

```
┌─────────────────┐
│  Auth Service   │
│  (Port 8010)    │
└────────┬────────┘
         │ Publish events
         ▼
┌─────────────────────────────┐
│  RabbitMQ                   │
│  Exchange: refertosicuro.   │
│           events (topic)    │
└────────┬────────────────────┘
         │ Route by event_type
         ▼
┌─────────────────────────────┐
│  Notification Service       │
│  - Consumer binding         │
│  - Template rendering       │
│  - SMTP delivery            │
│  - Retry & DLQ handling     │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  MailHog (dev) / SendGrid   │
│  SMTP Server                │
└─────────────────────────────┘
```

### Event Payload Structure (Standardized)

```json
{
  "event_type": "user.registered",
  "timestamp": "2025-11-22T14:30:00.000Z",
  "correlation_id": "uuid-v4",
  "source_service": "auth-service",
  "payload": {
    "user_id": "uuid",
    "email": "user@example.com",
    "full_name": "User Name",
    "verification_token": "abc123..."
  },
  "metadata": {
    "service_version": "2.0.0",
    "environment": "development"
  }
}
```

### Retry & Dead Letter Queue Strategy

```yaml
Retry Policy:
  max_attempts: 3
  backoff: exponential (1s, 5s, 30s)

Dead Letter Queue:
  exchange: refertosicuro.dlx
  queue: notification.failed
  retention: 7 days

Error Handling:
  - SMTP timeout: retry with backoff
  - Invalid template: log + skip (critical error)
  - Invalid recipient: log + skip
  - Template rendering error: log + DLQ
```

## 🎯 Responsabilità

### 1. Email Notifications (v1 MVP)

- Welcome emails con email verification link
- Password reset emails con token
- Security alerts (password changed, 2FA enabled)
- Subscription lifecycle (trial start/end, payment confirmations)
- Quota alerts (80%, 90%, exceeded)
- GDPR export ready notifications
- Invoice receipts

### 2. RabbitMQ Event Consumer

- Connect to `refertosicuro.events` exchange
- Bind to routing keys: `user.*`, `subscription.*`, `payment.*`, `quota.*`, `gdpr.*`
- Process events asynchronously
- Queue management with retry logic
- Dead letter handling

### 3. Template Management

- Jinja2 template rendering
- Variables interpolation
- HTML + plain text versions
- Template validation
- Locale support (Italian primary)

### 4. Delivery Tracking

- Log all delivery attempts
- Track success/failure rates
- Retry failed deliveries
- Unsubscribe management

### 5. SMS Notifications (v2 - Future)

- 2FA codes via Twilio
- Critical alerts
- (Not implemented in v1)

### 6. Push Notifications (v2 - Future)

- Mobile app notifications via FCM
- (Not implemented in v1)

## 📊 Database Schema

### notification_templates

```sql
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL,  -- email, sms, push
    subject VARCHAR(200),
    body_html TEXT NOT NULL,
    body_text TEXT NOT NULL,
    variables JSONB NOT NULL,  -- ["user_name", "verification_link", ...]
    locale VARCHAR(5) DEFAULT 'it',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_name ON notification_templates(name);
CREATE INDEX idx_templates_type_active ON notification_templates(type, is_active);
```

### notification_queue

```sql
CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL,  -- email, sms, push
    recipient VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES notification_templates(id),
    variables JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, sent, failed, retry
    priority INTEGER DEFAULT 5,  -- 1 (highest) to 10 (lowest)
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_queue_status_scheduled ON notification_queue(status, scheduled_at);
CREATE INDEX idx_queue_recipient ON notification_queue(recipient);
CREATE INDEX idx_queue_created ON notification_queue(created_at);
```

### delivery_log

```sql
CREATE TABLE delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notification_queue(id),
    event_type VARCHAR(100) NOT NULL,
    correlation_id UUID,
    recipient VARCHAR(255) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,  -- sent, failed, bounced
    smtp_response TEXT,
    error_message TEXT,
    delivered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_event_type ON delivery_log(event_type);
CREATE INDEX idx_delivery_status ON delivery_log(status);
CREATE INDEX idx_delivery_correlation ON delivery_log(correlation_id);
```

### unsubscribe_list

```sql
CREATE TABLE unsubscribe_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    notification_type VARCHAR(50),  -- all, marketing, transactional
    reason TEXT,
    unsubscribed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_unsubscribe_email ON unsubscribe_list(email);
```

## 📧 Email Templates & Variables

### Template Mapping (16 Templates)

| Event Type                 | Template Name            | Variables                                                |
| -------------------------- | ------------------------ | -------------------------------------------------------- |
| `user.registered`          | `welcome_email`          | `user_name`, `verification_link`                         |
| `user.registered`          | `email_verification`     | `user_name`, `verification_token`, `verification_link`   |
| `password_reset.requested` | `password_reset`         | `user_name`, `reset_token`, `reset_link`, `expires_in`   |
| `user.password_changed`    | `password_changed_alert` | `user_name`, `change_timestamp`, `ip_address`            |
| `user.2fa_enabled`         | `2fa_enabled`            | `user_name`, `enabled_at`                                |
| `subscription.created`     | `trial_started`          | `user_name`, `plan_name`, `trial_end_date`               |
| `trial.ending`             | `trial_ending_3days`     | `user_name`, `days_remaining`, `upgrade_link`            |
| `trial.ending`             | `trial_ending_1day`      | `user_name`, `upgrade_link`                              |
| `subscription.expired`     | `trial_expired`          | `user_name`, `subscribe_link`                            |
| `payment.successful`       | `payment_successful`     | `user_name`, `amount`, `currency`, `invoice_url`         |
| `payment.failed`           | `payment_failed`         | `user_name`, `amount`, `retry_url`, `reason`             |
| `subscription.cancelled`   | `subscription_cancelled` | `user_name`, `plan_name`, `cancelled_at`, `access_until` |
| `quota.warning`            | `quota_warning_80`       | `user_name`, `used`, `total`, `percentage`               |
| `quota.warning`            | `quota_warning_90`       | `user_name`, `used`, `total`, `percentage`               |
| `quota.exceeded`           | `quota_exceeded`         | `user_name`, `upgrade_link`                              |
| `invoice.created`          | `invoice_receipt`        | `user_name`, `invoice_number`, `amount`, `download_link` |
| `gdpr.export_ready`        | `gdpr_export_ready`      | `user_name`, `download_link`, `expires_at`               |

### Template Structure (Example: welcome_email)

```html
<!-- templates/welcome_email.html -->
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Benvenuto su RefertoSicuro</title>
  </head>
  <body>
    <h1>Benvenuto {{ user_name }}!</h1>
    <p>Grazie per esserti registrato su RefertoSicuro.</p>
    <p>
      Per completare la registrazione, verifica il tuo indirizzo email cliccando
      sul link:
    </p>
    <a href="{{ verification_link }}">Verifica Email</a>
    <p>Il link scadrà tra 24 ore.</p>
  </body>
</html>
```

```text
<!-- templates/welcome_email.txt -->
Benvenuto {{ user_name }}!

Grazie per esserti registrato su RefertoSicuro.

Per completare la registrazione, verifica il tuo indirizzo email:
{{ verification_link }}

Il link scadrà tra 24 ore.
```

## 🔌 API Endpoints

### Internal Endpoints

#### POST /api/v1/notifications/send (Internal Only)

Enqueue notification for sending.

**Request**:

```json
{
  "type": "email",
  "recipient": "user@example.com",
  "template": "welcome_email",
  "variables": {
    "user_name": "Mario Rossi",
    "verification_link": "https://refertosicuro.it/verify/abc123"
  },
  "priority": 5,
  "scheduled_at": "2025-11-22T15:00:00Z"
}
```

**Response**:

```json
{
  "notification_id": "uuid",
  "status": "queued",
  "scheduled_at": "2025-11-22T15:00:00Z"
}
```

#### GET /api/v1/notifications/{notification_id}/status

Get notification delivery status.

**Response**:

```json
{
  "notification_id": "uuid",
  "status": "sent",
  "sent_at": "2025-11-22T15:00:05Z",
  "attempts": 1
}
```

### Admin Endpoints

#### GET /api/v1/notifications/templates

List all templates.

**Response**:

```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "welcome_email",
      "type": "email",
      "is_active": true,
      "variables": ["user_name", "verification_link"]
    }
  ]
}
```

#### POST /api/v1/notifications/unsubscribe

Unsubscribe user from notifications.

**Request**:

```json
{
  "email": "user@example.com",
  "notification_type": "marketing",
  "reason": "Too many emails"
}
```

## 📤 Auth Service Events (Detailed)

### 1. user.registered

**Published by**: Auth Service registration endpoint
**Template**: `welcome_email` + `email_verification`
**Priority**: High (1)

**Payload**:

```json
{
  "event_type": "user.registered",
  "payload": {
    "user_id": "uuid",
    "email": "user@refertosicuro.it",
    "full_name": "Mario Rossi",
    "verification_token": "abc123...",
    "registered_at": "2025-11-22T14:00:00Z"
  }
}
```

**Action**: Send welcome email + verification email

### 2. password_reset.requested

**Published by**: Auth Service forgot-password endpoint
**Template**: `password_reset`
**Priority**: High (1)

**Payload**:

```json
{
  "event_type": "password_reset.requested",
  "payload": {
    "user_id": "uuid",
    "email": "user@refertosicuro.it",
    "full_name": "Mario Rossi",
    "reset_token": "xyz789...",
    "ip_address": "192.168.1.1",
    "expires_at": "2025-11-22T16:00:00Z"
  }
}
```

**Action**: Send password reset email with token

### 3. user.email_verified

**Published by**: Auth Service verify-email endpoint
**Template**: None (confirmation only, optional)
**Priority**: Low (8)

**Payload**:

```json
{
  "event_type": "user.email_verified",
  "payload": {
    "user_id": "uuid",
    "email": "user@refertosicuro.it",
    "verified_at": "2025-11-22T14:05:00Z"
  }
}
```

**Action**: Optional confirmation email (v2)

### 4. user.password_changed

**Published by**: Auth Service reset-password endpoint
**Template**: `password_changed_alert`
**Priority**: High (2)

**Payload**:

```json
{
  "event_type": "user.password_changed",
  "payload": {
    "user_id": "uuid",
    "email": "user@refertosicuro.it",
    "full_name": "Mario Rossi",
    "changed_at": "2025-11-22T14:10:00Z",
    "ip_address": "192.168.1.1"
  }
}
```

**Action**: Send security alert email

### 5. user.2fa_enabled

**Published by**: Auth Service 2FA enable endpoint
**Template**: `2fa_enabled`
**Priority**: Medium (5)

**Payload**:

```json
{
  "event_type": "user.2fa_enabled",
  "payload": {
    "user_id": "uuid",
    "email": "user@refertosicuro.it",
    "full_name": "Mario Rossi",
    "enabled_at": "2025-11-22T14:15:00Z"
  }
}
```

**Action**: Send 2FA confirmation email

### 6. user.logged_in / user.logged_out

**Published by**: Auth Service login/logout endpoints
**Template**: None (log only)
**Priority**: N/A

**Action**: Log for analytics (no email sent in v1)

## 🛠️ Implementation Tasks

### Phase 1: Database & Models (4 hours)

**Files to create**:

- `app/models/notification.py` - SQLAlchemy models
- `app/core/database.py` - Database connection
- `alembic/versions/001_initial_schema.py` - Migration

**Tasks**:

1. ✅ Setup SQLAlchemy models for 4 tables
2. ✅ Create Alembic migration
3. ✅ Add indexes for performance
4. ✅ Seed notification_templates table with 16 templates

**Validation**:

```bash
alembic upgrade head
psql -d refertosicuro_notification -c "SELECT name FROM notification_templates;"
# Should show 16 templates
```

### Phase 2: RabbitMQ Consumer (6 hours)

**Files to create**:

- `app/services/event_consumer.py` - RabbitMQ consumer
- `app/core/rabbitmq.py` - Connection manager
- `app/handlers/auth_events.py` - Auth event handlers

**Tasks**:

1. ✅ Setup aio-pika connection to RabbitMQ
2. ✅ Declare exchange binding (`refertosicuro.events`)
3. ✅ Setup queue with routing keys (`user.*`, `subscription.*`, etc.)
4. ✅ Implement event handlers for each Auth event type
5. ✅ Error handling & retry logic
6. ✅ Dead letter queue setup
7. ✅ Graceful shutdown handling

**Key Code Structure**:

```python
# app/services/event_consumer.py
class EventConsumer:
    async def start(self):
        connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        channel = await connection.channel()

        exchange = await channel.declare_exchange(
            "refertosicuro.events",
            aio_pika.ExchangeType.TOPIC,
            durable=True
        )

        queue = await channel.declare_queue(
            "notification.queue",
            durable=True
        )

        await queue.bind(exchange, routing_key="user.*")
        await queue.bind(exchange, routing_key="subscription.*")

        await queue.consume(self.process_message)

    async def process_message(self, message: aio_pika.IncomingMessage):
        async with message.process():
            event = json.loads(message.body)
            await self.handle_event(event)
```

**Validation**:

```bash
# Publish test event from Auth Service
# Check RabbitMQ management UI: http://localhost:15672
# Verify queue binding and message consumption
```

### Phase 3: Email Service (4 hours)

**Files to create**:

- `app/services/email_service.py` - SMTP wrapper
- `app/core/smtp.py` - SMTP connection config
- `app/schemas/email.py` - Email schemas

**Tasks**:

1. ✅ Setup aiosmtplib SMTP client
2. ✅ Development config: MailHog (localhost:1025)
3. ✅ Production config: SendGrid/AWS SES (from Vault)
4. ✅ HTML + plain text email sending
5. ✅ Attachment support (for invoices)
6. ✅ Retry logic for SMTP failures
7. ✅ Delivery logging to database

**Key Code Structure**:

```python
# app/services/email_service.py
class EmailService:
    async def send_email(
        self,
        recipient: str,
        subject: str,
        body_html: str,
        body_text: str
    ):
        message = EmailMessage()
        message["From"] = settings.SMTP_FROM
        message["To"] = recipient
        message["Subject"] = subject
        message.set_content(body_text)
        message.add_alternative(body_html, subtype="html")

        async with aiosmtplib.SMTP(
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT
        ) as smtp:
            await smtp.send_message(message)
```

**Validation**:

```bash
# Send test email
curl -X POST http://localhost:8015/api/v1/notifications/send \
  -d '{"type":"email","recipient":"test@example.com","template":"welcome_email",...}'

# Check MailHog: http://localhost:8025
```

### Phase 4: Template Rendering (3 hours)

**Files to create**:

- `app/services/template_service.py` - Jinja2 rendering
- `app/templates/` - Email template files (16 templates × 2 formats = 32 files)

**Tasks**:

1. ✅ Setup Jinja2 environment
2. ✅ Create 16 email templates (HTML + text)
3. ✅ Template validation
4. ✅ Variable interpolation
5. ✅ Error handling for missing variables
6. ✅ Template caching

**Template Files**:

```
app/templates/
├── email/
│   ├── welcome_email.html
│   ├── welcome_email.txt
│   ├── email_verification.html
│   ├── email_verification.txt
│   ├── password_reset.html
│   ├── password_reset.txt
│   ├── password_changed_alert.html
│   ├── password_changed_alert.txt
│   ├── 2fa_enabled.html
│   ├── 2fa_enabled.txt
│   └── ... (32 files total)
```

**Key Code Structure**:

```python
# app/services/template_service.py
class TemplateService:
    def __init__(self):
        self.env = Environment(
            loader=FileSystemLoader("app/templates/email"),
            autoescape=select_autoescape(["html", "xml"])
        )

    async def render_template(
        self,
        template_name: str,
        variables: dict
    ) -> tuple[str, str]:
        html_template = self.env.get_template(f"{template_name}.html")
        text_template = self.env.get_template(f"{template_name}.txt")

        html = html_template.render(**variables)
        text = text_template.render(**variables)

        return html, text
```

### Phase 5: Testing (4 hours)

**Files to create**:

- `tests/unit/test_template_service.py`
- `tests/unit/test_email_service.py`
- `tests/integration/test_event_consumer.py`
- `tests/conftest.py` - Fixtures

**Tests to implement**:

1. ✅ Template rendering with all 16 templates
2. ✅ Template rendering with missing variables (error handling)
3. ✅ Email service sending (SMTP mock)
4. ✅ Event consumer message processing
5. ✅ Queue retry logic
6. ✅ Dead letter queue handling
7. ✅ Database logging

**Coverage target**: ≥ 90%

**Validation**:

```bash
cd services/notification
pytest tests/ --cov=app --cov-report=html
# Should show ≥90% coverage
```

## ⚙️ Configuration

### Environment Variables

**File**: `.env` (development) / Vault (production)

```bash
# Service
SERVICE_NAME=notification-service
PORT=8015
ENVIRONMENT=development

# Database
DATABASE_URL=postgresql+asyncpg://refertosicuro:password@localhost:5432/refertosicuro_notification

# Redis (optional cache)
REDIS_URL=redis://localhost:6379/2

# RabbitMQ
RABBITMQ_URL=amqp://refertosicuro:password@localhost:5672/
RABBITMQ_EXCHANGE=refertosicuro.events
RABBITMQ_QUEUE=notification.queue

# SMTP (Development - MailHog)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@refertosicuro.it
SMTP_FROM_NAME=RefertoSicuro

# SMTP (Production - SendGrid)
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USERNAME=apikey
# SMTP_PASSWORD=<from-vault>
# SMTP_TLS=true

# Retry Policy
MAX_RETRY_ATTEMPTS=3
RETRY_BACKOFF_SECONDS=1,5,30

# Logging
LOG_LEVEL=INFO
```

### Vault Secrets (Production)

```bash
# Secrets to store in Vault
vault kv put secret/refertosicuro/notification \
  smtp_password="<sendgrid-api-key>" \
  twilio_auth_token="<twilio-token>" \
  fcm_server_key="<fcm-key>"
```

## 🧪 Testing Strategy

### Unit Tests

**Target Coverage**: 90%

**Test Files**:

```python
# tests/unit/test_template_service.py
def test_render_welcome_email():
    service = TemplateService()
    html, text = await service.render_template(
        "welcome_email",
        {"user_name": "Test", "verification_link": "https://..."}
    )
    assert "Test" in html
    assert "https://..." in html

def test_render_missing_variable_raises_error():
    service = TemplateService()
    with pytest.raises(TemplateError):
        await service.render_template("welcome_email", {})

# tests/unit/test_email_service.py
async def test_send_email(mock_smtp):
    service = EmailService()
    await service.send_email(
        recipient="test@example.com",
        subject="Test",
        body_html="<p>Test</p>",
        body_text="Test"
    )
    assert mock_smtp.send_message.called

# tests/unit/test_notification_queue.py
async def test_queue_notification(test_db):
    notification = NotificationQueue(
        type="email",
        recipient="test@example.com",
        template_id=uuid.uuid4(),
        variables={"user_name": "Test"}
    )
    test_db.add(notification)
    await test_db.commit()

    assert notification.status == "pending"
    assert notification.attempts == 0
```

### Integration Tests

**Test Files**:

```python
# tests/integration/test_event_consumer.py
async def test_consume_user_registered_event(rabbitmq_mock, test_db):
    consumer = EventConsumer()

    event = {
        "event_type": "user.registered",
        "payload": {
            "user_id": str(uuid.uuid4()),
            "email": "test@refertosicuro.it",
            "full_name": "Test User",
            "verification_token": "abc123"
        }
    }

    await consumer.handle_event(event)

    # Check notification was queued
    notifications = await test_db.execute(
        select(NotificationQueue).where(NotificationQueue.recipient == "test@refertosicuro.it")
    )
    assert len(notifications) == 1
    assert notifications[0].status == "pending"

# tests/integration/test_email_flow.py
async def test_full_email_flow(async_client, test_db, mailhog_client):
    # Send notification request
    response = await async_client.post(
        "/api/v1/notifications/send",
        json={
            "type": "email",
            "recipient": "test@example.com",
            "template": "welcome_email",
            "variables": {"user_name": "Test", "verification_link": "https://..."}
        }
    )

    assert response.status_code == 200

    # Process queue (simulate worker)
    await process_notification_queue()

    # Check MailHog received email
    emails = await mailhog_client.get_messages()
    assert len(emails) == 1
    assert emails[0]["to"] == "test@example.com"
    assert "Test" in emails[0]["body"]
```

### End-to-End Tests

```bash
# tests/e2e/test_auth_to_notification_flow.sh
#!/bin/bash

# 1. Register user via Auth Service
RESPONSE=$(curl -X POST http://localhost:8010/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e@test.com","password":"Test123!","full_name":"E2E Test"}')

# 2. Wait for event processing
sleep 2

# 3. Check MailHog for welcome email
EMAILS=$(curl http://localhost:8025/api/v2/messages)
echo $EMAILS | jq '.items[] | select(.To[0].Mailbox=="e2e")'

# Should contain welcome email
```

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Database migrations executed (`alembic upgrade head`)
- [ ] notification_templates table seeded with 16 templates
- [ ] SMTP credentials in Vault (production)
- [ ] RabbitMQ exchange `refertosicuro.events` declared
- [ ] RabbitMQ queue `notification.queue` created with DLQ
- [ ] Environment variables configured
- [ ] Health checks passing (`/health`, `/ready`)

### Deployment Steps

```bash
# 1. Run database migrations
cd services/notification
alembic upgrade head

# 2. Seed templates
python scripts/seed_templates.py

# 3. Build Docker image
docker build -t refertosicuro/notification:2.0.0 -f Dockerfile.dev .

# 4. Start service
docker-compose up -d notification-service

# 5. Verify health
curl http://localhost:8015/health
curl http://localhost:8015/ready

# 6. Test RabbitMQ connection
docker logs notification-service | grep "Connected to RabbitMQ"

# 7. Send test notification
curl -X POST http://localhost:8015/api/v1/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"type":"email","recipient":"test@example.com","template":"welcome_email",...}'

# 8. Check MailHog
open http://localhost:8025
```

### Post-Deployment Validation

- [ ] RabbitMQ consumer connected and consuming
- [ ] Test email sent successfully to MailHog
- [ ] Database logging working (check delivery_log table)
- [ ] Retry logic working (test with invalid SMTP)
- [ ] Dead letter queue receiving failed messages
- [ ] Prometheus metrics exposed (`/metrics`)

## 📊 Success Criteria

### Functional Requirements

- ✅ RabbitMQ consumer connected to `refertosicuro.events` exchange
- ✅ All 7 Auth Service events handled correctly
- ✅ Emails sent successfully via MailHog (development)
- ✅ All 16 email templates rendering correctly
- ✅ Retry logic working for failed deliveries
- ✅ Dead letter queue capturing permanent failures
- ✅ Delivery logging to database

### Performance Requirements

- ✅ Event processing latency < 500ms (p95)
- ✅ Email delivery latency < 5s (p95)
- ✅ Queue throughput: ≥ 100 emails/minute
- ✅ Template rendering < 100ms

### Quality Requirements

- ✅ Test coverage ≥ 90%
- ✅ All integration tests passing
- ✅ No SMTP credentials in code (Vault only)
- ✅ Graceful shutdown (no message loss)
- ✅ Health checks passing

### Monitoring & Observability

- ✅ Prometheus metrics exported
- ✅ Structured logging with correlation IDs
- ✅ RabbitMQ queue depth monitored
- ✅ Email delivery rate tracked
- ✅ Failed delivery alerts configured

---

## 📝 Development Notes

### Current Status (2025-11-22)

**Completed**:

- ✅ Service skeleton created (main.py, **version**.py)
- ✅ Health check endpoints
- ✅ Docker configuration
- ✅ Dependencies installed (requirements.txt)

**In Progress**:

- ⏳ Database schema implementation
- ⏳ RabbitMQ consumer setup
- ⏳ Email service implementation

**Blocked**:

- None - ready to start development

### Priority Events to Implement First

1. **user.registered** (CRITICAL) - Auth Service already publishing
2. **password_reset.requested** (CRITICAL) - Auth Service already publishing
3. **user.password_changed** (HIGH) - Security alert
4. **user.2fa_enabled** (MEDIUM)
5. **user.email_verified** (LOW) - Optional confirmation

### Integration Points

**Auth Service** (Port 8010):

- Publishes events to RabbitMQ
- Events: `user.*` routing key
- Already operational ✅

**Billing Service** (Port 8012):

- Will publish `subscription.*`, `payment.*` events
- Not yet implemented ⏳

**RabbitMQ** (Port 5672):

- Exchange: `refertosicuro.events` (topic)
- Management UI: <http://localhost:15672>

**MailHog** (Port 1025 SMTP, 8025 UI):

- Development SMTP server
- Web UI: <http://localhost:8025>
- Already configured in docker-compose ✅

---

**Last Updated**: 2025-11-22
**Version**: 2.0.0
**Status**: Ready for Development
**Estimated Completion**: 3 days (21 hours)

**Next Action**: Start with Phase 1 (Database & Models)
