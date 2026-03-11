
-- Add domain_scope JSONB column to platform_provider_pool
ALTER TABLE public.platform_provider_pool
  ADD COLUMN IF NOT EXISTS domain_scope JSONB NOT NULL DEFAULT '{"industry_segment_ids":[],"proficiency_area_ids":[],"sub_domain_ids":[],"speciality_ids":[],"department_ids":[],"functional_area_ids":[]}';

-- Migrate existing data: copy industry_ids and proficiency_id into domain_scope
UPDATE public.platform_provider_pool
SET domain_scope = jsonb_build_object(
  'industry_segment_ids', COALESCE(industry_ids, ARRAY[]::UUID[]),
  'proficiency_area_ids', CASE WHEN proficiency_id IS NOT NULL THEN jsonb_build_array(proficiency_id) ELSE '[]'::jsonb END,
  'sub_domain_ids', '[]'::jsonb,
  'speciality_ids', '[]'::jsonb,
  'department_ids', '[]'::jsonb,
  'functional_area_ids', '[]'::jsonb
)
WHERE industry_ids IS NOT NULL OR proficiency_id IS NOT NULL;

-- Drop old columns
ALTER TABLE public.platform_provider_pool DROP COLUMN IF EXISTS industry_ids;
ALTER TABLE public.platform_provider_pool DROP COLUMN IF EXISTS proficiency_id;

-- Add GIN index for JSONB queries on domain_scope
CREATE INDEX IF NOT EXISTS idx_provider_pool_domain_scope ON public.platform_provider_pool USING GIN (domain_scope);
