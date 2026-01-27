-- Modify the CHECK constraint to allow 'reviewer_custom' source
ALTER TABLE public.interview_question_responses 
DROP CONSTRAINT IF EXISTS interview_question_responses_question_source_check;

ALTER TABLE public.interview_question_responses 
ADD CONSTRAINT interview_question_responses_question_source_check 
CHECK (question_source IN ('interview_kit', 'question_bank', 'proof_point', 'reviewer_custom'));