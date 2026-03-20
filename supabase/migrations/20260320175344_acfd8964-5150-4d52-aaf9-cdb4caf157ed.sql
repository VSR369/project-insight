CREATE OR REPLACE FUNCTION public.check_sla_status(
  p_challenge_id UUID,
  p_phase INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
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

  v_total     := (v_timer.phase_duration_days || ' days')::INTERVAL;
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