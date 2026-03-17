
-- 1. Create table
CREATE TABLE IF NOT EXISTS public.legal_document_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('TIER_1', 'TIER_2')),
  required_for_maturity JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  default_template_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 2. Enable RLS
ALTER TABLE public.legal_document_templates ENABLE ROW LEVEL SECURITY;

-- 3. Public read policy (reference data)
CREATE POLICY "Anyone can read active templates"
  ON public.legal_document_templates
  FOR SELECT
  USING (is_active = true);

-- 4. Seed TIER 1
INSERT INTO public.legal_document_templates (document_type, document_name, tier, required_for_maturity, description) VALUES
  ('nda', 'Non-Disclosure Agreement', 'TIER_1', '["BLUEPRINT","POC","PROTOTYPE","PILOT"]', 'Mutual NDA covering challenge details and submitted solutions'),
  ('ip_disclosure', 'IP Disclosure Terms', 'TIER_1', '["POC"]', 'Terms governing disclosure of intellectual property during proof-of-concept'),
  ('ip_assignment', 'IP Assignment Terms', 'TIER_1', '["PROTOTYPE","PILOT"]', 'Terms for assignment of IP rights from solver to seeker'),
  ('licensing', 'Licensing Terms', 'TIER_1', '["PROTOTYPE"]', 'Licensing agreement for prototype-stage solutions'),
  ('participation', 'Participation Conditions', 'TIER_1', '["BLUEPRINT","POC","PROTOTYPE","PILOT"]', 'General conditions for participating in the challenge'),
  ('platform_usage', 'Platform Usage Terms', 'TIER_1', '["BLUEPRINT","POC","PROTOTYPE","PILOT"]', 'Terms of use for the CogniBlend platform during challenge lifecycle'),
  ('commercial_deployment', 'Commercial Deployment Terms', 'TIER_1', '["PILOT"]', 'Terms governing commercial deployment of pilot-stage solutions'),
  ('liability_data_sharing', 'Liability & Data Sharing Terms', 'TIER_1', '["PILOT"]', 'Liability limitations and data sharing obligations for pilot engagements');

-- 5. Seed TIER 2
INSERT INTO public.legal_document_templates (document_type, document_name, tier, required_for_maturity, description) VALUES
  ('solution_eval_consent', 'Solution Evaluation Consent', 'TIER_2', '["BLUEPRINT","POC","PROTOTYPE","PILOT"]', 'Consent for platform-assisted evaluation of submitted solutions'),
  ('ai_usage_policy', 'AI Usage Policy', 'TIER_2', '["BLUEPRINT","POC","PROTOTYPE","PILOT"]', 'Policy governing use of AI tools during solution development'),
  ('dispute_resolution', 'Dispute Resolution Agreement', 'TIER_2', '["BLUEPRINT","POC","PROTOTYPE","PILOT"]', 'Framework for resolving disputes between seekers and solvers'),
  ('withdrawal', 'Withdrawal Terms', 'TIER_2', '["POC","PROTOTYPE","PILOT"]', 'Terms for withdrawing a challenge or submission after publication'),
  ('escrow', 'Escrow Terms', 'TIER_2', '["POC_ENTERPRISE","PROTOTYPE_ENTERPRISE","PILOT_ENTERPRISE"]', 'Escrow account terms for Enterprise-tier reward funds'),
  ('rejection_fee', 'Rejection Fee Terms', 'TIER_2', '["PROTOTYPE_ENTERPRISE","PILOT_ENTERPRISE"]', 'Terms governing rejection fee obligations for Enterprise challenges'),
  ('blind_ip_access', 'Blind IP Access Agreement', 'TIER_2', '["PROTOTYPE_ENTERPRISE","PILOT_ENTERPRISE"]', 'Agreement for anonymized IP review during evaluation'),
  ('ip_transfer', 'IP Transfer Agreement', 'TIER_2', '["PROTOTYPE","PILOT"]', 'Formal IP transfer agreement executed post-award'),
  ('ai_similarity_watch', 'AI Similarity Watch Consent', 'TIER_2', '["PROTOTYPE_ENTERPRISE","PILOT_ENTERPRISE"]', 'Consent for AI-powered similarity monitoring of submitted solutions');

-- 6. Function: get_required_legal_docs
CREATE OR REPLACE FUNCTION public.get_required_legal_docs(
  p_maturity_level TEXT,
  p_governance_profile TEXT DEFAULT 'Enterprise'
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier1 JSONB;
  v_tier2 JSONB;
  v_maturity_key TEXT;
  v_enterprise_key TEXT;
BEGIN
  -- Normalize inputs
  v_maturity_key := UPPER(TRIM(p_maturity_level));
  v_enterprise_key := v_maturity_key || '_ENTERPRISE';

  -- TIER 1: match plain maturity level (no Enterprise-only docs in tier 1)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'template_id', template_id,
    'document_type', document_type,
    'document_name', document_name,
    'tier', tier,
    'description', description
  ) ORDER BY document_name), '[]'::jsonb)
  INTO v_tier1
  FROM legal_document_templates
  WHERE tier = 'TIER_1'
    AND is_active = true
    AND required_for_maturity ? v_maturity_key;

  -- TIER 2: match plain maturity OR enterprise-specific maturity
  IF LOWER(p_governance_profile) = 'enterprise' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'template_id', template_id,
      'document_type', document_type,
      'document_name', document_name,
      'tier', tier,
      'description', description
    ) ORDER BY document_name), '[]'::jsonb)
    INTO v_tier2
    FROM legal_document_templates
    WHERE tier = 'TIER_2'
      AND is_active = true
      AND (required_for_maturity ? v_maturity_key OR required_for_maturity ? v_enterprise_key);
  ELSE
    -- Lightweight: only plain maturity matches (excludes _ENTERPRISE entries)
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'template_id', template_id,
      'document_type', document_type,
      'document_name', document_name,
      'tier', tier,
      'description', description
    ) ORDER BY document_name), '[]'::jsonb)
    INTO v_tier2
    FROM legal_document_templates
    WHERE tier = 'TIER_2'
      AND is_active = true
      AND required_for_maturity ? v_maturity_key;
  END IF;

  RETURN jsonb_build_object(
    'tier_1', v_tier1,
    'tier_2', v_tier2,
    'maturity_level', v_maturity_key,
    'governance_profile', p_governance_profile
  );
END;
$$;
