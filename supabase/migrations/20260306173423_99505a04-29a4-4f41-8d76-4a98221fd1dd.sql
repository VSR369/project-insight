
-- Fix execute_auto_assignment: 
-- 1) Two-pass filter (pass1 = Available only, pass2 = Available + Partially Available)
-- 2) CTE scoping — pick winner from v_candidates JSONB instead of re-querying CTE
-- 3) Store candidates under key 'candidates' (not 'scoring_details') to match UI

CREATE OR REPLACE FUNCTION public.execute_auto_assignment(
  p_verification_id UUID,
  p_industry_segments UUID[],
  p_hq_country UUID,
  p_org_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_w_l1 INTEGER;
  v_w_l2 INTEGER;
  v_w_l3 INTEGER;
  v_best RECORD;
  v_snapshot JSONB;
  v_candidates JSONB;
  v_assignment_id UUID;
  v_pool_size INTEGER;
  v_selection_reason TEXT;
  v_pass TEXT;
  v_found BOOLEAN := FALSE;
  v_score_tie_count INTEGER;
  v_workload_tie_count INTEGER;
  v_priority_tie_count INTEGER;
  v_statuses TEXT[];
BEGIN
  -- Read weights from config
  SELECT
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'l1_weight'), 50),
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'l2_weight'), 30),
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'l3_weight'), 20)
  INTO v_w_l1, v_w_l2, v_w_l3;

  -- Step 1: Affinity check (BR-MPA-013)
  DECLARE
    v_affinity_admin RECORD;
  BEGIN
    SELECT pap.id, pap.full_name, pap.admin_tier
    INTO v_affinity_admin
    FROM verification_assignments va
    JOIN platform_admin_profiles pap ON pap.id = va.assigned_admin_id
    WHERE va.verification_id = p_verification_id
      AND va.is_current = false
      AND pap.availability_status IN ('Available', 'Partially Available')
      AND pap.current_active_verifications < pap.max_concurrent_verifications
    ORDER BY va.assigned_at DESC
    LIMIT 1;

    IF v_affinity_admin.id IS NOT NULL THEN
      v_snapshot := jsonb_build_object(
        'method', 'AFFINITY_RESUBMISSION',
        'selected_admin_id', v_affinity_admin.id,
        'selected_admin_name', v_affinity_admin.full_name,
        'selection_reason', 'AFFINITY_RESUBMISSION'
      );

      INSERT INTO verification_assignments (
        verification_id, assigned_admin_id, assignment_method,
        domain_match_score, scoring_details
      ) VALUES (
        p_verification_id, v_affinity_admin.id, 'AFFINITY_RESUBMISSION',
        100, v_snapshot
      ) RETURNING id INTO v_assignment_id;

      UPDATE platform_admin_profiles
      SET current_active_verifications = current_active_verifications + 1,
          last_assignment_timestamp = NOW(),
          updated_at = NOW()
      WHERE id = v_affinity_admin.id;

      INSERT INTO verification_assignment_log (
        verification_id, event_type, to_admin_id, reason, initiator, scoring_snapshot
      ) VALUES (
        p_verification_id, 'AFFINITY_RESUBMISSION', v_affinity_admin.id,
        'AFFINITY_RESUBMISSION', 'SYSTEM', v_snapshot
      );

      RETURN jsonb_build_object(
        'success', true,
        'assignment_id', v_assignment_id,
        'method', 'AFFINITY_RESUBMISSION',
        'assigned_to', v_affinity_admin.id
      );
    END IF;
  END;

  -- Step 2-5: Two-pass scoring engine (BR-MPA-012)
  FOR v_pass IN SELECT unnest(ARRAY['pass1', 'pass2']) LOOP

    -- FIX: Properly set statuses per pass
    IF v_pass = 'pass1' THEN
      v_statuses := ARRAY['Available'];
    ELSE
      v_statuses := ARRAY['Available', 'Partially Available'];
    END IF;

    WITH scored AS (
      SELECT
        pap.id AS admin_id,
        pap.full_name,
        pap.admin_tier,
        pap.assignment_priority,
        pap.current_active_verifications,
        pap.max_concurrent_verifications,
        pap.last_assignment_timestamp,
        COALESCE(
          (SELECT COUNT(*)::INTEGER * v_w_l1 / GREATEST(array_length(p_industry_segments, 1), 1)
           FROM unnest(pap.industry_expertise) ie
           WHERE ie = ANY(p_industry_segments)),
          0
        ) AS industry_score,
        CASE
          WHEN pap.country_region_expertise IS NULL OR array_length(pap.country_region_expertise, 1) IS NULL
            THEN (v_w_l2 / 2)
          WHEN p_hq_country = ANY(pap.country_region_expertise)
            THEN v_w_l2
          ELSE 0
        END AS country_score,
        CASE
          WHEN p_org_type IS NULL THEN 0
          WHEN pap.org_type_expertise IS NULL OR array_length(pap.org_type_expertise, 1) IS NULL
            THEN (v_w_l3 / 2)
          WHEN p_org_type = ANY(pap.org_type_expertise)
            THEN v_w_l3
          ELSE 0
        END AS org_type_score,
        -- Computed fields
        COALESCE(
          (SELECT COUNT(*)::INTEGER * v_w_l1 / GREATEST(array_length(p_industry_segments, 1), 1)
           FROM unnest(pap.industry_expertise) ie
           WHERE ie = ANY(p_industry_segments)),
          0
        )
        + CASE
            WHEN pap.country_region_expertise IS NULL OR array_length(pap.country_region_expertise, 1) IS NULL
              THEN (v_w_l2 / 2)
            WHEN p_hq_country = ANY(pap.country_region_expertise)
              THEN v_w_l2
            ELSE 0
          END
        + CASE
            WHEN p_org_type IS NULL THEN 0
            WHEN pap.org_type_expertise IS NULL OR array_length(pap.org_type_expertise, 1) IS NULL
              THEN (v_w_l3 / 2)
            WHEN p_org_type = ANY(pap.org_type_expertise)
              THEN v_w_l3
            ELSE 0
          END AS total_score,
        CASE WHEN pap.max_concurrent_verifications > 0
          THEN ROUND((pap.current_active_verifications::NUMERIC / pap.max_concurrent_verifications::NUMERIC), 3)
          ELSE 1.0
        END AS workload_ratio
      FROM platform_admin_profiles pap
      WHERE pap.availability_status = ANY(v_statuses)
        AND pap.current_active_verifications < pap.max_concurrent_verifications
        AND COALESCE(
          (SELECT COUNT(*)::INTEGER
           FROM unnest(pap.industry_expertise) ie
           WHERE ie = ANY(p_industry_segments)),
          0
        ) > 0  -- L1 must be > 0
      FOR UPDATE OF pap NOWAIT
    )
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'admin_id', s.admin_id,
          'full_name', s.full_name,
          'admin_tier', s.admin_tier,
          'total_score', s.total_score,
          'industry_score', s.industry_score,
          'country_score', s.country_score,
          'org_type_score', s.org_type_score,
          'workload_ratio', s.workload_ratio,
          'assignment_priority', s.assignment_priority
        ) ORDER BY s.total_score DESC, s.workload_ratio ASC, s.assignment_priority ASC, s.last_assignment_timestamp ASC NULLS FIRST
      ),
      COUNT(*)::INTEGER
    INTO v_candidates, v_pool_size
    FROM scored s;

    IF v_candidates IS NOT NULL AND jsonb_array_length(v_candidates) > 0 THEN
      -- Winner is first element of ordered array
      v_best.admin_id := (v_candidates->0->>'admin_id')::UUID;
      v_best.full_name := v_candidates->0->>'full_name';
      v_best.admin_tier := v_candidates->0->>'admin_tier';
      v_best.total_score := (v_candidates->0->>'total_score')::INTEGER;
      v_best.industry_score := (v_candidates->0->>'industry_score')::INTEGER;
      v_best.country_score := (v_candidates->0->>'country_score')::INTEGER;
      v_best.org_type_score := (v_candidates->0->>'org_type_score')::INTEGER;
      v_best.workload_ratio := (v_candidates->0->>'workload_ratio')::NUMERIC;
      v_best.assignment_priority := (v_candidates->0->>'assignment_priority')::INTEGER;

      -- Derive selection reason (GAP-5)
      SELECT COUNT(*) INTO v_score_tie_count FROM jsonb_array_elements(v_candidates) c
        WHERE (c->>'total_score')::INTEGER = v_best.total_score;

      IF v_score_tie_count <= 1 THEN
        v_selection_reason := 'highest_domain_score';
      ELSE
        SELECT COUNT(*) INTO v_workload_tie_count FROM jsonb_array_elements(v_candidates) c
          WHERE (c->>'total_score')::INTEGER = v_best.total_score
            AND (c->>'workload_ratio')::NUMERIC = v_best.workload_ratio;

        IF v_workload_tie_count <= 1 THEN
          v_selection_reason := 'workload_tiebreaker';
        ELSE
          SELECT COUNT(*) INTO v_priority_tie_count FROM jsonb_array_elements(v_candidates) c
            WHERE (c->>'total_score')::INTEGER = v_best.total_score
              AND (c->>'workload_ratio')::NUMERIC = v_best.workload_ratio
              AND (c->>'assignment_priority')::INTEGER = v_best.assignment_priority;

          IF v_priority_tie_count <= 1 THEN
            v_selection_reason := 'priority_tiebreaker';
          ELSE
            v_selection_reason := 'round_robin';
          END IF;
        END IF;
      END IF;

      v_found := TRUE;
      EXIT;
    END IF;

  END LOOP;

  -- Total pool size
  SELECT COUNT(*) INTO v_pool_size
  FROM platform_admin_profiles
  WHERE availability_status IN ('Available', 'Partially Available');

  IF NOT v_found THEN
    v_snapshot := jsonb_build_object(
      'method', 'FALLBACK_TO_QUEUE',
      'pool_size', v_pool_size,
      'selection_reason', 'NO_ELIGIBLE_ADMIN',
      'candidates', v_candidates
    );

    INSERT INTO open_queue_entries (
      verification_id, fallback_reason, sla_deadline
    ) VALUES (
      p_verification_id, 'NO_ELIGIBLE_ADMIN',
      NOW() + INTERVAL '24 hours'
    );

    INSERT INTO verification_assignment_log (
      verification_id, event_type, reason, initiator, scoring_snapshot
    ) VALUES (
      p_verification_id, 'FALLBACK_TO_QUEUE',
      'NO_ELIGIBLE_ADMIN', 'SYSTEM', v_snapshot
    );

    RETURN jsonb_build_object(
      'success', false,
      'method', 'FALLBACK_TO_QUEUE',
      'reason', 'NO_ELIGIBLE_ADMIN'
    );
  END IF;

  -- Build snapshot with 'candidates' key (matches ScoringSnapshotPanel)
  v_snapshot := jsonb_build_object(
    'method', 'AUTO_ASSIGNED',
    'selected_admin_id', v_best.admin_id,
    'selected_admin_name', v_best.full_name,
    'total_score', v_best.total_score,
    'industry_score', v_best.industry_score,
    'country_score', v_best.country_score,
    'org_type_score', v_best.org_type_score,
    'workload_ratio', v_best.workload_ratio,
    'pool_size', v_pool_size,
    'selection_reason', v_selection_reason,
    'candidates', v_candidates
  );

  INSERT INTO verification_assignments (
    verification_id, assigned_admin_id, assignment_method,
    domain_match_score, scoring_details
  ) VALUES (
    p_verification_id, v_best.admin_id, 'AUTO_ASSIGNED',
    v_best.total_score, v_snapshot
  ) RETURNING id INTO v_assignment_id;

  UPDATE platform_admin_profiles
  SET current_active_verifications = current_active_verifications + 1,
      last_assignment_timestamp = NOW(),
      updated_at = NOW()
  WHERE id = v_best.admin_id;

  INSERT INTO verification_assignment_log (
    verification_id, event_type, to_admin_id, reason, initiator, scoring_snapshot
  ) VALUES (
    p_verification_id, 'AUTO_ASSIGNED', v_best.admin_id,
    v_selection_reason, 'SYSTEM', v_snapshot
  );

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', v_assignment_id,
    'method', 'AUTO_ASSIGNED',
    'assigned_to', v_best.admin_id,
    'score', v_best.total_score
  );

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object(
      'success', false,
      'method', 'CONCURRENT_CONFLICT',
      'reason', 'Another assignment is in progress, retry'
    );
END;
$$;
