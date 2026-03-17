
-- Add is_qa_closed flag to challenges table
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS is_qa_closed BOOLEAN NOT NULL DEFAULT false;
