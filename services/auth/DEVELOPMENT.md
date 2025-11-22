# Auth Service - Development Specification

## 📋 Overview

**Service Name**: Auth Service
**Port**: 8010
**Database**: PostgreSQL (Dedicated)
**Dependencies**: Redis (sessions, rate limiting), RabbitMQ (events), Vault (secrets)

## 🎯 Responsabilità

1. **User Authentication**

   - Email/Password login con bcrypt hashing
   - JWT access tokens (4 ore) ⚠️ Richiesta specifica per sessioni lunghe medici
   - Refresh tokens rotation (7 giorni)
   - Session management con Redis
   - 2FA con TOTP (opzionale utenti, OBBLIGATORIO admin)

2. **User Management**

   - User registration con email verification OBBLIGATORIA ⚠️
   - Password reset flow
   - Email verification (BLOCCA utilizzo servizio se non verificata)
   - User profile CRUD
   - Soft delete (permanente, solo anonymization per GDPR)

3. **Authorization**

   - Role-based access control (RBAC)
   - Permission checking
   - Token validation per altri servizi

4. **Security**
   - CSRF protection
   - Rate limiting (10 req/min anonymous, 100 req/min authenticated)
   - Brute force protection
   - IP-based blocking
   - Audit logging di tutte le operazioni

## 📁 Struttura Directory

```
services/auth/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app + lifespan
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py           # Login, logout, refresh
│   │   │   ├── users.py          # User CRUD
│   │   │   ├── password.py       # Password reset
│   │   │   └── verification.py   # Email verification
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py             # Settings con pydantic-settings
│   │   ├── database.py           # SQLAlchemy async engine
│   │   ├── redis.py              # Redis client
│   │   ├── rabbitmq.py           # RabbitMQ publisher
│   │   ├── vault.py              # Vault client
│   │   ├── logging.py            # Structured logging
│   │   └── security.py           # Security utilities
│   ├── domain/
│   │   ├── __init__.py
│   │   ├── user.py               # User business logic
│   │   ├── session.py            # Session management
│   │   └── auth.py               # Authentication logic
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py               # User SQLAlchemy model
│   │   ├── session.py            # UserSession model
│   │   ├── role.py               # Role & Permission models
│   │   └── token.py              # PasswordResetToken, etc.
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py               # User Pydantic schemas
│   │   ├── auth.py               # Login, Token schemas
│   │   └── common.py             # Shared schemas
│   ├── services/
│   │   ├── __init__.py
│   │   ├── user_service.py       # User operations
│   │   ├── auth_service.py       # Authentication logic
│   │   ├── jwt_service.py        # JWT token operations
│   │   ├── email_service.py      # Email sending (via Notification)
│   │   └── rate_limiter.py       # Rate limiting logic
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── csrf.py               # CSRF protection
│   │   ├── security.py           # Security headers
│   │   └── request_id.py         # Request ID tracking
│   └── utils/
│       ├── __init__.py
│       ├── password.py           # Password hashing utilities
│       ├── validators.py         # Input validators
│       └── exceptions.py         # Custom exceptions
├── tests/
│   ├── unit/
│   │   ├── test_user_service.py
│   │   ├── test_auth_service.py
│   │   └── test_jwt_service.py
│   ├── integration/
│   │   ├── test_auth_api.py
│   │   ├── test_users_api.py
│   │   └── test_password_api.py
│   └── fixtures/
│       └── database.py
├── alembic/
│   ├── versions/
│   └── env.py
├── Dockerfile
├── Dockerfile.dev
├── requirements.txt
├── requirements-test.txt
├── pytest.ini
├── .env.development
└── DEVELOPMENT.md (questo file)
```

## 📊 Database Schema

### Tables

#### users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    role VARCHAR(50) NOT NULL DEFAULT 'customer',
    phone_number VARCHAR(20),
    avatar_url TEXT,
    two_factor_secret VARCHAR(32),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    failed_login_attempts INTEGER DEFAULT 0,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
```

#### user_sessions

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) UNIQUE NOT NULL,
    access_token_jti VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
```

#### password_reset_tokens

```sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(100) UNIQUE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_reset_tokens_token ON password_reset_tokens(token);
```

#### email_verification_tokens

```sql
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(100) UNIQUE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_token ON email_verification_tokens(token);
```

## 🔌 API Endpoints

### Authentication

#### POST /api/v1/auth/register

Registrazione nuovo utente con invio email di verifica.

**Request**:

```json
{
  "email": "medico@example.com",
  "password": "SecureP@ss123",
  "full_name": "Dr. Mario Rossi",
  "phone_number": "+39 333 1234567"
}
```

