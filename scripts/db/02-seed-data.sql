-- =============================================
-- RefertoSicuro v2 - Seed Data for Development
-- =============================================
-- This script inserts test data for development

\c refertosicuro_dev

-- =============================================
-- ROLES
-- =============================================
INSERT INTO auth.roles (id, name, description, permissions, is_system) VALUES
    ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'customer', 'Regular customer', '["reports.create", "reports.read", "billing.read"]', true),
    ('550e8400-e29b-41d4-a716-446655440001', 'partner', 'Partner with special rates', '["reports.create", "reports.read", "billing.read", "analytics.read"]', true),
    ('550e8400-e29b-41d4-a716-446655440002', 'admin', 'System administrator', '["*"]', true),
    ('550e8400-e29b-41d4-a716-446655440003', 'support', 'Customer support', '["users.read", "reports.read", "billing.read"]', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- TEST USERS (passwords are all: Test123!@#)
-- =============================================
INSERT INTO auth.users (id, email, email_verified, password_hash, full_name, phone, vat_number, is_active, created_at) VALUES
    -- Admin user
    ('11111111-1111-1111-1111-111111111111',
     'admin@refertosicuro.it',
     true,
     '$2b$12$YQqCYKxCn8lTKGLnIzRPOuPJHqL5KGqwZ.kQ7VqFJcQPqsZoGZMDO', -- Test123!@#
     'Admin User',
     '+39 02 1234567',
     'IT12345678901',
     true,
     NOW() - INTERVAL '30 days'),

    -- Regular customer
    ('22222222-2222-2222-2222-222222222222',
     'mario.rossi@example.com',
     true,
     '$2b$12$YQqCYKxCn8lTKGLnIzRPOuPJHqL5KGqwZ.kQ7VqFJcQPqsZoGZMDO',
     'Mario Rossi',
     '+39 333 1234567',
     'IT98765432109',
     true,
     NOW() - INTERVAL '15 days'),

    -- Partner user
    ('33333333-3333-3333-3333-333333333333',
     'studio.medico@partner.it',
     true,
     '$2b$12$YQqCYKxCn8lTKGLnIzRPOuPJHqL5KGqwZ.kQ7VqFJcQPqsZoGZMDO',
     'Studio Medico Milano',
     '+39 02 9876543',
     'IT11223344556',
     true,
     NOW() - INTERVAL '60 days'),

    -- Trial user
    ('44444444-4444-4444-4444-444444444444',
     'trial@example.com',
     false,
     '$2b$12$YQqCYKxCn8lTKGLnIzRPOuPJHqL5KGqwZ.kQ7VqFJcQPqsZoGZMDO',
     'Trial User',
     NULL,
     NULL,
     true,
     NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- Assign roles to users
INSERT INTO auth.user_roles (user_id, role_id) VALUES
    ('11111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440002'), -- admin -> admin role
    ('22222222-2222-2222-2222-222222222222', 'f47ac10b-58cc-4372-a567-0e02b2c3d479'), -- mario -> customer
    ('33333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440001'), -- studio -> partner
    ('44444444-4444-4444-4444-444444444444', 'f47ac10b-58cc-4372-a567-0e02b2c3d479') -- trial -> customer
ON CONFLICT (user_id, role_id) DO NOTHING;

-- =============================================
-- MEDICAL SPECIALTIES
-- =============================================
INSERT INTO reports.medical_specialties (id, code, name, description, is_active) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'RAD', 'Radiologia', 'Refertazione radiologica generale', true),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'CARD', 'Cardiologia', 'Refertazione cardiologica ed ECG', true),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'NEUR', 'Neurologia', 'Refertazione neurologica e neurofisiologia', true),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'ORT', 'Ortopedia', 'Refertazione ortopedica e traumatologia', true),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'DERM', 'Dermatologia', 'Refertazione dermatologica', true),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'GAST', 'Gastroenterologia', 'Refertazione gastroenterologica ed endoscopia', true),
    ('99999999-9999-9999-9999-999999999999', 'PNEU', 'Pneumologia', 'Refertazione pneumologica e funzionalità respiratoria', true),
    ('88888888-8888-8888-8888-888888888888', 'UROL', 'Urologia', 'Refertazione urologica', true),
    ('77777777-7777-7777-7777-777777777777', 'GINEC', 'Ginecologia', 'Refertazione ginecologica ed ostetrica', true),
    ('66666666-6666-6666-6666-666666666666', 'OFTAL', 'Oftalmologia', 'Refertazione oftalmologica', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SUBSCRIPTION PLANS
-- =============================================
INSERT INTO billing.subscription_plans
    (id, name, code, description, monthly_price, yearly_price, report_quota, max_specialties, features, is_active, display_order) VALUES

    -- Basic Plan
    ('10000000-0000-0000-0000-000000000001',
     'Basic',
     'basic',
     'Piano base per professionisti individuali',
     69.00,
     690.00,
     50,  -- 50 reports/month
     3,   -- 3 specialties
     '{
        "api_access": false,
        "priority_support": false,
        "voice_transcription": false,
        "custom_templates": false,
        "team_collaboration": false,
        "export_formats": ["pdf", "docx"],
        "data_retention_days": 90
     }'::jsonb,
     true,
     1),

    -- Pro Plan
    ('10000000-0000-0000-0000-000000000002',
     'Professional',
     'pro',
     'Piano professionale per studi medici',
     149.00,
     1490.00,
     200,  -- 200 reports/month
     10,   -- 10 specialties
     '{
        "api_access": true,
        "priority_support": true,
        "voice_transcription": true,
        "custom_templates": true,
        "team_collaboration": false,
        "export_formats": ["pdf", "docx", "hl7", "dicom"],
        "data_retention_days": 365
     }'::jsonb,
     true,
     2),

    -- Enterprise Plan
    ('10000000-0000-0000-0000-000000000003',
     'Enterprise',
     'enterprise',
     'Piano enterprise per cliniche e ospedali',
     499.00,
     4990.00,
     999999,  -- unlimited
     999999,  -- all specialties
     '{
        "api_access": true,
        "priority_support": true,
        "voice_transcription": true,
        "custom_templates": true,
        "team_collaboration": true,
        "export_formats": ["pdf", "docx", "hl7", "dicom", "fhir"],
        "data_retention_days": 999999,
        "sla": "99.9%",
        "dedicated_support": true,
        "custom_ai_training": true
     }'::jsonb,
     true,
     3),

    -- Trial Plan
    ('10000000-0000-0000-0000-000000000004',
     'Trial',
     'trial',
     'Piano di prova gratuito per 14 giorni',
     0.00,
     0.00,
     10,  -- 10 reports for trial
     2,   -- 2 specialties
     '{
        "api_access": false,
        "priority_support": false,
        "voice_transcription": false,
        "custom_templates": false,
        "team_collaboration": false,
        "export_formats": ["pdf"],
        "data_retention_days": 14
     }'::jsonb,
     true,
     0)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- USER SUBSCRIPTIONS
