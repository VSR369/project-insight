
-- Prompt 15: Consistency findings table
CREATE TABLE IF NOT EXISTS public.challenge_consistency_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  section_a TEXT NOT NULL,
  section_b TEXT NOT NULL,
  contradiction_type TEXT NOT NULL CHECK (contradiction_type IN ('factual','scope','numeric','terminology','stakeholder','timeline','reward_effort')),
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('error','warning','suggestion')),
  suggested_resolution TEXT,
  curator_accepted BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.challenge_consistency_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view consistency findings"
  ON public.challenge_consistency_findings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update consistency findings"
  ON public.challenge_consistency_findings FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert consistency findings"
  ON public.challenge_consistency_findings FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_consistency_findings_challenge ON public.challenge_consistency_findings(challenge_id);

-- Prompt 15: Ambiguity findings table
CREATE TABLE IF NOT EXISTS public.challenge_ambiguity_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  snippet TEXT NOT NULL,
  pattern_matched TEXT NOT NULL,
  suggested_replacement TEXT,
  curator_accepted BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.challenge_ambiguity_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view ambiguity findings"
  ON public.challenge_ambiguity_findings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update ambiguity findings"
  ON public.challenge_ambiguity_findings FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert ambiguity findings"
  ON public.challenge_ambiguity_findings FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_ambiguity_findings_challenge ON public.challenge_ambiguity_findings(challenge_id);

-- Prompt 16: Add similarity_threshold to global config
ALTER TABLE public.ai_review_global_config
  ADD COLUMN IF NOT EXISTS similarity_threshold NUMERIC NOT NULL DEFAULT 0.15;

-- Prompt 17: Framework library table
CREATE TABLE IF NOT EXISTS public.ai_review_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_name TEXT NOT NULL,
  domain_tags JSONB DEFAULT '[]'::jsonb,
  applicability_condition TEXT,
  how_to_apply TEXT,
  typical_pitfalls TEXT,
  when_not_to_use TEXT,
  embedding vector(1536),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.ai_review_frameworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active frameworks"
  ON public.ai_review_frameworks FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Platform admins can manage frameworks"
  ON public.ai_review_frameworks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role));

CREATE INDEX idx_frameworks_domain_tags ON public.ai_review_frameworks USING GIN(domain_tags);
CREATE INDEX idx_frameworks_active ON public.ai_review_frameworks(is_active) WHERE is_active = true;