**Response** (201):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "medico@example.com",
      "full_name": "Dr. Mario Rossi",
      "is_verified": false,
      "role": "customer"
    },
    "message": "Verification email sent to medico@example.com"
  }
}
```

#### POST /api/v1/auth/login

Login con email e password, ritorna access token + refresh token.

**Request**:

```json
{
  "email": "medico@example.com",
  "password": "SecureP@ss123",
  "two_factor_code": "123456" // Opzionale se 2FA abilitato
}
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 14400, // 4 ore = 14400 secondi
    "user": {
      "id": "uuid",
      "email": "medico@example.com",
      "full_name": "Dr. Mario Rossi",
      "role": "customer"
    }
  }
}
```

**Set-Cookie**: `refresh_token=eyJ...; HttpOnly; Secure; SameSite=Strict`

#### POST /api/v1/auth/refresh

Rinnova access token usando refresh token.

**Request**: (Cookie `refresh_token` o body)

```json
{
  "refresh_token": "eyJ..." // Opzionale se presente in cookie
}
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...", // Nuovo refresh token (rotation)
    "expires_in": 14400 // 4 ore
  }
}
```

#### POST /api/v1/auth/logout

Logout con invalidazione del refresh token.

**Headers**: `Authorization: Bearer <access_token>`

**Response** (200):

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST /api/v1/auth/validate-token

Valida un access token (usato dagli altri servizi).

**Request**:

```json
{
  "token": "eyJ..."
}
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "valid": true,
    "user_id": "uuid",
    "email": "medico@example.com",
    "role": "customer",
    "expires_at": "2024-11-21T11:00:00Z"
  }
}
```

### Password Management

#### POST /api/v1/auth/password/forgot

Richiesta reset password con invio email.

**Request**:

```json
{
  "email": "medico@example.com"
}
```

**Response** (200):

```json
{
  "success": true,
  "message": "Password reset email sent if account exists"
}
```

#### POST /api/v1/auth/password/reset

Reset password con token ricevuto via email.

**Request**:

```json
{
  "token": "abc123...",
  "new_password": "NewSecureP@ss123"
}
```

**Response** (200):

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

#### POST /api/v1/auth/password/change

Cambio password per utente autenticato.

**Headers**: `Authorization: Bearer <token>`

**Request**:

```json
{
  "current_password": "OldPassword123",
  "new_password": "NewSecureP@ss123"
}
```

**Response** (200):

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Email Verification

#### POST /api/v1/auth/verify-email

Verifica email con token ricevuto via email.

**Request**:

```json
{
  "token": "verification_token_abc123"
}
```

**Response** (200):

```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

#### POST /api/v1/auth/resend-verification

Reinvia email di verifica.

**Request**:

```json
{
  "email": "medico@example.com"
}
```

**Response** (200):

```json
{
  "success": true,
  "message": "Verification email sent"
}
```

### User Management

#### GET /api/v1/users/me

Ottiene profilo utente corrente.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "medico@example.com",
    "full_name": "Dr. Mario Rossi",
    "phone_number": "+39 333 1234567",
    "role": "customer",
    "is_verified": true,
    "two_factor_enabled": false,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT /api/v1/users/me

Aggiorna profilo utente corrente.

**Headers**: `Authorization: Bearer <token>`

**Request**:

```json
{
  "full_name": "Dr. Mario Rossi Aggiornato",
  "phone_number": "+39 333 9999999"
}
```

**Response** (200):

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "medico@example.com",
    "full_name": "Dr. Mario Rossi Aggiornato",
    "phone_number": "+39 333 9999999"
  }
}
```

#### DELETE /api/v1/users/me

Soft delete account utente.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):

```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

### Two-Factor Authentication

#### POST /api/v1/auth/2fa/enable

Abilita 2FA per l'utente.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):

```json
{
  "success": true,
  "data": {
    "secret": "BASE32SECRET",
    "qr_code": "data:image/png;base64,...",
    "backup_codes": ["code1", "code2", ...]
  }
}
```

#### POST /api/v1/auth/2fa/verify

Verifica e attiva 2FA con codice TOTP.

**Headers**: `Authorization: Bearer <token>`

**Request**:

```json
{
  "code": "123456"
}
```

**Response** (200):

```json
{
  "success": true,
  "message": "Two-factor authentication enabled"
}
```

#### POST /api/v1/auth/2fa/disable

Disabilita 2FA.

**Headers**: `Authorization: Bearer <token>`

**Request**:

```json
{
  "password": "CurrentPassword123"
}
```

**Response** (200):

```json
{
  "success": true,
  "message": "Two-factor authentication disabled"
}
```

