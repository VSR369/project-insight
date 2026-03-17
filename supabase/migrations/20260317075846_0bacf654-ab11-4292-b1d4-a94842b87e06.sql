
CREATE OR REPLACE FUNCTION public.get_valid_transitions(
  p_challenge_id UUID,
  p_user_id      UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phase_status   TEXT;
  v_current_phase  INTEGER;
  v_has_permission BOOLEAN;
  v_required_role  TEXT;
BEGIN
  -- Get challenge state
  SELECT phase_status, current_phase
    INTO v_phase_status, v_current_phase
    FROM public.challenges
   WHERE id = p_challenge_id;

  IF v_current_phase IS NULL THEN
    RETURN jsonb_build_object('actions', '[]'::jsonb, 'waiting_for', null);
  END IF;

  -- Determine required role for current phase
  BEGIN
    SELECT public.get_phase_required_role(v_current_phase) INTO v_required_role;
  EXCEPTION WHEN undefined_function THEN
    v_required_role := NULL;
  END;

  -- Check permission
  BEGIN
    SELECT public.can_perform(p_challenge_id, p_user_id, v_current_phase)
      INTO v_has_permission;
  EXCEPTION WHEN undefined_function THEN
    v_has_permission := true;
  END;

  -- No permission: return empty with waiting_for
  IF NOT COALESCE(v_has_permission, false) THEN
    RETURN jsonb_build_object(
      'actions',     '[]'::jsonb,
      'waiting_for', COALESCE(v_required_role, 'unknown_role')
    );
  END IF;

  -- ACTIVE: complete, hold, terminate
  IF v_phase_status = 'ACTIVE' THEN
    RETURN jsonb_build_object(
      'actions', jsonb_build_array(
        jsonb_build_object('action', 'complete',  'label', 'Complete Phase',    'type', 'primary'),
        jsonb_build_object('action', 'hold',      'label', 'Put On Hold',       'type', 'secondary'),
        jsonb_build_object('action', 'terminate', 'label', 'Cancel Challenge',  'type', 'danger')
      ),
      'waiting_for', null
    );
  END IF;

  -- ON_HOLD: resume
  IF v_phase_status = 'ON_HOLD' THEN
    RETURN jsonb_build_object(
      'actions', jsonb_build_array(
        jsonb_build_object('action', 'resume', 'label', 'Resume', 'type', 'primary')
      ),
      'waiting_for', null
    );
  END IF;

  -- COMPLETED / TERMINAL / other: no actions
  RETURN jsonb_build_object('actions', '[]'::jsonb, 'waiting_for', null);
END;
$$;

COMMENT ON FUNCTION public.get_valid_transitions(UUID, UUID) IS
  'Returns available phase transition actions for a challenge based on current phase_status and user role permissions. Includes waiting_for role name when user lacks permission.';
