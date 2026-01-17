-- =====================================================
-- Enrollment-Scoped Cascade Reset Functions (V2)
-- These functions operate on enrollment_id instead of provider_id
-- to support multi-industry isolation
-- =====================================================

-- Function: Execute expertise change reset for a specific enrollment only
CREATE OR REPLACE FUNCTION public.execute_expertise_change_reset_v2(
  p_enrollment_id UUID, 
  p_user_id UUID
) RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  -- Soft-delete specialty proof points FOR THIS ENROLLMENT ONLY
  UPDATE proof_points 
  SET is_deleted = true, deleted_at = NOW(), deleted_by = p_user_id
  WHERE enrollment_id = p_enrollment_id 
    AND category = 'specialty_specific'
    AND is_deleted = false;

  -- Delete speciality tags for this enrollment's proof points
  DELETE FROM proof_point_speciality_tags 
  WHERE proof_point_id IN (
    SELECT id FROM proof_points WHERE enrollment_id = p_enrollment_id
  );

  -- Delete provider specialities FOR THIS ENROLLMENT ONLY
  DELETE FROM provider_specialities WHERE enrollment_id = p_enrollment_id;

  -- Delete proficiency areas FOR THIS ENROLLMENT ONLY
  DELETE FROM provider_proficiency_areas WHERE enrollment_id = p_enrollment_id;

  -- Update lifecycle FOR THIS ENROLLMENT ONLY
  UPDATE provider_industry_enrollments 
  SET lifecycle_status = 'expertise_selected', 
      lifecycle_rank = 50,
      updated_by = p_user_id,
      updated_at = NOW()
  WHERE id = p_enrollment_id;
END;
$$;

-- Function: Get cascade impact counts for a specific enrollment only
CREATE OR REPLACE FUNCTION public.get_cascade_impact_counts_v2(
  p_enrollment_id UUID
) RETURNS TABLE(
  specialty_proof_points_count INTEGER, 
  general_proof_points_count INTEGER, 
  specialities_count INTEGER, 
  proficiency_areas_count INTEGER
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM proof_points 
     WHERE enrollment_id = p_enrollment_id 
       AND category = 'specialty_specific' 
       AND is_deleted = false),
    (SELECT COUNT(*)::INTEGER FROM proof_points 
     WHERE enrollment_id = p_enrollment_id 
       AND category = 'general' 
       AND is_deleted = false),
    (SELECT COUNT(*)::INTEGER FROM provider_specialities 
     WHERE enrollment_id = p_enrollment_id),
    (SELECT COUNT(*)::INTEGER FROM provider_proficiency_areas 
     WHERE enrollment_id = p_enrollment_id);
END;
$$;

-- Function: Execute industry change reset for a specific enrollment only
CREATE OR REPLACE FUNCTION public.execute_industry_change_reset_v2(
  p_enrollment_id UUID, 
  p_user_id UUID
) RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  -- Soft-delete specialty-specific proof points FOR THIS ENROLLMENT ONLY
  UPDATE proof_points 
  SET is_deleted = true, deleted_at = NOW(), deleted_by = p_user_id
  WHERE enrollment_id = p_enrollment_id 
    AND category = 'specialty_specific'
    AND is_deleted = false;

  -- Delete all speciality tag associations for this enrollment
  DELETE FROM proof_point_speciality_tags 
  WHERE proof_point_id IN (
    SELECT id FROM proof_points WHERE enrollment_id = p_enrollment_id
  );

  -- Delete all provider speciality selections for this enrollment
  DELETE FROM provider_specialities WHERE enrollment_id = p_enrollment_id;

  -- Delete all proficiency area selections for this enrollment
  DELETE FROM provider_proficiency_areas WHERE enrollment_id = p_enrollment_id;

  -- Clear expertise level and reset lifecycle for this enrollment only
  UPDATE provider_industry_enrollments 
  SET expertise_level_id = NULL, 
      lifecycle_status = 'enrolled', 
      lifecycle_rank = 20,
      updated_by = p_user_id,
      updated_at = NOW()
  WHERE id = p_enrollment_id;
END;
$$;

-- Function: Handle orphaned proof points for a specific enrollment
CREATE OR REPLACE FUNCTION public.handle_orphaned_proof_points_v2(
  p_enrollment_id UUID, 
  p_removed_area_ids UUID[]
) RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
DECLARE
  orphan_count INTEGER := 0;
BEGIN
  -- Find speciality IDs from removed proficiency areas
  CREATE TEMP TABLE temp_removed_specialities AS
  SELECT s.id as speciality_id
  FROM specialities s
  JOIN sub_domains sd ON s.sub_domain_id = sd.id
  WHERE sd.proficiency_area_id = ANY(p_removed_area_ids);

  -- Find proof points that will be orphaned (all their tags are from removed areas)
  CREATE TEMP TABLE temp_orphaned_proof_points AS
  SELECT DISTINCT pp.id
  FROM proof_points pp
  JOIN proof_point_speciality_tags ppst ON pp.id = ppst.proof_point_id
  WHERE pp.enrollment_id = p_enrollment_id
    AND pp.category = 'specialty_specific'
    AND pp.is_deleted = false
    AND ppst.speciality_id IN (SELECT speciality_id FROM temp_removed_specialities)
    -- Ensure ALL tags are from removed areas (truly orphaned)
    AND NOT EXISTS (
      SELECT 1 
      FROM proof_point_speciality_tags ppst2
      JOIN specialities s2 ON ppst2.speciality_id = s2.id
      JOIN sub_domains sd2 ON s2.sub_domain_id = sd2.id
      WHERE ppst2.proof_point_id = pp.id
        AND sd2.proficiency_area_id != ALL(p_removed_area_ids)
    );

  -- Convert orphaned proof points to 'general' category
  UPDATE proof_points 
  SET category = 'general', 
      updated_at = NOW()
  WHERE id IN (SELECT id FROM temp_orphaned_proof_points);

  GET DIAGNOSTICS orphan_count = ROW_COUNT;

  -- Remove tags that reference removed specialities
  DELETE FROM proof_point_speciality_tags
  WHERE speciality_id IN (SELECT speciality_id FROM temp_removed_specialities)
    AND proof_point_id IN (
      SELECT id FROM proof_points WHERE enrollment_id = p_enrollment_id
    );

  -- Cleanup temp tables
  DROP TABLE IF EXISTS temp_removed_specialities;
  DROP TABLE IF EXISTS temp_orphaned_proof_points;

  RETURN orphan_count;
END;
$$;