
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ============================================================
-- Table: curator_corrections
-- ============================================================
CREATE TABLE IF NOT EXISTS public.curator_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  ai_suggestion_hash TEXT,
  curator_action TEXT NOT NULL DEFAULT 'skipped'
    CHECK (curator_action IN ('accepted_unchanged', 'accepted_with_edits', 'rejected_rewritten', 'skipped')),
  edit_distance_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  time_spent_seconds NUMERIC(8,2) NOT NULL DEFAULT 0,
  confidence_score NUMERIC(5,2),
  ai_content TEXT,
  curator_content TEXT,
  embedding extensions.vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_curator_corrections_challenge ON public.curator_corrections(challenge_id);
CREATE INDEX IF NOT EXISTS idx_curator_corrections_section ON public.curator_corrections(section_key);
CREATE INDEX IF NOT EXISTS idx_curator_corrections_action ON public.curator_corrections(curator_action);
CREATE INDEX IF NOT EXISTS idx_curator_corrections_created ON public.curator_corrections(created_at DESC);

ALTER TABLE public.curator_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view all corrections"
  ON public.curator_corrections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_admin_profiles WHERE id = auth.uid()));

CREATE POLICY "Authenticated users can insert corrections"
  ON public.curator_corrections FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- Enhance existing section_example_library
-- ============================================================

-- Add embedding column if missing
ALTER TABLE public.section_example_library
  ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_example_library_section ON public.section_example_library(section_key);
CREATE INDEX IF NOT EXISTS idx_example_library_quality ON public.section_example_library(quality_tier);
CREATE INDEX IF NOT EXISTS idx_example_library_active ON public.section_example_library(is_active);
CREATE INDEX IF NOT EXISTS idx_example_library_domain ON public.section_example_library USING GIN(domain_tags);
CREATE INDEX IF NOT EXISTS idx_example_library_source ON public.section_example_library(source_challenge_id);

-- RLS
ALTER TABLE public.section_example_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage examples"
  ON public.section_example_library FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_admin_profiles WHERE id = auth.uid()));

CREATE POLICY "Authenticated users can view active examples"
  ON public.section_example_library FOR SELECT TO authenticated
  USING (is_active = true);
