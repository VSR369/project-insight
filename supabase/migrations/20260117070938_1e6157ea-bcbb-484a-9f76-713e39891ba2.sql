-- =====================================================
-- Phase 3: Mode/Org Enrollment Scoping Migration
-- Adds enrollment-level participation mode and organization fields
-- for proper multi-industry isolation
-- =====================================================

-- 1. Add participation mode column to enrollments
ALTER TABLE public.provider_industry_enrollments
  ADD COLUMN IF NOT EXISTS participation_mode_id UUID 
    REFERENCES public.participation_modes(id);

-- 2. Add organization JSONB column to enrollments
ALTER TABLE public.provider_industry_enrollments
  ADD COLUMN IF NOT EXISTS organization JSONB DEFAULT NULL;

-- 3. Add org approval status column to enrollments
ALTER TABLE public.provider_industry_enrollments
  ADD COLUMN IF NOT EXISTS org_approval_status TEXT 
    CHECK (org_approval_status IS NULL OR org_approval_status IN ('pending', 'approved', 'declined', 'withdrawn'));

-- 4. Add enrollment_id to proof_points for proper isolation
ALTER TABLE public.proof_points
  ADD COLUMN IF NOT EXISTS enrollment_id UUID 
    REFERENCES public.provider_industry_enrollments(id) ON DELETE SET NULL;

-- 5. Backfill proof_points enrollment_id from industry_segment match
UPDATE proof_points pp
SET enrollment_id = pie.id
FROM provider_industry_enrollments pie
WHERE pp.provider_id = pie.provider_id
  AND pp.industry_segment_id = pie.industry_segment_id
  AND pp.enrollment_id IS NULL;

-- 6. Backfill participation_mode_id from provider to primary enrollment
UPDATE provider_industry_enrollments pie
SET participation_mode_id = sp.participation_mode_id
FROM solution_providers sp
WHERE pie.provider_id = sp.id
  AND pie.is_primary = true
  AND pie.participation_mode_id IS NULL
  AND sp.participation_mode_id IS NOT NULL;

-- 7. Backfill organization from solution_provider_organizations to primary enrollment
UPDATE provider_industry_enrollments pie
SET 
  organization = jsonb_build_object(
    'org_name', spo.org_name,
    'org_type_id', spo.org_type_id,
    'org_website', spo.org_website,
    'manager_name', spo.manager_name,
    'manager_email', spo.manager_email,
    'manager_phone', spo.manager_phone,
    'designation', spo.designation
  ),
  org_approval_status = spo.approval_status
FROM solution_providers sp
JOIN solution_provider_organizations spo ON spo.provider_id = sp.id
WHERE pie.provider_id = sp.id
  AND pie.is_primary = true
  AND pie.organization IS NULL;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_proof_points_enrollment 
  ON public.proof_points(enrollment_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_mode 
  ON public.provider_industry_enrollments(participation_mode_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_org_status 
  ON public.provider_industry_enrollments(org_approval_status)
  WHERE org_approval_status IS NOT NULL;