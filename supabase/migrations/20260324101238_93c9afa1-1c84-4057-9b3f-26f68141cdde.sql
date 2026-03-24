-- A. Add governance_mode_override column to challenges
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS governance_mode_override TEXT;

ALTER TABLE public.challenges
  DROP CONSTRAINT IF EXISTS chk_challenges_governance_mode_override;

ALTER TABLE public.challenges
  ADD CONSTRAINT chk_challenges_governance_mode_override
  CHECK (governance_mode_override IS NULL OR governance_mode_override IN ('QUICK', 'STRUCTURED', 'CONTROLLED'));

-- B. Create resolve_challenge_governance function
CREATE OR REPLACE FUNCTION public.resolve_challenge_governance(p_challenge_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_override TEXT;
  v_org_default TEXT;
  v_tier TEXT;
  v_effective TEXT;
  v_allowed TEXT[];
BEGIN
  SELECT
    c.governance_mode_override,
    so.governance_profile,
    LOWER(COALESCE(so.subscription_tier, 'basic'))
  INTO v_override, v_org_default, v_tier
  FROM challenges c
  JOIN seeker_organizations so ON so.id = c.organization_id
  WHERE c.id = p_challenge_id;

  IF NOT FOUND THEN
    RETURN 'STRUCTURED';
  END IF;

  v_effective := COALESCE(v_override, v_org_default);

  IF v_effective IN ('LIGHTWEIGHT', 'QUICK') THEN
    v_effective := 'QUICK';
  ELSIF v_effective = 'CONTROLLED' THEN
    v_effective := 'CONTROLLED';
  ELSE
    v_effective := 'STRUCTURED';
  END IF;

  CASE v_tier
    WHEN 'basic', 'starter' THEN
      v_allowed := ARRAY['QUICK'];
    WHEN 'standard' THEN
      v_allowed := ARRAY['QUICK', 'STRUCTURED'];
    WHEN 'premium', 'enterprise' THEN
      v_allowed := ARRAY['QUICK', 'STRUCTURED', 'CONTROLLED'];
    ELSE
      v_allowed := ARRAY['QUICK'];
  END CASE;

  IF v_effective = ANY(v_allowed) THEN
    RETURN v_effective;
  END IF;

  RETURN v_allowed[array_length(v_allowed, 1)];
END;
$$;

-- C. Update validate_role_assignment to use resolver
CREATE OR REPLACE FUNCTION public.validate_role_assignment(
  p_user_id UUID,
  p_challenge_id UUID,
  p_new_role TEXT,
  p_governance_profile TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_roles TEXT[];
  v_role TEXT;
  v_conflict RECORD;
  v_mode TEXT;
BEGIN
  IF p_challenge_id IS NOT NULL THEN
    BEGIN
      v_mode := resolve_challenge_governance(p_challenge_id);
    EXCEPTION WHEN OTHERS THEN
      v_mode := NULL;
    END;
  END IF;

  IF v_mode IS NULL THEN
    v_mode := CASE
      WHEN p_governance_profile IN ('LIGHTWEIGHT', 'QUICK') THEN 'QUICK'
      WHEN p_governance_profile = 'CONTROLLED' THEN 'CONTROLLED'
      ELSE 'STRUCTURED'
    END;
  END IF;

  IF v_mode = 'QUICK' THEN
    RETURN jsonb_build_object('allowed', true, 'conflict_type', 'ALLOWED', 'message', NULL);
  END IF;

  SELECT array_agg(role_code) INTO v_existing_roles
  FROM user_challenge_roles
  WHERE user_id = p_user_id AND challenge_id = p_challenge_id AND is_active = true;

  IF v_existing_roles IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'conflict_type', 'ALLOWED', 'message', NULL);
  END IF;

  FOREACH v_role IN ARRAY v_existing_roles LOOP
    SELECT conflict_type, governance_profile AS rule_profile INTO v_conflict
    FROM role_conflict_rules
    WHERE ((role_a = v_role AND role_b = p_new_role) OR (role_a = p_new_role AND role_b = v_role))
      AND applies_scope = 'SAME_CHALLENGE'
      AND is_active = true
      AND governance_profile IN (v_mode, 'BOTH')
    ORDER BY CASE conflict_type WHEN 'HARD_BLOCK' THEN 0 ELSE 1 END
    LIMIT 1;

    IF NOT FOUND THEN CONTINUE; END IF;

    IF v_conflict.conflict_type = 'HARD_BLOCK' THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'conflict_type', 'HARD_BLOCK',
        'message', 'User holds ' || v_role || ' and cannot also hold ' || p_new_role || ' on the same challenge.'
      );
    END IF;

    IF v_conflict.conflict_type = 'SOFT_WARN' THEN
      RETURN jsonb_build_object(
        'allowed', true,
        'conflict_type', 'SOFT_WARN',
        'message', 'User holds both ' || v_role || ' and ' || p_new_role || '. Org Admin must acknowledge reduced governance.'
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('allowed', true, 'conflict_type', 'ALLOWED', 'message', NULL);
END;
$$;

-- D. Update auto_assign_roles_on_creation to use resolver
CREATE OR REPLACE FUNCTION public.auto_assign_roles_on_creation(
  p_challenge_id UUID,
  p_creator_id UUID,
  p_governance_profile TEXT,
  p_operating_model TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roles TEXT[];
  v_role TEXT;
  v_assigned TEXT[] := '{}';
  v_mode TEXT;
BEGIN
  IF p_challenge_id IS NOT NULL THEN
    BEGIN
      v_mode := resolve_challenge_governance(p_challenge_id);
    EXCEPTION WHEN OTHERS THEN
      v_mode := NULL;
    END;
  END IF;

  IF v_mode IS NULL THEN
    v_mode := CASE
      WHEN p_governance_profile IN ('LIGHTWEIGHT', 'QUICK') THEN 'QUICK'
      WHEN p_governance_profile = 'CONTROLLED' THEN 'CONTROLLED'
      ELSE 'STRUCTURED'
    END;
  END IF;

  IF v_mode = 'QUICK' THEN
    v_roles := ARRAY['CR','CU','ID','ER','LC','FC'];
    IF p_operating_model = 'MP' THEN
      v_roles := array_append(v_roles, 'AM');
    ELSIF p_operating_model = 'AGG' THEN
      v_roles := array_append(v_roles, 'RQ');
    END IF;
  ELSIF v_mode IN ('STRUCTURED','CONTROLLED') THEN
    IF p_operating_model = 'MP' THEN
      v_roles := ARRAY['AM'];
    ELSIF p_operating_model = 'AGG' THEN
      v_roles := ARRAY['CR'];
    ELSE
      v_roles := '{}';
    END IF;
  ELSE
    RETURN jsonb_build_object(
      'roles_assigned', '[]'::jsonb,
      'governance_profile', p_governance_profile,
      'auto_assigned', false,
      'error', 'Unknown governance_profile: ' || COALESCE(p_governance_profile, 'NULL')
    );
  END IF;

  FOREACH v_role IN ARRAY v_roles LOOP
    INSERT INTO public.user_challenge_roles (user_id, challenge_id, role_code, assigned_by, is_active, auto_assigned)
    VALUES (p_creator_id, p_challenge_id, v_role, p_creator_id, true, true)
    ON CONFLICT (user_id, challenge_id, role_code) DO UPDATE SET
      is_active = true, auto_assigned = true, assigned_by = EXCLUDED.assigned_by, updated_at = NOW();

    INSERT INTO public.audit_trail (user_id, challenge_id, action, method, details)
    VALUES (p_creator_id, p_challenge_id, 'ROLE_AUTO_ASSIGNED', 'SYSTEM',
      jsonb_build_object('role_code', v_role, 'governance_profile', p_governance_profile, 'governance_mode', v_mode, 'operating_model', p_operating_model));

    v_assigned := array_append(v_assigned, v_role);
  END LOOP;

  RETURN jsonb_build_object(
    'roles_assigned', to_jsonb(v_assigned),
    'governance_profile', p_governance_profile,
    'governance_mode', v_mode,
    'auto_assigned', true
  );
END;
$$;