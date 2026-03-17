CREATE OR REPLACE FUNCTION public.get_user_dashboard_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  v_required_role text;
  v_deadline_at timestamptz;
  v_needs_action jsonb := '[]'::jsonb;
  v_waiting_for jsonb := '[]'::jsonb;
BEGIN
  FOR rec IN SELECT * FROM get_user_all_challenge_roles(p_user_id)
  LOOP
    v_required_role := get_phase_required_role(rec.current_phase);

    IF v_required_role IS NOT NULL
       AND v_required_role = ANY(rec.role_codes)
       AND rec.phase_status = 'ACTIVE'
    THEN
      v_needs_action := v_needs_action || jsonb_build_object(
        'challenge_id', rec.challenge_id,
        'title', rec.challenge_title,
        'current_phase', rec.current_phase,
        'phase_status', rec.phase_status,
        'required_role', v_required_role,
        'operating_model', rec.operating_model
      );
    ELSE
      SELECT st.deadline_at INTO v_deadline_at
      FROM sla_timers st
      WHERE st.challenge_id = rec.challenge_id
        AND st.phase = rec.current_phase
      LIMIT 1;

      v_waiting_for := v_waiting_for || jsonb_build_object(
        'challenge_id', rec.challenge_id,
        'title', rec.challenge_title,
        'current_phase', rec.current_phase,
        'waiting_for_role', COALESCE(v_required_role, 'Solver submissions'),
        'operating_model', rec.operating_model,
        'deadline_at', v_deadline_at
      );

      v_deadline_at := NULL;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'needs_action', v_needs_action,
    'waiting_for', v_waiting_for
  );
END;
$$;