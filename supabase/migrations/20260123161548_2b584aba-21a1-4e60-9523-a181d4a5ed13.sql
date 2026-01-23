-- =====================================================
-- Update correct_option to 1-based indexing (1-6)
-- First fix existing 0-indexed values, then add constraint
-- =====================================================

-- Step 1: Convert any 0-indexed values to 1-indexed
-- (0 becomes 1, meaning "first option")
UPDATE question_bank 
SET correct_option = correct_option + 1
WHERE correct_option = 0;

-- Step 2: Drop existing constraint
ALTER TABLE question_bank 
DROP CONSTRAINT IF EXISTS question_bank_correct_option_check;

-- Step 3: Add new constraint for 1-based indexing (1-6)
ALTER TABLE question_bank 
ADD CONSTRAINT question_bank_correct_option_check 
CHECK (correct_option >= 1 AND correct_option <= 6);