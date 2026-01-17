-- =====================================================
-- Phase 1: Multi-Industry Provider Enrollments
-- Enables providers to enroll in multiple industries with
-- independent lifecycle progression per industry
-- =====================================================

-- 1.1 Create Provider Industry Enrollments Table
CREATE TABLE public.provider_industry_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES solution_providers(id) ON DELETE CASCADE,
  industry_segment_id UUID NOT NULL REFERENCES industry_segments(id),
  expertise_level_id UUID REFERENCES expertise_levels(id),
  lifecycle_status lifecycle_status NOT NULL DEFAULT 'enrolled',
  lifecycle_rank INTEGER NOT NULL DEFAULT 20,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  UNIQUE(provider_id, industry_segment_id)
);

-- Only one primary industry per provider
CREATE UNIQUE INDEX idx_provider_primary_enrollment 
  ON provider_industry_enrollments(provider_id) 
  WHERE is_primary = TRUE;

-- Performance indexes
CREATE INDEX idx_enrollments_provider ON provider_industry_enrollments(provider_id);
CREATE INDEX idx_enrollments_industry ON provider_industry_enrollments(industry_segment_id);
CREATE INDEX idx_enrollments_lifecycle ON provider_industry_enrollments(lifecycle_status, lifecycle_rank);

-- 1.2 Add Enrollment Reference to Related Tables

-- Provider Proficiency Areas
ALTER TABLE provider_proficiency_areas 
  ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES provider_industry_enrollments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_prof_areas_enrollment ON provider_proficiency_areas(enrollment_id);

-- Provider Specialities  
ALTER TABLE provider_specialities 
  ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES provider_industry_enrollments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_specialities_enrollment ON provider_specialities(enrollment_id);

-- Assessment Attempts
ALTER TABLE assessment_attempts 
  ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES provider_industry_enrollments(id);

CREATE INDEX IF NOT EXISTS idx_attempts_enrollment ON assessment_attempts(enrollment_id);

-- 1.3 Data Migration - Backfill Existing Providers
-- Create enrollment records for existing providers with industry set
INSERT INTO provider_industry_enrollments (
  provider_id, industry_segment_id, expertise_level_id, 
  lifecycle_status, lifecycle_rank, is_primary, 
  created_at, created_by
)
SELECT 
  id, industry_segment_id, expertise_level_id,
  lifecycle_status, lifecycle_rank, TRUE,
  created_at, created_by
FROM solution_providers
WHERE industry_segment_id IS NOT NULL
ON CONFLICT (provider_id, industry_segment_id) DO NOTHING;

-- Link existing proficiency areas to enrollments
UPDATE provider_proficiency_areas ppa
SET enrollment_id = pie.id
FROM provider_industry_enrollments pie
WHERE ppa.provider_id = pie.provider_id
  AND ppa.enrollment_id IS NULL;

-- Link existing specialities to enrollments
UPDATE provider_specialities ps
SET enrollment_id = pie.id
FROM provider_industry_enrollments pie
WHERE ps.provider_id = pie.provider_id
  AND ps.enrollment_id IS NULL;

-- Link existing assessment attempts to enrollments
UPDATE assessment_attempts aa
SET enrollment_id = pie.id
FROM provider_industry_enrollments pie
WHERE aa.provider_id = pie.provider_id
  AND aa.enrollment_id IS NULL;

-- 1.4 RLS Policies for New Table
ALTER TABLE provider_industry_enrollments ENABLE ROW LEVEL SECURITY;

-- Providers view own enrollments
CREATE POLICY "Providers view own enrollments" ON provider_industry_enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM solution_providers sp 
      WHERE sp.id = provider_industry_enrollments.provider_id 
      AND sp.user_id = auth.uid()
    )
  );

-- Providers manage own enrollments
CREATE POLICY "Providers manage own enrollments" ON provider_industry_enrollments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM solution_providers sp 
      WHERE sp.id = provider_industry_enrollments.provider_id 
      AND sp.user_id = auth.uid()
    )
  );

-- Admin full access
CREATE POLICY "Admin manage enrollments" ON provider_industry_enrollments
  FOR ALL USING (has_role(auth.uid(), 'platform_admin'::app_role));