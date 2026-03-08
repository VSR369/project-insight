
-- =============================================================================
-- MOD-06 Final Reconciliation: GAP-A, GAP-B column/signature fixes
-- =============================================================================

-- 1. Drop restrictive CHECK on initiator (composite values like 'SUPERVISOR:MANUAL' needed)
ALTER TABLE public.verification_assignment_log DROP CONSTRAINT IF EXISTS verification_assignment_log_initiator_check;

-- 2. Add REASSIGNED_SUPERVISOR to verification_assignments CHECK
ALTER TABLE public.verification_assignments DROP CONSTRAINT IF EXISTS verification_assignments_assignment_method_check;
ALTER TABLE public.verification_assignments ADD CONSTRAINT verification_assignments_assignment_method_check
  CHECK (assignment_method IN (
    'AUTO_ASSIGNED', 'OPEN_QUEUE_CLAIMED', 'REASSIGNED_MANUAL',
    'REASSIGNED_SYSTEM', 'REASSIGNED_SUPERVISOR', 'AFFINITY_RESUBMISSION'
  ));

-- 3. Add released_at and close columns if missing (some RPCs reference closed_at)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='verification_assignments' AND column_name='closed_at') THEN
    ALTER TABLE public.verification_assignments ADD COLUMN closed_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='verification_assignments' AND column_name='close_reason') THEN
    ALTER TABLE public.verification_assignments ADD COLUMN close_reason TEXT;
  END IF;
END$$;

-- 4. Fix reassign_verification: correct column names
CREATE OR REPLACE FUNCTION public.reassign_verification(
  p_verification_id UUID,
  p_to_admin_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT '',
  p_initiator TEXT DEFAULT 'SUPERVISOR',
  p_trigger TEXT DEFAULT 'MANUAL',
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verification RECORD;
  v_from_admin_id UUID;
  v_max_reassignments INT;
  v_audit_reason TEXT;
  v_new_assignment_id UUID;
BEGIN
  -- GAP-12: Read max from config with fallback
  SELECT COALESCE(param_value::INTEGER, 3)
    INTO v_max_reassignments
    FROM md_mpa_config
   WHERE param_key = 'max_reassignments_per_verification';
  IF v_max_reassignments IS NULL THEN
    v_max_reassignments := 3;
  END IF;

  -- Lock verification row
  SELECT id, assigned_admin_id, status, reassignment_count
    INTO v_verification
    FROM platform_admin_verifications
   WHERE id = p_verification_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'VERIFICATION_NOT_FOUND');
  END IF;

  v_from_admin_id := v_verification.assigned_admin_id;

  -- BR-MPA-045: Limit check blocks ADMIN only
  IF p_initiator = 'ADMIN' AND v_verification.reassignment_count >= v_max_reassignments THEN
    RETURN jsonb_build_object('success', false, 'error', 'REASSIGNMENT_LIMIT_REACHED');
  END IF;

  -- Check target admin exists and is not fully loaded (if specified)
  IF p_to_admin_id IS NOT NULL THEN
    DECLARE
      v_target RECORD;
    BEGIN
      SELECT id, availability_status, current_active_verifications, max_concurrent_verifications
        INTO v_target
        FROM platform_admin_profiles
       WHERE id = p_to_admin_id AND availability_status IN ('Available', 'Reduced_Capacity');

      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'TARGET_ADMIN_NOT_FOUND');
      END IF;

      IF v_target.current_active_verifications >= v_target.max_concurrent_verifications THEN
        RETURN jsonb_build_object('success', false, 'error', 'TARGET_AT_CAPACITY');
      END IF;
    END;
  END IF;

  -- BR-MPA-040: Update verification (sla_start_at NOT touched)
  UPDATE platform_admin_verifications
     SET assigned_admin_id = p_to_admin_id,
         reassignment_count = reassignment_count + 1,
         updated_at = NOW()
   WHERE id = p_verification_id;

  -- Close old assignment (use both column pairs for compatibility)
  UPDATE verification_assignments
     SET is_current = false,
         released_at = NOW(),
         release_reason = 'REASSIGNED',
         closed_at = NOW(),
         close_reason = 'REASSIGNED'
   WHERE verification_id = p_verification_id
     AND is_current = true;

  -- Decrement old admin workload
  IF v_from_admin_id IS NOT NULL THEN
    UPDATE platform_admin_profiles
       SET current_active_verifications = GREATEST(current_active_verifications - 1, 0),
           updated_at = NOW()
     WHERE id = v_from_admin_id;
  END IF;

  -- Open new assignment (if target specified)
  IF p_to_admin_id IS NOT NULL THEN
    INSERT INTO verification_assignments (
      verification_id, assigned_admin_id, assigned_at, assignment_method, is_current
    ) VALUES (
      p_verification_id, p_to_admin_id, NOW(), 'REASSIGNED_SUPERVISOR', true
    )
    RETURNING id INTO v_new_assignment_id;

    -- Increment new admin workload
    UPDATE platform_admin_profiles
       SET current_active_verifications = current_active_verifications + 1,
           last_assignment_timestamp = NOW(),
           updated_at = NOW()
     WHERE id = p_to_admin_id;
  END IF;

  -- GAP-3: Build audit reason with IP
  v_audit_reason := p_reason;
  IF p_ip_address IS NOT NULL AND p_ip_address <> '' THEN
    v_audit_reason := v_audit_reason || ' [IP: ' || p_ip_address || ']';
  END IF;

  -- Audit log (BR-MPA-043)
  INSERT INTO verification_assignment_log (
    verification_id, event_type, from_admin_id, to_admin_id,
    reason, initiator, scoring_snapshot, created_at
  ) VALUES (
    p_verification_id, 'REASSIGNED', v_from_admin_id, p_to_admin_id,
    v_audit_reason, p_initiator || ':' || p_trigger, '{}'::jsonb, NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'from_admin_id', v_from_admin_id,
    'to_admin_id', p_to_admin_id
  );
