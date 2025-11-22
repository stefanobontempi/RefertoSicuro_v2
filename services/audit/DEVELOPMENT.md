# Audit Service - Development Specification

## 📋 Overview

**Service Name**: Audit Service ⚠️ **CRITICO per Compliance**
**Port**: 8016
**Database**: PostgreSQL (Dedicated, Append-Only, Partitioned)
**Dependencies**: Redis, RabbitMQ

## 🎯 Responsabilità

1. **Immutable Audit Trail**

   - Log TUTTE le operazioni mediche
   - Append-only database (NO updates, NO deletes)
   - Partition by month per performance
   - Encryption at rest obbligatoria

2. **GDPR Compliance**

   - Right to access (export dati)
   - Right to erasure (anonymization)
   - Right to rectification
   - Consent tracking
   - Data retention enforcement

3. **AI Act Compliance**

   - Log decisioni AI
   - Metadata modelli utilizzati
   - Confidence scores
   - Human oversight tracking

4. **Audit Reports**
   - Compliance reports
   - User activity timeline
   - GDPR request tracking
   - Security incident logs

## 📁 Struttura Directory

```
services/audit/
├── app/
│   ├── main.py
│   ├── api/v2/
│   │   ├── audit_trail.py     # Query audit logs
│   │   ├── gdpr.py            # GDPR operations
│   │   ├── compliance.py      # Compliance reports
│   │   └── ai_logs.py         # AI decision logs
│   ├── domain/
│   │   ├── audit_logger.py
│   │   ├── gdpr_manager.py
│   │   └── retention_manager.py
│   ├── models/
│   │   ├── audit_log.py
│   │   ├── gdpr_request.py
│   │   ├── consent_log.py
│   │   └── ai_decision_log.py
│   ├── services/
│   │   ├── audit_service.py
│   │   ├── gdpr_service.py
│   │   ├── anonymizer.py
│   │   └── retention_service.py
│   └── workers/
│       └── event_consumer.py  # RabbitMQ consumer
├── tests/
├── alembic/
└── DEVELOPMENT.md
```

## 📊 Database Schema

### audit_logs (Partitioned by month)

```sql
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    action VARCHAR(50) NOT NULL,  -- create, read, update, delete, process
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_id UUID,
    correlation_id UUID,
    source_service VARCHAR(50) NOT NULL,
    metadata JSONB,
    encrypted_payload BYTEA,  -- Encrypted sensitive data
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create partitions for each month
CREATE TABLE audit_logs_2024_11 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');

CREATE TABLE audit_logs_2024_12 PARTITION OF audit_logs
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE INDEX idx_audit_user_id ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_event_type ON audit_logs(event_type, timestamp DESC);
```

### ai_decision_logs

```sql
CREATE TABLE ai_decision_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL,
    request_id UUID NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50),
    specialty VARCHAR(10) NOT NULL,
    input_hash VARCHAR(64) NOT NULL,  -- SHA256 of sanitized input
    output_hash VARCHAR(64) NOT NULL, -- SHA256 of output
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    confidence_score DECIMAL(3,2),
    human_review_required BOOLEAN DEFAULT FALSE,
    human_reviewed_at TIMESTAMP,
    human_reviewer_id UUID,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_logs_user_id ON ai_decision_logs(user_id, timestamp DESC);
CREATE INDEX idx_ai_logs_specialty ON ai_decision_logs(specialty, timestamp DESC);
```

### gdpr_requests

```sql
CREATE TABLE gdpr_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    request_type VARCHAR(50) NOT NULL,  -- access, erasure, rectification, portability
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP,
    processed_by UUID,  -- Admin user ID
    export_url TEXT,  -- S3/MinIO URL for data export
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_gdpr_user_id ON gdpr_requests(user_id);
CREATE INDEX idx_gdpr_status ON gdpr_requests(status);
```

### consent_log

```sql
CREATE TABLE consent_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    consent_type VARCHAR(50) NOT NULL,  -- terms, privacy, marketing, debug_logging
    version VARCHAR(20) NOT NULL,       -- Version of the consent document
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_consent_user_id ON consent_log(user_id, consent_type);
```

### data_retention_schedule

```sql
CREATE TABLE data_retention_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    delete_after TIMESTAMP NOT NULL,
    reason VARCHAR(100) NOT NULL,  -- gdpr_request, user_deleted, retention_policy
    status VARCHAR(20) DEFAULT 'scheduled',  -- scheduled, processing, completed, failed
    scheduled_at TIMESTAMP NOT NULL DEFAULT NOW(),
    executed_at TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_retention_delete_after ON data_retention_schedule(delete_after);
CREATE INDEX idx_retention_status ON data_retention_schedule(status);
```

