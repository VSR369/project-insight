
-- ============================================================
-- Phase 1: Data Fixes for Seeker Master Data Gaps
-- ============================================================

-- 1A. Fix Organization Types
-- Deactivate duplicate COL (keep COLLEGE as canonical)
UPDATE organization_types SET is_active = false WHERE code = 'COL';

-- Insert "Academic Institution" unified org type
INSERT INTO organization_types (code, name, description, is_active, display_order)
VALUES ('ACADEMIC', 'Academic Institution', 'Unified type for academic institutions (universities, colleges, schools)', true, 10)
ON CONFLICT DO NOTHING;

-- Insert "Internal Department" org type
INSERT INTO organization_types (code, name, description, is_active, display_order)
VALUES ('INTDEPT', 'Internal Department', 'Internal organizational department', true, 11)
ON CONFLICT DO NOTHING;

-- Insert org_type_seeker_rules for ACADEMIC
INSERT INTO org_type_seeker_rules (org_type_id, tier_recommendation, subsidized_eligible, zero_fee_eligible, compliance_required)
SELECT id, 'basic', true, true, false
FROM organization_types WHERE code = 'ACADEMIC'
ON CONFLICT DO NOTHING;

-- Insert org_type_seeker_rules for INTDEPT
INSERT INTO org_type_seeker_rules (org_type_id, tier_recommendation, subsidized_eligible, zero_fee_eligible, compliance_required)
SELECT id, 'standard', false, false, false
FROM organization_types WHERE code = 'INTDEPT'
ON CONFLICT DO NOTHING;

-- 1B. Seed md_tax_formats
INSERT INTO md_tax_formats (country_id, tax_name, format_regex, example, is_required, display_order) VALUES
((SELECT id FROM countries WHERE code='US'), 'EIN', '^\d{2}-\d{7}$', '12-3456789', true, 1),
((SELECT id FROM countries WHERE code='GB'), 'UTR', '^\d{10}$', '1234567890', true, 2),
((SELECT id FROM countries WHERE code='IN'), 'GSTIN', '^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$', '22AAAAA0000A1Z5', true, 3),
((SELECT id FROM countries WHERE code='DE'), 'Steuernummer', '^\d{3}/\d{3}/\d{5}$', '123/456/78901', true, 4),
((SELECT id FROM countries WHERE code='FR'), 'SIREN', '^\d{9}$', '123456789', true, 5),
((SELECT id FROM countries WHERE code='CA'), 'BN', '^\d{9}[A-Z]{2}\d{4}$', '123456789RC0001', true, 6),
((SELECT id FROM countries WHERE code='AU'), 'ABN', '^\d{11}$', '12345678901', true, 7),
((SELECT id FROM countries WHERE code='JP'), 'Corporate Number', '^\d{13}$', '1234567890123', true, 8),
((SELECT id FROM countries WHERE code='SG'), 'UEN', '^[A-Z\d]{9,10}[A-Z]$', '200912345D', true, 9),
((SELECT id FROM countries WHERE code='AE'), 'TRN', '^\d{15}$', '100123456789012', true, 10),
((SELECT id FROM countries WHERE code='BR'), 'CNPJ', '^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$', '12.345.678/0001-90', true, 11),
((SELECT id FROM countries WHERE code='ZA'), 'Tax Ref', '^\d{10}$', '1234567890', true, 12);

-- 1C. Seed md_subsidized_pricing
-- Academic types (ACADEMIC, UNI, COLLEGE, SCHOOL) - 50%
INSERT INTO md_subsidized_pricing (org_type_rule_id, discount_percentage, max_duration_months, description)
SELECT otr.id, 50, 12, 'Academic institution subsidy - 50% discount'
FROM org_type_seeker_rules otr
JOIN organization_types ot ON ot.id = otr.org_type_id
WHERE ot.code IN ('ACADEMIC', 'UNI', 'COLLEGE', 'SCHOOL');

-- NGO - 30%
INSERT INTO md_subsidized_pricing (org_type_rule_id, discount_percentage, max_duration_months, description)
SELECT otr.id, 30, 12, 'NGO/Non-Profit subsidy - 30% discount'
FROM org_type_seeker_rules otr
JOIN organization_types ot ON ot.id = otr.org_type_id
WHERE ot.code = 'NGO';

-- Start-up - 25%
INSERT INTO md_subsidized_pricing (org_type_rule_id, discount_percentage, max_duration_months, description)
SELECT otr.id, 25, 12, 'Start-up subsidy - 25% discount'
FROM org_type_seeker_rules otr
JOIN organization_types ot ON ot.id = otr.org_type_id
WHERE ot.code = 'STARTUP';

-- MSME - 15%
INSERT INTO md_subsidized_pricing (org_type_rule_id, discount_percentage, max_duration_months, description)
SELECT otr.id, 15, 12, 'MSME subsidy - 15% discount'
FROM org_type_seeker_rules otr
JOIN organization_types ot ON ot.id = otr.org_type_id
WHERE ot.code = 'MSME';

-- 1D. Seed md_postal_formats
INSERT INTO md_postal_formats (country_id, label, format_regex, example) VALUES
((SELECT id FROM countries WHERE code='US'), 'ZIP Code', '^\d{5}(-\d{4})?$', '12345'),
((SELECT id FROM countries WHERE code='GB'), 'Postcode', '^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$', 'SW1A 1AA'),
((SELECT id FROM countries WHERE code='IN'), 'PIN Code', '^\d{6}$', '110001'),
((SELECT id FROM countries WHERE code='DE'), 'PLZ', '^\d{5}$', '10115'),
((SELECT id FROM countries WHERE code='FR'), 'Code Postal', '^\d{5}$', '75001'),
((SELECT id FROM countries WHERE code='CA'), 'Postal Code', '^[A-Z]\d[A-Z]\s?\d[A-Z]\d$', 'K1A 0B1'),
((SELECT id FROM countries WHERE code='AU'), 'Postcode', '^\d{4}$', '2000'),
((SELECT id FROM countries WHERE code='JP'), 'Postal Code', '^\d{3}-\d{4}$', '100-0001'),
((SELECT id FROM countries WHERE code='SG'), 'Postal Code', '^\d{6}$', '018956'),
((SELECT id FROM countries WHERE code='AE'), 'P.O. Box', '^\d{1,6}$', '12345'),
((SELECT id FROM countries WHERE code='BR'), 'CEP', '^\d{5}-\d{3}$', '01001-000'),
((SELECT id FROM countries WHERE code='ZA'), 'Postal Code', '^\d{4}$', '2000');
