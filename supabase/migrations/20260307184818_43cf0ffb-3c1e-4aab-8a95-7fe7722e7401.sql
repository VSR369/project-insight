
-- MOD-05: Performance Metrics Dashboard — Schema Extension + RPCs + RLS

-- 1. Extend admin_performance_metrics with M6-M8 + period fields
ALTER TABLE public.admin_performance_metrics
  ADD COLUMN IF NOT EXISTS sla_compliant_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sla_breached_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS open_queue_claims INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reassignments_received INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reassignments_sent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ;

-- 2. RLS on admin_performance_metrics
ALTER TABLE public.admin_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Self-view: admin can see own metrics
CREATE POLICY "admin_self_view_metrics"
  ON public.admin_performance_metrics
  FOR SELECT
  TO authenticated
  USING (
    admin_id IN (
      SELECT id FROM public.platform_admin_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Supervisor: can see all metrics
CREATE POLICY "supervisor_view_all_metrics"
  ON public.admin_performance_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE user_id = auth.uid()
        AND admin_tier = 'supervisor'
    )
  );

-- Platform admins can update own metrics (for refresh)
CREATE POLICY "admin_update_own_metrics"
  ON public.admin_performance_metrics
  FOR UPDATE
  TO authenticated
  USING (
    admin_id IN (
      SELECT id FROM public.platform_admin_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Supervisor can update all metrics
CREATE POLICY "supervisor_update_all_metrics"
  ON public.admin_performance_metrics
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE user_id = auth.uid()
        AND admin_tier = 'supervisor'
    )
  );

-- Insert policy for metrics creation
CREATE POLICY "admin_insert_metrics"
  ON public.admin_performance_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE user_id = auth.uid()
        AND admin_tier IN ('supervisor', 'senior_admin')
    )
  );