## 🔌 API Endpoints

### Audit Trail

#### GET /api/v2/audit/trail/{user_id}

Ottieni audit trail per utente (Admin only).

**Headers**: `Authorization: Bearer <admin_token>`

**Query Params**:

- `start_date=2024-11-01`
- `end_date=2024-11-21`
- `event_type=user.login|report.processed`
- `page=1&page_size=50`

**Response** (200):

```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "events": [
      {
        "id": "uuid",
        "timestamp": "2024-11-21T10:00:00Z",
        "event_type": "user.login",
        "action": "read",
        "ip_address": "192.168.1.1",
        "source_service": "auth-service",
        "metadata": {
          "user_agent": "Mozilla/5.0..."
        }
      },
      {
        "id": "uuid",
        "timestamp": "2024-11-21T10:05:00Z",
        "event_type": "report.processed",
        "action": "process",
        "source_service": "reports-service",
        "metadata": {
          "specialty": "RAD",
          "processing_time_ms": 1234
        }
      }
    ],
    "pagination": {
      "page": 1,
      "total_pages": 5
    }
  }
}
```

#### POST /api/v2/audit/log (Internal Only)

Crea audit log entry.

**Headers**: `X-Service-Token: <service_token>`

**Request**:

```json
{
  "event_type": "report.processed",
  "user_id": "uuid",
  "resource_type": "report",
  "action": "process",
  "source_service": "reports-service",
  "metadata": {
    "specialty": "RAD",
    "tokens_used": 456
  }
}
```

**Response** (201):

```json
{
  "success": true,
  "data": {
    "audit_id": "uuid",
    "timestamp": "2024-11-21T10:00:00Z"
  }
}
```

### GDPR Compliance

#### POST /api/v2/audit/gdpr/export

Richiesta export dati utente (Right to Access).

**Headers**: `Authorization: Bearer <token>`

**Response** (202):

```json
{
  "success": true,
  "data": {
    "request_id": "uuid",
    "status": "processing",
    "estimated_completion": "2024-11-21T12:00:00Z",
    "message": "Your data export request is being processed. You will receive an email when ready."
  }
}
```

#### POST /api/v2/audit/gdpr/delete

Richiesta cancellazione dati (Right to Erasure).

**Headers**: `Authorization: Bearer <token>`

**Request**:

```json
{
  "confirmation": "DELETE MY DATA",
  "reason": "I no longer wish to use the service"
}
```

**Response** (202):

```json
{
  "success": true,
  "data": {
    "request_id": "uuid",
    "status": "pending_verification",
    "message": "Deletion request received. You will receive a confirmation email to verify this request."
  }
}
```

#### POST /api/v2/audit/gdpr/rectify

Richiesta rettifica dati (Right to Rectification).

**Headers**: `Authorization: Bearer <token>`

**Request**:

```json
{
  "field": "full_name",
  "current_value": "Mario Rossi",
  "corrected_value": "Mario Giuseppe Rossi",
  "reason": "Name was incomplete"
}
```

**Response** (200):

```json
{
  "success": true,
  "message": "Rectification request submitted"
}
```

#### GET /api/v2/audit/gdpr/status

Status richieste GDPR utente.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):

```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "uuid",
        "type": "export",
        "status": "completed",
        "requested_at": "2024-11-20T10:00:00Z",
        "completed_at": "2024-11-20T10:30:00Z",
        "download_url": "https://s3.../export.zip",
        "expires_at": "2024-11-27T10:30:00Z"
      }
    ]
  }
}
```

### Compliance Reports

#### GET /api/v2/audit/compliance/report

Genera compliance report (Admin only).

**Headers**: `Authorization: Bearer <admin_token>`

**Query Params**:

- `type=gdpr|ai_act|medical`
- `start_date=2024-11-01`
- `end_date=2024-11-21`

**Response** (200):

```json
{
  "success": true,
  "data": {
    "report_type": "gdpr",
    "period": {
      "start": "2024-11-01",
      "end": "2024-11-21"
    },
    "summary": {
      "total_gdpr_requests": 23,
      "export_requests": 15,
      "deletion_requests": 5,
      "rectification_requests": 3,
      "average_processing_time_hours": 4.5,
      "completed_within_30_days": "100%"
    },
    "details": [...]
  }
}
```

### AI Decision Logs

