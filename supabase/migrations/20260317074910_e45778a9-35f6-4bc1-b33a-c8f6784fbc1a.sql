
CREATE OR REPLACE FUNCTION public.get_governance_behavior(
  p_governance_profile TEXT,
  p_phase INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Enterprise: strict defaults for every phase
  IF p_governance_profile = 'ENTERPRISE' THEN
    RETURN jsonb_build_object(
      'auto_complete',    false,
      'skip_phase',       false,
      'simplified_gate',  null,
      'required_content', 'FULL',
      'role_relaxation',  false
    );
  END IF;

  -- Lightweight: phase-specific overrides
  IF p_governance_profile = 'LIGHTWEIGHT' THEN
    -- Start with lightweight defaults
    v_result := jsonb_build_object(
      'auto_complete',    false,
      'skip_phase',       false,
      'simplified_gate',  null,
      'required_content', 'FULL',
      'role_relaxation',  true
    );

    CASE p_phase
      WHEN 1 THEN
        v_result := v_result || jsonb_build_object(
          'auto_complete', true,
          'skip_phase',    true
        );

      WHEN 2 THEN
        v_result := v_result || jsonb_build_object(
          'auto_complete',    false,
          'required_content', 'REDUCED'
        );

      WHEN 3 THEN
        v_result := v_result || jsonb_build_object(
          'auto_complete', true
        );

      WHEN 4 THEN
        v_result := v_result || jsonb_build_object(
          'auto_complete',   true,
          'simplified_gate', 'GATE-11-L'
        );

      WHEN 5 THEN
        v_result := v_result || jsonb_build_object(
          'auto_complete', false
        );

      WHEN 7, 8 THEN
        v_result := v_result || jsonb_build_object(
          'simplified_gate', 'SINGLE_REVIEWER_AI'
        );

      WHEN 9 THEN
        v_result := v_result || jsonb_build_object(
          'skip_phase', true
        );

      WHEN 10 THEN
        v_result := v_result || jsonb_build_object(
          'simplified_gate', 'NO_BLIND_IP'
        );

      WHEN 13 THEN
        v_result := v_result || jsonb_build_object(
          'auto_complete', true
        );

      ELSE
        NULL;
    END CASE;

    RETURN v_result;
  END IF;

  -- Unknown profile: return enterprise-safe defaults
  RETURN jsonb_build_object(
    'auto_complete',    false,
    'skip_phase',       false,
    'simplified_gate',  null,
    'required_content', 'FULL',
    'role_relaxation',  false
  );
END;
$$;

COMMENT ON FUNCTION public.get_governance_behavior(TEXT, INTEGER) IS
  'Returns phase-specific governance behavior config for LIGHTWEIGHT or ENTERPRISE profiles.';