-- 3. RPC: get_realtime_admin_metrics
-- Returns live M1/M2/M4/M5 from platform_admin_verifications
CREATE OR REPLACE FUNCTION public.get_realtime_admin_metrics(
  p_admin_id UUID DEFAULT NULL
)
RETURNS TABLE (
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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_tier TEXT;
  v_caller_admin_id UUID;
BEGIN
  -- Get caller's admin profile
  SELECT pap.id, pap.admin_tier
    INTO v_caller_admin_id, v_caller_tier
    FROM platform_admin_profiles pap
   WHERE pap.user_id = auth.uid();

  -- BR-MPA-038: non-supervisors can only query their own metrics
  IF v_caller_tier IS DISTINCT FROM 'supervisor' AND p_admin_id IS NULL THEN
    p_admin_id := v_caller_admin_id;
  END IF;

  IF v_caller_tier IS DISTINCT FROM 'supervisor' AND p_admin_id IS DISTINCT FROM v_caller_admin_id THEN
    RAISE EXCEPTION 'Permission denied: can only view own metrics';
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
    -- M4: current pending (assigned, not completed)
    COALESCE((
      SELECT COUNT(*)
        FROM platform_admin_verifications pav
       WHERE pav.assigned_admin_id = pap.id
         AND pav.status IN ('assigned', 'in_progress')
    ), 0) AS current_pending,
    -- M5: SLA at-risk (pending + SLA deadline within 24 hours or breached)
    COALESCE((
      SELECT COUNT(*)
        FROM platform_admin_verifications pav
       WHERE pav.assigned_admin_id = pap.id
         AND pav.status IN ('assigned', 'in_progress')
         AND (
           pav.sla_breached = TRUE
           OR (pav.sla_start_at IS NOT NULL AND
               (NOW() - pav.sla_start_at - COALESCE(pav.sla_paused_duration_hours, 0) * INTERVAL '1 hour') > INTERVAL '48 hours')
         )
    ), 0) AS sla_at_risk_count,
    -- M1: completed total
    COALESCE((
      SELECT COUNT(*)
        FROM platform_admin_verifications pav
       WHERE pav.completed_by_admin_id = pap.id
         AND pav.status = 'completed'
    ), 0) AS completed_total,
    -- SLA compliant count
    COALESCE((
      SELECT COUNT(*)
        FROM platform_admin_verifications pav
       WHERE pav.completed_by_admin_id = pap.id
         AND pav.status = 'completed'
         AND pav.sla_breached = FALSE
    ), 0) AS sla_compliant_total,
    -- SLA breached count
    COALESCE((
      SELECT COUNT(*)
        FROM platform_admin_verifications pav
       WHERE pav.completed_by_admin_id = pap.id
         AND pav.status = 'completed'
         AND pav.sla_breached = TRUE
    ), 0) AS sla_breached_total
  FROM platform_admin_profiles pap
  WHERE pap.is_active = TRUE
    AND (p_admin_id IS NULL OR pap.id = p_admin_id);
END;
$$;

-- 4. RPC: refresh_performance_metrics
-- Batch recalculates M1-M8 from source tables
CREATE OR REPLACE FUNCTION public.refresh_performance_metrics()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only supervisors can refresh
  IF NOT EXISTS (
    SELECT 1 FROM platform_admin_profiles
    WHERE user_id = auth.uid() AND admin_tier = 'supervisor'
  ) THEN
    RAISE EXCEPTION 'Permission denied: supervisor required';
  END IF;

  -- Upsert metrics for all active admins
  INSERT INTO admin_performance_metrics (admin_id, verifications_completed, sla_compliant_count, sla_breached_count, sla_compliance_rate_pct, avg_processing_hours, open_queue_claims, reassignments_received, reassignments_sent, computed_at, updated_at)
  SELECT
    pap.id,
    -- M1: verifications completed
    COALESCE((SELECT COUNT(*) FROM platform_admin_verifications pav WHERE pav.completed_by_admin_id = pap.id AND pav.status = 'completed'), 0),
    -- M2a: SLA compliant
    COALESCE((SELECT COUNT(*) FROM platform_admin_verifications pav WHERE pav.completed_by_admin_id = pap.id AND pav.status = 'completed' AND pav.sla_breached = FALSE), 0),
    -- M2b: SLA breached
    COALESCE((SELECT COUNT(*) FROM platform_admin_verifications pav WHERE pav.completed_by_admin_id = pap.id AND pav.status = 'completed' AND pav.sla_breached = TRUE), 0),
    -- M2: SLA compliance rate
    CASE
      WHEN (SELECT COUNT(*) FROM platform_admin_verifications pav WHERE pav.completed_by_admin_id = pap.id AND pav.status = 'completed') = 0 THEN NULL
      ELSE ROUND(
        (SELECT COUNT(*) FROM platform_admin_verifications pav WHERE pav.completed_by_admin_id = pap.id AND pav.status = 'completed' AND pav.sla_breached = FALSE)::NUMERIC
        / NULLIF((SELECT COUNT(*) FROM platform_admin_verifications pav WHERE pav.completed_by_admin_id = pap.id AND pav.status = 'completed'), 0) * 100
      , 1)
    END,
    -- M3: avg processing hours
    COALESCE((
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (pav.completed_at - pav.sla_start_at)) / 3600.0 - COALESCE(pav.sla_paused_duration_hours, 0))::NUMERIC, 1)
        FROM platform_admin_verifications pav
       WHERE pav.completed_by_admin_id = pap.id AND pav.status = 'completed' AND pav.completed_at IS NOT NULL AND pav.sla_start_at IS NOT NULL
    ), 0),
    -- M6: open queue claims
    COALESCE((SELECT COUNT(*) FROM verification_assignments va WHERE va.assigned_admin_id = pap.id AND va.assignment_method = 'OPEN_QUEUE_CLAIM'), 0),
    -- M7: reassignments received
    COALESCE((SELECT COUNT(*) FROM verification_assignment_log val WHERE val.to_admin_id = pap.id AND val.event_type = 'REASSIGNED'), 0),
    -- M8: reassignments sent
    COALESCE((SELECT COUNT(*) FROM verification_assignment_log val WHERE val.from_admin_id = pap.id AND val.event_type = 'REASSIGNED'), 0),
    NOW(),
    NOW()
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
    computed_at = EXCLUDED.computed_at,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- 5. Index for performance queries
CREATE INDEX IF NOT EXISTS idx_pav_completed_by_status
  ON public.platform_admin_verifications (completed_by_admin_id, status);

CREATE INDEX IF NOT EXISTS idx_pav_assigned_status
  ON public.platform_admin_verifications (assigned_admin_id, status);

CREATE INDEX IF NOT EXISTS idx_val_reassignment_to
  ON public.verification_assignment_log (to_admin_id, event_type);

CREATE INDEX IF NOT EXISTS idx_val_reassignment_from
  ON public.verification_assignment_log (from_admin_id, event_type);