#### GET /api/v2/audit/ai-logs

Query AI decision logs (Admin only).

**Headers**: `Authorization: Bearer <admin_token>`

**Query Params**:

- `user_id=uuid` (optional)
- `specialty=RAD` (optional)
- `start_date=2024-11-01`
- `end_date=2024-11-21`

**Response** (200):

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "timestamp": "2024-11-21T10:00:00Z",
        "user_id": "uuid",
        "model_name": "gpt-4o",
        "specialty": "RAD",
        "tokens_used": 456,
        "processing_time_ms": 1234,
        "confidence_score": 0.92,
        "human_review_required": false
      }
    ]
  }
}
```

## 📤 Events Consumati (RabbitMQ)

L'Audit Service DEVE consumare TUTTI gli eventi da tutti i servizi:

### From Auth Service

- `user.registered`
- `user.logged_in`
- `user.password_changed`
- `user.email_verified`
- `user.2fa_enabled`
- `user.deleted`

### From Reports Service

- `report.processed`
- `report.failed`

### From Billing Service

- `subscription.created`
- `subscription.cancelled`
- `payment.successful`
- `payment.failed`

### Worker Implementation

```python
# app/workers/event_consumer.py
import asyncio
from aio_pika import connect_robust, IncomingMessage

async def consume_events():
    connection = await connect_robust(RABBITMQ_URL)
    channel = await connection.channel()

    # Bind to all event types
    queue = await channel.declare_queue("audit-service-queue", durable=True)
    await queue.bind("refertosicuro.events", routing_key="#")

    async for message in queue:
        async with message.process():
            await process_event(message.body)

async def process_event(message_body: bytes):
    """
    Process event and create audit log entry.
    ALL events are logged, NO exceptions.
    """
    event = json.loads(message_body)

    audit_entry = {
        "event_type": event["event_type"],
        "timestamp": event["timestamp"],
        "user_id": event["payload"].get("user_id"),
        "source_service": event["source_service"],
        "correlation_id": event["correlation_id"],
        "metadata": event["payload"],
    }

    await create_audit_log(audit_entry)
```

## 🔒 Security Requirements

### Database Security

```python
# Append-only enforcement
GRANT INSERT, SELECT ON audit_logs TO audit_service;
REVOKE UPDATE, DELETE ON audit_logs FROM audit_service;

# Encryption at rest (PostgreSQL)
ALTER TABLE audit_logs SET (encryption = true);
```

### Data Anonymization

```python
def anonymize_user_data(user_id: UUID):
    """
    GDPR Right to Erasure implementation.
    Replace PII with anonymized values, keep audit trail.
    """
    # Update audit logs
    await db.execute("""
        UPDATE audit_logs
        SET metadata = jsonb_set(
            metadata,
            '{user_email}',
            '"[DELETED]"'
        )
        WHERE user_id = :user_id
    """, {"user_id": user_id})

    # Keep statistical data, anonymize identity
    # DON'T delete audit logs (compliance requirement)
```

### Retention Policy

```python
# Retention periods per EU/Italian law
RETENTION_POLICIES = {
    "audit_logs": 730,              # 2 years (GDPR Art. 17)
    "medical_ai_decisions": 3650,   # 10 years (MDR requirement)
    "payment_records": 3650,        # 10 years (tax law)
    "gdpr_requests": 1825,          # 5 years (compliance)
}

# Automated cleanup job (runs daily)
async def enforce_retention_policy():
    """
    Delete data older than retention period.
    EXCEPT: Medical AI decisions and compliance logs.
    """
    for resource_type, days in RETENTION_POLICIES.items():
        cutoff_date = datetime.now() - timedelta(days=days)

        if resource_type == "medical_ai_decisions":
            # Never delete, only archive
            await archive_old_ai_logs(cutoff_date)
        else:
            await delete_old_records(resource_type, cutoff_date)
```

## 🧪 Testing Requirements

### Unit Tests

```python
# tests/unit/test_audit_logger.py
- test_create_audit_log()
- test_append_only_enforcement()
- test_partition_routing()

# tests/unit/test_gdpr_service.py
- test_export_user_data()
- test_anonymize_user_data()
- test_delete_user_data()

# tests/unit/test_retention.py
- test_calculate_retention_date()
- test_schedule_deletion()
```

### Integration Tests

```python
# tests/integration/test_event_consumer.py
- test_consume_all_event_types()
- test_concurrent_event_processing()
- test_event_idempotency()

