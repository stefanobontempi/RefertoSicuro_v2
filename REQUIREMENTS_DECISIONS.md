# RefertoSicuro v2 - Requirements & Design Decisions

**Data**: 2024-11-22
**Status**: ✅ Approved by Stefano

---

## 📋 DECISIONI CRITICHE APPROVATE

### 🎯 Scope & Timeline

| Decisione                    | Valore              | Rationale                                                          |
| ---------------------------- | ------------------- | ------------------------------------------------------------------ |
| **Timeline MVP**             | Flessibile          | Priorità alla qualità e completezza, no deadline rigide            |
| **Utenti previsti (3 mesi)** | 100-1000            | Architettura medio-scalabile, caching necessario                   |
| **Utenti beta attuali**      | 10-50 medici        | Serve stabilità ragionevole da subito                              |
| **Team sviluppo**            | 1 persona (Stefano) | Serve automazione massima, docs chiare, sviluppo sequenziale       |
| **Priorità qualità**         | **Medical-grade**   | 90%+ test coverage, compliance assoluta, security scan obbligatori |

---

## 🔐 AUTH SERVICE - Decisioni

### Autenticazione

```yaml
JWT_STRATEGY: Access + Refresh tokens
ACCESS_TOKEN_EXPIRE: 4 ore # NON 15min standard - richiesta esplicita
REFRESH_TOKEN_EXPIRE: 7 giorni
REFRESH_TOKEN_ROTATION: true # Security best practice
PASSWORD_HASH_ALGORITHM: bcrypt # Standard, sicuro
```

**Rationale Access Token 4h**:

- Bilanciamento security vs UX
- Medici lavorano sessioni lunghe (visite, referti)
- Refresh token rotation mitiga rischio

### Email Verification

```yaml
EMAIL_VERIFICATION_REQUIRED: true # OBBLIGATORIA
VERIFICATION_TOKEN_EXPIRE: 7 giorni
BLOCK_UNVERIFIED_USERS: true # NON possono processare referti
```

**Rationale**:

- Compliance: verifica identità medico
- Anti-spam e account fake
- GDPR: comunicazioni solo a email verificate

### Password Policy

```yaml
PASSWORD_MIN_LENGTH: 12 # Medical-grade security
PASSWORD_REQUIRE_UPPERCASE: true
PASSWORD_REQUIRE_LOWERCASE: true
PASSWORD_REQUIRE_DIGIT: true
PASSWORD_REQUIRE_SPECIAL_CHAR: true
PASSWORD_COMMON_CHECK: true # Contro dizionario
PASSWORD_RESET_TOKEN_EXPIRE: 6 ore
```

### Two-Factor Authentication

```yaml
2FA_SUPPORTED: true # Opzionale per users, obbligatorio per admin
2FA_METHOD: TOTP # Google Authenticator, Authy
2FA_BACKUP_CODES: true
2FA_ADMIN_REQUIRED: true # Admin DEVE avere 2FA
```

### Rate Limiting

```yaml
RATE_LIMITS:
  login_attempts: 5/minute
  registration: 3/hour
  password_reset: 3/hour
  authenticated_endpoints: 100/minute

BRUTE_FORCE_PROTECTION:
  max_failed_logins: 5
  account_lockout_duration: 30 minuti
  ip_blacklist_after: 10 tentativi falliti
  ip_blacklist_duration: 24 ore
```

### User Deletion

```yaml
DELETION_STRATEGY: soft_delete # Flag deleted_at
HARD_DELETE_AFTER: never # Permanente per compliance
ANONYMIZATION_ON_DELETE: true # PII → [DELETED], keep audit trail
GDPR_DELETE_SCHEDULE: 30 giorni # User può annullare entro 30gg
```

---

## 💳 BILLING SERVICE - Decisioni

### Piani di Abbonamento

```yaml
PLANS:
  trial:
    duration_days: 7
    reports_quota: 20
    specializations: unlimited
    price_monthly: 0
    requires_credit_card: false # Trial gratuito senza CC
    auto_upgrade: false # Manuale dopo scadenza

  basic:
    reports_quota: 300
    specializations: 1
    price_monthly: 19.00 # Da confermare
    features:
      voice_input: false
      api_access: false
      custom_templates: false

  medium:
    reports_quota: 800
    specializations: 3
    price_monthly: 49.00 # Da confermare
    features:
      voice_input: true
      api_access: false
      custom_templates: false

  professional:
    reports_quota: 1500
    specializations: unlimited
    price_monthly: 99.00 # Da confermare
    features:
      voice_input: true
      api_access: true
      custom_templates: true
      priority_support: true

  enterprise:
    reports_quota: custom
    price: custom_quote
    features: all
    dedicated_support: true
```

