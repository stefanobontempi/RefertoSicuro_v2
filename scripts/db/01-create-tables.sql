-- =============================================
-- RefertoSicuro v2 - Core Tables Creation
-- =============================================
-- This script creates all core tables for the application

\c refertosicuro_dev

-- =============================================
-- AUTH SCHEMA - User Management & Authentication
-- =============================================

-- Users table
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    phone_verified BOOLEAN DEFAULT FALSE,
    vat_number VARCHAR(50),
    company_name VARCHAR(255),

    -- Security fields
    totp_secret VARCHAR(255),
    totp_enabled BOOLEAN DEFAULT FALSE,
    backup_codes TEXT[],

    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    failed_login_count INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- User sessions
CREATE TABLE IF NOT EXISTS auth.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    refresh_token_hash VARCHAR(255) UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    device_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- User roles
CREATE TABLE IF NOT EXISTS auth.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- User role assignments
CREATE TABLE IF NOT EXISTS auth.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES auth.roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ,
    UNIQUE(user_id, role_id)
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS auth.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS auth.email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for auth schema
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone ON auth.users(phone) WHERE phone IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON auth.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON auth.user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON auth.user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON auth.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON auth.password_reset_tokens(token_hash);

-- =============================================
-- REPORTS SCHEMA - Medical Reports Management
-- =============================================

-- Medical specialties
CREATE TABLE IF NOT EXISTS reports.medical_specialties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    ai_assistant_id VARCHAR(255),
    ai_model VARCHAR(100) DEFAULT 'gpt-4-turbo',
    max_tokens INT DEFAULT 4000,
    temperature NUMERIC(3,2) DEFAULT 0.7,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Reports
CREATE TABLE IF NOT EXISTS reports.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    specialty_id UUID REFERENCES reports.medical_specialties(id),

    -- Content (encrypted in production)
    input_text TEXT NOT NULL,
    output_text TEXT,
    suggestions JSONB DEFAULT '[]'::jsonb,

    -- Metadata
    input_tokens INT,
    output_tokens INT,
    processing_time_ms INT,
    ai_model VARCHAR(100),
    ai_response_id VARCHAR(255),

    -- User feedback
    user_rating INT CHECK (user_rating BETWEEN 1 AND 5),
    user_feedback TEXT,

    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

