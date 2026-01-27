-- =====================================================
-- Interview Kit Implementation - Phase 1: Add Missing Columns
-- =====================================================

-- Add interview score columns to interview_bookings (these don't exist yet)
ALTER TABLE public.interview_bookings 
ADD COLUMN IF NOT EXISTS interview_score_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS interview_score_out_of_10 DECIMAL(3,1),
ADD COLUMN IF NOT EXISTS interview_total_questions INTEGER,
ADD COLUMN IF NOT EXISTS interview_correct_count INTEGER,
ADD COLUMN IF NOT EXISTS panel_recommendation VARCHAR(50),
ADD COLUMN IF NOT EXISTS interview_submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS interview_submitted_by UUID REFERENCES auth.users(id);

-- Add missing columns to interview_question_responses table
ALTER TABLE public.interview_question_responses 
ADD COLUMN IF NOT EXISTS interview_kit_question_id UUID REFERENCES interview_kit_questions(id),
ADD COLUMN IF NOT EXISTS question_bank_id UUID REFERENCES question_bank(id),
ADD COLUMN IF NOT EXISTS section_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS section_label VARCHAR(150),
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Update section_type from section_name if needed
UPDATE interview_question_responses 
SET section_type = section_name, section_label = section_name 
WHERE section_type IS NULL AND section_name IS NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_interview_responses_evaluation ON interview_question_responses(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_interview_responses_section ON interview_question_responses(section_type);
CREATE INDEX IF NOT EXISTS idx_interview_responses_source ON interview_question_responses(question_source);
CREATE INDEX IF NOT EXISTS idx_interview_responses_deleted ON interview_question_responses(evaluation_id, is_deleted);