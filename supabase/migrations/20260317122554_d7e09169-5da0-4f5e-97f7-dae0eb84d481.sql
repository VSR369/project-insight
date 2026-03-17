
-- 1. Create storage bucket for legal docs
INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-docs', 'legal-docs', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS: authenticated users can upload/read
CREATE POLICY "Authenticated users can upload legal docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'legal-docs');

CREATE POLICY "Authenticated users can read legal docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'legal-docs');

-- 3. Add unique constraint on challenge_legal_docs for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_challenge_legal_docs_type_tier'
  ) THEN
    ALTER TABLE public.challenge_legal_docs
      ADD CONSTRAINT uq_challenge_legal_docs_type_tier
      UNIQUE (challenge_id, document_type, tier);
  END IF;
END $$;

-- 4. GATE-02 validation function
CREATE OR REPLACE FUNCTION public.validate_gate_02(p_challenge_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
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
BEGIN
  -- Fetch challenge
  SELECT id, title, problem_statement, maturity_level, governance_profile
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

  -- Check 2: Maturity level
  IF v_challenge.maturity_level IS NULL OR TRIM(v_challenge.maturity_level) = '' THEN
    v_failures := array_append(v_failures, 'Maturity level is not set');
  END IF;

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

  RETURN jsonb_build_object(
    'passed', array_length(v_failures, 1) IS NULL,
    'failures', to_jsonb(v_failures)
  );
END;
$$;
