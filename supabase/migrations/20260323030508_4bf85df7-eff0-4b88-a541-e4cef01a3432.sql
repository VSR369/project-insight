-- Step 1A: Create roles_equivalent helper function
CREATE OR REPLACE FUNCTION public.roles_equivalent(p_required text, p_actual text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_required = p_actual
      OR (p_required = 'CR' AND p_actual = 'CA')
      OR (p_required = 'CA' AND p_actual = 'CR');
$$;

-- Step 1B: Update can_perform to use roles_equivalent
CREATE OR REPLACE FUNCTION public.can_perform(
  p_user_id uuid,
  p_challenge_id uuid,
  p_required_role text,
  p_required_phase integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operating_model text;
BEGIN
  -- Step 1: Check active role assignment (using roles_equivalent)
  IF NOT EXISTS (
    SELECT 1 FROM user_challenge_roles
    WHERE user_id = p_user_id
      AND challenge_id = p_challenge_id
      AND roles_equivalent(p_required_role, role_code)
      AND is_active = true
  ) THEN
    RETURN false;
  END IF;

  -- Step 2: Phase check (only if p_required_phase is provided)
  IF p_required_phase IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM challenges
      WHERE id = p_challenge_id
        AND current_phase = p_required_phase
        AND phase_status = 'ACTIVE'
    ) THEN
      RETURN false;
    END IF;
  END IF;

  -- Step 3: Operating model check
  SELECT operating_model INTO v_operating_model
  FROM challenges
  WHERE id = p_challenge_id;

  IF p_required_role = 'AM' AND v_operating_model = 'AGG' THEN
    RETURN false;
  END IF;

  IF p_required_role = 'RQ' AND v_operating_model = 'MP' THEN
    RETURN false;
  END IF;

  -- Step 4: All checks passed
  RETURN true;
END;
$$;

-- Step 1C: Update get_user_dashboard_data to use roles_equivalent
CREATE OR REPLACE FUNCTION public.get_user_dashboard_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  v_required_role text;
  v_deadline_at timestamptz;
  v_needs_action jsonb := '[]'::jsonb;
  v_waiting_for jsonb := '[]'::jsonb;
  v_role_match boolean;
BEGIN
  FOR rec IN SELECT * FROM get_user_all_challenge_roles(p_user_id)
  LOOP
    v_required_role := get_phase_required_role(rec.current_phase);

    -- Check if any of the user's role codes are equivalent to the required role
    v_role_match := false;
    IF v_required_role IS NOT NULL AND rec.phase_status = 'ACTIVE' THEN
      SELECT true INTO v_role_match
      FROM unnest(rec.role_codes) AS rc(code)
      WHERE roles_equivalent(v_required_role, rc.code)
      LIMIT 1;
      v_role_match := COALESCE(v_role_match, false);
    END IF;

    IF v_role_match THEN
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