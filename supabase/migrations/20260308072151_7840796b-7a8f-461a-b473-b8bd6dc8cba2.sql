
-- GAP: Add supervisor permission guard to refresh_performance_metrics RPC
CREATE OR REPLACE FUNCTION public.refresh_performance_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_admin_id UUID;
  v_is_supervisor BOOLEAN := FALSE;
BEGIN
  -- Permission check: supervisor only
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT id INTO v_caller_admin_id
    FROM platform_admin_profiles
   WHERE user_id = v_caller_id;

  IF v_caller_admin_id IS NOT NULL THEN
    SELECT (admin_tier = 'supervisor') INTO v_is_supervisor
      FROM platform_admin_profiles
     WHERE id = v_caller_admin_id;
  END IF;

  IF NOT v_is_supervisor THEN
    RAISE EXCEPTION 'Permission denied: supervisor role required';
  END IF;

  -- Batch recalculate M1-M8 with 30-day rolling window
  INSERT INTO admin_performance_metrics (
    admin_id,
    verifications_completed,
    sla_compliant_count,
    sla_breached_count,
    sla_compliance_rate_pct,
    avg_processing_hours,
    open_queue_claims,
    reassignments_received,
    reassignments_sent,
    period_start,
    period_end,
    computed_at
  )
  SELECT
    pap.id AS admin_id,
    -- M1: Completed in last 30 days
    COALESCE((
      SELECT COUNT(*)
        FROM platform_admin_verifications pav
       WHERE pav.completed_by_admin_id = pap.id
         AND pav.status = 'completed'
         AND pav.completed_at >= NOW() - INTERVAL '30 days'
    ), 0) AS verifications_completed,
    -- M2a: SLA compliant
    COALESCE((
      SELECT COUNT(*)
        FROM platform_admin_verifications pav
       WHERE pav.completed_by_admin_id = pap.id
         AND pav.status = 'completed'
         AND pav.sla_breached = FALSE
         AND pav.completed_at >= NOW() - INTERVAL '30 days'
    ), 0) AS sla_compliant_count,
    -- M2b: SLA breached
    COALESCE((
      SELECT COUNT(*)
        FROM platform_admin_verifications pav
       WHERE pav.completed_by_admin_id = pap.id
         AND pav.status = 'completed'
         AND pav.sla_breached = TRUE
         AND pav.completed_at >= NOW() - INTERVAL '30 days'
    ), 0) AS sla_breached_count,
    -- M2c: SLA compliance rate
    CASE
      WHEN (
        SELECT COUNT(*)
          FROM platform_admin_verifications pav
         WHERE pav.completed_by_admin_id = pap.id
           AND pav.status = 'completed'
           AND pav.completed_at >= NOW() - INTERVAL '30 days'
      ) > 0 THEN
        ROUND(
          (SELECT COUNT(*)::numeric
             FROM platform_admin_verifications pav
            WHERE pav.completed_by_admin_id = pap.id
              AND pav.status = 'completed'
              AND pav.sla_breached = FALSE
              AND pav.completed_at >= NOW() - INTERVAL '30 days'
          ) * 100.0 /
          (SELECT COUNT(*)
             FROM platform_admin_verifications pav
            WHERE pav.completed_by_admin_id = pap.id
              AND pav.status = 'completed'
              AND pav.completed_at >= NOW() - INTERVAL '30 days'
          ), 1
        )
      ELSE NULL
    END AS sla_compliance_rate_pct,
    -- M3: Avg processing hours
    (SELECT ROUND(AVG(
        EXTRACT(EPOCH FROM (pav.completed_at - pav.sla_start_at)) / 3600.0
        - COALESCE(pav.sla_paused_duration_hours, 0)
      )::numeric, 1)
       FROM platform_admin_verifications pav
      WHERE pav.completed_by_admin_id = pap.id
        AND pav.status = 'completed'
        AND pav.completed_at >= NOW() - INTERVAL '30 days'
        AND pav.sla_start_at IS NOT NULL
    ) AS avg_processing_hours,
    -- M6: Queue claims
    COALESCE((
      SELECT COUNT(*)
        FROM verification_assignment_log val
       WHERE val.assigned_admin_id = pap.id
         AND val.event_type = 'queue_claim'
         AND val.created_at >= NOW() - INTERVAL '30 days'
    ), 0) AS open_queue_claims,
    -- M7: Reassignments received
    COALESCE((
      SELECT COUNT(*)
        FROM verification_assignment_log val
       WHERE val.assigned_admin_id = pap.id
         AND val.event_type = 'reassignment'
         AND val.created_at >= NOW() - INTERVAL '30 days'
    ), 0) AS reassignments_received,
    -- M8: Reassignments sent
    COALESCE((
      SELECT COUNT(*)
        FROM verification_assignment_log val
       WHERE val.previous_admin_id = pap.id
         AND val.event_type = 'reassignment'
         AND val.created_at >= NOW() - INTERVAL '30 days'
    ), 0) AS reassignments_sent,
    NOW() - INTERVAL '30 days' AS period_start,
    NOW() AS period_end,
    NOW() AS computed_at
  FROM platform_admin_profiles pap
  WHERE pap.is_active = TRUE
  ON CONFLICT (admin_id) DO UPDATE SET
    verifications_completed = EXCLUDED.verifications_completed,
    sla_compliant_count = EXCLUDED.sla_compliant_count,
    sla_breached_count = EXCLUDED.sla_breached_count,
    sla_compliance_rate_pct = EXCLUDED.sla_compliance_rate_pct,
    avg_processing_hours = EXCLUDED.avg_processing_hours,
    open_queue_claims = EXCLUDED.open_queue_claims,
    reassignments_received = EXCLUDED.reassignments_received,
    reassignments_sent = EXCLUDED.reassignments_sent,
    period_start = EXCLUDED.period_start,
    period_end = EXCLUDED.period_end,
    computed_at = EXCLUDED.computed_at,
    updated_at = NOW();
END;
$$;