# tests/integration/test_gdpr_flow.py
- test_full_export_flow()
- test_full_deletion_flow()
```

## 🚀 Development Tasks

### Phase 1: Core Audit Logging (Priority: CRITICAL)

- [ ] Setup FastAPI app + PostgreSQL
- [ ] Implement audit_logs table con partitioning
- [ ] Implement append-only enforcement
- [ ] RabbitMQ event consumer
- [ ] POST /audit/log endpoint (internal)
- [ ] Tests audit logging

### Phase 2: GDPR Compliance (Priority: CRITICAL)

- [ ] Implement GDPR request models
- [ ] Implement data export logic
- [ ] Implement anonymization logic
- [ ] Implement deletion scheduling
- [ ] GDPR API endpoints
- [ ] Tests GDPR flows

### Phase 3: AI Act Compliance (Priority: HIGH)

- [ ] AI decision log model
- [ ] Human oversight tracking
- [ ] Confidence score logging
- [ ] AI compliance reports
- [ ] Tests AI logging

### Phase 4: Retention & Cleanup (Priority: HIGH)

- [ ] Retention policy configuration
- [ ] Automated cleanup jobs
- [ ] Archive old records
- [ ] Tests retention enforcement

### Phase 5: Compliance Reports (Priority: MEDIUM)

- [ ] Report generation logic
- [ ] PDF export
- [ ] Compliance dashboards
- [ ] Scheduled reports

## 📊 Metrics & Monitoring

### Prometheus Metrics

```python
audit_logs_created_total{event_type="user.login"}
gdpr_requests_total{type="export|delete|rectify", status="pending|completed"}
retention_cleanup_total{resource_type="audit_logs"}
event_processing_lag_seconds
```

### Alerts

- Audit log write failures (CRITICAL)
- Event consumer lag > 5 minutes
- GDPR request processing > 24 hours
- Retention cleanup failures

---

**Status**: ❌ To Create (CRITICAL)
**Assigned Agent**: TBD
**Estimated Time**: 5-6 giorni
**Dependencies**: Tutti i servizi (event consumers)
**Priority**: CRITICAL - Required for legal compliance

---

## ⚠️ DECISIONI APPROVATE (2024-11-22)

### Audit Trail

- **Retention**: PERMANENTE (mai cancellare)
- **Partitioning**: Mensile per performance
- **Encryption**: At rest obbligatoria
- **Immutability**: Append-only, NO updates/deletes
- Rationale: Compliance medicale Italia 7-10 anni + safety margin

### GDPR Compliance

- **Export response time**: 24 ore (background job)
- **Export format**: ZIP con JSON + PDF (password-protected)
- **Delete strategy**: Anonymization (NON hard delete)
  - Replace PII con [DELETED]
  - Keep audit trail per compliance
  - Grace period 30 giorni (user può annullare)
- **Rectify**: Self-service, immediate update

### AI Decision Logging (AI Act)

- **Retention**: Permanente
- **Fields logged**:
  - Model name + version
  - Specialty code
  - Input/output hash (SHA256 per privacy)
  - Tokens used
  - Processing time
  - Confidence score
  - Human review required flag
- Rationale: High-risk medical AI compliance

### Event Consumption

- **Consuma**: TUTTI gli eventi da TUTTI i servizi
- **Priority queue**: Critical events first
- **Idempotency**: Event deduplication con correlation_id
- **Error handling**: DLQ (Dead Letter Queue) per eventi falliti

### Database Strategy

- **PostgreSQL partitioned** by month
- **Indexes** su user_id, event_type, timestamp
- **Write-only** permissions (no UPDATE/DELETE grants)
- **Backup**: Daily, retention 90 giorni minimum

### Data Retention Policies

```yaml
audit_logs: permanent
ai_decision_logs: permanent
user_data_deleted: 30 giorni grace period
gdpr_export_files: 7 giorni
payment_records: 10 anni (legge fiscale Italia)
invoices: 10 anni
debug_logs: 7 giorni auto-delete
session_data: 7 giorni after logout
```

### Testing

- **Coverage minimum**: 90% (medical-grade)
- Event consumer idempotency tests
- GDPR export/delete flow tests
- Partition performance tests
- Immutability enforcement tests

### Reference

- See [REQUIREMENTS_DECISIONS.md](../../REQUIREMENTS_DECISIONS.md)

**Status**: ❌ To Create (CRITICAL for compliance)
**Estimated Time**: 5-6 giorni
**Dependencies**: Tutti i servizi (consuma events)
**Priority**: CRITICAL - Cannot launch without this
