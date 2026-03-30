
-- Create md_solution_types master data table
CREATE TABLE IF NOT EXISTS public.md_solution_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  proficiency_group TEXT NOT NULL,
  proficiency_group_label TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_md_solution_types_group ON public.md_solution_types(proficiency_group);
CREATE INDEX IF NOT EXISTS idx_md_solution_types_active ON public.md_solution_types(is_active, display_order);

-- Enable RLS
ALTER TABLE public.md_solution_types ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated users (master data)
CREATE POLICY "Anyone can read active solution types"
  ON public.md_solution_types FOR SELECT
  USING (is_active = true);

-- Seed the 15 solution types
INSERT INTO public.md_solution_types (code, label, proficiency_group, proficiency_group_label, description, display_order) VALUES
  -- Future & Business Blueprint
  ('business_model_design', 'Business Model Design', 'strategy_design', 'Future & Business Blueprint', 'Design of revenue models, value propositions, and business architecture', 1),
  ('business_strategy_map', 'Business Strategy Map', 'strategy_design', 'Future & Business Blueprint', 'Strategic roadmaps, competitive positioning, and growth pathways', 2),
  ('business_outcomes_design', 'Business Outcomes Design', 'strategy_design', 'Future & Business Blueprint', 'Outcome-driven planning linking strategy to measurable results', 3),
  -- Product & Service Innovation
  ('product_innovation', 'Product Innovation', 'product_innovation', 'Product & Service Innovation', 'New product development, feature innovation, and product-market fit', 4),
  ('service_innovation', 'Service Innovation', 'product_innovation', 'Product & Service Innovation', 'Service design, customer experience innovation, and service delivery models', 5),
  -- Business & Operational Excellence
  ('business_processes_design', 'Business Processes Design', 'process_operations', 'Business & Operational Excellence', 'Design of SCM, CRM, CXM, PLM and other core business processes', 6),
  ('workplaces_design', 'Workplaces Design', 'process_operations', 'Business & Operational Excellence', 'Workplace strategy, hybrid work models, and employee experience design', 7),
  ('operating_model_design', 'Operating Model Design', 'process_operations', 'Business & Operational Excellence', 'End-to-end operating model design including governance and capabilities', 8),
  -- Digital & Technology Blueprint
  ('technology_strategy', 'Technology Strategy', 'technology_architecture', 'Digital & Technology Blueprint', 'Technology vision, roadmaps, and digital transformation strategy', 9),
  ('technology_architecture', 'Technology Architecture', 'technology_architecture', 'Digital & Technology Blueprint', 'Enterprise architecture, infrastructure design, and platform engineering', 10),
  ('technology_governance', 'Technology Governance', 'technology_architecture', 'Digital & Technology Blueprint', 'IT governance frameworks, standards, and compliance architecture', 11),
  ('ai_agents_digital_workforce', 'AI Agents / Digital Workforce Design', 'technology_architecture', 'Digital & Technology Blueprint', 'Agentic AI systems, digital workers, and autonomous process agents', 12),
  ('ai_ml_models_design', 'AI/ML Models Design', 'technology_architecture', 'Digital & Technology Blueprint', 'Machine learning model architecture, training pipelines, and MLOps', 13),
  ('app_rationalization_agentic_ai', 'Application Rationalization & Agentic AI Integration Strategy', 'technology_architecture', 'Digital & Technology Blueprint', 'Application portfolio optimization and agentic AI integration across enterprise systems', 14);

-- Add solution_types JSONB column to challenges (multi-select, alongside existing solution_type for backward compat)
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS solution_types JSONB DEFAULT '[]'::jsonb;
