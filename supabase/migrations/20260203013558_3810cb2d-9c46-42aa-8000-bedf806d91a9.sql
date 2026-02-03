-- =====================================================
-- Post-Certification Expertise Upgrade Feature
-- Add tracking columns and RPC for certified providers
-- to voluntarily upgrade their expertise level
-- =====================================================

-- Phase 1.1: Add tracking columns for upgrade history
ALTER TABLE provider_industry_enrollments
  ADD COLUMN IF NOT EXISTS upgrade_attempt_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_certified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS previous_expertise_level_id UUID REFERENCES expertise_levels(id);

-- Index for upgrade tracking (filtered for certified status)
CREATE INDEX IF NOT EXISTS idx_enrollments_upgrade_history 
  ON provider_industry_enrollments(provider_id, upgrade_attempt_count)
  WHERE lifecycle_status = 'certified';

-- Phase 1.2: Create RPC for resetting enrollment for expertise upgrade
CREATE OR REPLACE FUNCTION reset_enrollment_for_expertise_upgrade(
  p_enrollment_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment RECORD;
BEGIN
  -- Get current enrollment (must be certified)
  SELECT * INTO v_enrollment
  FROM provider_industry_enrollments
  WHERE id = p_enrollment_id
    AND lifecycle_status = 'certified';
    
  IF v_enrollment IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Enrollment not found or not in certified status'
    );
  END IF;

  -- Store previous certification data for audit, then reset
  UPDATE provider_industry_enrollments SET
    -- Archive previous state
    previous_expertise_level_id = expertise_level_id,
    last_certified_at = certified_at,
    upgrade_attempt_count = COALESCE(upgrade_attempt_count, 0) + 1,
    
    -- Reset lifecycle to expertise_selected
    lifecycle_status = 'expertise_selected',
    lifecycle_rank = 50,
    
    -- Clear certification fields
    certified_at = NULL,
    certified_by = NULL,
    certification_level = NULL,
    star_rating = NULL,
    composite_score = NULL,
    
    -- Audit fields
    updated_at = NOW(),
    updated_by = p_user_id
  WHERE id = p_enrollment_id;

  -- CLEAR: Proficiency areas (user must re-select for new level)
  DELETE FROM provider_proficiency_areas 
  WHERE enrollment_id = p_enrollment_id;

  -- NO ACTION: provider_specialities (auto-derived, system regenerates)
  -- NO ACTION: proof_points (retained - amending is optional)
  -- NO ACTION: proof_point_speciality_tags (retained with proof points)

  RETURN json_build_object(
    'success', true,
    'message', 'Enrollment reset for expertise upgrade. Please select your new expertise level and proficiency areas.',
    'previous_expertise_level_id', v_enrollment.expertise_level_id,
    'previous_star_rating', v_enrollment.star_rating,
    'previous_certified_at', v_enrollment.certified_at,
    'upgrade_count', COALESCE(v_enrollment.upgrade_attempt_count, 0) + 1
  );
END;
$$;