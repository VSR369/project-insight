
-- Add pattern_extracted flag to curator_corrections
ALTER TABLE public.curator_corrections
  ADD COLUMN IF NOT EXISTS pattern_extracted BOOLEAN DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_curator_corrections_pattern
  ON public.curator_corrections (pattern_extracted)
  WHERE pattern_extracted IS NULL;

-- Add learning_rule and source_type to section_example_library
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'section_example_library' AND column_name = 'learning_rule'
  ) THEN
    ALTER TABLE public.section_example_library ADD COLUMN learning_rule TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'section_example_library' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE public.section_example_library ADD COLUMN source_type TEXT DEFAULT 'manual';
  END IF;
END $$;
