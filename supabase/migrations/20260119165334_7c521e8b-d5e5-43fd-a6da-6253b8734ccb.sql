-- =====================================================
-- Fix enrollment initial lifecycle state
-- New enrollments should start at 'registered' (rank 15) 
-- so users see Registration step first before Participation Mode
-- =====================================================

-- Update the default values for provider_industry_enrollments
ALTER TABLE public.provider_industry_enrollments 
  ALTER COLUMN lifecycle_status SET DEFAULT 'registered',
  ALTER COLUMN lifecycle_rank SET DEFAULT 15;

-- Optional: Backfill any recent enrollments that were created with 'enrolled' 
-- but haven't progressed past Step 1 (still at rank 20 with no mode selected)
UPDATE public.provider_industry_enrollments
SET lifecycle_status = 'registered', 
    lifecycle_rank = 15
WHERE lifecycle_status = 'enrolled' 
  AND lifecycle_rank = 20 
  AND participation_mode_id IS NULL;