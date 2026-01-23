-- =====================================================
-- Fix: Update sync_provider_lifecycle_rank trigger to use proper type casting
-- Then cleanup orphan attempts and stale enrollments
-- =====================================================

-- Step 1: Fix the trigger function with proper type casting
CREATE OR REPLACE FUNCTION public.sync_provider_lifecycle_rank()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_provider_id UUID;
  v_max_rank INTEGER;
  v_max_status lifecycle_status;
BEGIN
  -- Determine the provider_id based on trigger operation
  IF TG_OP = 'DELETE' THEN
    v_provider_id := OLD.provider_id;
  ELSE
    v_provider_id := NEW.provider_id;
  END IF;

  -- Calculate max lifecycle_rank across all active enrollments for this provider
  SELECT 
    COALESCE(MAX(lifecycle_rank), 20),
    (SELECT lifecycle_status FROM provider_industry_enrollments 
     WHERE provider_id = v_provider_id 
     ORDER BY lifecycle_rank DESC LIMIT 1)
  INTO v_max_rank, v_max_status
  FROM provider_industry_enrollments
  WHERE provider_id = v_provider_id;

  -- Update the solution_providers table with the max values
  UPDATE solution_providers
  SET 
    lifecycle_rank = v_max_rank,
    lifecycle_status = COALESCE(v_max_status, 'registered'::lifecycle_status),
    updated_at = NOW()
  WHERE id = v_provider_id;

  -- Return appropriate row based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;

-- Step 2: Delete the specific orphan attempt found
DELETE FROM assessment_attempts 
WHERE id = '3b0046a4-b434-4857-b0b4-2c03fd50a4ef';

-- Step 3: Reset the enrollment to proof_points_min_met (rank 70)
UPDATE provider_industry_enrollments 
SET 
  lifecycle_status = 'proof_points_min_met'::lifecycle_status,
  lifecycle_rank = 70,
  updated_at = NOW()
WHERE id = '58155298-1987-4f40-ba6c-2f8aa3257e7d'
  AND lifecycle_status = 'assessment_in_progress';

-- Step 4: Generic cleanup - Delete any remaining orphan attempts (0 responses, not submitted)
DELETE FROM assessment_attempts 
WHERE id IN (
  SELECT aa.id 
  FROM assessment_attempts aa
  LEFT JOIN assessment_attempt_responses aar ON aar.attempt_id = aa.id
  WHERE aa.submitted_at IS NULL
  GROUP BY aa.id
  HAVING COUNT(aar.id) = 0
);

-- Step 5: Reset any remaining stale enrollments stuck in assessment_in_progress
UPDATE provider_industry_enrollments pie
SET 
  lifecycle_status = 'proof_points_min_met'::lifecycle_status,
  lifecycle_rank = 70,
  updated_at = NOW()
WHERE pie.lifecycle_status = 'assessment_in_progress'
AND NOT EXISTS (
  SELECT 1 FROM assessment_attempts aa 
  WHERE aa.enrollment_id = pie.id 
  AND aa.submitted_at IS NULL
);