
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
BEGIN
  -- Build role array based on governance profile
  IF p_governance_profile = 'LIGHTWEIGHT' THEN
    -- All 8 seeker-side roles
    v_roles := ARRAY['CR','CU','ID','ER','LC','FC'];
    IF p_operating_model = 'MP' THEN
      v_roles := v_roles || 'AM';
    ELSIF p_operating_model = 'AGG' THEN
      v_roles := v_roles || 'RQ';
    END IF;

  ELSIF p_governance_profile = 'ENTERPRISE' THEN
    -- Only initiation role
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

  -- Loop and insert each role
  FOREACH v_role IN ARRAY v_roles
  LOOP
    INSERT INTO public.user_challenge_roles (
      user_id, challenge_id, role_code, assigned_by, is_active, auto_assigned
    ) VALUES (
      p_creator_id, p_challenge_id, v_role, p_creator_id, true, true
    )
    ON CONFLICT (user_id, challenge_id, role_code)
    DO UPDATE SET
      is_active = true,
      auto_assigned = true,
      assigned_by = EXCLUDED.assigned_by,
      updated_at = NOW();

    -- Audit trail
    INSERT INTO public.audit_trail (
      user_id, challenge_id, action, method, details
    ) VALUES (
      p_creator_id,
      p_challenge_id,
      'ROLE_AUTO_ASSIGNED',
      'SYSTEM',
      jsonb_build_object(
        'role_code', v_role,
        'governance_profile', p_governance_profile,
        'operating_model', p_operating_model
      )
    );

    v_assigned := v_assigned || v_role;
  END LOOP;

  RETURN jsonb_build_object(
    'roles_assigned', to_jsonb(v_assigned),
    'governance_profile', p_governance_profile,
    'auto_assigned', true
  );
END;
$$;
