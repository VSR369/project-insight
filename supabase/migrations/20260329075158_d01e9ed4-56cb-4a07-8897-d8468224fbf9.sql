-- Phase 6 Step 1: Add structured prompt columns to ai_review_section_config
-- These columns enrich the existing table with structured JSONB fields for
-- quality criteria, cross-references, master data constraints, content templates,
-- computation rules, research directives, and supervisor examples.

ALTER TABLE ai_review_section_config
  ADD COLUMN IF NOT EXISTS platform_preamble TEXT,
  ADD COLUMN IF NOT EXISTS quality_criteria JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS master_data_constraints JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS computation_rules JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS content_templates JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS web_search_queries JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS industry_frameworks JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS analyst_sources JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS supervisor_examples JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cross_references JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS wave_number INTEGER,
  ADD COLUMN IF NOT EXISTS tab_group TEXT,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add GIN indexes for JSONB columns that may be queried
CREATE INDEX IF NOT EXISTS idx_ai_review_config_quality_criteria
  ON ai_review_section_config USING GIN (quality_criteria);

CREATE INDEX IF NOT EXISTS idx_ai_review_config_cross_references
  ON ai_review_section_config USING GIN (cross_references);

-- Phase 6 Step 2: Create phase_templates table for solution-type x maturity phase durations
CREATE TABLE IF NOT EXISTS phase_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_type TEXT NOT NULL,
  maturity_level TEXT NOT NULL,
  phases JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_range_min_weeks INTEGER NOT NULL DEFAULT 4,
  total_range_max_weeks INTEGER NOT NULL DEFAULT 16,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(solution_type, maturity_level)
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_phase_templates_type_maturity
  ON phase_templates (solution_type, maturity_level)
  WHERE is_active = TRUE;

-- Add comment
COMMENT ON TABLE phase_templates IS 'Phase duration templates per solution-type x maturity-level combination. Used by AI prompt assembly to inject phase schedule constraints.';
COMMENT ON COLUMN phase_templates.phases IS 'JSON array: [{name, minDays, maxDays}]';
COMMENT ON COLUMN ai_review_section_config.quality_criteria IS 'JSON array: [{name, description, severity, crossReferences}]';
COMMENT ON COLUMN ai_review_section_config.cross_references IS 'JSON array of section_key strings whose content gets injected into this sections prompt';
COMMENT ON COLUMN ai_review_section_config.content_templates IS 'JSON object: {blueprint, poc, pilot} maturity-specific output templates';
COMMENT ON COLUMN ai_review_section_config.wave_number IS 'Which wave (1-6) this section belongs to in the wave executor';