
-- MOD-02 GAPs 1-6: Rewrite execute_auto_assignment with correct column names,
-- two-pass logic, wildcard scoring, round-robin tiebreaker, selection reason,
-- full candidate snapshot.
-- Also adds CHECK constraint on open_queue_entries.fallback_reason (GAP-17).

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
BEGIN
  -- Read weights from config (keys already correct: l1_weight=50, l2_weight=30, l3_weight=20)
  SELECT
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'l1_weight'), 50),
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'l2_weight'), 30),
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'l3_weight'), 20)
  INTO v_w_l1, v_w_l2, v_w_l3;

  -- Step 1: Affinity check (BR-MPA-013) — prior admin for same verification
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

  -- Step 2-5: Two-pass scoring engine (GAP-1: BR-MPA-012)
  -- Pass 1: Available only. Pass 2: Available + Partially Available (only if Pass 1 yields no L1>0 candidate).
  FOR v_pass IN SELECT unnest(ARRAY['pass1', 'pass2']) LOOP

    WITH eligible_admins AS (
      SELECT
        pap.id AS admin_id,
        pap.full_name,
        pap.admin_tier,
        pap.assignment_priority,
        pap.current_active_verifications,
        pap.max_concurrent_verifications,
        pap.last_assignment_timestamp,
        -- L1: Industry domain score (proportional)
        COALESCE(
          (SELECT COUNT(*)::INTEGER * v_w_l1 / GREATEST(array_length(p_industry_segments, 1), 1)
           FROM unnest(pap.industry_expertise) ie
           WHERE ie = ANY(p_industry_segments)),
          0
        ) AS industry_score,
        -- L2: Country match with wildcard (GAP-2)
        CASE
          WHEN pap.country_region_expertise IS NULL OR array_length(pap.country_region_expertise, 1) IS NULL
            THEN (v_w_l2 / 2)  -- Wildcard = half points
          WHEN p_hq_country = ANY(pap.country_region_expertise)
            THEN v_w_l2
          ELSE 0
        END AS country_score,
        -- L3: Org type match with wildcard (GAP-2)
        CASE
          WHEN p_org_type IS NULL THEN 0
          WHEN pap.org_type_expertise IS NULL OR array_length(pap.org_type_expertise, 1) IS NULL
            THEN (v_w_l3 / 2)  -- Wildcard = half points
          WHEN p_org_type = ANY(pap.org_type_expertise)
            THEN v_w_l3
          ELSE 0
        END AS org_type_score
      FROM platform_admin_profiles pap
      WHERE pap.availability_status IN (
          CASE WHEN v_pass = 'pass1' THEN 'Available' ELSE 'Available' END,
          CASE WHEN v_pass = 'pass1' THEN 'Available' ELSE 'Partially Available' END
        )
        AND pap.current_active_verifications < pap.max_concurrent_verifications
      FOR UPDATE OF pap NOWAIT
    ),
    scored AS (
      SELECT *,
        (industry_score + country_score + org_type_score) AS total_score,
        CASE WHEN max_concurrent_verifications > 0
          THEN (current_active_verifications::FLOAT / max_concurrent_verifications::FLOAT)
          ELSE 1.0
        END AS workload_ratio
      FROM eligible_admins
      WHERE industry_score > 0  -- L1 must be > 0
    )
    -- Build full candidate snapshot (GAP-6: BR-MPA-016)
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
          'workload_ratio', ROUND(s.workload_ratio::NUMERIC, 3),
          'assignment_priority', s.assignment_priority
        ) ORDER BY s.total_score DESC, s.workload_ratio ASC, s.assignment_priority ASC, s.last_assignment_timestamp ASC NULLS FIRST
      ),
      COUNT(*)::INTEGER
    INTO v_candidates, v_pool_size
    FROM scored s;

    -- If candidates found in this pass, pick the best
    IF v_candidates IS NOT NULL AND jsonb_array_length(v_candidates) > 0 THEN
      -- Select best candidate (GAP-4: round-robin tiebreaker)
      SELECT admin_id, full_name, admin_tier, total_score,
             industry_score, country_score, org_type_score,
             workload_ratio, assignment_priority
      INTO v_best
      FROM (
        SELECT * FROM (
          SELECT * FROM eligible_admins ea2
          JOIN (SELECT admin_id AS sid, total_score, workload_ratio FROM scored) sc2 ON sc2.sid = ea2.admin_id
        ) sub
        WHERE industry_score > 0
      ) candidates
      ORDER BY total_score DESC, workload_ratio ASC, assignment_priority ASC,
               last_assignment_timestamp ASC NULLS FIRST  -- GAP-4: round-robin
      LIMIT 1;

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
      EXIT; -- break out of pass loop
    END IF;

    -- If pass1 found no candidates, continue to pass2
  END LOOP;

  -- Get total pool size for context
  SELECT COUNT(*) INTO v_pool_size
  FROM platform_admin_profiles
  WHERE availability_status IN ('Available', 'Partially Available');

  IF NOT v_found THEN
    -- Fallback: no eligible admin
    v_snapshot := jsonb_build_object(
      'method', 'FALLBACK_TO_QUEUE',
      'pool_size', v_pool_size,
      'selection_reason', 'NO_ELIGIBLE_ADMIN',
      'scoring_details', v_candidates
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

  -- Build full snapshot with all candidates + winner
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
    'scoring_details', v_candidates  -- GAP-6: full candidate array
  );

  -- Create assignment
  INSERT INTO verification_assignments (
    verification_id, assigned_admin_id, assignment_method,
    domain_match_score, scoring_details
  ) VALUES (
    p_verification_id, v_best.admin_id, 'AUTO_ASSIGNED',
    v_best.total_score, v_snapshot
  ) RETURNING id INTO v_assignment_id;

  -- Update workload + last_assignment_timestamp (GAP-16)
  UPDATE platform_admin_profiles
  SET current_active_verifications = current_active_verifications + 1,
      last_assignment_timestamp = NOW(),
      updated_at = NOW()
  WHERE id = v_best.admin_id;

  -- Log with selection reason (GAP-5)
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
