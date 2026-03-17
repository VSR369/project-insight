
-- Function 1: get_mandatory_fields
CREATE OR REPLACE FUNCTION public.get_mandatory_fields(
  p_governance_profile TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_base JSONB;
  v_extended JSONB;
BEGIN
  v_base := '["title","description","problem_statement","deliverables","evaluation_criteria","reward_structure","maturity_level","phase_schedule"]'::jsonb;

  IF p_governance_profile = 'LIGHTWEIGHT' THEN
    RETURN v_base;
  END IF;

  IF p_governance_profile = 'ENTERPRISE' THEN
    v_extended := '["scope","complexity_parameters","ip_model","visibility","eligibility","submission_guidelines","taxonomy_tags","permitted_artifact_types"]'::jsonb;
    RETURN v_base || v_extended;
  END IF;

  -- Unknown profile: return enterprise set (safe default)
  v_extended := '["scope","complexity_parameters","ip_model","visibility","eligibility","submission_guidelines","taxonomy_tags","permitted_artifact_types"]'::jsonb;
  RETURN v_base || v_extended;
END;
$$;

COMMENT ON FUNCTION public.get_mandatory_fields(TEXT) IS
  'Returns the list of mandatory challenge fields for LIGHTWEIGHT (8) or ENTERPRISE (16) governance profiles.';

-- Function 2: get_gate_requirements
CREATE OR REPLACE FUNCTION public.get_gate_requirements(
  p_governance_profile TEXT,
  p_gate_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- GATE-11-L: Lightweight pre-publication
  IF p_gate_id = 'GATE-11-L' THEN
    RETURN jsonb_build_object(
      'gate_id',    'GATE-11-L',
      'profile',    'LIGHTWEIGHT',
      'checks',     '["mandatory_content_complete","legal_templates_auto_attached","complexity_level_selected","access_toggle_set","phase_schedule_confirmed","solver_match_exists"]'::jsonb,
      'check_count', 6
    );
  END IF;

  -- GATE-11: Enterprise pre-publication
  IF p_gate_id = 'GATE-11' THEN
    RETURN jsonb_build_object(
      'gate_id',    'GATE-11',
      'profile',    'ENTERPRISE',
      'checks',     '["all_content_complete","tier1_legal_attached","tier2_legal_attached","complexity_finalized","eligibility_configured","visibility_set","phase_schedule_defined","reward_validated","maturity_and_artifacts_set","solver_match_exists"]'::jsonb,
      'check_count', 10
    );
  END IF;

  -- Unknown gate: return empty checks
  RETURN jsonb_build_object(
    'gate_id',    p_gate_id,
    'profile',    p_governance_profile,
    'checks',     '[]'::jsonb,
    'check_count', 0
  );
END;
$$;

COMMENT ON FUNCTION public.get_gate_requirements(TEXT, TEXT) IS
  'Returns the gate check requirements for a given governance profile and gate ID (GATE-11-L or GATE-11).';

-- Function 3: get_active_rules
CREATE OR REPLACE FUNCTION public.get_active_rules(
  p_governance_profile TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_governance_profile = 'ENTERPRISE' THEN
    RETURN jsonb_build_object(
      'BR-TRUST',  jsonb_build_object('status', 'ACTIVE',      'note', 'Full trust framework active'),
      'BR-ESCROW', jsonb_build_object('status', 'ACTIVE',      'note', 'Full escrow with partial payments'),
      'BR-AI-001', jsonb_build_object('status', 'INACTIVE',    'note', 'AI plagiarism check not used'),
      'BR-AI-002', jsonb_build_object('status', 'INACTIVE',    'note', 'AI feasibility check not used'),
      'BR-ANON',   jsonb_build_object('status', 'MANDATORY',   'note', 'Blind evaluation enforced'),
      'BR-CP',     jsonb_build_object('status', 'ACTIVE',      'note', 'Full conflict-of-interest panel'),
      'BR-PP',     jsonb_build_object('status', 'ACTIVE',      'note', 'Full peer-panel review')
    );
  END IF;

  IF p_governance_profile = 'LIGHTWEIGHT' THEN
    RETURN jsonb_build_object(
      'BR-TRUST',  jsonb_build_object('status', 'REDUCED',     'note', 'BR-TRUST-003 only'),
      'BR-ESCROW', jsonb_build_object('status', 'REDUCED',     'note', 'BR-ESCROW-004 only'),
      'BR-AI-001', jsonb_build_object('status', 'ACTIVE',      'note', 'AI plagiarism check active'),
      'BR-AI-002', jsonb_build_object('status', 'ACTIVE',      'note', 'AI feasibility check active'),
      'BR-ANON',   jsonb_build_object('status', 'CONFIGURABLE','note', 'Org can toggle blind evaluation'),
      'BR-CP',     jsonb_build_object('status', 'INACTIVE',    'note', 'No conflict-of-interest panel'),
      'BR-PP',     jsonb_build_object('status', 'INACTIVE',    'note', 'No peer-panel review')
    );
  END IF;

  -- Unknown profile: enterprise-safe defaults
  RETURN jsonb_build_object(
    'BR-TRUST',  jsonb_build_object('status', 'ACTIVE',    'note', 'Default: full trust framework'),
    'BR-ESCROW', jsonb_build_object('status', 'ACTIVE',    'note', 'Default: full escrow'),
    'BR-AI-001', jsonb_build_object('status', 'INACTIVE',  'note', 'Default: AI off'),
    'BR-AI-002', jsonb_build_object('status', 'INACTIVE',  'note', 'Default: AI off'),
    'BR-ANON',   jsonb_build_object('status', 'MANDATORY', 'note', 'Default: blind enforced'),
    'BR-CP',     jsonb_build_object('status', 'ACTIVE',    'note', 'Default: conflict panel on'),
    'BR-PP',     jsonb_build_object('status', 'ACTIVE',    'note', 'Default: peer panel on')
  );
END;
$$;

COMMENT ON FUNCTION public.get_active_rules(TEXT) IS
  'Returns the BR activation matrix showing which rule groups are Active, Inactive, Reduced, or Configurable per governance profile.';
