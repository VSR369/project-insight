
-- Step 1: Map existing text values to UUID equivalents
UPDATE platform_admin_profiles
SET org_type_expertise = ARRAY(
  SELECT ot.id::TEXT
  FROM unnest(org_type_expertise) AS t(val)
  JOIN organization_types ot ON
    (LOWER(t.val) = 'corporation' AND ot.code = 'CORPORATE')
    OR (LOWER(t.val) = 'non-profit' AND ot.code = 'NGO')
    OR (LOWER(t.val) = 'government' AND ot.code = 'GOVT')
    OR (LOWER(t.val) = 'academic' AND ot.code = 'ACADEMIC')
    OR (LOWER(t.val) = 'llc' AND ot.code = 'MSME')
    OR (LOWER(t.val) = 'partnership' AND ot.code = 'CORPORATE')
    OR (LOWER(t.val) = 'other' AND ot.code = 'CORPORATE')
)
WHERE org_type_expertise IS NOT NULL
  AND array_length(org_type_expertise, 1) > 0;

-- Step 2: Drop existing default before type change
ALTER TABLE platform_admin_profiles
  ALTER COLUMN org_type_expertise DROP DEFAULT;

-- Step 3: ALTER column type
ALTER TABLE platform_admin_profiles
  ALTER COLUMN org_type_expertise TYPE UUID[]
  USING CASE
    WHEN org_type_expertise IS NULL THEN '{}'::UUID[]
    WHEN array_length(org_type_expertise, 1) IS NULL THEN '{}'::UUID[]
    ELSE org_type_expertise::UUID[]
  END;

-- Step 4: Set new default
ALTER TABLE platform_admin_profiles
  ALTER COLUMN org_type_expertise SET DEFAULT '{}'::UUID[];

