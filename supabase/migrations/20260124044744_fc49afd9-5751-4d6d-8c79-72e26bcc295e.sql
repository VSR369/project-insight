-- Migration: Fix assessment response selected_option constraint
-- The constraint was incorrectly set to 0-3 but options use 1-based indexing (1-4)

-- Drop existing constraint on assessment_attempt_responses
ALTER TABLE public.assessment_attempt_responses 
  DROP CONSTRAINT IF EXISTS assessment_attempt_responses_selected_option_check;

-- Add corrected constraint (allows NULL for unanswered, or 1-4 for answered)
ALTER TABLE public.assessment_attempt_responses 
  ADD CONSTRAINT assessment_attempt_responses_selected_option_check 
  CHECK (selected_option IS NULL OR (selected_option >= 1 AND selected_option <= 4));

-- Also fix correct_option constraint on question_bank to match
ALTER TABLE public.question_bank 
  DROP CONSTRAINT IF EXISTS question_bank_correct_option_check;

ALTER TABLE public.question_bank 
  ADD CONSTRAINT question_bank_correct_option_check 
  CHECK (correct_option >= 1 AND correct_option <= 4);