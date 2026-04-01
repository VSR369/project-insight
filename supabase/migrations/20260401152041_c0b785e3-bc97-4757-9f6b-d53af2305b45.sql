-- ============================================================
-- Gap 3 (Critical): validate_gate_03
-- Called by complete_phase when v_current_phase = 3
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_gate_03(p_challenge_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_governance TEXT;
  v_approval_required BOOLEAN;
  v_has_pending_approvals BOOLEAN;
  v_lc_approved BOOLEAN;
  v_escrow_funded BOOLEAN;
  v_failures TEXT[] := '{}';
BEGIN
  SELECT
    UPPER(COALESCE(governance_mode_override, governance_profile, 'STRUCTURED')),
    COALESCE((extended_brief->>'creator_approval_required')::boolean, false)
  INTO v_governance, v_approval_required
  FROM challenges WHERE id = p_challenge_id;

  -- Gate A: Creator approval check (STRUCTURED with toggle on, or CONTROLLED always)
  IF v_approval_required OR v_governance = 'CONTROLLED' THEN
    SELECT EXISTS(
      SELECT 1 FROM challenge_section_approvals
      WHERE challenge_id = p_challenge_id AND status = 'pending'
    ) INTO v_has_pending_approvals;

    IF v_has_pending_approvals THEN
      v_failures := array_append(v_failures, 'Creator has not approved all sections');
    END IF;
  END IF;

  -- Gate B: LC approval (CONTROLLED only)
  IF v_governance = 'CONTROLLED' THEN
    SELECT NOT EXISTS(
      SELECT 1 FROM challenge_legal_docs
      WHERE challenge_id = p_challenge_id AND lc_status != 'approved'
    ) INTO v_lc_approved;

    IF NOT v_lc_approved THEN
      v_failures := array_append(v_failures, 'Legal Coordinator has not approved all legal documents');
    END IF;
  END IF;

  -- Gate C: Escrow funded (CONTROLLED only)
  IF v_governance = 'CONTROLLED' THEN
    SELECT EXISTS(
      SELECT 1 FROM escrow_records
      WHERE challenge_id = p_challenge_id AND escrow_status = 'funded'
    ) INTO v_escrow_funded;

    IF NOT COALESCE(v_escrow_funded, false) THEN
      v_failures := array_append(v_failures, 'Finance Controller has not confirmed escrow funding');
    END IF;
  END IF;

  IF array_length(v_failures, 1) > 0 THEN
    RETURN jsonb_build_object('passed', false, 'failures', to_jsonb(v_failures));
  END IF;

  RETURN jsonb_build_object('passed', true);
END;
$$;

-- ============================================================
-- Gap 2 (Important): validate_role_separation
-- Enforces CR/CU and CU/LC separation in CONTROLLED mode
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_role_separation(
  p_challenge_id UUID,
  p_user_id UUID,
  p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_governance TEXT;
  v_existing_roles TEXT[];
BEGIN
  -- Get governance mode
  SELECT UPPER(COALESCE(governance_mode_override, governance_profile, 'STRUCTURED'))
  INTO v_governance
  FROM challenges WHERE id = p_challenge_id;

  -- QUICK mode: all combinations allowed
  IF v_governance = 'QUICK' THEN
    RETURN jsonb_build_object('allowed', true, 'level', 'ALLOWED');
  END IF;

  -- Get existing roles for this user on this challenge
  SELECT array_agg(role_code)
  INTO v_existing_roles
  FROM user_challenge_roles
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id AND is_active = true;

  IF v_existing_roles IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'level', 'ALLOWED');
  END IF;

  -- CR and CU cannot be held by the same person
  IF (p_new_role = 'CR' AND 'CU' = ANY(v_existing_roles))
     OR (p_new_role = 'CU' AND 'CR' = ANY(v_existing_roles)) THEN
    IF v_governance = 'CONTROLLED' THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'level', 'HARD_BLOCK',
        'reason', 'Controlled governance requires Creator and Curator to be different users'
      );
    ELSE
      RETURN jsonb_build_object(
        'allowed', true,
        'level', 'SOFT_WARN',
        'reason', 'Creator and Curator are the same user — consider assigning different users for better oversight'
      );
    END IF;
  END IF;

  -- CU and LC cannot be held by the same person
  IF (p_new_role = 'CU' AND 'LC' = ANY(v_existing_roles))
     OR (p_new_role = 'LC' AND 'CU' = ANY(v_existing_roles)) THEN
    IF v_governance = 'CONTROLLED' THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'level', 'HARD_BLOCK',
        'reason', 'Controlled governance requires Curator and Legal Coordinator to be different users'
      );
    ELSE
      RETURN jsonb_build_object(
        'allowed', true,
        'level', 'SOFT_WARN',
        'reason', 'Curator and Legal Coordinator are the same user — consider assigning different users'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true, 'level', 'ALLOWED');
END;
$$;