-- Step 5: Drop all overloaded execute_auto_assignment functions
DROP FUNCTION IF EXISTS public.execute_auto_assignment(UUID, UUID[], UUID, TEXT);
DROP FUNCTION IF EXISTS public.execute_auto_assignment(UUID, UUID[], UUID, UUID);
DROP FUNCTION IF EXISTS public.execute_auto_assignment(UUID, UUID[], UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.execute_auto_assignment(UUID, UUID[], UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.execute_auto_assignment(UUID, UUID, UUID, TEXT);

-- Step 6: Recreate execute_auto_assignment with clean UUID signature
CREATE OR REPLACE FUNCTION public.execute_auto_assignment(
  p_verification_id UUID,
  p_industry_segments UUID[],
  p_hq_country UUID,
  p_org_type UUID DEFAULT NULL,
  p_skip_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_w_l1 INTEGER; v_w_l2 INTEGER; v_w_l3 INTEGER;
  v_best RECORD; v_snapshot JSONB; v_candidates JSONB;
  v_assignment_id UUID; v_pool_size INTEGER; v_selection_reason TEXT;
  v_pass TEXT; v_found BOOLEAN := FALSE;
  v_score_tie_count INTEGER; v_workload_tie_count INTEGER; v_priority_tie_count INTEGER;
  v_statuses TEXT[];
BEGIN
  SELECT
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'l1_weight'), 50),
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'l2_weight'), 30),
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'l3_weight'), 20)
  INTO v_w_l1, v_w_l2, v_w_l3;

  DECLARE v_affinity_admin RECORD;
  BEGIN
    SELECT pap.id, pap.full_name, pap.admin_tier INTO v_affinity_admin
    FROM verification_assignments va
    JOIN platform_admin_profiles pap ON pap.id = va.assigned_admin_id
    WHERE va.verification_id = p_verification_id AND va.is_current = false
      AND pap.availability_status IN ('Available', 'Partially Available')
      AND pap.current_active_verifications < pap.max_concurrent_verifications
      AND (p_skip_admin_id IS NULL OR pap.id != p_skip_admin_id)
    ORDER BY va.assigned_at DESC LIMIT 1;

    IF v_affinity_admin.id IS NOT NULL THEN
      v_snapshot := jsonb_build_object('method', 'AFFINITY_RESUBMISSION',
        'selected_admin_id', v_affinity_admin.id, 'selected_admin_name', v_affinity_admin.full_name,
        'selection_reason', 'AFFINITY_RESUBMISSION');
      INSERT INTO verification_assignments (verification_id, assigned_admin_id, assignment_method, domain_match_score, scoring_details)
      VALUES (p_verification_id, v_affinity_admin.id, 'AFFINITY_RESUBMISSION', 100, v_snapshot)
      RETURNING id INTO v_assignment_id;
      UPDATE platform_admin_profiles SET current_active_verifications = current_active_verifications + 1,
        last_assignment_timestamp = NOW(), updated_at = NOW() WHERE id = v_affinity_admin.id;
      INSERT INTO verification_assignment_log (verification_id, event_type, to_admin_id, reason, initiator, scoring_snapshot)
      VALUES (p_verification_id, 'AFFINITY_RESUBMISSION', v_affinity_admin.id, 'AFFINITY_RESUBMISSION', 'SYSTEM', v_snapshot);
      RETURN jsonb_build_object('success', true, 'assignment_id', v_assignment_id,
        'method', 'AFFINITY_RESUBMISSION', 'assigned_to', v_affinity_admin.id);
    END IF;
  END;

  FOR v_pass IN SELECT unnest(ARRAY['pass1', 'pass2']) LOOP
    IF v_pass = 'pass1' THEN v_statuses := ARRAY['Available'];
    ELSE v_statuses := ARRAY['Available', 'Partially Available']; END IF;

    WITH scored AS (
      SELECT pap.id AS admin_id, pap.full_name, pap.admin_tier, pap.assignment_priority,
        pap.current_active_verifications, pap.max_concurrent_verifications, pap.last_assignment_timestamp,
        COALESCE((SELECT COUNT(*)::INTEGER * v_w_l1 / GREATEST(array_length(p_industry_segments, 1), 1)
         FROM unnest(pap.industry_expertise) ie WHERE ie = ANY(p_industry_segments)), 0) AS industry_score,
        CASE WHEN pap.country_region_expertise IS NULL OR array_length(pap.country_region_expertise, 1) IS NULL THEN (v_w_l2 / 2)
          WHEN p_hq_country = ANY(pap.country_region_expertise) THEN v_w_l2 ELSE 0 END AS country_score,
        CASE WHEN p_org_type IS NULL THEN 0
          WHEN pap.org_type_expertise IS NULL OR array_length(pap.org_type_expertise, 1) IS NULL THEN (v_w_l3 / 2)
          WHEN p_org_type = ANY(pap.org_type_expertise) THEN v_w_l3 ELSE 0 END AS org_type_score,
        COALESCE((SELECT COUNT(*)::INTEGER * v_w_l1 / GREATEST(array_length(p_industry_segments, 1), 1)
         FROM unnest(pap.industry_expertise) ie WHERE ie = ANY(p_industry_segments)), 0)
        + CASE WHEN pap.country_region_expertise IS NULL OR array_length(pap.country_region_expertise, 1) IS NULL THEN (v_w_l2 / 2)
            WHEN p_hq_country = ANY(pap.country_region_expertise) THEN v_w_l2 ELSE 0 END
        + CASE WHEN p_org_type IS NULL THEN 0
            WHEN pap.org_type_expertise IS NULL OR array_length(pap.org_type_expertise, 1) IS NULL THEN (v_w_l3 / 2)
            WHEN p_org_type = ANY(pap.org_type_expertise) THEN v_w_l3 ELSE 0 END AS total_score,
        CASE WHEN pap.max_concurrent_verifications > 0
          THEN (pap.current_active_verifications::FLOAT / pap.max_concurrent_verifications::FLOAT) ELSE 1.0 END AS workload_ratio
      FROM platform_admin_profiles pap
      WHERE pap.availability_status = ANY(v_statuses)
        AND pap.current_active_verifications < pap.max_concurrent_verifications
        AND (p_skip_admin_id IS NULL OR pap.id != p_skip_admin_id)
    ), candidates AS (SELECT * FROM scored WHERE total_score > 0)
    SELECT * INTO v_best FROM candidates
    ORDER BY total_score DESC, workload_ratio ASC, assignment_priority ASC, last_assignment_timestamp ASC NULLS FIRST LIMIT 1;

    IF v_best.admin_id IS NOT NULL THEN
      v_found := TRUE;
      WITH scored AS (
        SELECT pap.id AS admin_id, pap.full_name, pap.admin_tier, pap.assignment_priority,
          pap.current_active_verifications, pap.max_concurrent_verifications, pap.last_assignment_timestamp,
          COALESCE((SELECT COUNT(*)::INTEGER * v_w_l1 / GREATEST(array_length(p_industry_segments, 1), 1)
           FROM unnest(pap.industry_expertise) ie WHERE ie = ANY(p_industry_segments)), 0) AS industry_score,
          CASE WHEN pap.country_region_expertise IS NULL OR array_length(pap.country_region_expertise, 1) IS NULL THEN (v_w_l2 / 2)
            WHEN p_hq_country = ANY(pap.country_region_expertise) THEN v_w_l2 ELSE 0 END AS country_score,
          CASE WHEN p_org_type IS NULL THEN 0
            WHEN pap.org_type_expertise IS NULL OR array_length(pap.org_type_expertise, 1) IS NULL THEN (v_w_l3 / 2)
            WHEN p_org_type = ANY(pap.org_type_expertise) THEN v_w_l3 ELSE 0 END AS org_type_score,
          COALESCE((SELECT COUNT(*)::INTEGER * v_w_l1 / GREATEST(array_length(p_industry_segments, 1), 1)
           FROM unnest(pap.industry_expertise) ie WHERE ie = ANY(p_industry_segments)), 0)
          + CASE WHEN pap.country_region_expertise IS NULL OR array_length(pap.country_region_expertise, 1) IS NULL THEN (v_w_l2 / 2)
              WHEN p_hq_country = ANY(pap.country_region_expertise) THEN v_w_l2 ELSE 0 END
          + CASE WHEN p_org_type IS NULL THEN 0
              WHEN pap.org_type_expertise IS NULL OR array_length(pap.org_type_expertise, 1) IS NULL THEN (v_w_l3 / 2)
              WHEN p_org_type = ANY(pap.org_type_expertise) THEN v_w_l3 ELSE 0 END AS total_score,
          CASE WHEN pap.max_concurrent_verifications > 0
            THEN (pap.current_active_verifications::FLOAT / pap.max_concurrent_verifications::FLOAT) ELSE 1.0 END AS workload_ratio
        FROM platform_admin_profiles pap
        WHERE pap.availability_status = ANY(v_statuses)
          AND pap.current_active_verifications < pap.max_concurrent_verifications
          AND (p_skip_admin_id IS NULL OR pap.id != p_skip_admin_id)
      )
      SELECT jsonb_agg(jsonb_build_object(
        'admin_id', s.admin_id, 'full_name', s.full_name, 'admin_tier', s.admin_tier,
        'industry_score', s.industry_score, 'country_score', s.country_score,
        'org_type_score', s.org_type_score, 'total_score', s.total_score,
        'workload_ratio', ROUND(s.workload_ratio::NUMERIC, 3),
        'assignment_priority', s.assignment_priority, 'last_assignment_timestamp', s.last_assignment_timestamp
      ) ORDER BY s.total_score DESC, s.workload_ratio ASC, s.assignment_priority ASC, s.last_assignment_timestamp ASC NULLS FIRST)
      INTO v_candidates FROM scored s WHERE s.total_score > 0;

      SELECT COUNT(*) INTO v_pool_size FROM jsonb_array_elements(v_candidates);
      SELECT COUNT(*) INTO v_score_tie_count FROM jsonb_array_elements(v_candidates) e
      WHERE (e->>'total_score')::INTEGER = v_best.total_score;

      IF v_score_tie_count = 1 THEN v_selection_reason := 'highest_domain_score';
      ELSE
        SELECT COUNT(*) INTO v_workload_tie_count FROM jsonb_array_elements(v_candidates) e
        WHERE (e->>'total_score')::INTEGER = v_best.total_score
          AND ROUND((e->>'workload_ratio')::NUMERIC, 3) = ROUND(v_best.workload_ratio::NUMERIC, 3);
        IF v_workload_tie_count = 1 THEN v_selection_reason := 'workload_tiebreaker';
        ELSE
          SELECT COUNT(*) INTO v_priority_tie_count FROM jsonb_array_elements(v_candidates) e
          WHERE (e->>'total_score')::INTEGER = v_best.total_score
            AND ROUND((e->>'workload_ratio')::NUMERIC, 3) = ROUND(v_best.workload_ratio::NUMERIC, 3)
            AND (e->>'assignment_priority')::INTEGER = v_best.assignment_priority;
          IF v_priority_tie_count = 1 THEN v_selection_reason := 'priority_tiebreaker';
          ELSE v_selection_reason := 'round_robin'; END IF;
        END IF;
      END IF;

      v_snapshot := jsonb_build_object('method', 'SCORED_ASSIGNMENT', 'pass', v_pass, 'pool_size', v_pool_size,
        'weights', jsonb_build_object('l1', v_w_l1, 'l2', v_w_l2, 'l3', v_w_l3),
        'selected_admin_id', v_best.admin_id, 'selected_admin_name', v_best.full_name,
        'selected_admin_tier', v_best.admin_tier, 'selection_reason', v_selection_reason, 'scoring_details', v_candidates);

      INSERT INTO verification_assignments (verification_id, assigned_admin_id, assignment_method, domain_match_score, scoring_details)
      VALUES (p_verification_id, v_best.admin_id, 'SCORED_ASSIGNMENT', v_best.total_score, v_snapshot)
      RETURNING id INTO v_assignment_id;
      UPDATE platform_admin_profiles SET current_active_verifications = current_active_verifications + 1,
        last_assignment_timestamp = NOW(), updated_at = NOW() WHERE id = v_best.admin_id;
      INSERT INTO verification_assignment_log (verification_id, event_type, to_admin_id, reason, initiator, scoring_snapshot)
      VALUES (p_verification_id, 'AUTO_ASSIGNMENT', v_best.admin_id, v_selection_reason, 'SYSTEM', v_snapshot);
      RETURN jsonb_build_object('success', true, 'assignment_id', v_assignment_id,
        'method', 'SCORED_ASSIGNMENT', 'assigned_to', v_best.admin_id, 'score', v_best.total_score, 'pass', v_pass);
    END IF;
  END LOOP;

  DECLARE v_sla_hours INTEGER; v_fallback_reason TEXT; v_queue_id UUID;
  BEGIN
    SELECT COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'sla_hours_default'), 72) INTO v_sla_hours;
    IF NOT EXISTS (SELECT 1 FROM platform_admin_profiles WHERE availability_status IN ('Available', 'Partially Available')
      AND (p_skip_admin_id IS NULL OR id != p_skip_admin_id)) THEN v_fallback_reason := 'NO_ELIGIBLE_ADMIN';
    ELSE v_fallback_reason := 'ALL_AT_CAPACITY'; END IF;
    INSERT INTO open_queue_entries (verification_id, reason, sla_deadline, priority)
    VALUES (p_verification_id, v_fallback_reason, NOW() + (v_sla_hours || ' hours')::INTERVAL,
      CASE v_fallback_reason WHEN 'NO_ELIGIBLE_ADMIN' THEN 1 ELSE 2 END)
    RETURNING id INTO v_queue_id;
    INSERT INTO verification_assignment_log (verification_id, event_type, reason, initiator, scoring_snapshot)
    VALUES (p_verification_id, 'QUEUED', v_fallback_reason, 'SYSTEM',
      jsonb_build_object('fallback_reason', v_fallback_reason, 'sla_hours', v_sla_hours));
    RETURN jsonb_build_object('success', false, 'method', 'FALLBACK_QUEUE', 'reason', v_fallback_reason,
      'queue_id', v_queue_id, 'sla_deadline', NOW() + (v_sla_hours || ' hours')::INTERVAL);
  END;