### Quota Management

```yaml
QUOTA_ENFORCEMENT:
  strategy: soft_limit_with_overage # Solo se user abilita
  overage_enabled: user_configurable # Default: OFF
  overage_cost_per_report: 1.00 # EUR
  overage_notification: true # Email quando attiva overage

QUOTA_WARNINGS:
  - threshold: 80%
    action: email_warning
  - threshold: 90%
    action: email_warning + in-app_banner
  - threshold: 100%
    action: email_critical + block_if_no_overage

QUOTA_RESET:
  frequency: monthly
  reset_day: anniversary # Es. subscribed 15th → reset ogni 15
```

**Rationale Soft Limit**:

- User in controllo (opt-in overage)
- No sorprese: default è hard block a 100%
- Flessibilità per emergenze mediche

### Trial Period

```yaml
TRIAL:
  duration: 7 giorni
  requires_credit_card: false
  auto_convert: false # Manuale upgrade
  trial_expiry_action: account_suspended # Read-only mode
  trial_warning_days: [3, 1] # Email 3gg e 1gg prima scadenza
```

### Pagamenti

```yaml
PAYMENT_METHODS:
  stripe: true # v1 MVP
  paypal: false # v2 future
  bank_transfer: false # v2 future, solo enterprise

INVOICING:
  format: PDF + XML # Fattura elettronica Italia
  vat_rate: 22 # IVA Italia standard
  reverse_charge: true # B2B UE
  send_email: true
  storage: S3/MinIO

UPGRADE_DOWNGRADE:
  upgrade_mid_cycle: proration # Credita giorni, addebita nuovo
  downgrade_mid_cycle: end_of_cycle # Effettivo prossimo ciclo
```

---

## 🤖 REPORTS SERVICE - Decisioni

### Specializzazioni Mediche

```yaml
SPECIALIZATIONS:
  total: 19+
  v1_mvp: ALL # Già implementate su Azure
  migration: true # Migrazione da monolith, logica invariata

# Lista completa (da existing Azure)
SPECIALTY_CODES:
  - RAD: Radiologia
  - CARD: Cardiologia
  - NEUR: Neurologia
  - ORTH: Ortopedia
  - GIN: Ginecologia
  - PED: Pediatria
  - DERM: Dermatologia
  - OFT: Oftalmologia
  - ORL: Otorinolaringoiatria
  - URO: Urologia
  - GASTRO: Gastroenterologia
  - PNEUMO: Pneumologia
  - ENDO: Endocrinologia
  - REUMA: Reumatologia
  - EMATO: Ematologia
  - ONCO: Oncologia
  - MEDINT: Medicina Interna
  - CHIRGEN: Chirurgia Generale
  - ANES: Anestesia
  - EMERG: Emergenza
```

**Importante**: Agenti AI già configurati su Azure, solo migrazione architettura.

### AI Processing

```yaml
AZURE_OPENAI:
  model: gpt-4o # Potente, accuracy massima per medicina
  temperature: 0.3 # Deterministico per contenuti medici
  max_tokens: 4000 # ~3000 parole output
  timeout: 60 secondi
  streaming: true # SSE per UX migliore

PRIVACY:
  pii_sanitization: user_configurable # User decide
  sanitization_default: true # Consigliato ON
  sanitization_elements:
    - codice_fiscale: true
    - date_of_birth: true
    - phone_numbers: true
    - names: optional # NER-based, può ridurre qualità

STORAGE:
  default: no_storage # Privacy by design
  debug_mode: opt_in # User può abilitare per debug
  debug_retention: 7 giorni # Poi auto-delete
  anonymization_required: true # Anche se debug ON
```

**Rationale**:

- GPT-4o: Migliore per terminologia medica complessa
- Temperature 0.3: Bilanciamento accuracy vs naturalezza
- PII configurabile: Medico decide trade-off privacy/qualità

### Voice-to-Text

```yaml
VOICE_TO_TEXT:
  enabled: true
  plan_required: professional # Solo Pro+ users

AZURE_SPEECH:
  language: it-IT
  recognition_mode: continuous
  profanity_filter: false # Terminologia medica

LIMITS:
  max_duration_seconds: 600 # 10 minuti
  max_file_size_mb: 25
  formats: [mp3, wav, m4a, ogg]
```

---

## 📊 AUDIT & COMPLIANCE - Decisioni

### GDPR Compliance

```yaml
GDPR_EXPORT:
  response_time: 24 ore # Background job
  format: ZIP (JSON + PDF)
  delivery: email_link
  link_expiry: 7 giorni
  encryption: true # ZIP password-protected

GDPR_DELETE:
  strategy: anonymization # NON hard delete
  pii_replacement: [DELETED]
  audit_trail_kept: true # Compliance requirement
  schedule_delay: 30 giorni # User può annullare
  notification: email_confirmation

GDPR_RECTIFY:
  self_service: true # User corregge da profilo
  admin_approval: false # Immediate update
  audit_log: true
```

