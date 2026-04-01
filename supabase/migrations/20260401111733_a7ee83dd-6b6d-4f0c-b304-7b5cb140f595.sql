
-- ============================================================
-- Phase E: validate_role_assignment — CONTROLLED mode role separation
-- ============================================================
-- This function is called by the frontend hook useValidateRoleAssignment
-- before assigning a role to a user on a challenge.
--
-- It resolves the effective governance mode for the challenge,
-- then checks separation-of-duty rules:
--   CONTROLLED: CR+CU and CR+ER are HARD_BLOCK for same user
--   STRUCTURED: CR+CU and CR+ER are SOFT_WARN
--   QUICK: no restrictions (ALLOWED)
--
-- LC and FC are always exempt from restrictions.
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_role_assignment(
  p_user_id   UUID,
  p_challenge_id UUID,
  p_new_role  TEXT,
  p_governance_profile TEXT DEFAULT 'STRUCTURED'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_effective_mode TEXT;
  v_existing_roles TEXT[];
  v_conflict_type  TEXT := 'ALLOWED';
  v_message        TEXT := NULL;
  v_blocked_pairs  TEXT[][] := ARRAY[
    ARRAY['CR','CU'],
    ARRAY['CR','ER']
  ];
  v_pair TEXT[];
  v_has_conflict BOOLEAN := FALSE;
BEGIN
  -- 1. Exempt roles: LC and FC never trigger conflicts
  IF p_new_role IN ('LC', 'FC') THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'conflict_type', 'ALLOWED',
      'message', NULL
    );
  END IF;

  -- 2. Resolve effective governance mode
  IF p_challenge_id IS NOT NULL THEN
    SELECT
      COALESCE(c.governance_mode_override, c.governance_profile, p_governance_profile)
    INTO v_effective_mode
    FROM challenges c
    WHERE c.id = p_challenge_id;
  END IF;

  v_effective_mode := UPPER(TRIM(COALESCE(v_effective_mode, p_governance_profile, 'STRUCTURED')));

  -- Normalize legacy values
  IF v_effective_mode IN ('LIGHTWEIGHT') THEN
    v_effective_mode := 'QUICK';
  ELSIF v_effective_mode IN ('ENTERPRISE') THEN
    v_effective_mode := 'STRUCTURED';
  END IF;

  -- 3. QUICK mode: no restrictions
  IF v_effective_mode = 'QUICK' THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'conflict_type', 'ALLOWED',
      'message', NULL
    );
  END IF;

  -- 4. Get existing active roles for this user on this challenge
  IF p_challenge_id IS NOT NULL THEN
    SELECT ARRAY_AGG(DISTINCT cra.role_code)
    INTO v_existing_roles
    FROM challenge_role_assignments cra
    JOIN platform_provider_pool ppp ON ppp.id = cra.pool_member_id
    WHERE cra.challenge_id = p_challenge_id
      AND ppp.provider_id = p_user_id
      AND cra.status = 'active';
  END IF;

  v_existing_roles := COALESCE(v_existing_roles, ARRAY[]::TEXT[]);

  -- 5. Check blocked pairs
  FOREACH v_pair SLICE 1 IN ARRAY v_blocked_pairs
  LOOP
    -- Check if new_role + any existing role form a blocked pair
    IF (p_new_role = v_pair[1] AND v_pair[2] = ANY(v_existing_roles))
       OR (p_new_role = v_pair[2] AND v_pair[1] = ANY(v_existing_roles))
    THEN
      v_has_conflict := TRUE;

      IF v_effective_mode = 'CONTROLLED' THEN
        v_conflict_type := 'HARD_BLOCK';
        v_message := format(
          'CONTROLLED mode: a single user cannot hold both %s and %s roles on the same challenge.',
          v_pair[1], v_pair[2]
        );
        -- Hard block: return immediately
        RETURN jsonb_build_object(
          'allowed', false,
          'conflict_type', v_conflict_type,
          'message', v_message
        );
      ELSE
        -- STRUCTURED mode: soft warning
        v_conflict_type := 'SOFT_WARN';
        v_message := format(
          'Warning: holding both %s and %s roles may create a conflict of interest.',
          v_pair[1], v_pair[2]
        );
      END IF;
    END IF;
  END LOOP;

  -- 6. Return result
  RETURN jsonb_build_object(
    'allowed', true,
    'conflict_type', v_conflict_type,
    'message', v_message
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_role_assignment(UUID, UUID, TEXT, TEXT) TO authenticated;