## 📤 Events Pubblicati (RabbitMQ)

### user.registered

Pubblicato quando un nuovo utente si registra.

```json
{
  "event_type": "user.registered",
  "timestamp": "2024-11-21T10:00:00Z",
  "correlation_id": "uuid",
  "source_service": "auth-service",
  "payload": {
    "user_id": "uuid",
    "email": "medico@example.com",
    "full_name": "Dr. Mario Rossi",
    "verification_token": "token_abc123"
  }
}
```

**Consumatori**: Notification Service (invio email di benvenuto)

### user.logged_in

Pubblicato ad ogni login riuscito.

```json
{
  "event_type": "user.logged_in",
  "timestamp": "2024-11-21T10:00:00Z",
  "correlation_id": "uuid",
  "source_service": "auth-service",
  "payload": {
    "user_id": "uuid",
    "email": "medico@example.com",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0..."
  }
}
```

**Consumatori**: Analytics Service, Audit Service

### user.password_changed

Pubblicato quando un utente cambia password.

```json
{
  "event_type": "user.password_changed",
  "timestamp": "2024-11-21T10:00:00Z",
  "correlation_id": "uuid",
  "source_service": "auth-service",
  "payload": {
    "user_id": "uuid",
    "email": "medico@example.com",
    "changed_by": "user|admin",
    "ip_address": "192.168.1.1"
  }
}
```

**Consumatori**: Notification Service (alert email), Audit Service

### user.email_verified

Pubblicato quando l'email viene verificata.

```json
{
  "event_type": "user.email_verified",
  "timestamp": "2024-11-21T10:00:00Z",
  "correlation_id": "uuid",
  "source_service": "auth-service",
  "payload": {
    "user_id": "uuid",
    "email": "medico@example.com"
  }
}
```

**Consumatori**: Billing Service (attiva trial), Notification Service

### user.2fa_enabled

Pubblicato quando viene abilitato 2FA.

```json
{
  "event_type": "user.2fa_enabled",
  "timestamp": "2024-11-21T10:00:00Z",
  "correlation_id": "uuid",
  "source_service": "auth-service",
  "payload": {
    "user_id": "uuid",
    "email": "medico@example.com"
  }
}
```

**Consumatori**: Audit Service, Notification Service

### user.deleted

Pubblicato quando un utente viene cancellato (soft delete).

```json
{
  "event_type": "user.deleted",
  "timestamp": "2024-11-21T10:00:00Z",
  "correlation_id": "uuid",
  "source_service": "auth-service",
  "payload": {
    "user_id": "uuid",
    "email": "medico@example.com",
    "deletion_reason": "user_request"
  }
}
```

**Consumatori**: Tutti i servizi (cleanup dati), Audit Service (GDPR compliance)

## 🔒 Security Requirements

### Password Policy

```python
# ⚠️ MEDICAL-GRADE SECURITY
PASSWORD_MIN_LENGTH = 12  # NON 8 - medical-grade requirement
PASSWORD_REQUIRE_UPPERCASE = True
PASSWORD_REQUIRE_LOWERCASE = True
PASSWORD_REQUIRE_DIGIT = True
PASSWORD_REQUIRE_SPECIAL = True
PASSWORD_COMMON_CHECK = True  # Check contro dizionario password comuni
PASSWORD_MAX_AGE_DAYS = None  # No expiry forzata (UX medicale)
```

### Rate Limiting

```python
RATE_LIMITS = {
    "login": "5/minute",           # Max 5 login attempts per minute
    "register": "3/hour",          # Max 3 registrazioni per ora
    "password_reset": "3/hour",    # Max 3 reset password per ora
    "authenticated": "100/minute", # Endpoint autenticati
}
```

### JWT Configuration

```python
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 240  # 4 ore = 240 minuti ⚠️ APPROVED
REFRESH_TOKEN_EXPIRE_DAYS = 7
REFRESH_TOKEN_ROTATION = True  # Security best practice
JWT_SECRET = "from_vault"  # MUST be from Vault, NEVER hardcoded
```

### Brute Force Protection

```python
MAX_FAILED_LOGIN_ATTEMPTS = 5
ACCOUNT_LOCKOUT_DURATION_MINUTES = 30
IP_BLACKLIST_DURATION_HOURS = 24
```

## 🧪 Testing Requirements

### Unit Tests (Coverage >= 90%) ⚠️ MEDICAL-GRADE

```python
# tests/unit/test_auth_service.py
- test_register_user_success()
- test_register_user_duplicate_email()
- test_login_valid_credentials()
- test_login_invalid_credentials()
- test_login_unverified_email()
- test_refresh_token_valid()
- test_refresh_token_expired()
- test_password_reset_flow()
- test_2fa_enable_flow()
```

