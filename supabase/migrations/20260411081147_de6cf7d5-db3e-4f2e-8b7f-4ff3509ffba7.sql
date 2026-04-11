
-- Add context_intake_status to challenges
ALTER TABLE public.challenges
ADD COLUMN IF NOT EXISTS context_intake_status TEXT DEFAULT 'pending'
CHECK (context_intake_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'));

-- Backfill existing phase-2+ challenges
UPDATE public.challenges
SET context_intake_status = 'skipped'
WHERE current_phase >= 2 AND context_intake_status = 'pending';
