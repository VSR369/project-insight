
-- Drop old function with original param order
DROP FUNCTION IF EXISTS public.auto_assign_roles_on_creation(uuid, uuid, text, text);

-- Recreate with correct params and updated role logic
CREATE OR REPLACE FUNCTION public.auto_assign_roles_on_creation(
  p_challenge_id UUID,
  p_creator_id UUID,
  p_governance_profile TEXT DEFAULT 'STRUCTURED',
  p_operating_model TEXT DEFAULT 'AGG'
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
    v_roles := ARRAY['CR','CU','ER','LC','FC'];
  ELSIF v_mode IN ('STRUCTURED','CONTROLLED') THEN
    v_roles := ARRAY['CR'];
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

-- Deactivate orphan legacy role assignments
UPDATE public.user_challenge_roles
SET is_active = false, updated_at = NOW()
WHERE role_code IN ('AM', 'ID', 'RQ') AND is_active = true;
