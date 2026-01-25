-- Add question_order column to preserve display sequence
ALTER TABLE public.assessment_attempt_responses
  ADD COLUMN IF NOT EXISTS question_order INTEGER;

-- Create index for efficient ordering by attempt and question order
CREATE INDEX IF NOT EXISTS idx_assessment_responses_order 
  ON public.assessment_attempt_responses(attempt_id, question_order);