-- =====================================================
-- Clean slate for provider@test.local (John Provider)
-- Provider ID: ce00180c-1ff5-4e48-8d79-d4eb7ada8070
-- Enrollment ID: 129298d7-7877-40eb-ba32-d98dd4bdde12
-- =====================================================

-- Step 1: Delete assessment responses
DELETE FROM public.assessment_attempt_responses 
WHERE attempt_id IN (
  SELECT id FROM public.assessment_attempts 
  WHERE provider_id = 'ce00180c-1ff5-4e48-8d79-d4eb7ada8070'
);

-- Step 2: Delete assessment attempts
DELETE FROM public.assessment_attempts 
WHERE provider_id = 'ce00180c-1ff5-4e48-8d79-d4eb7ada8070';

-- Step 3: Delete proof point related data
DELETE FROM public.proof_point_speciality_tags 
WHERE proof_point_id IN (
  SELECT id FROM proof_points 
  WHERE provider_id = 'ce00180c-1ff5-4e48-8d79-d4eb7ada8070'
);

DELETE FROM public.proof_point_links 
WHERE proof_point_id IN (
  SELECT id FROM proof_points 
  WHERE provider_id = 'ce00180c-1ff5-4e48-8d79-d4eb7ada8070'
);

DELETE FROM public.proof_point_files 
WHERE proof_point_id IN (
  SELECT id FROM proof_points 
  WHERE provider_id = 'ce00180c-1ff5-4e48-8d79-d4eb7ada8070'
);

DELETE FROM public.proof_points 
WHERE provider_id = 'ce00180c-1ff5-4e48-8d79-d4eb7ada8070';

-- Step 4: Delete proficiency areas and specialities
DELETE FROM public.provider_proficiency_areas 
WHERE provider_id = 'ce00180c-1ff5-4e48-8d79-d4eb7ada8070';

DELETE FROM public.provider_specialities 
WHERE provider_id = 'ce00180c-1ff5-4e48-8d79-d4eb7ada8070';

-- Step 5: Delete the enrollment record
DELETE FROM public.provider_industry_enrollments 
WHERE provider_id = 'ce00180c-1ff5-4e48-8d79-d4eb7ada8070';

-- Step 6: Reset solution provider to initial state
UPDATE public.solution_providers 
SET lifecycle_status = 'registered',
    lifecycle_rank = 10,
    participation_mode_id = NULL,
    expertise_level_id = NULL,
    updated_at = NOW()
WHERE id = 'ce00180c-1ff5-4e48-8d79-d4eb7ada8070';