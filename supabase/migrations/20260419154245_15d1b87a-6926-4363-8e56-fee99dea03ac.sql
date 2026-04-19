-- =========================================================================
-- A1: New table ai_legal_review_config
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ai_legal_review_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL,
  section_title TEXT NOT NULL,
  section_order INTEGER NOT NULL,
  system_prompt TEXT NOT NULL,
  section_instructions TEXT,
  required_context_keys TEXT[] NOT NULL DEFAULT '{}',
  regulatory_frameworks TEXT[] NOT NULL DEFAULT '{}',
  anti_disintermediation_required BOOLEAN NOT NULL DEFAULT false,
  min_clauses INTEGER DEFAULT 3,
  applies_to_engagement TEXT NOT NULL DEFAULT 'BOTH'
    CHECK (applies_to_engagement IN ('MARKETPLACE', 'AGGREGATOR', 'BOTH')),
  applies_to_governance TEXT NOT NULL DEFAULT 'ALL'
    CHECK (applies_to_governance IN ('QUICK', 'STRUCTURED', 'CONTROLLED', 'ALL')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Unique constraint on section_key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ai_legal_review_config_section_key_unique'
  ) THEN
    ALTER TABLE public.ai_legal_review_config
      ADD CONSTRAINT ai_legal_review_config_section_key_unique UNIQUE (section_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_legal_review_config_active_order
  ON public.ai_legal_review_config (is_active, section_order);

-- RLS
ALTER TABLE public.ai_legal_review_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read legal review config" ON public.ai_legal_review_config;
CREATE POLICY "Anyone can read legal review config"
  ON public.ai_legal_review_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Supervisors can manage legal review config" ON public.ai_legal_review_config;
CREATE POLICY "Supervisors can manage legal review config"
  ON public.ai_legal_review_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE user_id = auth.uid() AND admin_tier IN ('supervisor', 'senior_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE user_id = auth.uid() AND admin_tier IN ('supervisor', 'senior_admin')
    )
  );

-- =========================================================================
-- A2: Seed the 11 SPA sections
-- =========================================================================
INSERT INTO public.ai_legal_review_config
  (section_key, section_title, section_order, system_prompt,
   required_context_keys, regulatory_frameworks,
   anti_disintermediation_required, applies_to_engagement)
VALUES
('definitions', 'Definitions & Interpretation', 1,
 'Generate a comprehensive definitions section for a Solution Provider Agreement. Define all key terms: Platform, Seeker, Solution Provider, Challenge, Solution, Deliverables, Confidential Information, Intellectual Property, Prize, Evaluation Period. Reference the specific challenge title and parties. Use clear, unambiguous legal language.',
 ARRAY['title', 'ip_model', 'deliverables'], ARRAY[]::TEXT[], false, 'BOTH'),

('engagement', 'Engagement Terms', 2,
 'Draft engagement terms establishing the relationship as independent contractor (NOT employment). Define the platform role based on engagement model: marketplace facilitator or aggregator principal. Reference the specific challenge scope, deliverables, and timeline from the curated challenge.',
 ARRAY['title', 'scope', 'deliverables', 'phase_schedule', 'operating_model'], ARRAY[]::TEXT[], false, 'BOTH'),

('ip', 'Intellectual Property', 3,
 'Generate IP clauses specific to the selected IP model. For IP-EA: full assignment deed with moral rights waiver. For IP-NEL: non-exclusive license grant. For IP-EL: exclusive license with reversion. For IP-JO: joint ownership with exploitation rights. For IP-NONE: no transfer, Solution Provider retains all rights. Include pre-existing IP carve-out and background IP protection in all cases.',
 ARRAY['ip_model', 'deliverables', 'maturity_level'], ARRAY[]::TEXT[], false, 'BOTH'),

('confidentiality', 'Confidentiality & NDA', 4,
 'Draft confidentiality obligations covering challenge details, evaluation criteria, other submissions, and provided data. Set obligations period based on maturity level (2 years for ideation, 5 years for production-ready). Include exceptions for public domain, independent development, and legal compulsion. Include return/destruction provisions and breach remedies.',
 ARRAY['maturity_level', 'data_resources_provided'], ARRAY[]::TEXT[], false, 'BOTH'),

