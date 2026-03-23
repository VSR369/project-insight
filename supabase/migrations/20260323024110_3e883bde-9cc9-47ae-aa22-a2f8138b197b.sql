-- Add 'CA' (Challenge Architect) as a distinct platform role for Marketplace model
-- This fixes the FK violation when setup-test-scenario assigns CA to MP challenges
INSERT INTO platform_roles (role_code, role_name, role_description, applicable_model, is_active)
VALUES ('CA', 'Challenge Architect', 'Specification owner for Marketplace model challenges', 'MP', true)
ON CONFLICT (role_code) DO NOTHING;