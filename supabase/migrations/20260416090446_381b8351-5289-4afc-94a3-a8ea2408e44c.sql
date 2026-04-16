
-- Prompt 0: Baseline quality telemetry table
-- Captures per-challenge review quality metrics for trend analysis

CREATE TABLE IF NOT EXISTS public.challenge_quality_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  is_baseline BOOLEAN NOT NULL DEFAULT false,
  avg_edit_magnitude NUMERIC,
  consistency_findings_count INTEGER NOT NULL DEFAULT 0,
  ambiguity_findings_count INTEGER NOT NULL DEFAULT 0,
  pass1_tokens INTEGER,
  pass2_tokens INTEGER,
  review_duration_seconds INTEGER,
  model_used TEXT,
  sections_reviewed INTEGER,
  total_corrections INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for trend queries
CREATE INDEX idx_quality_telemetry_challenge ON public.challenge_quality_telemetry (challenge_id);
CREATE INDEX idx_quality_telemetry_baseline ON public.challenge_quality_telemetry (is_baseline, created_at);
CREATE INDEX idx_quality_telemetry_trend ON public.challenge_quality_telemetry (created_at DESC);

-- RLS
ALTER TABLE public.challenge_quality_telemetry ENABLE ROW LEVEL SECURITY;

-- Platform admins and curators can read telemetry
CREATE POLICY "Authenticated users can read quality telemetry"
  ON public.challenge_quality_telemetry
  FOR SELECT
  TO authenticated
  USING (true);

-- Only system (edge functions via service_role) inserts telemetry
CREATE POLICY "Service role inserts quality telemetry"
  ON public.challenge_quality_telemetry
  FOR INSERT
  TO service_role
  WITH CHECK (true);