### Integration Tests

```python
# tests/integration/test_auth_api.py
- test_full_registration_flow()
- test_full_login_logout_flow()
- test_full_password_reset_flow()
- test_concurrent_login_sessions()
- test_rate_limiting()
```

## 🚀 Development Tasks

### Phase 1: Core Authentication (Priority: HIGH)

- [ ] Setup FastAPI app con middleware
- [ ] Implement User model + migrations
- [ ] Implement JWT service (access + refresh tokens)
- [ ] Implement login/logout endpoints
- [ ] Implement session management con Redis
- [ ] Unit tests per JWT service
- [ ] Integration tests per auth endpoints

### Phase 2: User Management (Priority: HIGH)

- [ ] Implement registration endpoint
- [ ] Implement email verification flow OBBLIGATORIA ⚠️
- [ ] BLOCK unverified users da processare referti
- [ ] Implement password reset flow
- [ ] Implement user CRUD endpoints
- [ ] Soft delete permanente + anonymization
- [ ] RabbitMQ event publishing
- [ ] Integration con Notification Service

### Phase 3: Security Features (Priority: HIGH)

- [ ] Implement 2FA con TOTP (opzionale users)
- [ ] ENFORCE 2FA per ruolo admin ⚠️ OBBLIGATORIO
- [ ] Implement rate limiting
- [ ] Implement brute force protection (5 attempts → lock 30min)
- [ ] Implement CSRF protection
- [ ] Audit logging di tutte le operazioni
- [ ] Security headers middleware
- [ ] Password strength validator (min 12 chars)

### Phase 4: Advanced Features (Priority: LOW)

- [ ] OAuth2 integration (Google, Microsoft)
- [ ] API key generation per partner
- [ ] Session management UI
- [ ] Password strength meter
- [ ] Login history tracking

## 📊 Metrics & Monitoring

### Prometheus Metrics

```python
# Counters
auth_login_total{status="success|failed"}
auth_register_total{status="success|failed"}
auth_token_refresh_total{status="success|failed"}

# Histograms
auth_login_duration_seconds
auth_token_validation_duration_seconds

# Gauges
auth_active_sessions_total
auth_users_total{role="customer|partner|admin"}
```

### Health Checks

```python
GET /health       # Liveness: is the service running?
GET /ready        # Readiness: database + redis + vault connected?
GET /metrics      # Prometheus metrics
```

## 🔗 Dependencies

### External Services

- **PostgreSQL**: User data storage
- **Redis**: Session management, rate limiting
- **RabbitMQ**: Event publishing
- **Vault**: JWT secret, encryption keys
- **Notification Service**: Email sending

### Python Packages

```txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy[asyncio]==2.0.35
asyncpg==0.29.0
redis[hiredis]==5.0.8
aio-pika==9.4.3
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
pydantic==2.9.0
pydantic-settings==2.5.2
python-multipart==0.0.17
pyotp==2.9.0
qrcode==7.4.2
httpx==0.27.2
prometheus-client==0.20.0
slowapi==0.1.9
structlog==24.4.0
```

---

## ⚠️ DECISIONI APPROVATE (2024-11-22)

### JWT Configuration

- **Access Token**: 4 ore (240 minuti) - APPROVED per sessioni lunghe medici
- **Refresh Token**: 7 giorni con rotation
- Rationale: Bilanciamento security/UX per utilizzo medicale

### Email Verification

- **OBBLIGATORIA** - User NON può processare referti senza verifica
- Token expiry: 7 giorni
- Rationale: Compliance + anti-spam

### Password Policy

- **Min length**: 12 caratteri (medical-grade, non 8)
- Tutti i requisiti attivi (uppercase, lowercase, digit, special)
- Common password check
- NO expiry forzata

### 2FA

- **Opzionale** per utenti standard
- **OBBLIGATORIO** per ruolo admin
- TOTP con backup codes

### User Deletion

- **Soft delete permanente** (flag deleted_at)
- Anonymization PII per GDPR
- NO hard delete (compliance requirement)
- Grace period 30 giorni (schedulabile cancellazione)

### Testing

- **Coverage minimum**: 90% (medical-grade, non 80%)
- Security scan obbligatorio
- Load testing per 100-1000 utenti

### Reference

- See [REQUIREMENTS_DECISIONS.md](../../REQUIREMENTS_DECISIONS.md) per dettagli completi

---

**Status**: ✅ Ready for Development
**Assigned Agent**: TBD
**Estimated Time**: 4 giorni (medical-grade quality)
**Dependencies**: Nessuna (core service)
