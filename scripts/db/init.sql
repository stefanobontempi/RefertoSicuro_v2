-- Database initialization for RefertoSicuro

-- Create databases (PostgreSQL syntax - handle errors for existing DBs)
CREATE DATABASE auth_db;
CREATE DATABASE reports_db;
CREATE DATABASE billing_db;
CREATE DATABASE admin_db;
CREATE DATABASE analytics_db;

-- Create users (using DO block to handle existing users)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'auth_service') THEN
        CREATE USER auth_service WITH PASSWORD 'auth_dev_password';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'reports_service') THEN
        CREATE USER reports_service WITH PASSWORD 'reports_dev_password';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'billing_service') THEN
        CREATE USER billing_service WITH PASSWORD 'billing_dev_password';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'admin_service') THEN
        CREATE USER admin_service WITH PASSWORD 'admin_dev_password';
    END IF;
END
$$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE auth_db TO auth_service;
GRANT ALL PRIVILEGES ON DATABASE reports_db TO reports_service;
GRANT ALL PRIVILEGES ON DATABASE billing_db TO billing_service;
GRANT ALL PRIVILEGES ON DATABASE admin_db TO admin_service;
GRANT ALL PRIVILEGES ON DATABASE analytics_db TO admin_service;
