-- Fix initialize_challenge default from ENTERPRISE to STRUCTURED
CREATE OR REPLACE FUNCTION public.initialize_challenge(
  p_org_id UUID,
  p_creator_id UUID,
  p_title TEXT,
  p_operating_model TEXT DEFAULT NULL,
  p_governance_mode_override TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge_id UUID;
  v_tenant_id UUID;
  v_governance TEXT;
  v_operating_model TEXT;
BEGIN
  -- Resolve tenant
  v_tenant_id := p_org_id;

  -- Resolve governance mode
  v_governance := COALESCE(p_governance_mode_override, 'STRUCTURED');

  -- Normalize legacy modes
  IF v_governance = 'LIGHTWEIGHT' THEN v_governance := 'QUICK'; END IF;
  IF v_governance = 'ENTERPRISE' THEN v_governance := 'CONTROLLED'; END IF;

  -- Resolve operating model
  v_operating_model := COALESCE(p_operating_model, 'MP');

  -- Create challenge
  INSERT INTO public.challenges (
    organization_id,
    tenant_id,
    title,
    status,
    current_phase,
    phase_status,
    master_status,
    operating_model,
    governance_mode_override,
    created_by
  ) VALUES (
    p_org_id,
    v_tenant_id,
    p_title,
    'DRAFT',
    1,
    'ACTIVE',
    'IN_PREPARATION',
    v_operating_model,
    v_governance,
    p_creator_id
  )
  RETURNING id INTO v_challenge_id;

  RETURN v_challenge_id;
END;
$$;