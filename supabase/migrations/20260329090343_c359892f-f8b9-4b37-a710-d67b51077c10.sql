
-- completeness_checks reference table
CREATE TABLE IF NOT EXISTS public.completeness_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept TEXT NOT NULL,
  question TEXT NOT NULL,
  check_sections JSONB NOT NULL DEFAULT '[]',
  criticality TEXT NOT NULL CHECK (criticality IN ('error','warning','conditional')),
  condition_field TEXT,
  condition_value TEXT,
  remediation_hint TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE public.completeness_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active checks" ON public.completeness_checks
  FOR SELECT TO authenticated USING (is_active = TRUE);

-- Add two new JSONB columns to challenges
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS data_resources_provided JSONB,
  ADD COLUMN IF NOT EXISTS success_metrics_kpis JSONB;
