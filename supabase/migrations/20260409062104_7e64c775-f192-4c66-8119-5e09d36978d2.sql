
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS solver_audience TEXT NOT NULL DEFAULT 'ALL';

-- Add CHECK constraint separately for idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_challenges_solver_audience'
  ) THEN
    ALTER TABLE public.challenges
      ADD CONSTRAINT chk_challenges_solver_audience
      CHECK (solver_audience IN ('ALL', 'INTERNAL', 'EXTERNAL'));
  END IF;
END $$;
