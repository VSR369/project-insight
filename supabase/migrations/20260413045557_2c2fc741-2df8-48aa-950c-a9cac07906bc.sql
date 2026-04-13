
-- ═══ PART 1: Update expertise_levels names and descriptions ═══
UPDATE expertise_levels SET name='Explorer', description='Building foundational skills and gaining practical exposure to real-world innovation challenges.' WHERE name='Associate Consultant' OR level_number=1;
UPDATE expertise_levels SET name='Catalyst', description='Accelerates outcomes with proven proficiency — experienced and fully independent.' WHERE name='Senior Consultant' OR level_number=2;
UPDATE expertise_levels SET name='Maestro', description='Leads complex cross-domain projects, mentors others, designs high-impact integrated solutions.' WHERE name='Principal Consultant' OR level_number=3;
UPDATE expertise_levels SET name='Pioneer', description='Strategic ecosystem shapers charting new territory and co-creating the future of industries.' WHERE name='Partner' OR level_number=4;

-- ═══ PART 2: Update certification_level values on enrollments ═══
UPDATE provider_industry_enrollments SET certification_level='proven' WHERE certification_level='basic';
UPDATE provider_industry_enrollments SET certification_level='acclaimed' WHERE certification_level='competent';
UPDATE provider_industry_enrollments SET certification_level='eminent' WHERE certification_level='expert';

-- ═══ PART 3: Update md_solver_eligibility LABELS ONLY (codes stay unchanged) ═══
UPDATE md_solver_eligibility SET label='Certified Proven', description='Entry-level certified Solution Providers. Minimum verified competency.' WHERE code='certified_basic';
UPDATE md_solver_eligibility SET label='Certified Acclaimed', description='Mid-level certified Solution Providers with demonstrated domain expertise.' WHERE code='certified_competent';
UPDATE md_solver_eligibility SET label='Certified Eminent', description='Top-tier certified Solution Providers. For complex, IP-sensitive challenges.' WHERE code='certified_expert';

-- ═══ PART 4: Update finalize_certification RPC to write new tier names ═══
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
      v_certification_level := 'eminent';
    ELSIF p_composite_score >= 66.0 THEN
      v_star_rating := 2;
      v_certification_level := 'acclaimed';
    ELSE
      v_star_rating := 1;
      v_certification_level := 'proven';
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
