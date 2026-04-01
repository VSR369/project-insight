
-- ============================================================
-- Phase 10: AI Quality Assurance System — 3 Tables
-- ============================================================

-- 1. curation_quality_metrics — per-challenge AI quality scores
CREATE TABLE IF NOT EXISTS public.curation_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  ai_accuracy_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ai_assist_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ai_rewrite_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  grade TEXT NOT NULL DEFAULT 'D' CHECK (grade IN ('A','B','C','D')),
  section_breakdown JSONB NOT NULL DEFAULT '{}',
  total_sections_reviewed INTEGER NOT NULL DEFAULT 0,
  sections_accepted_unchanged INTEGER NOT NULL DEFAULT 0,
  sections_accepted_with_edits INTEGER NOT NULL DEFAULT 0,
  sections_rejected_rewritten INTEGER NOT NULL DEFAULT 0,
  avg_edit_distance_percent NUMERIC(5,2),
  avg_time_spent_seconds NUMERIC(10,2),
  governance_mode TEXT,
  maturity_level TEXT,
  domain_tags JSONB DEFAULT '[]',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(challenge_id)
);

CREATE INDEX idx_curation_quality_metrics_grade ON public.curation_quality_metrics(grade);
CREATE INDEX idx_curation_quality_metrics_computed ON public.curation_quality_metrics(computed_at DESC);
CREATE INDEX idx_curation_quality_metrics_maturity ON public.curation_quality_metrics(maturity_level);

ALTER TABLE public.curation_quality_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view quality metrics"
  ON public.curation_quality_metrics FOR SELECT
  TO authenticated
  USING (true);

-- 2. solver_challenge_feedback — solver clarity ratings
CREATE TABLE IF NOT EXISTS public.solver_challenge_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  solver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clarity_overall INTEGER NOT NULL CHECK (clarity_overall BETWEEN 1 AND 5),
  clarity_problem INTEGER CHECK (clarity_problem BETWEEN 1 AND 5),
  clarity_deliverables INTEGER CHECK (clarity_deliverables BETWEEN 1 AND 5),
  clarity_evaluation INTEGER CHECK (clarity_evaluation BETWEEN 1 AND 5),
  missing_info TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(challenge_id, solver_id)
);

CREATE INDEX idx_solver_feedback_challenge ON public.solver_challenge_feedback(challenge_id);
CREATE INDEX idx_solver_feedback_solver ON public.solver_challenge_feedback(solver_id);

ALTER TABLE public.solver_challenge_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view solver feedback"
  ON public.solver_challenge_feedback FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solvers can insert own feedback"
  ON public.solver_challenge_feedback FOR INSERT
  TO authenticated
  WITH CHECK (solver_id = auth.uid());

CREATE POLICY "Solvers can update own feedback"
  ON public.solver_challenge_feedback FOR UPDATE
  TO authenticated
  USING (solver_id = auth.uid());

-- 3. section_example_library — harvested high-quality examples
CREATE TABLE IF NOT EXISTS public.section_example_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL,
  quality_tier TEXT NOT NULL CHECK (quality_tier IN ('excellent','good','poor')),
  content JSONB NOT NULL,
  source_challenge_id UUID REFERENCES public.challenges(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'harvested' CHECK (source_type IN ('harvested','manual','imported')),
  domain_tags JSONB DEFAULT '[]',
  maturity_level TEXT,
  annotation TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_section_examples_lookup ON public.section_example_library(section_key, quality_tier, is_active);
CREATE INDEX idx_section_examples_domain ON public.section_example_library USING GIN(domain_tags);

ALTER TABLE public.section_example_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view examples"
  ON public.section_example_library FOR SELECT
  TO authenticated
  USING (true);
