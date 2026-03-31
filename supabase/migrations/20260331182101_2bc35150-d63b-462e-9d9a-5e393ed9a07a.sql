
-- Create md_solution_maturity table
CREATE TABLE public.md_solution_maturity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Index for active records ordered by display_order
CREATE INDEX idx_solution_maturity_active ON public.md_solution_maturity (is_active, display_order);

-- Enable RLS
ALTER TABLE public.md_solution_maturity ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Authenticated users can read solution maturity"
  ON public.md_solution_maturity
  FOR SELECT
  TO authenticated
  USING (true);

-- Seed data
INSERT INTO public.md_solution_maturity (code, label, description, display_order) VALUES
  ('SOLUTION_BLUEPRINT', 'Solution Blueprint', 'A conceptual design or architectural plan for the solution', 1),
  ('SOLUTION_DEMO', 'Solution Demo', 'A demonstration showcasing key solution capabilities', 2),
  ('SOLUTION_POC', 'Solution Proof of Concept', 'Evidence that the solution approach is feasible and viable', 3),
  ('SOLUTION_PROTOTYPE', 'Solution Prototype', 'A functional working model of the solution', 4);
