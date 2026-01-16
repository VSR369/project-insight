-- Create function to handle orphaned proof points when proficiency areas are removed
-- This converts specialty-specific proof points to 'general' if all their speciality tags
-- are from removed areas

CREATE OR REPLACE FUNCTION public.handle_orphaned_proof_points(
  p_provider_id UUID,
  p_removed_area_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  WHERE pp.provider_id = p_provider_id
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

  -- Remove tags that reference removed specialities (from any proof point of this provider)
  DELETE FROM proof_point_speciality_tags
  WHERE speciality_id IN (SELECT speciality_id FROM temp_removed_specialities)
    AND proof_point_id IN (
      SELECT id FROM proof_points WHERE provider_id = p_provider_id
    );

  -- Cleanup temp tables
  DROP TABLE IF EXISTS temp_removed_specialities;
  DROP TABLE IF EXISTS temp_orphaned_proof_points;

  RETURN orphan_count;
END;
$$;