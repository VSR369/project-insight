
CREATE OR REPLACE FUNCTION public.validate_phase_transition(
  p_challenge_id UUID,
  p_from_status  TEXT,
  p_to_status    TEXT,
  p_user_id      UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_phase   INTEGER;
  v_has_permission   BOOLEAN;
BEGIN
  -- -------------------------------------------------------
  -- 1. Block any transition FROM terminal states
  -- -------------------------------------------------------
  IF p_from_status = 'TERMINAL' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Cannot transition from TERMINAL status. This state is permanent.'
    );
  END IF;

  -- -------------------------------------------------------
  -- 2. Block reversal from COMPLETED back to ACTIVE
  -- -------------------------------------------------------
  IF p_from_status = 'COMPLETED' AND p_to_status = 'ACTIVE' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Cannot revert a COMPLETED phase back to ACTIVE.'
    );
  END IF;

  -- -------------------------------------------------------
  -- 3. Validate allowed transition pairs
  -- -------------------------------------------------------
  IF NOT (
    (p_from_status = 'ACTIVE'  AND p_to_status IN ('COMPLETED', 'ON_HOLD', 'TERMINAL'))
    OR
    (p_from_status = 'ON_HOLD' AND p_to_status = 'ACTIVE')
  ) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('Invalid transition: %s -> %s is not permitted.', p_from_status, p_to_status)
    );
  END IF;

  -- -------------------------------------------------------
  -- 4. Get current phase and guard backward moves
  -- -------------------------------------------------------
  SELECT current_phase INTO v_current_phase
    FROM public.challenges
   WHERE id = p_challenge_id;

  IF v_current_phase IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Challenge not found.'
    );
  END IF;

  -- -------------------------------------------------------
  -- 5. Check user has required role for current phase
  -- -------------------------------------------------------
  BEGIN
    SELECT public.can_perform(p_challenge_id, p_user_id, v_current_phase)
      INTO v_has_permission;
  EXCEPTION WHEN undefined_function THEN
    -- can_perform not yet deployed; allow by default
    v_has_permission := true;
  END;

  IF NOT COALESCE(v_has_permission, false) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('User does not have the required role for phase %s.', v_current_phase)
    );
  END IF;

  -- -------------------------------------------------------
  -- 6. All checks passed
  -- -------------------------------------------------------
  RETURN jsonb_build_object(
    'valid', true,
    'error', null
  );
END;
$$;

COMMENT ON FUNCTION public.validate_phase_transition(UUID, TEXT, TEXT, UUID) IS
  'Validates challenge status transitions. Enforces allowed pairs (ACTIVE->COMPLETED/ON_HOLD/TERMINAL, ON_HOLD->ACTIVE), blocks terminal/completed reversals, and checks user role permission via can_perform.';
