-- Add dedicated expected_outcomes JSONB column to challenges table
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS expected_outcomes jsonb;

-- Migrate existing data from extended_brief.expected_outcomes to the new column
UPDATE public.challenges
SET expected_outcomes = extended_brief->'expected_outcomes',
    extended_brief = extended_brief - 'expected_outcomes'
WHERE extended_brief ? 'expected_outcomes';