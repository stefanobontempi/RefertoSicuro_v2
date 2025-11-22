# RefertoSicuro v2 - Microservices Overview

## Architettura Generale

RefertoSicuro v2 è costruito con un'architettura a microservizi per garantire scalabilità, manutenibilità e isolamento delle responsabilità.

## Microservizi Core

| Servizio             | Port | Database   | Responsabilità                       | Status            |
| -------------------- | ---- | ---------- | ------------------------------------ | ----------------- |
| Auth Service         | 8010 | PostgreSQL | Autenticazione, JWT, User Management | ✅ Ready          |
| Reports Service      | 8011 | PostgreSQL | Elaborazione AI, Specializzazioni    | 🚧 In Development |
| Billing Service      | 8012 | PostgreSQL | Stripe, PayPal, Subscriptions        | ✅ Ready          |
| Admin Service        | 8013 | PostgreSQL | Dashboard, User Management           | ✅ Ready          |
| Analytics Service    | 8014 | MongoDB    | Metriche, Events, KPIs               | ✅ Ready          |
| Notification Service | 8015 | PostgreSQL | Email, SMS, Push Notifications       | ✅ Ready          |
| Audit Service        | 8016 | PostgreSQL | Compliance, GDPR, Audit Trail        | ❌ To Create      |

## Convenzioni Comuni

### Naming Conventions

#### Database Tables

- Formato: `snake_case`
- Esempi: `users`, `user_sessions`, `subscription_plans`

#### API Endpoints

- Formato: `/api/v{version}/{resource}`
- Esempi: `/api/v2/auth/login`, `/api/v2/reports/process`

#### Environment Variables

- Formato: `UPPER_SNAKE_CASE`
- Service-specific prefix quando necessario
- Esempi: `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL`

#### Python Code

- Classes: `PascalCase` (es: `UserService`, `JWTManager`)
- Functions/Methods: `snake_case` (es: `create_user`, `validate_token`)
- Constants: `UPPER_SNAKE_CASE` (es: `MAX_LOGIN_ATTEMPTS`)
- Private methods: `_snake_case` con underscore prefix

#### TypeScript/React Code

- Components: `PascalCase` (es: `LoginForm`, `UserProfile`)
- Functions: `camelCase` (es: `handleSubmit`, `fetchUserData`)
- Constants: `UPPER_SNAKE_CASE` (es: `API_BASE_URL`)
- Interfaces: `PascalCase` con `I` prefix opzionale (es: `User`, `IUserResponse`)

### Shared Models e DTOs

Tutti i servizi condividono le stesse definizioni per entità comuni:

#### User Model

```python
class User(Base):
    __tablename__ = "users"

    id: UUID = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email: str = Column(String(255), unique=True, nullable=False, index=True)
    full_name: str = Column(String(255), nullable=False)
    hashed_password: str = Column(String(255), nullable=False)
    is_active: bool = Column(Boolean, default=True)
    is_verified: bool = Column(Boolean, default=False)
    role: UserRole = Column(Enum(UserRole), default=UserRole.CUSTOMER)
    created_at: datetime = Column(DateTime, default=datetime.utcnow)
    updated_at: datetime = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: datetime | None = Column(DateTime, nullable=True)
```

#### UserRole Enum

```python
class UserRole(str, Enum):
    CUSTOMER = "customer"
    PARTNER = "partner"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"
```

#### Subscription Plan Model

```python
class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id: UUID = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name: str = Column(String(50), unique=True, nullable=False)
    display_name: str = Column(String(100), nullable=False)
    description: str = Column(Text, nullable=True)
    price_monthly: Decimal = Column(Numeric(10, 2), nullable=False)
    price_yearly: Decimal = Column(Numeric(10, 2), nullable=True)
    reports_quota: int = Column(Integer, nullable=False)
    specializations_limit: int | None = Column(Integer, nullable=True)
    features: dict = Column(JSONB, default={})
    is_active: bool = Column(Boolean, default=True)
    stripe_price_id_monthly: str | None = Column(String(100), nullable=True)
    stripe_price_id_yearly: str | None = Column(String(100), nullable=True)
```

#### Medical Specialty Enum

```python
class MedicalSpecialty(str, Enum):
    """19+ specializzazioni mediche supportate"""
    RADIOLOGIA = "RAD"
    CARDIOLOGIA = "CARD"
    NEUROLOGIA = "NEUR"
    ORTOPEDIA = "ORTH"
    GINECOLOGIA = "GIN"
    PEDIATRIA = "PED"
    DERMATOLOGIA = "DERM"
    OFTALMOLOGIA = "OFT"
    ORL = "ORL"
    UROLOGIA = "URO"
    GASTROENTEROLOGIA = "GASTRO"
    PNEUMOLOGIA = "PNEUMO"
    ENDOCRINOLOGIA = "ENDO"
    REUMATOLOGIA = "REUMA"
    EMATOLOGIA = "EMATO"
    ONCOLOGIA = "ONCO"
    MEDICINA_INTERNA = "MEDINT"
    CHIRURGIA_GENERALE = "CHIRGEN"
    ANESTESIA = "ANES"
    EMERGENZA = "EMERG"
```

### API Response Format

