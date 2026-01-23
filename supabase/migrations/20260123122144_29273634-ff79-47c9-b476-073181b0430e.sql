-- =====================================================
-- Randomize correct_option values across question_bank
-- Constraint: correct_option must be 0-3 (0=A, 1=B, 2=C, 3=D)
-- =====================================================

-- Randomize correct_option (0-3) for all active questions
UPDATE question_bank
SET 
  correct_option = floor(random() * LEAST(4, jsonb_array_length(options::jsonb)))::int,
  updated_at = NOW()
WHERE is_active = true
  AND options IS NOT NULL
  AND jsonb_array_length(options::jsonb) > 0;