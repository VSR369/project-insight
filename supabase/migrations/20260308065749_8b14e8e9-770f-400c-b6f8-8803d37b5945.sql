
-- GAP-8: Drop overly broad original RLS policy
DROP POLICY IF EXISTS "platform_admin_select_metrics" ON admin_performance_metrics;

-- GAP-2 + GAP-1 (DB side): Replace get_realtime_admin_metrics with period support + correct M5
CREATE OR REPLACE FUNCTION public.get_realtime_admin_metrics(
  p_admin_id UUID DEFAULT NULL,
  p_period_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  admin_id UUID,
  full_name TEXT,
  admin_tier TEXT,
  availability_status TEXT,
  current_active_verifications INTEGER,
  max_concurrent_verifications INTEGER,
  assignment_priority INTEGER,
  current_pending BIGINT,
  sla_at_risk_count BIGINT,
  completed_total BIGINT,
  sla_compliant_total BIGINT,
  sla_breached_total BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_is_supervisor BOOLEAN;
BEGIN
  -- Get caller's admin profile
  SELECT pap.id, pap.is_supervisor
  INTO v_caller_id, v_is_supervisor
  FROM platform_admin_profiles pap
  WHERE pap.user_id = auth.uid();

  -- BR-MPA-038: Non-supervisors can only query their own metrics
  IF NOT v_is_supervisor AND p_admin_id IS NULL THEN
    p_admin_id := v_caller_id;
  END IF;

  IF NOT v_is_supervisor AND p_admin_id != v_caller_id THEN
    RAISE EXCEPTION 'Permission denied: non-supervisors can only view their own metrics';
  END IF;

  RETURN QUERY
  SELECT
    pap.id AS admin_id,
    pap.full_name,
    pap.admin_tier,
    pap.availability_status,
    pap.current_active_verifications,
    pap.max_concurrent_verifications,
    pap.assignment_priority,
    -- M4: Current pending (always live, no period filter)
    COALESCE((
      SELECT COUNT(*)
      FROM platform_admin_verifications pav
      WHERE pav.assigned_admin_id = pap.id
        AND pav.status IN ('assigned', 'in_progress')
    ), 0) AS current_pending,
    -- M5: At-risk — verifications with any SLA breach tier (FIXED: was using sla_breached OR time > 48h)
    COALESCE((
      SELECT COUNT(*)
      FROM platform_admin_verifications pav
      WHERE pav.assigned_admin_id = pap.id
        AND pav.status IN ('assigned', 'in_progress')
        AND pav.sla_breach_tier IS NOT NULL
        AND pav.sla_breach_tier IN ('TIER1', 'TIER2', 'TIER3')
    ), 0) AS sla_at_risk_count,
    -- M1: Completed (period-filtered)
    COALESCE((
      SELECT COUNT(*)
      FROM platform_admin_verifications pav
      WHERE pav.completed_by_admin_id = pap.id
        AND pav.status = 'completed'
        AND pav.completed_at >= NOW() - (p_period_days || ' days')::INTERVAL
    ), 0) AS completed_total,
    -- M2 numerator: SLA compliant (period-filtered)
    COALESCE((
      SELECT COUNT(*)
      FROM platform_admin_verifications pav
      WHERE pav.completed_by_admin_id = pap.id
        AND pav.status = 'completed'
        AND pav.sla_breached = FALSE
        AND pav.completed_at >= NOW() - (p_period_days || ' days')::INTERVAL
    ), 0) AS sla_compliant_total,
    -- M2 denominator part: SLA breached (period-filtered)
    COALESCE((
      SELECT COUNT(*)
      FROM platform_admin_verifications pav
      WHERE pav.completed_by_admin_id = pap.id
        AND pav.status = 'completed'
        AND pav.sla_breached = TRUE
        AND pav.completed_at >= NOW() - (p_period_days || ' days')::INTERVAL
    ), 0) AS sla_breached_total
  FROM platform_admin_profiles pap
  WHERE (p_admin_id IS NULL OR pap.id = p_admin_id);
END;
$$;

-- GAP-9: Replace refresh_performance_metrics with rolling 30-day window
CREATE OR REPLACE FUNCTION public.refresh_performance_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO admin_performance_metrics (
    admin_id,
    verifications_completed,
    sla_compliant_count,
    sla_breached_count,
    avg_processing_hours,
    sla_compliance_rate_pct,
    open_queue_claims,
    reassignments_received,
    reassignments_sent,
    period_start,
    period_end,
    computed_at,
    updated_at
  )
  SELECT
    pap.id AS admin_id,
    -- M1: Completed in rolling 30 days
    COALESCE((
      SELECT COUNT(*)
      FROM platform_admin_verifications pav
      WHERE pav.completed_by_admin_id = pap.id
        AND pav.status = 'completed'
        AND pav.completed_at >= NOW() - INTERVAL '30 days'
    ), 0),
    -- M2a: SLA compliant in rolling 30 days
    COALESCE((
      SELECT COUNT(*)
      FROM platform_admin_verifications pav
      WHERE pav.completed_by_admin_id = pap.id
        AND pav.status = 'completed'
        AND pav.sla_breached = FALSE
        AND pav.completed_at >= NOW() - INTERVAL '30 days'
    ), 0),
    -- M2b: SLA breached in rolling 30 days
    COALESCE((
      SELECT COUNT(*)
      FROM platform_admin_verifications pav
      WHERE pav.completed_by_admin_id = pap.id
        AND pav.status = 'completed'
        AND pav.sla_breached = TRUE
        AND pav.completed_at >= NOW() - INTERVAL '30 days'
    ), 0),
    -- M3: Avg processing hours in rolling 30 days
    (
      SELECT ROUND(AVG(
        EXTRACT(EPOCH FROM (pav.completed_at - pav.sla_start_at)) / 3600.0
        - COALESCE(pav.sla_paused_duration_hours, 0)
      )::numeric, 1)
      FROM platform_admin_verifications pav
      WHERE pav.completed_by_admin_id = pap.id
        AND pav.status = 'completed'
        AND pav.completed_at IS NOT NULL
        AND pav.sla_start_at IS NOT NULL
        AND pav.completed_at >= NOW() - INTERVAL '30 days'
    ),
    -- SLA compliance rate
    CASE
      WHEN (SELECT COUNT(*) FROM platform_admin_verifications pav
            WHERE pav.completed_by_admin_id = pap.id AND pav.status = 'completed'
            AND pav.completed_at >= NOW() - INTERVAL '30 days') > 0
      THEN ROUND(
        (SELECT COUNT(*) FROM platform_admin_verifications pav
         WHERE pav.completed_by_admin_id = pap.id AND pav.status = 'completed'
         AND pav.sla_breached = FALSE AND pav.completed_at >= NOW() - INTERVAL '30 days')::numeric
        / (SELECT COUNT(*) FROM platform_admin_verifications pav
           WHERE pav.completed_by_admin_id = pap.id AND pav.status = 'completed'
           AND pav.completed_at >= NOW() - INTERVAL '30 days')::numeric
        * 100, 1
      )
      ELSE NULL
    END,
    -- M6: Open queue claims in rolling 30 days
    COALESCE((
      SELECT COUNT(*)
      FROM verification_assignments va
      WHERE va.assigned_admin_id = pap.id
        AND va.assignment_method = 'queue_claim'
        AND va.assigned_at >= NOW() - INTERVAL '30 days'
    ), 0),
    -- M7: Reassignments received in rolling 30 days
    COALESCE((
      SELECT COUNT(*)
      FROM verification_assignment_log val
      WHERE val.to_admin_id = pap.id
        AND val.event_type = 'reassignment'
        AND val.created_at >= NOW() - INTERVAL '30 days'
    ), 0),
    -- M8: Reassignments sent in rolling 30 days
    COALESCE((
      SELECT COUNT(*)
      FROM verification_assignment_log val
      WHERE val.from_admin_id = pap.id
        AND val.event_type = 'reassignment'
        AND val.created_at >= NOW() - INTERVAL '30 days'
    ), 0),
    (NOW() - INTERVAL '30 days')::date,
    NOW()::date,
    NOW(),
    NOW()
  FROM platform_admin_profiles pap
  ON CONFLICT (admin_id) DO UPDATE SET
    verifications_completed = EXCLUDED.verifications_completed,
    sla_compliant_count = EXCLUDED.sla_compliant_count,
    sla_breached_count = EXCLUDED.sla_breached_count,
    avg_processing_hours = EXCLUDED.avg_processing_hours,
    sla_compliance_rate_pct = EXCLUDED.sla_compliance_rate_pct,
    open_queue_claims = EXCLUDED.open_queue_claims,
    reassignments_received = EXCLUDED.reassignments_received,
    reassignments_sent = EXCLUDED.reassignments_sent,
    period_start = EXCLUDED.period_start,
    period_end = EXCLUDED.period_end,
    computed_at = EXCLUDED.computed_at,
    updated_at = EXCLUDED.updated_at;
END;
$$;
