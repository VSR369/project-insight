
-- ============================================================
-- Migration: Update organization_types seed data for rate card segments
-- ============================================================

-- 1. Rename CORPORATE → LARGE_ENTERPRISE
UPDATE public.organization_types 
SET code = 'LARGE_ENTERPRISE', name = 'Large Enterprise', description = '250+ employees', display_order = 1, updated_at = NOW()
WHERE id = '80d85064-43ae-4da5-a523-cb87dcb601f4';

-- 2. Deactivate MSME (replaced by 3 granular types)
UPDATE public.organization_types SET is_active = false, updated_at = NOW() WHERE id = '72ab7453-fa0f-4a97-a94f-90f3c5869fda';

-- 3. Deactivate COLLEGE, SCHOOL, UNI (merged into ACADEMIC)
UPDATE public.organization_types SET is_active = false, updated_at = NOW() WHERE id IN (
  '5b7e6c71-a566-4709-9f6b-cff23ecf3041',
  '5e47a1c6-ee9d-47b4-a72d-217e1b545a00',
  '2e11ab11-9988-419f-ad23-e800662f39db'
);

-- 4. Update display orders for remaining types
UPDATE public.organization_types SET display_order = 5, description = 'Funded early-stage company', updated_at = NOW() WHERE id = '368f5693-f26c-4469-aae5-ef0686ef1c03'; -- STARTUP
UPDATE public.organization_types SET display_order = 6, description = 'Universities, colleges, schools', updated_at = NOW() WHERE id = '3593df88-ea5c-41f5-b1f6-46299c28e41a'; -- ACADEMIC
UPDATE public.organization_types SET display_order = 7, updated_at = NOW() WHERE id = '03c2cdc7-c282-4fa2-9fea-1c022e00e5fe'; -- NGO
UPDATE public.organization_types SET display_order = 8, updated_at = NOW() WHERE id = 'e4a06f95-e28c-49dd-99d5-fd7afd432a8e'; -- GOVT
UPDATE public.organization_types SET display_order = 9, updated_at = NOW() WHERE id = '5f49e065-65d6-4b79-989f-df2f5cc3cdb5'; -- INTDEPT

-- 5. Insert new enterprise size types
INSERT INTO public.organization_types (code, name, description, display_order, is_active)
VALUES 
  ('MEDIUM_ENTERPRISE', 'Medium Enterprise', '50–249 employees', 2, true),
  ('SMALL_ENTERPRISE', 'Small Enterprise', '10–49 employees', 3, true),
  ('MICRO_ENTERPRISE', 'Micro Enterprise', 'Fewer than 10 employees', 4, true);

-- 6. Insert org_type_seeker_rules for new enterprise types
INSERT INTO public.org_type_seeker_rules (org_type_id, tier_recommendation, subsidized_eligible, compliance_required, zero_fee_eligible, startup_eligible)
SELECT id, 'standard', false, true, false, false FROM public.organization_types WHERE code = 'MEDIUM_ENTERPRISE'
UNION ALL
SELECT id, 'basic', false, false, false, false FROM public.organization_types WHERE code = 'SMALL_ENTERPRISE'
UNION ALL
SELECT id, 'basic', true, false, false, false FROM public.organization_types WHERE code = 'MICRO_ENTERPRISE';