### Audit Logging

```yaml
AUDIT_TRAIL:
  retention: permanent # MAI cancellare
  partitioning: monthly # Performance
  encryption_at_rest: true
  immutable: true # Append-only, no updates/deletes

EVENTS_LOGGED:
  - all_logins: true
  - user_data_changes: true
  - report_processing: true
  - payments: true
  - subscription_changes: true
  - admin_actions: true
  - gdpr_requests: true
  - api_calls: true # Per partner API

AI_DECISION_LOGS:
  retention: permanent
  fields:
    - model_name
    - model_version
    - specialty
    - input_hash: SHA256 # Privacy
    - output_hash: SHA256
    - tokens_used
    - processing_time_ms
    - confidence_score
    - human_review_required
```

**Rationale Permanente**:

- Compliance medicale Italia: 7-10 anni minimum
- Audit trail legale: mai cancellare
- Storage economico (partitioned, compressed)

### Data Retention

```yaml
RETENTION_POLICIES:
  audit_logs: permanent
  ai_decision_logs: permanent
  user_data_deleted: 30 giorni # Grace period
  gdpr_export_files: 7 giorni
  payment_records: 10 anni # Legge fiscale Italia
  invoices: 10 anni
  debug_logs: 7 giorni # Auto-delete
  session_data: 7 giorni after logout
```

---

## 📧 NOTIFICATION SERVICE - Decisioni

### Email Templates (v1)

```yaml
TEMPLATES_V1:
  - welcome_email: true
  - email_verification: true
  - password_reset: true
  - password_changed_alert: true
  - trial_started: true
  - trial_ending_3days: true
  - trial_ending_1day: true
  - trial_expired: true
  - payment_successful: true
  - payment_failed: true
  - subscription_cancelled: true
  - quota_warning_80: true
  - quota_warning_90: true
  - quota_exceeded: true
  - invoice_receipt: true
  - gdpr_export_ready: true

LANGUAGE: italiano # v1, multi-lingua v2

EMAIL_PROVIDER:
  development: MailHog
  production: TBD # SendGrid, Mailgun, SES
```

### SMS Notifications

```yaml
SMS_ENABLED: false # v2 future
SMS_USE_CASES:
  - 2fa_codes: v2
  - critical_alerts: v2
```

---

## 🔧 TECHNICAL DECISIONS

### Database

```yaml
POSTGRESQL_VERSION: 16 # Latest stable
CONNECTION_POOLING: PgBouncer
BACKUP_FREQUENCY: daily
BACKUP_RETENTION: 30 giorni
BACKUP_DESTINATION: S3-compatible (MinIO dev, Cloudflare R2 prod)
RTO: 4 ore
RPO: 1 ora
```

### Caching

```yaml
REDIS_USAGE:
  - session_storage: true
  - rate_limiting: true
  - api_response_cache: false # v1, medical data sempre fresh
  - quota_counters: true

CACHE_TTL:
  sessions: 4 ore # Match access token
  rate_limit_windows: 1 minuto
  quota_counters: 1 ora
```

### Deployment

```yaml
PLATFORM: Docker Compose
ENVIRONMENT_STRATEGY:
  development: docker-compose.dev.yml
  staging: docker-compose.staging.yml # Auto-deploy from develop
  production: docker-compose.prod.yml # Manual approval

SECRETS_MANAGEMENT:
  development: .env files
  staging: HashiCorp Vault
  production: HashiCorp Vault

CI_CD:
  pipeline: GitHub Actions
  security_scan:
    - trivy: container vulnerabilities
    - semgrep: SAST code analysis
    - bandit: Python security
    - safety: dependency vulnerabilities
    - gitleaks: secrets detection
  blocking_threshold: CRITICAL vulnerabilities
  test_coverage_minimum: 90% # Medical-grade
```

### Monitoring

```yaml
OBSERVABILITY_STACK:
  metrics: Prometheus + Grafana
  logging: Loki + Promtail
  tracing: Jaeger
  alerting: TBD (Slack, PagerDuty, email)
  error_tracking: Sentry or self-hosted

HEALTH_CHECKS:
  liveness: /health
  readiness: /ready
  metrics: /metrics (Prometheus format)
  interval: 30 secondi
```

---

## 🎯 MVP SCOPE - Feature Matrix

