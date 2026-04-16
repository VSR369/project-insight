
-- Prompt 1: Add ai_review_level column (separate from importance_level for UI triage)
ALTER TABLE public.ai_review_section_config
  ADD COLUMN IF NOT EXISTS ai_review_level TEXT NOT NULL DEFAULT 'principal'
  CHECK (ai_review_level IN ('principal', 'senior', 'standard'));

-- Set all active curation sections to principal
UPDATE public.ai_review_section_config
  SET ai_review_level = 'principal'
  WHERE role_context = 'curation' AND is_active = true;

-- Add reasoning_effort to global config (for Prompt 3, but schema change done now)
ALTER TABLE public.ai_review_global_config
  ADD COLUMN IF NOT EXISTS reasoning_effort TEXT NOT NULL DEFAULT 'high'
  CHECK (reasoning_effort IN ('low', 'medium', 'high'));
