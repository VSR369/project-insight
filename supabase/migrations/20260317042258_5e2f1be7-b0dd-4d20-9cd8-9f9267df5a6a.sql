-- M-02: CogniBlend RBAC database functions

-- Function 1: can_perform
CREATE OR REPLACE FUNCTION public.can_perform(
  p_user_id uuid,
  p_challenge_id uuid,
  p_required_role text,
  p_required_phase integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operating_model text;
BEGIN
  -- Step 1: Check active role assignment
  IF NOT EXISTS (
    SELECT 1 FROM user_challenge_roles
    WHERE user_id = p_user_id
      AND challenge_id = p_challenge_id
      AND role_code = p_required_role
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

-- Function 2: get_user_roles
CREATE OR REPLACE FUNCTION public.get_user_roles(
  p_user_id uuid,
  p_challenge_id uuid
)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT role_code
      FROM user_challenge_roles
      WHERE user_id = p_user_id
        AND challenge_id = p_challenge_id
        AND is_active = true
    ),
    ARRAY[]::text[]
  );
$$;