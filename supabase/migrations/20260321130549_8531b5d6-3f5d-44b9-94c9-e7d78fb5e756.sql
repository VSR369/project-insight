
CREATE OR REPLACE FUNCTION public.validate_gate_02(p_challenge_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
  v_failures TEXT[] := '{}';
  v_required JSONB;
  v_tier1_required INT;
  v_tier2_required INT;
  v_tier1_attached INT;
  v_tier2_attached INT;
  v_lc_unapproved INT;
  v_adhoc_pending INT;
BEGIN
  -- Fetch challenge
  SELECT id, title, problem_statement, maturity_level, governance_profile, lc_review_required
  INTO v_challenge
  FROM challenges
  WHERE id = p_challenge_id AND is_deleted = false;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('passed', false, 'failures', jsonb_build_array('Challenge not found'));
  END IF;

  -- Check 1: Mandatory content sections
  IF v_challenge.title IS NULL OR TRIM(v_challenge.title) = '' THEN
    v_failures := array_append(v_failures, 'Title is missing');
  END IF;

  IF v_challenge.problem_statement IS NULL OR TRIM(v_challenge.problem_statement) = '' THEN
    v_failures := array_append(v_failures, 'Problem statement is missing');
  END IF;

  -- (Maturity level check removed — maturity is set by Creator/Curator, not LC concern)

  -- Get required docs count
  IF v_challenge.maturity_level IS NOT NULL THEN
    v_required := get_required_legal_docs(
      v_challenge.maturity_level,
      COALESCE(v_challenge.governance_profile, 'Enterprise')
    );

    v_tier1_required := jsonb_array_length(COALESCE(v_required->'tier_1', '[]'::jsonb));
    v_tier2_required := jsonb_array_length(COALESCE(v_required->'tier_2', '[]'::jsonb));

    -- Check 3: Tier 1 docs attached
    SELECT COUNT(*) INTO v_tier1_attached
    FROM challenge_legal_docs
    WHERE challenge_id = p_challenge_id AND tier = 'TIER_1';

    IF v_tier1_attached < v_tier1_required THEN
      v_failures := array_append(v_failures,
        format('Tier 1 legal documents incomplete: %s of %s attached', v_tier1_attached, v_tier1_required));
    END IF;

    -- Check 4: Tier 2 docs attached
    SELECT COUNT(*) INTO v_tier2_attached
    FROM challenge_legal_docs
    WHERE challenge_id = p_challenge_id AND tier = 'TIER_2';

    IF v_tier2_attached < v_tier2_required THEN
      v_failures := array_append(v_failures,
        format('Tier 2 legal templates incomplete: %s of %s attached', v_tier2_attached, v_tier2_required));
    END IF;
  END IF;

  -- Check 5: Mandatory LC — ALL docs must be LC-approved
  IF v_challenge.lc_review_required THEN
    SELECT COUNT(*) INTO v_lc_unapproved
    FROM challenge_legal_docs
    WHERE challenge_id = p_challenge_id
      AND (lc_status IS NULL OR lc_status != 'approved');

    IF v_lc_unapproved > 0 THEN
      v_failures := array_append(v_failures,
        format('%s legal doc(s) pending Legal Coordinator approval', v_lc_unapproved));
    END IF;
  END IF;

  -- Check 6: Ad-hoc — docs with active review requests must be approved
  SELECT COUNT(*) INTO v_adhoc_pending
  FROM legal_review_requests lr
  JOIN challenge_legal_docs cd ON cd.id = lr.document_id
  WHERE lr.challenge_id = p_challenge_id
    AND lr.status = 'pending'
    AND (cd.lc_status IS NULL OR cd.lc_status != 'approved');

  IF v_adhoc_pending > 0 THEN
    v_failures := array_append(v_failures,
      format('%s doc(s) awaiting requested Legal Coordinator review', v_adhoc_pending));
  END IF;

  RETURN jsonb_build_object(
    'passed', array_length(v_failures, 1) IS NULL,
    'failures', to_jsonb(v_failures)
  );
END;
$$;