('data_protection', 'Data Protection & Privacy', 5,
 'Generate data protection clauses based on the applicable jurisdiction. For India: reference DPDPA 2023 and IT Act 2000. For EU: reference GDPR. For US: reference CCPA. Identify controller vs processor roles. Reference the SPECIFIC data resources provided in the challenge. Include cross-border transfer mechanisms, breach notification, and data retention provisions.',
 ARRAY['data_resources_provided', 'scope'], ARRAY['DPDPA_2023', 'GDPR', 'CCPA'], false, 'BOTH'),

('submission', 'Submission & Evaluation', 6,
 'Draft submission and evaluation terms referencing the specific evaluation criteria and weights from the challenge. Include submission format requirements, evaluation timeline from phase schedule, dispute resolution for evaluation outcomes, and right to reject non-compliant submissions.',
 ARRAY['evaluation_criteria', 'submission_guidelines', 'phase_schedule'], ARRAY[]::TEXT[], false, 'BOTH'),

('reward', 'Reward & Payment', 7,
 'Generate reward and payment terms referencing the exact tier amounts and currency from the challenge reward structure. Include payment timing, tax withholding obligations, escrow arrangements for CONTROLLED governance mode, and a clear no-guaranteed-payment clause. For non-monetary incentives, include separate terms.',
 ARRAY['reward_structure', 'governance_profile'], ARRAY[]::TEXT[], false, 'BOTH'),

('liability', 'Liability & Indemnification', 8,
 'Draft limitation of liability capped at the prize amount. Include Solution Provider indemnification obligations, platform indemnification limited to service failures, seeker indemnification for provided data accuracy, and a comprehensive force majeure clause.',
 ARRAY['reward_structure'], ARRAY[]::TEXT[], false, 'BOTH'),

('anti_disintermediation', 'Anti-Disintermediation', 9,
 'Generate non-circumvention obligations for the Aggregator engagement model. Include: direct engagement prohibition during challenge plus 12 months post-completion, referral fee for post-challenge direct engagement, platform audit rights, and liquidated damages for violation. This section is MANDATORY for Aggregator model and CANNOT be removed.',
 ARRAY['operating_model'], ARRAY[]::TEXT[], true, 'AGGREGATOR'),

('governing_law', 'Governing Law & Disputes', 10,
 'Draft governing law and dispute resolution clauses based on the Seeker organization geography. Include a tiered mechanism: negotiation first, then mediation, then arbitration, with litigation as last resort. Specify jurisdiction, language of proceedings, and costs allocation.',
 ARRAY['scope'], ARRAY[]::TEXT[], false, 'BOTH'),

('general', 'General Provisions', 11,
 'Generate standard general provisions: entire agreement, severability, waiver, assignment restrictions, notice mechanisms, survival clauses for IP/confidentiality/liability sections, and amendment procedures requiring written mutual consent.',
 ARRAY[]::TEXT[], ARRAY[]::TEXT[], false, 'BOTH')
ON CONFLICT (section_key) DO NOTHING;

-- =========================================================================
-- A3: Add Pass 3 result columns to challenge_legal_docs
-- =========================================================================
ALTER TABLE public.challenge_legal_docs
  ADD COLUMN IF NOT EXISTS ai_modified_content_html TEXT,
  ADD COLUMN IF NOT EXISTS ai_changes_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_review_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ai_confidence TEXT,
  ADD COLUMN IF NOT EXISTS ai_regulatory_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pass3_run_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_challenge_legal_docs_ai_review_status'
  ) THEN
    ALTER TABLE public.challenge_legal_docs
      ADD CONSTRAINT chk_challenge_legal_docs_ai_review_status
      CHECK (ai_review_status IS NULL OR ai_review_status IN ('pending', 'ai_suggested', 'accepted', 'rejected', 'stale'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_challenge_legal_docs_ai_confidence'
  ) THEN
    ALTER TABLE public.challenge_legal_docs
      ADD CONSTRAINT chk_challenge_legal_docs_ai_confidence
      CHECK (ai_confidence IS NULL OR ai_confidence IN ('high', 'medium', 'low'));
  END IF;
END $$;

-- =========================================================================
-- A4: LC review timeout column on md_governance_mode_config
-- =========================================================================
ALTER TABLE public.md_governance_mode_config
  ADD COLUMN IF NOT EXISTS lc_review_timeout_days INTEGER NOT NULL DEFAULT 7;