END;
$$;

-- 5. Fix place_in_open_queue: correct column names
CREATE OR REPLACE FUNCTION public.place_in_open_queue(
  p_verification_id UUID,
  p_reason TEXT DEFAULT '',
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_admin_id UUID;
  v_audit_reason TEXT;
BEGIN
  SELECT assigned_admin_id INTO v_from_admin_id
    FROM platform_admin_verifications
   WHERE id = p_verification_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'VERIFICATION_NOT_FOUND');
  END IF;

  -- BR-MPA-040: sla_start_at NOT touched
  UPDATE platform_admin_verifications
     SET assigned_admin_id = NULL,
         reassignment_count = reassignment_count + 1,
         updated_at = NOW()
   WHERE id = p_verification_id;

  -- Close current assignment
  UPDATE verification_assignments
     SET is_current = false,
         released_at = NOW(),
         release_reason = 'PLACED_IN_QUEUE',
         closed_at = NOW(),
         close_reason = 'PLACED_IN_QUEUE'
   WHERE verification_id = p_verification_id
     AND is_current = true;

  -- Decrement old admin workload
  IF v_from_admin_id IS NOT NULL THEN
    UPDATE platform_admin_profiles
       SET current_active_verifications = GREATEST(current_active_verifications - 1, 0),
           updated_at = NOW()
     WHERE id = v_from_admin_id;
  END IF;

  -- Insert into open queue
  INSERT INTO open_queue_entries (verification_id, entered_at, fallback_reason)
  VALUES (p_verification_id, NOW(), 'SUPERVISOR_PLACED')
  ON CONFLICT DO NOTHING;

  v_audit_reason := p_reason;
  IF p_ip_address IS NOT NULL AND p_ip_address <> '' THEN
    v_audit_reason := v_audit_reason || ' [IP: ' || p_ip_address || ']';
  END IF;

  INSERT INTO verification_assignment_log (
    verification_id, event_type, from_admin_id, to_admin_id,
    reason, initiator, scoring_snapshot, created_at
  ) VALUES (
    p_verification_id, 'PLACED_IN_QUEUE', v_from_admin_id, NULL,
    v_audit_reason, 'SUPERVISOR:MANUAL', '{}'::jsonb, NOW()
  );

  RETURN jsonb_build_object('success', true, 'from_admin_id', v_from_admin_id);
END;
$$;

