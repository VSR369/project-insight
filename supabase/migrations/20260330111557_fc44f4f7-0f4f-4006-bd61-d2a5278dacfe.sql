
-- Mapping table: proficiency area names → solution_type codes
CREATE TABLE IF NOT EXISTS public.proficiency_area_solution_type_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proficiency_area_name TEXT NOT NULL UNIQUE,
  solution_type_code TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the 4 mappings
INSERT INTO public.proficiency_area_solution_type_map (proficiency_area_name, solution_type_code, description, display_order)
VALUES
  ('Future & Business Blueprint', 'strategy_design', 'Strategic planning, business model design, and future-state architecture', 1),
  ('Business & Operational Excellence', 'process_operations', 'Process optimization, operational efficiency, and organizational transformation', 2),
  ('Digital & Technology Blueprint', 'technology_architecture', 'Technology strategy, system architecture, and digital transformation', 3),
  ('Product & Service Innovation', 'product_innovation', 'Product development, service design, and innovation management', 4)
ON CONFLICT (proficiency_area_name) DO NOTHING;

-- RLS
ALTER TABLE public.proficiency_area_solution_type_map ENABLE ROW LEVEL SECURITY;

-- Public read access (reference data)
CREATE POLICY "Anyone can read solution type map"
  ON public.proficiency_area_solution_type_map
  FOR SELECT
  USING (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_pa_solution_type_map_code ON public.proficiency_area_solution_type_map(solution_type_code);
