-- =====================================================
-- Post-Interview Failure: Phase 1B - Columns, Index, and RPCs
-- =====================================================

-- 1.2 Add new columns to provider_industry_enrollments for re-interview tracking
ALTER TABLE provider_industry_enrollments 
  ADD COLUMN IF NOT EXISTS interview_attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_interview_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reattempt_eligible_after TIMESTAMPTZ;

-- 1.3 Create index for efficient eligibility queries
CREATE INDEX IF NOT EXISTS idx_enrollments_reattempt_eligible 
  ON provider_industry_enrollments(reattempt_eligible_after) 
  WHERE lifecycle_status = 'interview_unsuccessful';

-- 1.4 Update finalize_certification RPC to handle interview_unsuccessful status
CREATE OR REPLACE FUNCTION public.finalize_certification(
  p_enrollment_id UUID,
  p_composite_score DECIMAL(5,2),
  p_certifying_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_current_attempt_count INTEGER;
  v_cooling_off_days INTEGER;
  v_star_rating INTEGER;
  v_certification_level TEXT;
BEGIN
  -- Get current attempt count
  SELECT COALESCE(interview_attempt_count, 0) + 1
  INTO v_current_attempt_count
  FROM provider_industry_enrollments
  WHERE id = p_enrollment_id;
  
  -- Determine cooling-off period based on attempt count
  IF v_current_attempt_count = 1 THEN
    v_cooling_off_days := 30;
  ELSIF v_current_attempt_count = 2 THEN
    v_cooling_off_days := 60;
  ELSE
    v_cooling_off_days := 90;
  END IF;
  
  IF p_composite_score < 51.0 THEN
    -- FAILED: interview_unsuccessful
    UPDATE provider_industry_enrollments SET
      lifecycle_status = 'interview_unsuccessful',
      lifecycle_rank = 150,
      interview_attempt_count = v_current_attempt_count,
      last_interview_failed_at = NOW(),
      reattempt_eligible_after = NOW() + (v_cooling_off_days || ' days')::INTERVAL,
      composite_score = p_composite_score,
      certified_at = NULL,
      certified_by = NULL,
      certification_level = NULL,
      star_rating = NULL,
      updated_at = NOW(),
      updated_by = p_certifying_user_id
    WHERE id = p_enrollment_id;
    
    SELECT json_build_object(
      'success', true,
      'lifecycle_status', 'interview_unsuccessful',
      'certification_level', NULL,
      'star_rating', NULL,
      'interview_attempt_count', v_current_attempt_count,
      'reattempt_eligible_after', NOW() + (v_cooling_off_days || ' days')::INTERVAL,
      'cooling_off_days', v_cooling_off_days
    ) INTO v_result;
  ELSE
    -- PASSED: Determine certification level based on composite score
    IF p_composite_score >= 86.0 THEN
      v_star_rating := 3;
      v_certification_level := 'expert';
    ELSIF p_composite_score >= 66.0 THEN
      v_star_rating := 2;
      v_certification_level := 'competent';
    ELSE
      v_star_rating := 1;
      v_certification_level := 'basic';
    END IF;
    
    UPDATE provider_industry_enrollments SET
      lifecycle_status = 'certified',
      lifecycle_rank = 140,
      composite_score = p_composite_score,
      certification_level = v_certification_level,
      star_rating = v_star_rating,
      certified_at = NOW(),
      certified_by = p_certifying_user_id,
      updated_at = NOW(),
      updated_by = p_certifying_user_id
    WHERE id = p_enrollment_id;
    
    SELECT json_build_object(
      'success', true,
      'lifecycle_status', 'certified',
      'certification_level', v_certification_level,
      'star_rating', v_star_rating
    ) INTO v_result;
  END IF;
  
  RETURN v_result;
END;
$$;

-- 1.5 Create RPC for resetting enrollment after expertise change (Path B)
CREATE OR REPLACE FUNCTION public.reset_enrollment_for_expertise_change(
  p_enrollment_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- Verify enrollment is in interview_unsuccessful status
  SELECT lifecycle_status INTO v_current_status
  FROM provider_industry_enrollments
  WHERE id = p_enrollment_id;
  
  IF v_current_status != 'interview_unsuccessful' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Expertise changes are only allowed after interview failure.'
    );
  END IF;
  
  -- Reset enrollment to expertise_selected
  UPDATE provider_industry_enrollments SET
    lifecycle_status = 'expertise_selected',
    lifecycle_rank = 50,
    -- Keep interview_attempt_count (doesn't reset)
    -- Keep reattempt_eligible_after (cooling-off still applies)
    updated_at = NOW(),
    updated_by = p_user_id
  WHERE id = p_enrollment_id;
  
  -- Soft-delete all proof points for this enrollment
  UPDATE proof_points SET
    is_deleted = true,
    deleted_at = NOW(),
    deleted_by = p_user_id
  WHERE enrollment_id = p_enrollment_id
    AND is_deleted = false;
  
  -- Delete speciality tags for affected proof points
  DELETE FROM proof_point_speciality_tags
  WHERE proof_point_id IN (
    SELECT id FROM proof_points WHERE enrollment_id = p_enrollment_id
  );
  
  -- Delete provider specialities for this enrollment
  DELETE FROM provider_specialities WHERE enrollment_id = p_enrollment_id;
  
  -- Delete proficiency areas for this enrollment
  DELETE FROM provider_proficiency_areas WHERE enrollment_id = p_enrollment_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Enrollment reset to expertise_selected. Please re-submit proof points and assessment.'
  );
END;
$$;