
-- =============================================================
-- Function 1: start_sla_timer
-- =============================================================
CREATE OR REPLACE FUNCTION public.start_sla_timer(
  p_challenge_id  UUID,
  p_phase         INTEGER,
  p_role_code     TEXT,
  p_duration_days INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duration INTEGER;
  v_tenant_id UUID;
BEGIN
  -- Resolve duration
  IF p_duration_days IS NOT NULL THEN
    v_duration := p_duration_days;
  ELSE
    v_duration := CASE p_phase
      WHEN 1  THEN 5
      WHEN 2  THEN 15
      WHEN 3  THEN 5
      WHEN 4  THEN 5
      WHEN 5  THEN 3
      WHEN 8  THEN 10
      WHEN 9  THEN 5
      WHEN 10 THEN 30
      WHEN 11 THEN 5
      WHEN 12 THEN 5
      WHEN 13 THEN 14
      ELSE 7  -- fallback default
    END;
  END IF;

  -- Get tenant_id from challenge
  SELECT tenant_id INTO v_tenant_id
    FROM public.challenges
   WHERE id = p_challenge_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Challenge not found: %', p_challenge_id;
  END IF;

  -- Insert timer
  INSERT INTO public.sla_timers (
    challenge_id,
    phase,
    role_code,
    duration_days,
    started_at,
    deadline_at,
    status,
    tenant_id
  ) VALUES (
    p_challenge_id,
    p_phase,
    p_role_code,
    v_duration,
    NOW(),
    NOW() + (v_duration || ' days')::INTERVAL,
    'ACTIVE',
    v_tenant_id
  );
END;
$$;

COMMENT ON FUNCTION public.start_sla_timer(UUID, INTEGER, TEXT, INTEGER) IS
  'Starts an SLA timer for a challenge phase with default or custom duration. Inserts into sla_timers with computed deadline.';

-- =============================================================
-- Function 2: check_sla_status
-- =============================================================
CREATE OR REPLACE FUNCTION public.check_sla_status(
  p_challenge_id UUID,
  p_phase        INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timer        RECORD;
  v_remaining    INTERVAL;
  v_total        INTERVAL;
  v_pct_used     NUMERIC;
  v_status       TEXT;
  v_remaining_h  NUMERIC;
BEGIN
  SELECT *
    INTO v_timer
    FROM public.sla_timers
   WHERE challenge_id = p_challenge_id
     AND phase = p_phase
   ORDER BY started_at DESC
   LIMIT 1;

  IF v_timer IS NULL THEN
    RETURN jsonb_build_object(
      'status',          'NO_TIMER',
      'remaining_hours', null,
      'deadline_at',     null,
      'percentage_used', null
    );
  END IF;

  -- Already breached
  IF v_timer.breached_at IS NOT NULL THEN
    v_remaining := v_timer.deadline_at - NOW();
    v_remaining_h := ROUND(EXTRACT(EPOCH FROM v_remaining) / 3600.0, 1);
    RETURN jsonb_build_object(
      'status',          'BREACHED',
      'remaining_hours', v_remaining_h,
      'deadline_at',     v_timer.deadline_at,
      'percentage_used', 1.0
    );
  END IF;

  v_total     := (v_timer.duration_days || ' days')::INTERVAL;
  v_remaining := v_timer.deadline_at - NOW();
  v_remaining_h := ROUND(EXTRACT(EPOCH FROM v_remaining) / 3600.0, 1);

  -- Guard division by zero
  IF EXTRACT(EPOCH FROM v_total) = 0 THEN
    v_pct_used := 1.0;
  ELSE
    v_pct_used := ROUND(
      1.0 - (EXTRACT(EPOCH FROM v_remaining) / EXTRACT(EPOCH FROM v_total))::NUMERIC,
      3
    );
  END IF;

  -- Clamp
  IF v_pct_used > 1.0 THEN v_pct_used := 1.0; END IF;
  IF v_pct_used < 0.0 THEN v_pct_used := 0.0; END IF;

  -- Determine status
  IF v_remaining <= INTERVAL '0' THEN
    v_status := 'BREACHED';
  ELSIF v_pct_used > 0.75 THEN
    v_status := 'APPROACHING';
  ELSE
    v_status := 'ON_TRACK';
  END IF;

  RETURN jsonb_build_object(
    'status',          v_status,
    'remaining_hours', v_remaining_h,
    'deadline_at',     v_timer.deadline_at,
    'percentage_used', v_pct_used
  );
END;
$$;

COMMENT ON FUNCTION public.check_sla_status(UUID, INTEGER) IS
  'Returns SLA status for a challenge phase: ON_TRACK, APPROACHING (>75%), or BREACHED, with remaining hours and percentage used.';

-- =============================================================
-- Function 3: process_sla_breaches
-- =============================================================
CREATE OR REPLACE FUNCTION public.process_sla_breaches()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count      INTEGER := 0;
  v_rec        RECORD;
  v_tenant_id  UUID;
  v_challenge_title TEXT;
BEGIN
  -- Find and mark breached timers
  FOR v_rec IN
    SELECT st.id, st.challenge_id, st.phase, st.role_code, st.tenant_id
      FROM public.sla_timers st
     WHERE st.status = 'ACTIVE'
       AND st.deadline_at < NOW()
  LOOP
    -- Mark as breached
    UPDATE public.sla_timers
       SET status = 'BREACHED',
           breached_at = NOW()
     WHERE id = v_rec.id;

    -- Get challenge title for notification
    SELECT title INTO v_challenge_title
      FROM public.challenges
     WHERE id = v_rec.challenge_id;

    -- Notify assigned users with the role on this challenge
    BEGIN
      INSERT INTO public.cogni_notifications (
        user_id,
        challenge_id,
        notification_type,
        title,
        message
      )
      SELECT
        ucr.user_id,
        v_rec.challenge_id,
        'sla_breach',
        'SLA Deadline Breached',
        format('Phase %s deadline breached for challenge "%s". Immediate action required.',
               v_rec.phase, COALESCE(v_challenge_title, 'Unknown'))
      FROM public.user_challenge_roles ucr
      WHERE ucr.challenge_id = v_rec.challenge_id
        AND ucr.role_code = v_rec.role_code
        AND ucr.is_active = true;
    EXCEPTION WHEN undefined_table THEN
      NULL; -- user_challenge_roles not yet created
    END;

    -- Notify org admins
    BEGIN
      INSERT INTO public.cogni_notifications (
        user_id,
        challenge_id,
        notification_type,
        title,
        message
      )
      SELECT
        soa.user_id,
        v_rec.challenge_id,
        'sla_breach_admin',
        'SLA Breach Alert',
        format('Phase %s SLA breached for challenge "%s" (role: %s). Please review.',
               v_rec.phase, COALESCE(v_challenge_title, 'Unknown'), v_rec.role_code)
      FROM public.seeking_org_admins soa
      WHERE soa.organization_id = v_rec.tenant_id
        AND soa.status = 'active'
        AND soa.admin_tier = 'PRIMARY';
    EXCEPTION WHEN undefined_column THEN
      NULL; -- graceful fallback
    END;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.process_sla_breaches() IS
  'Scans for overdue SLA timers, marks them BREACHED, and sends notifications to assigned users and org admins. Returns count of breaches processed.';