| Feature                        | v1 MVP | Priority | Notes                  |
| ------------------------------ | ------ | -------- | ---------------------- |
| **Auth Service**               |
| Registration + Email verify    | ✅     | CRITICAL | Obbligatorio           |
| Login (JWT 4h + Refresh 7d)    | ✅     | CRITICAL |                        |
| Password reset                 | ✅     | CRITICAL |                        |
| 2FA (optional users)           | ✅     | HIGH     |                        |
| 2FA (mandatory admin)          | ✅     | CRITICAL |                        |
| OAuth (Google, MS)             | ❌     | v2       |                        |
| **Billing Service**            |
| Subscription plans CRUD        | ✅     | CRITICAL |                        |
| Trial 7 giorni                 | ✅     | CRITICAL | No CC required         |
| Stripe integration             | ✅     | CRITICAL |                        |
| PayPal integration             | ❌     | v2       |                        |
| Quota enforcement              | ✅     | CRITICAL | Hard block default     |
| Overage opt-in                 | ✅     | HIGH     | User-configurable      |
| Invoice PDF + XML              | ✅     | HIGH     | Fattura elettronica    |
| **Reports Service**            |
| AI processing (19+ specialità) | ✅     | CRITICAL | Migrazione da existing |
| Streaming SSE                  | ✅     | HIGH     | UX                     |
| PII sanitization               | ✅     | CRITICAL | Configurabile          |
| Voice-to-text (Pro+)           | ✅     | MEDIUM   | Azure Speech           |
| Template custom                | ✅     | MEDIUM   | Pro+ only              |
| **Audit Service**              |
| Audit trail immutabile         | ✅     | CRITICAL | Permanent retention    |
| GDPR export (24h)              | ✅     | CRITICAL | ZIP with JSON+PDF      |
| GDPR delete (anonymization)    | ✅     | CRITICAL | 30gg grace period      |
| AI decision logging            | ✅     | CRITICAL | AI Act compliance      |
| **Notification Service**       |
| Email templates (16+)          | ✅     | CRITICAL | Italiano               |
| SMTP integration               | ✅     | CRITICAL |                        |
| SMS notifications              | ❌     | v2       |                        |
| Push notifications             | ❌     | v2       |                        |
| **Analytics Service**          |
| Event collection               | ✅     | HIGH     | Anonimizzato           |
| Metrics aggregation            | ✅     | MEDIUM   | Hourly/daily           |
| KPI dashboard                  | ✅     | MEDIUM   |                        |
| **Admin Service**              |
| Dashboard overview             | ✅     | HIGH     |                        |
| User management                | ✅     | HIGH     | Suspend/activate       |
| System health                  | ✅     | HIGH     |                        |
| Impersonate user               | ❌     | v2       | Con audit              |

---

## 🚀 DEVELOPMENT PRIORITY ORDER

Basato su dipendenze e criticità:

### Phase 1: Foundation (Week 1)

1. **Auth Service** - 4 giorni
   - No dependencies
   - Blocca tutto il resto
   - 90%+ test coverage

### Phase 2: Core Business (Week 2)

2. **Billing Service** - 4 giorni

   - Depends: Auth
   - Critical per monetizzazione

3. **Notification Service** - 3 giorni (parallel con Billing)
   - Depends: Auth
   - Necessario per onboarding

### Phase 3: Main Feature (Week 3)

4. **Reports Service** - 5 giorni
   - Depends: Auth, Billing (quota)
   - Core value proposition
   - Migrazione logica existing

### Phase 4: Compliance (Week 4)

5. **Audit Service** - 5 giorni
   - Depends: ALL services (consuma events)
   - CRITICAL compliance
   - Non può essere posticipato

### Phase 5: Analytics & Admin (Week 5)

6. **Analytics Service** - 3 giorni (parallel con Admin)

   - Depends: Events da tutti

7. **Admin Service** - 3 giorni
   - Depends: Tutti i servizi
   - Nice to have, non bloccante

**Stima Totale**: 5 settimane sviluppo sequenziale con medical-grade quality

---

## ✅ VALIDATION CHECKLIST

Prima di considerare un servizio "completato":

- [ ] Test coverage >= 90%
- [ ] Security scan passed (no CRITICAL vulnerabilities)
- [ ] Health checks implemented (/health, /ready, /metrics)
- [ ] OpenAPI schema documented
- [ ] README con esempi d'uso
- [ ] Audit logging attivo
- [ ] GDPR compliance verificata
- [ ] Medical disclaimer presente (se applicabile)
- [ ] Docker container building
- [ ] Integration tests passing
- [ ] Load testing eseguito (100-1000 utenti simulati)
- [ ] Logs strutturati (JSON)
- [ ] Error tracking configurato
- [ ] Backup strategy testata

---

**Approvato da**: Stefano
**Data**: 2024-11-22
**Versione**: 1.0.0
**Next**: Aggiornare DEVELOPMENT.md files con queste decisioni
