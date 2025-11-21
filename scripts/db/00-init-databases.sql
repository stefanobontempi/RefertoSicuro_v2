-- =============================================
-- RefertoSicuro v2 - PostgreSQL Initialization
-- =============================================
-- This script initializes all databases and users
-- Run as superuser (postgres)

-- Set client encoding
SET client_encoding = 'UTF8';

-- Create main database if not exists
SELECT 'CREATE DATABASE refertosicuro_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'refertosicuro_dev')\gexec

-- Connect to main database
\c refertosicuro_dev

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Encryption functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Trigram text search
CREATE EXTENSION IF NOT EXISTS "unaccent";       -- Remove accents for search
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query performance monitoring

-- Create schemas for logical separation
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS reports;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS admin;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS shared;

-- Create service users with proper passwords (from Vault in production)
DO $$
BEGIN
    -- Auth service user
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'auth_service') THEN
        CREATE USER auth_service WITH PASSWORD 'auth_dev_password_change_me';
    END IF;

    -- Reports service user
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'reports_service') THEN
        CREATE USER reports_service WITH PASSWORD 'reports_dev_password_change_me';
    END IF;

    -- Billing service user
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'billing_service') THEN
        CREATE USER billing_service WITH PASSWORD 'billing_dev_password_change_me';
    END IF;

    -- Admin service user
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'admin_service') THEN
        CREATE USER admin_service WITH PASSWORD 'admin_dev_password_change_me';
    END IF;

    -- Analytics service user (read-only)
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'analytics_service') THEN
        CREATE USER analytics_service WITH PASSWORD 'analytics_dev_password_change_me';
    END IF;

    -- Application read-only user for reporting
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'readonly_user') THEN
        CREATE USER readonly_user WITH PASSWORD 'readonly_password_change_me';
    END IF;
END
$$;

-- Grant schema permissions
GRANT ALL ON SCHEMA auth TO auth_service;
GRANT USAGE ON SCHEMA auth TO admin_service;
GRANT USAGE ON SCHEMA auth TO analytics_service;

GRANT ALL ON SCHEMA reports TO reports_service;
GRANT USAGE ON SCHEMA reports TO admin_service;
GRANT USAGE ON SCHEMA reports TO analytics_service;

GRANT ALL ON SCHEMA billing TO billing_service;
GRANT USAGE ON SCHEMA billing TO admin_service;
GRANT USAGE ON SCHEMA billing TO analytics_service;

GRANT ALL ON SCHEMA admin TO admin_service;
GRANT USAGE ON SCHEMA admin TO analytics_service;

GRANT ALL ON SCHEMA analytics TO analytics_service;
GRANT USAGE ON SCHEMA analytics TO admin_service;

GRANT USAGE ON SCHEMA shared TO auth_service, reports_service, billing_service, admin_service, analytics_service;

-- Set default search path for users
ALTER USER auth_service SET search_path TO auth, shared, public;
ALTER USER reports_service SET search_path TO reports, shared, public;
ALTER USER billing_service SET search_path TO billing, shared, public;
ALTER USER admin_service SET search_path TO admin, auth, reports, billing, analytics, shared, public;
ALTER USER analytics_service SET search_path TO analytics, shared, public;

-- Grant permissions on future objects
ALTER DEFAULT PRIVILEGES FOR USER auth_service IN SCHEMA auth
    GRANT ALL ON TABLES TO auth_service;
ALTER DEFAULT PRIVILEGES FOR USER auth_service IN SCHEMA auth
    GRANT ALL ON SEQUENCES TO auth_service;

ALTER DEFAULT PRIVILEGES FOR USER reports_service IN SCHEMA reports
    GRANT ALL ON TABLES TO reports_service;
ALTER DEFAULT PRIVILEGES FOR USER reports_service IN SCHEMA reports
    GRANT ALL ON SEQUENCES TO reports_service;

ALTER DEFAULT PRIVILEGES FOR USER billing_service IN SCHEMA billing
    GRANT ALL ON TABLES TO billing_service;
ALTER DEFAULT PRIVILEGES FOR USER billing_service IN SCHEMA billing
    GRANT ALL ON SEQUENCES TO billing_service;

ALTER DEFAULT PRIVILEGES FOR USER admin_service IN SCHEMA admin
    GRANT ALL ON TABLES TO admin_service;
ALTER DEFAULT PRIVILEGES FOR USER admin_service IN SCHEMA admin
    GRANT ALL ON SEQUENCES TO admin_service;

-- Read-only permissions for analytics user
ALTER DEFAULT PRIVILEGES IN SCHEMA auth, reports, billing, admin
    GRANT SELECT ON TABLES TO analytics_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth, reports, billing, admin
    GRANT SELECT ON SEQUENCES TO analytics_service;

-- Create audit log table in shared schema
CREATE TABLE IF NOT EXISTS shared.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    operation VARCHAR(20) NOT NULL,
    user_id UUID,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Create index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON shared.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_service ON shared.audit_logs(service_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON shared.audit_logs(user_id, created_at DESC);

-- Grant permissions on audit logs
GRANT INSERT ON shared.audit_logs TO auth_service, reports_service, billing_service, admin_service;
GRANT SELECT ON shared.audit_logs TO admin_service, analytics_service;

-- Create function for updated_at timestamp
CREATE OR REPLACE FUNCTION shared.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function for soft delete
CREATE OR REPLACE FUNCTION shared.soft_delete()
RETURNS TRIGGER AS $$
BEGIN
    NEW.deleted_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Output confirmation
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully!';
    RAISE NOTICE 'Schemas created: auth, reports, billing, admin, analytics, shared';
    RAISE NOTICE 'Users created: auth_service, reports_service, billing_service, admin_service, analytics_service';
    RAISE NOTICE 'Extensions enabled: uuid-ossp, pgcrypto, pg_trgm, unaccent, pg_stat_statements';
END
$$;