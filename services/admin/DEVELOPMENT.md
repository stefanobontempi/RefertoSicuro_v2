# Admin Service - Development Specification

## 📋 Overview

**Service Name**: Admin Service
**Port**: 8013
**Database**: PostgreSQL (Read replicas da altri servizi)
**Dependencies**: Redis, RabbitMQ, Tutti i servizi (read-only)

## 🎯 Responsabilità

1. **Admin Dashboard**

   - Overview metrics (users, subscriptions, revenue)
   - Real-time statistics
   - Charts e visualizzazioni

2. **User Management**

   - Lista utenti con filtri
   - User details view
   - Suspend/Activate users
   - Reset passwords
   - Impersonate user (audit logged)

3. **System Monitoring**

   - Service health status
   - Error logs aggregation
   - Performance metrics
   - Database statistics

4. **Support Tools**

   - Support tickets (future)
   - User activity logs
   - Subscription history
   - Payment history

5. **Configuration Management**
   - System settings
   - Feature flags
   - Maintenance mode

## 📁 Struttura Directory

```
services/admin/
├── app/
│   ├── main.py
│   ├── api/v2/
│   │   ├── dashboard.py       # Dashboard metrics
│   │   ├── users.py           # User management
│   │   ├── subscriptions.py   # Subscription management
│   │   ├── system.py          # System config
│   │   └── logs.py            # Log viewing
│   ├── domain/
│   │   ├── user_manager.py
│   │   └── analytics_aggregator.py
│   ├── services/
│   │   ├── auth_client.py     # Call Auth Service
│   │   ├── billing_client.py  # Call Billing Service
│   │   ├── reports_client.py  # Call Reports Service
│   │   └── analytics_client.py
│   └── utils/
│       └── permissions.py
├── tests/
└── DEVELOPMENT.md
```

## 🔌 API Endpoints

### Dashboard

#### GET /api/v2/admin/dashboard

Dashboard overview.

**Headers**: `Authorization: Bearer <admin_token>`

**Response** (200):

```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1234,
      "active": 1100,
      "new_this_month": 45
    },
    "subscriptions": {
      "total": 890,
      "by_plan": {
        "trial": 123,
        "basic": 400,
        "professional": 367
      }
    },
    "revenue": {
      "current_month": 45678.9,
      "last_month": 42300.0,
      "growth_percentage": 8.0
    },
    "reports": {
      "processed_today": 234,
      "processed_this_month": 8901
    }
  }
}
```

### User Management

#### GET /api/v2/admin/users

Lista utenti con paginazione e filtri.

**Query Params**:

- `page=1`
- `page_size=20`
- `role=customer|partner|admin`
- `status=active|inactive`
- `search=email@example.com`

**Response** (200):

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "full_name": "Mario Rossi",
        "role": "customer",
        "is_active": true,
        "subscription": {
          "plan": "professional",
          "status": "active"
        },
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 1234,
      "total_pages": 62
    }
  }
}
```

#### GET /api/v2/admin/users/{id}

Dettagli utente specifico.

**Response** (200):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "Mario Rossi",
      "role": "customer",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z"
    },
    "subscription": {
      "plan": "professional",
      "status": "active",
      "usage": {
        "reports_used": 450,
        "reports_quota": 1500
      }
    },
    "activity": {
      "last_login": "2024-11-21T09:00:00Z",
      "total_reports": 2345,
      "total_payments": 12
    }
  }
}
```

#### POST /api/v2/admin/users/{id}/suspend

Sospendi utente.

**Request**:

```json
{
  "reason": "violation_of_terms",
  "notes": "Spam detected"
}
```

**Response** (200):

```json
{
  "success": true,
  "message": "User suspended"
}
```

### System Management

#### GET /api/v2/admin/system/health

Health check di tutti i servizi.

**Response** (200):

```json
{
  "success": true,
  "data": {
    "services": {
      "auth-service": { "status": "healthy", "latency_ms": 12 },
      "reports-service": { "status": "healthy", "latency_ms": 45 },
      "billing-service": { "status": "healthy", "latency_ms": 23 }
    },
    "databases": {
      "postgresql": { "status": "healthy", "connections": 23 },
      "mongodb": { "status": "healthy", "connections": 12 },
      "redis": { "status": "healthy" }
    }
  }
}
```

---

**Status**: ✅ Ready for Development
**Dependencies**: Tutti i servizi (read-only access)

---

## ⚠️ DECISIONI APPROVATE (2024-11-22)

### Dashboard Metrics

- Users overview (total, active, new)
- Subscriptions by plan
- Revenue (current month, growth %)
- Reports processed today/month
- System health all services

### User Management

- List users (pagination, filters)
- View user details (subscription, usage, activity)
- Suspend/activate users
- Password reset (admin action)
- NO impersonate in v1 (v2 con audit)

### Read-Only Access

- HTTP clients per Auth, Billing, Reports, Analytics
- NO direct DB access
- Aggregazione dati via API

### Security

- 2FA OBBLIGATORIO per admin
- IP whitelist (opzionale)
- Tutti actions audit logged

### Testing

- **Coverage**: 90%
- Authorization tests (solo admin)
- Integration con altri servizi

**Status**: ✅ Ready
**Time**: 3 giorni
**Dependencies**: Tutti (read-only)