-- 6. Add p_skip_admin_id to execute_auto_assignment
-- Read current function body from latest migration and add skip param
CREATE OR REPLACE FUNCTION public.execute_auto_assignment(
  p_verification_id UUID,
  p_industry_segments UUID[],
  p_hq_country UUID,
  p_org_type TEXT DEFAULT NULL,
  p_skip_admin_id UUID DEFAULT NULL
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
      AND (p_skip_admin_id IS NULL OR pap.id <> p_skip_admin_id)
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

      UPDATE platform_admin_verifications
      SET assigned_admin_id = v_affinity_admin.id,
          updated_at = NOW()
      WHERE id = p_verification_id;

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
        pap.availability_status,
        pap.current_active_verifications,
        pap.max_concurrent_verifications,
        pap.assignment_priority,
        pap.last_assignment_timestamp,
        -- L1: Industry score with wildcard
        CASE
          WHEN '*' = ANY(pap.industry_expertise) THEN v_w_l1
          WHEN p_industry_segments IS NOT NULL AND array_length(p_industry_segments, 1) > 0
               AND pap.industry_expertise && (SELECT array_agg(x::text) FROM unnest(p_industry_segments) x) THEN v_w_l1
          ELSE 0
        END AS l1_score,
        -- L2: Country/region score with wildcard
        CASE
          WHEN '*' = ANY(pap.country_region_expertise) THEN v_w_l2
          WHEN p_hq_country IS NOT NULL
               AND p_hq_country::text = ANY(pap.country_region_expertise) THEN v_w_l2
          ELSE 0
        END AS l2_score,
        -- L3: Org type score with wildcard
        CASE
          WHEN '*' = ANY(pap.org_type_expertise) THEN v_w_l3
          WHEN p_org_type IS NOT NULL
               AND p_org_type = ANY(pap.org_type_expertise) THEN v_w_l3
          ELSE 0
        END AS l3_score,
        -- Workload ratio
        CASE
          WHEN pap.max_concurrent_verifications > 0
          THEN pap.current_active_verifications::NUMERIC / pap.max_concurrent_verifications
          ELSE 1
        END AS workload_ratio
      FROM platform_admin_profiles pap
      WHERE pap.availability_status = ANY(v_statuses)
        AND pap.current_active_verifications < pap.max_concurrent_verifications
        AND (p_skip_admin_id IS NULL OR pap.id <> p_skip_admin_id)
    ),
    ranked AS (
      SELECT *,
        l1_score + l2_score + l3_score AS total_score,
        ROW_NUMBER() OVER (
          ORDER BY
            (l1_score + l2_score + l3_score) DESC,
            workload_ratio ASC,
            assignment_priority ASC,
            last_assignment_timestamp ASC NULLS FIRST
        ) AS rank
      FROM scored
    )
    SELECT * INTO v_best FROM ranked WHERE rank = 1;

    IF v_best.admin_id IS NOT NULL THEN
      -- Build candidates snapshot
      v_candidates := (
        SELECT jsonb_agg(jsonb_build_object(
          'admin_id', r.admin_id,
          'full_name', r.full_name,
          'total_score', r.total_score,
          'l1', r.l1_score, 'l2', r.l2_score, 'l3', r.l3_score,
          'workload_ratio', ROUND(r.workload_ratio::numeric, 2),
          'priority', r.assignment_priority,
          'rank', r.rank
        ) ORDER BY r.rank)
        FROM ranked r
      );

      v_pool_size := (SELECT count(*) FROM ranked);

      -- Determine selection reason
      SELECT count(*) INTO v_score_tie_count FROM ranked WHERE total_score = v_best.total_score;
      IF v_score_tie_count = 1 THEN
        v_selection_reason := 'HIGHEST_DOMAIN_SCORE';
      ELSE
        SELECT count(*) INTO v_workload_tie_count FROM ranked
        WHERE total_score = v_best.total_score AND workload_ratio = v_best.workload_ratio;
        IF v_workload_tie_count = 1 THEN
          v_selection_reason := 'LOWEST_WORKLOAD';
        ELSE
          SELECT count(*) INTO v_priority_tie_count FROM ranked
          WHERE total_score = v_best.total_score AND workload_ratio = v_best.workload_ratio
            AND assignment_priority = v_best.assignment_priority;
          IF v_priority_tie_count = 1 THEN
            v_selection_reason := 'HIGHEST_PRIORITY';
          ELSE
            v_selection_reason := 'ROUND_ROBIN';
          END IF;
        END IF;
      END IF;

      v_snapshot := jsonb_build_object(
        'method', 'AUTO_ASSIGNED',
        'pass', v_pass,
        'pool_size', v_pool_size,
        'selected_admin_id', v_best.admin_id,
        'selected_admin_name', v_best.full_name,
        'total_score', v_best.total_score,
        'l1', v_best.l1_score, 'l2', v_best.l2_score, 'l3', v_best.l3_score,
        'workload_ratio', ROUND(v_best.workload_ratio::numeric, 2),
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

      UPDATE platform_admin_verifications
      SET assigned_admin_id = v_best.admin_id,
          updated_at = NOW()
      WHERE id = p_verification_id;

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
        'pass', v_pass,
        'selection_reason', v_selection_reason
      );
    END IF;
  END LOOP;

  -- Fallback: Open Queue
  INSERT INTO open_queue_entries (verification_id, entered_at, fallback_reason)
  VALUES (p_verification_id, NOW(), 'NO_ELIGIBLE_ADMIN')
  ON CONFLICT DO NOTHING;

  INSERT INTO verification_assignment_log (
    verification_id, event_type, reason, initiator, scoring_snapshot
  ) VALUES (
    p_verification_id, 'QUEUED', 'No eligible admin found', 'SYSTEM', '{}'::jsonb
  );

  RETURN jsonb_build_object(
    'success', false,
    'method', 'OPEN_QUEUE',
    'reason', 'NO_ELIGIBLE_ADMIN'
  );
