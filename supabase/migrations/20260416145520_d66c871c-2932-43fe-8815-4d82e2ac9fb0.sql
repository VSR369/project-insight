-- Add correction classification and activation gating columns to section_example_library
ALTER TABLE public.section_example_library
  ADD COLUMN IF NOT EXISTS correction_class TEXT,
  ADD COLUMN IF NOT EXISTS activation_confidence NUMERIC NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS distinct_curator_count INTEGER NOT NULL DEFAULT 1;

-- Index for efficient retrieval of active, high-confidence corrections
CREATE INDEX IF NOT EXISTS idx_section_example_library_active_corrections
  ON public.section_example_library (is_active, activation_confidence)
  WHERE learning_rule IS NOT NULL AND activation_confidence >= 0.7;