-- =============================================
INSERT INTO billing.user_subscriptions
    (id, user_id, plan_id, status, billing_period, current_period_start, current_period_end, reports_used, created_at) VALUES

    -- Admin has Enterprise
    ('a1111111-1111-1111-1111-111111111111',
     '11111111-1111-1111-1111-111111111111',
     '10000000-0000-0000-0000-000000000003',
     'active',
     'yearly',
     CURRENT_DATE,
     CURRENT_DATE + INTERVAL '1 year',
     0,
     NOW() - INTERVAL '30 days'),

    -- Mario has Pro
    ('a2222222-2222-2222-2222-222222222222',
     '22222222-2222-2222-2222-222222222222',
     '10000000-0000-0000-0000-000000000002',
     'active',
     'monthly',
     DATE_TRUNC('month', CURRENT_DATE),
     DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month',
     23,
     NOW() - INTERVAL '15 days'),

    -- Studio has Enterprise
    ('a3333333-3333-3333-3333-333333333333',
     '33333333-3333-3333-3333-333333333333',
     '10000000-0000-0000-0000-000000000003',
     'active',
     'yearly',
     CURRENT_DATE - INTERVAL '2 months',
     CURRENT_DATE + INTERVAL '10 months',
     156,
     NOW() - INTERVAL '60 days'),

    -- Trial user has Trial
    ('a4444444-4444-4444-4444-444444444444',
     '44444444-4444-4444-4444-444444444444',
     '10000000-0000-0000-0000-000000000004',
     'trialing',
     'monthly',
     CURRENT_DATE,
     CURRENT_DATE + INTERVAL '14 days',
     2,
     NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- SAMPLE REPORTS
-- =============================================
INSERT INTO reports.reports
    (user_id, specialty_id, input_text, output_text, status, user_rating, processing_time_ms, created_at) VALUES

    -- Report for Mario (Radiologia)
    ('22222222-2222-2222-2222-222222222222',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
     'RX torace: opacità polmonare destra, versamento pleurico minimo',
     'RADIOGRAFIA DEL TORACE IN PROIEZIONE PA E LL\n\nQuesito clinico: Dispnea e tosse persistente.\n\nTecnica di esame: Radiografia del torace eseguita in proiezione postero-anteriore e latero-laterale.\n\nReferto:\nSi osserva area di opacità parenchimale in corrispondenza del lobo medio destro, con margini sfumati, compatibile con processo flogistico in atto. Minimo versamento pleurico basale destro. Ilo-mediastino nei limiti. Diaframmi regolari. Seni costo-frenici liberi a sinistra.\n\nConclusioni:\nQuadro radiologico compatibile con focolaio broncopneumonico del lobo medio destro con minima reazione pleurica omolaterale. Si consiglia controllo clinico-radiologico a distanza.',
     'completed',
     5,
     1250,
     NOW() - INTERVAL '5 days'),

    -- Report for Studio (Cardiologia)
    ('33333333-3333-3333-3333-333333333333',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
     'ECG: ritmo sinusale, PR allungato, QRS nei limiti',
     'ELETTROCARDIOGRAMMA A 12 DERIVAZIONI\n\nRitmo: Sinusale regolare\nFrequenza: 68 bpm\nPR: 220 ms (prolungato)\nQRS: 90 ms\nQT/QTc: 400/410 ms\n\nReferto:\nRitmo sinusale regolare con frequenza di 68 bpm. Blocco atrio-ventricolare di I grado (PR 220 ms). Conduzione intraventricolare nella norma. Ripolarizzazione ventricolare regolare. Non evidenza di sopra o sottoslivellamenti significativi del tratto ST.\n\nConclusioni:\nECG che mostra blocco AV di I grado. Si consiglia monitoraggio clinico.',
     'completed',
     4,
     890,
     NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- =============================================
-- SAMPLE PAYMENTS
-- =============================================
INSERT INTO billing.payments
    (user_id, subscription_id, amount, currency, status, payment_method, paid_at, created_at) VALUES

    -- Payment from Mario
    ('22222222-2222-2222-2222-222222222222',
     'a2222222-2222-2222-2222-222222222222',
     149.00,
     'EUR',
     'succeeded',
     'stripe',
     NOW() - INTERVAL '15 days',
     NOW() - INTERVAL '15 days'),

    -- Payment from Studio
    ('33333333-3333-3333-3333-333333333333',
     'a3333333-3333-3333-3333-333333333333',
     4990.00,
     'EUR',
     'succeeded',
     'bank_transfer',
     NOW() - INTERVAL '60 days',
     NOW() - INTERVAL '60 days')
ON CONFLICT DO NOTHING;

-- =============================================
-- SYSTEM CONFIGURATION
-- =============================================
INSERT INTO admin.system_config (key, value, value_type, description, is_sensitive) VALUES
    ('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', false),
    ('max_report_length', '50000', 'integer', 'Maximum characters in a report', false),
    ('ai_temperature_default', '0.7', 'float', 'Default AI temperature setting', false),
    ('trial_days', '14', 'integer', 'Trial period duration in days', false),
    ('support_email', 'support@refertosicuro.it', 'string', 'Support email address', false),
    ('vat_rate', '22', 'float', 'VAT rate percentage for Italy', false),
    ('session_timeout_minutes', '60', 'integer', 'Session timeout in minutes', false),
    ('max_login_attempts', '5', 'integer', 'Maximum failed login attempts', false)
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- SAMPLE EVENTS FOR ANALYTICS
-- =============================================
INSERT INTO analytics.events (user_id, event_type, event_category, event_data, created_at) VALUES
    ('22222222-2222-2222-2222-222222222222', 'login', 'auth', '{"method": "password"}'::jsonb, NOW() - INTERVAL '5 days'),
    ('22222222-2222-2222-2222-222222222222', 'report_created', 'reports', '{"specialty": "RAD"}'::jsonb, NOW() - INTERVAL '5 days'),
    ('22222222-2222-2222-2222-222222222222', 'report_exported', 'reports', '{"format": "pdf"}'::jsonb, NOW() - INTERVAL '5 days'),
    ('33333333-3333-3333-3333-333333333333', 'login', 'auth', '{"method": "password"}'::jsonb, NOW() - INTERVAL '3 days'),
    ('33333333-3333-3333-3333-333333333333', 'report_created', 'reports', '{"specialty": "CARD"}'::jsonb, NOW() - INTERVAL '3 days'),
    ('44444444-4444-4444-4444-444444444444', 'signup', 'auth', '{"referrer": "google"}'::jsonb, NOW() - INTERVAL '2 days'),
    ('44444444-4444-4444-4444-444444444444', 'trial_started', 'billing', '{"plan": "trial"}'::jsonb, NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- =============================================
-- SAMPLE METRICS
-- =============================================
INSERT INTO analytics.metrics_daily (date, metric_name, metric_value, dimensions) VALUES
    (CURRENT_DATE - INTERVAL '5 days', 'active_users', 2, '{"plan": "all"}'::jsonb),
    (CURRENT_DATE - INTERVAL '4 days', 'active_users', 3, '{"plan": "all"}'::jsonb),
    (CURRENT_DATE - INTERVAL '3 days', 'active_users', 2, '{"plan": "all"}'::jsonb),
    (CURRENT_DATE - INTERVAL '2 days', 'active_users', 4, '{"plan": "all"}'::jsonb),
    (CURRENT_DATE - INTERVAL '1 days', 'active_users', 3, '{"plan": "all"}'::jsonb),
    (CURRENT_DATE, 'active_users', 2, '{"plan": "all"}'::jsonb),
    (CURRENT_DATE - INTERVAL '5 days', 'reports_created', 1, '{"specialty": "RAD"}'::jsonb),
    (CURRENT_DATE - INTERVAL '3 days', 'reports_created', 1, '{"specialty": "CARD"}'::jsonb),
    (CURRENT_DATE - INTERVAL '2 days', 'new_signups', 1, '{}'::jsonb)
ON CONFLICT (date, metric_name) DO NOTHING;

-- Output confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Seed data inserted successfully!';
    RAISE NOTICE '📊 Test users created:';
    RAISE NOTICE '   - admin@refertosicuro.it (password: Test123!@#)';
    RAISE NOTICE '   - mario.rossi@example.com (password: Test123!@#)';
    RAISE NOTICE '   - studio.medico@partner.it (password: Test123!@#)';
    RAISE NOTICE '   - trial@example.com (password: Test123!@#)';
    RAISE NOTICE '💳 Subscription plans: Basic, Pro, Enterprise, Trial';
    RAISE NOTICE '🏥 Medical specialties: 10 specialties loaded';
    RAISE NOTICE '📝 Sample reports and payments added';
END
$$;