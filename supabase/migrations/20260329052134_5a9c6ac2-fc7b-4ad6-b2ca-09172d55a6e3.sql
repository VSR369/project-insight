
-- Step 1: Add solution_type column to challenges
ALTER TABLE public.challenges
ADD COLUMN IF NOT EXISTS solution_type TEXT CHECK (solution_type IN ('strategy_design', 'process_operations', 'technology_architecture', 'product_innovation'));

-- Step 2: Create complexity_dimensions table
CREATE TABLE IF NOT EXISTS public.complexity_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_type TEXT NOT NULL CHECK (solution_type IN ('strategy_design', 'process_operations', 'technology_architecture', 'product_innovation')),
  dimension_key TEXT NOT NULL,
  dimension_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  level_1_description TEXT NOT NULL,
  level_3_description TEXT NOT NULL,
  level_5_description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (solution_type, dimension_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_complexity_dimensions_solution_type ON public.complexity_dimensions(solution_type, display_order);

-- RLS
ALTER TABLE public.complexity_dimensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read complexity dimensions"
  ON public.complexity_dimensions
  FOR SELECT
  TO authenticated
  USING (true);

-- Seed: Strategy & Design (5 dimensions)
INSERT INTO public.complexity_dimensions (solution_type, dimension_key, dimension_name, display_order, level_1_description, level_3_description, level_5_description)
VALUES
  ('strategy_design', 'strategic_breadth', 'Strategic Breadth', 1,
   'Single business unit or function',
   'Multi-function, single geography',
   'Enterprise-wide, multi-geography'),
  ('strategy_design', 'analytical_depth', 'Analytical Depth', 2,
   'Basic SWOT / qualitative analysis',
   'Quantitative modeling with market data',
   'Advanced scenario modeling, financial simulation'),
  ('strategy_design', 'stakeholder_complexity', 'Stakeholder Complexity', 3,
   'Single decision-maker',
   '3–5 stakeholders, aligned interests',
   '10+ stakeholders, competing interests, board-level'),
  ('strategy_design', 'industry_regulatory_context', 'Industry/Regulatory Context', 4,
   'Well-understood, minimal regulation',
   'Moderately regulated, evolving market',
   'Heavily regulated, disrupted market, geopolitical'),
  ('strategy_design', 'deliverable_sophistication', 'Deliverable Sophistication', 5,
   'Standard template-based output',
   'Custom frameworks with supporting analysis',
   'Proprietary methodology with implementation playbook');

-- Seed: Process & Operations (5 dimensions)
INSERT INTO public.complexity_dimensions (solution_type, dimension_key, dimension_name, display_order, level_1_description, level_3_description, level_5_description)
VALUES
  ('process_operations', 'process_scope', 'Process Scope', 1,
   'Single process, single department',
   'Multi-process, 2–3 departments',
   'End-to-end value chain, cross-functional'),
  ('process_operations', 'change_impact', 'Change Impact', 2,
   'Incremental, <50 users',
   'Moderate redesign, 50–500 users',
   'Transformational, 500+ users, cultural shift'),
  ('process_operations', 'system_touchpoints', 'System Touchpoints', 3,
   'Manual/paper-based process',
   '2–3 systems (ERP, CRM)',
   '5+ integrated systems, real-time'),
  ('process_operations', 'measurement_complexity', 'Measurement Complexity', 4,
   'Single KPI, easy to measure',
   '5–10 KPIs, some new instrumentation',
   'Balanced scorecard, baseline establishment needed'),
  ('process_operations', 'domain_depth', 'Domain Depth', 5,
   'General business knowledge',
   'Industry-specific expertise',
   'Rare domain expertise + regulatory certification');

-- Seed: Technology & Architecture (5 dimensions)
INSERT INTO public.complexity_dimensions (solution_type, dimension_key, dimension_name, display_order, level_1_description, level_3_description, level_5_description)
VALUES
  ('technology_architecture', 'technical_depth', 'Technical Depth', 1,
   'Single technology, standard patterns',
   'Multi-technology, custom integration',
   'Frontier tech, research-grade algorithms'),
  ('technology_architecture', 'integration_complexity', 'Integration Complexity', 2,
   'Standalone',
   '2–3 systems via standard APIs',
   '5+ systems, real-time, event-driven, legacy'),
  ('technology_architecture', 'data_complexity', 'Data Complexity', 3,
   'Structured, <1GB, no PII',
   'Mixed, 1–100GB, some PII',
   '100GB+, streaming, heavily regulated'),
  ('technology_architecture', 'security_compliance', 'Security & Compliance', 4,
   'Basic authentication',
   'RBAC, audit logging',
   'Zero-trust, encryption, SOC2/ISO27001'),
  ('technology_architecture', 'scalability_requirements', 'Scalability Requirements', 5,
   'Prototype, <100 users',
   'Department, 100–10K users',
   'Enterprise, 10K+ concurrent, multi-region');

-- Seed: Product & Innovation (5 dimensions)
INSERT INTO public.complexity_dimensions (solution_type, dimension_key, dimension_name, display_order, level_1_description, level_3_description, level_5_description)
VALUES
  ('product_innovation', 'user_research_depth', 'User Research Depth', 1,
   'Existing personas, known needs',
   'Primary research, 10–20 interviews',
   'Ethnographic, 50+ participants, cross-cultural'),
  ('product_innovation', 'market_novelty', 'Market Novelty', 2,
   'Incremental improvement',
   'New category for existing market',
   'Category-creating, requires market education'),
  ('product_innovation', 'technical_feasibility', 'Technical Feasibility', 3,
   'Proven stack',
   'Requires technology validation',
   'Depends on emerging/unproven technology'),
  ('product_innovation', 'business_model_innovation', 'Business Model Innovation', 4,
   'Revenue model known',
   'New pricing/distribution model',
   'Platform/ecosystem play, multi-sided market'),
  ('product_innovation', 'design_complexity', 'Design Complexity', 5,
   'Single user type, 5–10 screens',
   'Multi-persona, 20–50 screens',
   'Omni-channel, 50+ touchpoints, personalized');
