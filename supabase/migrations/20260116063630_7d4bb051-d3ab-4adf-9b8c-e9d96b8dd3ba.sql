-- Phase 1: Update provider@test.local profile with complete data
UPDATE solution_providers
SET 
  first_name = 'Srinivasa Rao',
  last_name = 'Vegendla',
  address = 'Ramky Pearl 73, HMT Satavahana Nagar Colony, Kukatpally, Hyderabad - 500072',
  pin_code = '500072',
  country_id = 'b386af94-4e21-4b78-9235-eb8c75c12016',
  industry_segment_id = 'a333531e-8a60-4682-87df-a9fdc617a232',
  participation_mode_id = '3314a2c8-3b1e-45a5-81d1-b77862d7a32a',
  expertise_level_id = '2046b071-dc36-4265-b40d-4f8d62cd408f',
  lifecycle_status = 'profile_building',
  onboarding_status = 'in_progress',
  updated_at = now()
WHERE id = 'b0a56517-cabf-4dbf-82ec-28f63b9c171b';

-- Phase 2: Insert organization for provider@test.local
INSERT INTO solution_provider_organizations (
  provider_id, org_name, org_type_id, designation, 
  manager_name, manager_email, manager_phone
)
VALUES (
  'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
  'BT&BT',
  '72ab7453-fa0f-4a97-a94f-90f3c5869fda',
  'CDO',
  'VSR',
  'vsr@btbt.co.in',
  '+919866893307'
)
ON CONFLICT (provider_id) DO UPDATE SET
  org_name = EXCLUDED.org_name,
  org_type_id = EXCLUDED.org_type_id,
  designation = EXCLUDED.designation,
  manager_name = EXCLUDED.manager_name,
  manager_email = EXCLUDED.manager_email,
  manager_phone = EXCLUDED.manager_phone,
  updated_at = now();

-- Phase 3: Insert proficiency area for provider@test.local
INSERT INTO provider_proficiency_areas (provider_id, proficiency_area_id, created_by)
VALUES (
  'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
  '4e036593-59e2-41cf-a075-71c7285f1d1c',
  '32aec070-360a-4d73-a6dd-28961c629ca6'
)
ON CONFLICT DO NOTHING;

-- Phase 4a: Soft-delete existing proof points for provider@test.local
UPDATE proof_points 
SET is_deleted = true, deleted_at = now(), deleted_by = '32aec070-360a-4d73-a6dd-28961c629ca6'
WHERE provider_id = 'b0a56517-cabf-4dbf-82ec-28f63b9c171b' AND is_deleted = false;

-- Phase 4b: Insert 4 consolidated proof points for provider@test.local
INSERT INTO proof_points (provider_id, type, category, title, description, created_by)
VALUES 
  ('b0a56517-cabf-4dbf-82ec-28f63b9c171b', 'project', 'general',
   'ERP Master Data Cleanup to Stabilize Planning & Dispatch (OEM / Tier-1 Supplies)',
   'Led cross-functional ERP master data cleanup initiative for an OEM / Tier-1 auto components supplier. Corrected BOM structures, routing inaccuracies, and inventory discrepancies that caused planning failures and dispatch delays. Resulted in 30% reduction in planning exceptions and improved on-time delivery.',
   '32aec070-360a-4d73-a6dd-28961c629ca6'),
  ('b0a56517-cabf-4dbf-82ec-28f63b9c171b', 'case_study', 'general',
   'Shopfloor Process Baseline for Machining & Assembly Lines',
   'Conducted an AS-IS shopfloor process baseline for a Tier-2 auto components manufacturer covering machining and assembly operations. Documented cycle times, material flow, and bottlenecks. Identified 15% capacity improvement opportunities through line balancing and setup time reduction.',
   '32aec070-360a-4d73-a6dd-28961c629ca6'),
  ('b0a56517-cabf-4dbf-82ec-28f63b9c171b', 'project', 'general',
   'ERP Master Data Cleanup to Stabilize Planning and Dispatch',
   'Led a cross-functional data cleanup initiative to fix BOM structures, routing inaccuracies, and inventory mismatches affecting MRP and dispatch reliability. Achieved 30% reduction in planning exceptions.',
   '32aec070-360a-4d73-a6dd-28961c629ca6'),
  ('b0a56517-cabf-4dbf-82ec-28f63b9c171b', 'project', 'specialty_specific',
   'Plant Strategy → Initiative Roadmap for Quality & Delivery (Auto Components)',
   'Facilitated strategy-to-execution roadmap for auto components manufacturing plant. Translated plant-level quality and delivery objectives into prioritized improvement initiatives with clear ownership, timelines, and KPIs. Enabled structured execution tracking and quarterly reviews.',
   '32aec070-360a-4d73-a6dd-28961c629ca6');

-- Phase 5a: Soft-delete proof points from admin@test.local and vsr@btbt.co.in
UPDATE proof_points 
SET is_deleted = true, deleted_at = now()
WHERE provider_id IN (
  'b6463a7d-c852-453d-b5f5-9f1395dd9d68',
  'dff71e3b-e65e-434c-bb9b-0d42406bd846'
) AND is_deleted = false;

-- Phase 5b: Delete proficiency areas for vsr@btbt.co.in provider
DELETE FROM provider_proficiency_areas 
WHERE provider_id = 'dff71e3b-e65e-434c-bb9b-0d42406bd846';

-- Phase 5c: Delete organization for vsr@btbt.co.in provider
DELETE FROM solution_provider_organizations 
WHERE provider_id = 'dff71e3b-e65e-434c-bb9b-0d42406bd846';

-- Phase 5d: Delete vsr@btbt.co.in provider record (orphan)
DELETE FROM solution_providers 
WHERE id = 'dff71e3b-e65e-434c-bb9b-0d42406bd846';