-- Report templates
CREATE TABLE IF NOT EXISTS reports.templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    specialty_id UUID REFERENCES reports.medical_specialties(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_text TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for reports schema
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports.reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_specialty ON reports.reports(specialty_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports.reports(status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_specialties_code ON reports.medical_specialties(code) WHERE is_active = true;

-- =============================================
-- BILLING SCHEMA - Subscriptions & Payments
-- =============================================

-- Subscription plans
CREATE TABLE IF NOT EXISTS billing.subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,

    -- Pricing
    monthly_price DECIMAL(10,2),
    yearly_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'EUR',

    -- Limits
    report_quota INT,
    max_specialties INT,
    max_users INT DEFAULT 1,

    -- Features
    features JSONB DEFAULT '{}'::jsonb,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,

    -- Stripe/PayPal IDs
    stripe_price_id_monthly VARCHAR(255),
    stripe_price_id_yearly VARCHAR(255),
    paypal_plan_id_monthly VARCHAR(255),
    paypal_plan_id_yearly VARCHAR(255),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS billing.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    plan_id UUID NOT NULL REFERENCES billing.subscription_plans(id),

    -- Subscription details
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly',

    -- Period dates
    current_period_start DATE NOT NULL,
    current_period_end DATE NOT NULL,
    trial_end DATE,

    -- Cancellation
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,

    -- Usage
    reports_used INT DEFAULT 0,
    reports_quota_override INT,

    -- External IDs
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    paypal_subscription_id VARCHAR(255),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- Payments
CREATE TABLE IF NOT EXISTS billing.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    subscription_id UUID REFERENCES billing.user_subscriptions(id),

    -- Amount
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50),

    -- External references
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    paypal_order_id VARCHAR(255),
    paypal_capture_id VARCHAR(255),

    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ
);

-- Invoices
CREATE TABLE IF NOT EXISTS billing.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    subscription_id UUID REFERENCES billing.user_subscriptions(id),
    payment_id UUID REFERENCES billing.payments(id),

    -- Invoice details
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,

    -- Amounts
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',

    -- Line items
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Status
    status VARCHAR(50) DEFAULT 'draft',

    -- Files
    pdf_url VARCHAR(500),

    -- External IDs
    stripe_invoice_id VARCHAR(255),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for billing schema
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON billing.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON billing.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user ON billing.payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON billing.payments(status);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON billing.invoices(user_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON billing.invoices(invoice_number);

-- =============================================
-- ANALYTICS SCHEMA - Events & Metrics
-- =============================================

-- Events tracking
CREATE TABLE IF NOT EXISTS analytics.events (
    id UUID DEFAULT uuid_generate_v4(),
    user_id UUID,
    session_id UUID,
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50),
    event_data JSONB DEFAULT '{}'::jsonb,

    -- Context
    ip_address INET,
    user_agent TEXT,
    referer TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at)  -- Include partition key in PRIMARY KEY
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for events (current and previous months)
CREATE TABLE IF NOT EXISTS analytics.events_2025_10 PARTITION OF analytics.events
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE IF NOT EXISTS analytics.events_2025_11 PARTITION OF analytics.events
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE IF NOT EXISTS analytics.events_2025_12 PARTITION OF analytics.events
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Daily metrics aggregation
CREATE TABLE IF NOT EXISTS analytics.metrics_daily (
    date DATE NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(20,4),
    dimensions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (date, metric_name)
);

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_events_user ON analytics.events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON analytics.events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON analytics.metrics_daily(date DESC);

-- =============================================
-- ADMIN SCHEMA - System Configuration
-- =============================================

-- System configuration
CREATE TABLE IF NOT EXISTS admin.system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    value_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID
);

-- Compliance records
CREATE TABLE IF NOT EXISTS admin.compliance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    record_type VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for admin
CREATE INDEX IF NOT EXISTS idx_config_key ON admin.system_config(key);
CREATE INDEX IF NOT EXISTS idx_compliance_user ON admin.compliance_records(user_id, created_at DESC);

-- =============================================
-- Add update triggers for all tables with updated_at
-- =============================================

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION shared.update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON auth.roles
    FOR EACH ROW EXECUTE FUNCTION shared.update_updated_at_column();

CREATE TRIGGER update_specialties_updated_at BEFORE UPDATE ON reports.medical_specialties
    FOR EACH ROW EXECUTE FUNCTION shared.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports.reports
    FOR EACH ROW EXECUTE FUNCTION shared.update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON reports.templates
    FOR EACH ROW EXECUTE FUNCTION shared.update_updated_at_column();

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON billing.subscription_plans
    FOR EACH ROW EXECUTE FUNCTION shared.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON billing.user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION shared.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON billing.invoices
    FOR EACH ROW EXECUTE FUNCTION shared.update_updated_at_column();

-- Grant permissions on new tables
GRANT ALL ON ALL TABLES IN SCHEMA auth TO auth_service;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO auth_service;

GRANT ALL ON ALL TABLES IN SCHEMA reports TO reports_service;
GRANT ALL ON ALL SEQUENCES IN SCHEMA reports TO reports_service;

GRANT ALL ON ALL TABLES IN SCHEMA billing TO billing_service;
GRANT ALL ON ALL SEQUENCES IN SCHEMA billing TO billing_service;

GRANT ALL ON ALL TABLES IN SCHEMA admin TO admin_service;
GRANT ALL ON ALL SEQUENCES IN SCHEMA admin TO admin_service;

GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO analytics_service;
GRANT ALL ON ALL SEQUENCES IN SCHEMA analytics TO analytics_service;

-- Output confirmation
DO $$
BEGIN
    RAISE NOTICE 'All tables created successfully!';
    RAISE NOTICE 'Schemas populated: auth, reports, billing, admin, analytics';
    RAISE NOTICE 'Triggers and indexes created';
    RAISE NOTICE 'Permissions granted to service users';
END
$$;