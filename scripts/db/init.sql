-- Database initialization for RefertoSicuro

-- Create databases
CREATE DATABASE IF NOT EXISTS auth_db;
CREATE DATABASE IF NOT EXISTS reports_db;
CREATE DATABASE IF NOT EXISTS billing_db;
CREATE DATABASE IF NOT EXISTS admin_db;
CREATE DATABASE IF NOT EXISTS analytics_db;

-- Create users
CREATE USER IF NOT EXISTS auth_service WITH PASSWORD 'auth_dev_password';
CREATE USER IF NOT EXISTS reports_service WITH PASSWORD 'reports_dev_password';
CREATE USER IF NOT EXISTS billing_service WITH PASSWORD 'billing_dev_password';
CREATE USER IF NOT EXISTS admin_service WITH PASSWORD 'admin_dev_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE auth_db TO auth_service;
GRANT ALL PRIVILEGES ON DATABASE reports_db TO reports_service;
GRANT ALL PRIVILEGES ON DATABASE billing_db TO billing_service;
GRANT ALL PRIVILEGES ON DATABASE admin_db TO admin_service;
GRANT ALL PRIVILEGES ON DATABASE analytics_db TO admin_service;