END;
$$;

-- 7. Fix bulk_reassign_admin: fetch org context, call execute_auto_assignment with correct 4+1 params
CREATE OR REPLACE FUNCTION public.bulk_reassign_admin(
  p_departing_admin_id UUID,
  p_trigger TEXT DEFAULT 'LEAVE'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_total INT := 0;
  v_assigned INT := 0;
  v_queued INT := 0;
  v_results JSONB := '[]'::JSONB;
  v_auto_result JSONB;
  v_org_id UUID;
  v_hq_country UUID;
  v_org_type TEXT;
  v_industry_segments UUID[];
BEGIN
  FOR v_rec IN
    SELECT pav.id, pav.organization_id
      FROM platform_admin_verifications pav
     WHERE pav.assigned_admin_id = p_departing_admin_id
       AND pav.status = 'Under_Verification'
     ORDER BY pav.sla_start_at ASC NULLS LAST
     FOR UPDATE
  LOOP
    v_total := v_total + 1;

    -- Fetch org context for auto-assignment scoring
    SELECT so.hq_country_id, so.organization_type_id::TEXT
      INTO v_hq_country, v_org_type
      FROM seeker_organizations so
     WHERE so.id = v_rec.organization_id;

    SELECT array_agg(soi.industry_id)
      INTO v_industry_segments
      FROM seeker_org_industries soi
     WHERE soi.organization_id = v_rec.organization_id;

    IF v_industry_segments IS NULL THEN
      v_industry_segments := ARRAY[]::UUID[];
    END IF;

    -- Close current assignment
    UPDATE verification_assignments
       SET is_current = false,
           released_at = NOW(),
           release_reason = 'BULK_REASSIGNED',
           closed_at = NOW(),
           close_reason = 'BULK_REASSIGNED'
     WHERE verification_id = v_rec.id
       AND is_current = true;

    -- Decrement departing admin workload
    UPDATE platform_admin_profiles
       SET current_active_verifications = GREATEST(current_active_verifications - 1, 0),
           updated_at = NOW()
     WHERE id = p_departing_admin_id;

    -- Unassign
    UPDATE platform_admin_verifications
       SET assigned_admin_id = NULL,
           reassignment_count = reassignment_count + 1,
           updated_at = NOW()
     WHERE id = v_rec.id;

    -- Try auto-assignment with correct signature + skip departing admin
    BEGIN
      SELECT public.execute_auto_assignment(
        v_rec.id,
        v_industry_segments,
        v_hq_country,
        v_org_type,
        p_departing_admin_id
      ) INTO v_auto_result;

      IF (v_auto_result->>'success')::BOOLEAN THEN
        v_assigned := v_assigned + 1;

        -- GAP-11: Override assignment_method to REASSIGNED_SYSTEM
        UPDATE verification_assignments
           SET assignment_method = 'REASSIGNED_SYSTEM'
         WHERE verification_id = v_rec.id
           AND is_current = true;

        UPDATE verification_assignment_log
           SET event_type = 'REASSIGNED',
               initiator = 'SYSTEM:' || p_trigger
         WHERE verification_id = v_rec.id
           AND created_at = (
             SELECT MAX(created_at) FROM verification_assignment_log WHERE verification_id = v_rec.id
           );

        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'verification_id', v_rec.id, 'outcome', 'ASSIGNED'));
      ELSE
        v_queued := v_queued + 1;
        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'verification_id', v_rec.id, 'outcome', 'QUEUED'));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_queued := v_queued + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'verification_id', v_rec.id, 'outcome', 'QUEUED'));
    END;

    -- Audit log
    INSERT INTO verification_assignment_log (
      verification_id, event_type, from_admin_id, to_admin_id,
      reason, initiator, scoring_snapshot, created_at
    ) VALUES (
      v_rec.id, 'BULK_REASSIGNED', p_departing_admin_id, NULL,
      'Bulk reassignment: admin ' || p_trigger, 'SYSTEM:' || p_trigger, '{}'::jsonb, NOW()
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total', v_total,
    'assigned', v_assigned,
    'queued', v_queued,
    'results', v_results
  );
END;
$$;
