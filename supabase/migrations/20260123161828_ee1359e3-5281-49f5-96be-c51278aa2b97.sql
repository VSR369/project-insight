-- =====================================================
-- Fix: Update correct_option constraint to 1-4 range
-- (User has 4 options per question, not 6)
-- =====================================================

-- Drop the incorrect 1-6 constraint
ALTER TABLE question_bank 
DROP CONSTRAINT IF EXISTS question_bank_correct_option_check;

-- Add correct constraint for 1-4 range
ALTER TABLE question_bank 
ADD CONSTRAINT question_bank_correct_option_check 
CHECK (correct_option >= 1 AND correct_option <= 4);