END;
$$;

-- Step 7: Drop and recreate get_eligible_admins_ranked
DROP FUNCTION IF EXISTS public.get_eligible_admins_ranked(UUID[], UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_eligible_admins_ranked(UUID[], UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.get_eligible_admins_ranked(
  p_industry_segments UUID[], p_hq_country UUID,
  p_org_type UUID DEFAULT NULL, p_exclude_admin_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID, full_name TEXT, email TEXT, admin_tier TEXT, availability_status TEXT,
  current_active INTEGER, max_concurrent INTEGER, is_supervisor BOOLEAN,
  total_score INTEGER, industry_score INTEGER, country_score INTEGER,
  org_type_score INTEGER, workload_ratio FLOAT, assignment_priority INTEGER,
  last_assignment_timestamp TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_w_l1 INTEGER; v_w_l2 INTEGER; v_w_l3 INTEGER;
BEGIN
  SELECT
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'l1_weight'), 50),
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'l2_weight'), 30),
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'l3_weight'), 20)
  INTO v_w_l1, v_w_l2, v_w_l3;

  RETURN QUERY
  SELECT pap.id, pap.full_name, pap.email, pap.admin_tier, pap.availability_status,
    pap.current_active_verifications AS current_active, pap.max_concurrent_verifications AS max_concurrent,
    pap.is_supervisor,
    (COALESCE((SELECT COUNT(*)::INTEGER * v_w_l1 / GREATEST(array_length(p_industry_segments, 1), 1)
       FROM unnest(pap.industry_expertise) ie WHERE ie = ANY(p_industry_segments)), 0)
     + CASE WHEN pap.country_region_expertise IS NULL OR array_length(pap.country_region_expertise, 1) IS NULL THEN (v_w_l2 / 2)
         WHEN p_hq_country = ANY(pap.country_region_expertise) THEN v_w_l2 ELSE 0 END
     + CASE WHEN p_org_type IS NULL THEN 0
         WHEN pap.org_type_expertise IS NULL OR array_length(pap.org_type_expertise, 1) IS NULL THEN (v_w_l3 / 2)
         WHEN p_org_type = ANY(pap.org_type_expertise) THEN v_w_l3 ELSE 0 END
    )::INTEGER AS total_score,
    COALESCE((SELECT COUNT(*)::INTEGER * v_w_l1 / GREATEST(array_length(p_industry_segments, 1), 1)
       FROM unnest(pap.industry_expertise) ie WHERE ie = ANY(p_industry_segments)), 0) AS industry_score,
    CASE WHEN pap.country_region_expertise IS NULL OR array_length(pap.country_region_expertise, 1) IS NULL THEN (v_w_l2 / 2)
      WHEN p_hq_country = ANY(pap.country_region_expertise) THEN v_w_l2 ELSE 0 END AS country_score,
    CASE WHEN p_org_type IS NULL THEN 0
      WHEN pap.org_type_expertise IS NULL OR array_length(pap.org_type_expertise, 1) IS NULL THEN (v_w_l3 / 2)
      WHEN p_org_type = ANY(pap.org_type_expertise) THEN v_w_l3 ELSE 0 END AS org_type_score,
    CASE WHEN pap.max_concurrent_verifications > 0
      THEN (pap.current_active_verifications::FLOAT / pap.max_concurrent_verifications::FLOAT) ELSE 1.0 END AS workload_ratio,
    pap.assignment_priority, pap.last_assignment_timestamp
  FROM platform_admin_profiles pap
  WHERE pap.availability_status IN ('Available', 'Partially Available')
    AND (p_exclude_admin_id IS NULL OR pap.id != p_exclude_admin_id)
  ORDER BY total_score DESC, workload_ratio ASC, pap.assignment_priority ASC, pap.last_assignment_timestamp ASC NULLS FIRST;
END;
$$;
