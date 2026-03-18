
-- Master Complexity Parameters table
-- Admin-managed parameters for Enterprise complexity scoring
CREATE TABLE IF NOT EXISTS public.master_complexity_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  param_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  weight NUMERIC(4,2) NOT NULL DEFAULT 0.10 CHECK (weight >= 0 AND weight <= 1),
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_master_complexity_params_active ON public.master_complexity_params(is_active, display_order);

-- RLS
ALTER TABLE public.master_complexity_params ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active complexity params"
  ON public.master_complexity_params FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage complexity params"
  ON public.master_complexity_params FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed 7 default parameters
INSERT INTO public.master_complexity_params (param_key, name, weight, description, display_order) VALUES
  ('technical_novelty', 'Technical Novelty', 0.20, 'Degree of technical innovation required', 1),
  ('solution_maturity', 'Solution Maturity', 0.15, 'Expected maturity level of the deliverable', 2),
  ('domain_breadth', 'Domain Breadth', 0.15, 'Number of domains or disciplines involved', 3),
  ('evaluation_complexity', 'Evaluation Complexity', 0.15, 'Difficulty of assessing submitted solutions', 4),
  ('ip_sensitivity', 'IP Sensitivity', 0.15, 'Level of intellectual property protection needed', 5),
  ('timeline_urgency', 'Timeline Urgency', 0.10, 'How time-critical the challenge is', 6),
  ('budget_scale', 'Budget Scale', 0.10, 'Relative budget magnitude of the challenge', 7);
