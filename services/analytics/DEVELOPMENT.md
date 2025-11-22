# Analytics Service - Development Specification

## 📋 Overview

**Service Name**: Analytics Service
**Port**: 8014
**Database**: MongoDB (Time-series optimized)
**Dependencies**: Redis, RabbitMQ

## 🎯 Responsabilità

1. **Event Collection**

   - Consuma TUTTI gli eventi da RabbitMQ
   - Anonimizzazione dati sensibili
   - Time-series storage

2. **Metrics Aggregation**

   - Hourly rollups
   - Daily summaries
   - KPI calculation

3. **Analytics API**
   - Metrics query endpoint
   - Trend analysis
   - Custom reports

## 📁 MongoDB Collections

### events

```javascript
{
  _id: ObjectId,
  event_type: "user.registered",
  timestamp: ISODate,
  user_id_hash: "sha256_hash",  // Anonimizzato
  metadata: {
    source_service: "auth-service",
    correlation_id: "uuid"
  },
  payload: { /* anonimizzato */ }
}
```

### metrics_hourly

```javascript
{
  _id: ObjectId,
  hour: ISODate("2024-11-21T10:00:00Z"),
  metrics: {
    reports_processed: 123,
    users_registered: 5,
    payments_successful: 45,
    by_specialty: {
      RAD: 60,
      CARD: 40
    }
  }
}
```

## 🔌 API Endpoints

#### GET /api/v2/analytics/metrics

Query metrics con filtri temporali.

**Query Params**:

- `start_date=2024-11-01`
- `end_date=2024-11-21`
- `metric=reports_processed|users_registered`
- `granularity=hour|day|month`

**Response** (200):

```json
{
  "success": true,
  "data": {
    "metric": "reports_processed",
    "period": {
      "start": "2024-11-01",
      "end": "2024-11-21"
    },
    "data_points": [
      { "timestamp": "2024-11-01T00:00:00Z", "value": 234 },
      { "timestamp": "2024-11-02T00:00:00Z", "value": 267 }
    ]
  }
}
```

---

**Status**: ✅ Ready for Development
**Dependencies**: Tutti i servizi (event consumers)

---

## ⚠️ DECISIONI APPROVATE (2024-11-22)

### MongoDB Time-Series

- **Events collection**: Tutti gli eventi (anonimizzati)
- **Aggregations**: Hourly rollups → Daily summaries
- **Retention**: Dettagli 90gg, aggregati permanenti

### Metrics Tracked

- User signups/active users
- Referti processati per specialità
- Revenue per piano
- Conversion rate trial → paid
- Churn rate
- AI processing time + error rates

### Anonymization

- User IDs hashed (SHA256)
- NO PII in analytics
- Solo statistiche aggregate

### API

- GET /metrics con filtri temporali
- GET /trends
- GET /kpis

### Testing

- **Coverage**: 90%
- Aggregation logic tests
- Time-series performance tests

**Status**: ✅ Ready
**Time**: 3 giorni
**Dependencies**: Tutti (consuma events)