Tutti i servizi DEVONO usare questo formato per le risposte:

#### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "request_id": "uuid-v4"
}
```

#### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  },
  "request_id": "uuid-v4"
}
```

#### Paginated Response

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 100,
      "total_pages": 5
    }
  },
  "request_id": "uuid-v4"
}
```

### Error Codes Standard

Tutti i servizi DEVONO usare questi codici di errore standard:

| Code                  | HTTP Status | Descrizione                     |
| --------------------- | ----------- | ------------------------------- |
| `VALIDATION_ERROR`    | 400         | Input validation failed         |
| `UNAUTHORIZED`        | 401         | Authentication required         |
| `FORBIDDEN`           | 403         | Insufficient permissions        |
| `NOT_FOUND`           | 404         | Resource not found              |
| `CONFLICT`            | 409         | Resource already exists         |
| `QUOTA_EXCEEDED`      | 429         | Rate limit or quota exceeded    |
| `INTERNAL_ERROR`      | 500         | Internal server error           |
| `SERVICE_UNAVAILABLE` | 503         | Service temporarily unavailable |

### Health Check Endpoints

Ogni servizio DEVE implementare:

```python
@app.get("/health")
async def health_check():
    """Liveness probe - Is the service running?"""
    return {"status": "healthy"}

@app.get("/ready")
async def readiness_check():
    """Readiness probe - Is the service ready to accept traffic?"""
    # Check database, redis, etc.
    return {"ready": True, "checks": {...}}

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    # Return Prometheus format metrics
```

### Inter-Service Communication

#### HTTP Client Configuration

```python
from httpx import AsyncClient, Timeout

# Shared HTTP client configuration
HTTP_CLIENT_CONFIG = {
    "timeout": Timeout(5.0, connect=2.0),
    "follow_redirects": True,
    "http2": True,
}

# Service URLs (from environment)
SERVICE_URLS = {
    "auth": os.getenv("AUTH_SERVICE_URL", "http://auth-service:8010"),
    "billing": os.getenv("BILLING_SERVICE_URL", "http://billing-service:8012"),
    "reports": os.getenv("REPORTS_SERVICE_URL", "http://reports-service:8011"),
    # ...
}
```

#### RabbitMQ Event Format

```python
{
    "event_type": "user.registered",  # Format: entity.action
    "timestamp": "2024-11-21T10:00:00Z",
    "correlation_id": "uuid-v4",
    "source_service": "auth-service",
    "payload": {
        # Event-specific data
    },
    "metadata": {
        "user_id": "uuid-v4",
        "trace_id": "uuid-v4"
    }
}
```

### Security Headers

Tutti i servizi DEVONO applicare questi security headers:

```python
SECURITY_HEADERS = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(self), camera=()",
}
```

### Logging Format

Tutti i servizi DEVONO usare structured logging in JSON:

```json
{
  "timestamp": "2024-11-21T10:00:00.000Z",
  "level": "INFO",
  "service": "auth-service",
  "request_id": "uuid-v4",
  "trace_id": "uuid-v4",
  "message": "User logged in successfully",
  "context": {
    "user_id": "uuid-v4",
    "ip_address": "192.168.1.1"
  }
}
```

### Database Migration Strategy

Ogni servizio gestisce le proprie migrations con Alembic:

```bash
# Create migration
alembic revision --autogenerate -m "Add user table"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Testing Requirements

Ogni servizio DEVE avere:

1. **Unit Tests**: Coverage minimo 80%

   - `tests/unit/` - Business logic tests

2. **Integration Tests**: API endpoints

   - `tests/integration/` - API integration tests

3. **Contract Tests**: Inter-service communication
   - `tests/contracts/` - API contract tests

### Environment Variables Comuni

Tutti i servizi condividono queste variabili:

```bash
# General
ENVIRONMENT=development|staging|production
LOG_LEVEL=debug|info|warning|error
TZ=Europe/Rome

# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=refertosicuro_dev
POSTGRES_USER=refertosicuro
POSTGRES_PASSWORD=***

# Redis
REDIS_URL=redis://redis:6379

# RabbitMQ
RABBITMQ_URL=amqp://admin:***@rabbitmq:5672/refertosicuro

# Vault
VAULT_ADDR=http://vault:8200
VAULT_TOKEN=***
```

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/SERVICE-XXX-description
```

### 2. Implement Feature

- Scrivere codice seguendo le convenzioni
- Implementare test (unit + integration)
- Aggiornare documentazione

### 3. Run Tests

```bash
pytest tests/ --cov=app --cov-report=html
```

### 4. Commit & Push

```bash
git commit -m "feat(service): description"
git push origin feature/SERVICE-XXX-description
```

### 5. Create Pull Request

- Almeno 1 review richiesta
- CI/CD checks devono passare
- Coverage >= 80%

## Deployment Strategy

### Development

- Docker Compose
- Auto-reload on code changes
- Shared volumes

### Staging

- Kubernetes (Minikube/Kind)
- Simula ambiente production
- Test end-to-end

### Production

- Kubernetes (GKE/EKS/AKS)
- Auto-scaling
- Multi-region
- Health checks e readiness probes

---

**Ultimo Aggiornamento**: 2024-11-21
**Versione**: 2.0.0
