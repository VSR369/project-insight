-- Migration Part 2: Migrate data after enum value was committed
-- Step 1: Migrate 'verified' → 'certified' with new rank 140
UPDATE solution_providers 
SET lifecycle_status = 'certified', lifecycle_rank = 140, updated_at = NOW()
WHERE lifecycle_status = 'verified';

UPDATE provider_industry_enrollments 
SET lifecycle_status = 'certified', lifecycle_rank = 140, updated_at = NOW()
WHERE lifecycle_status = 'verified';

-- Step 2: Migrate 'not_verified' → 'not_certified' with rank 150
UPDATE solution_providers 
SET lifecycle_status = 'not_certified', lifecycle_rank = 150, updated_at = NOW()
WHERE lifecycle_status = 'not_verified';

UPDATE provider_industry_enrollments 
SET lifecycle_status = 'not_certified', lifecycle_rank = 150, updated_at = NOW()
WHERE lifecycle_status = 'not_verified';

-- Step 3: Update 'active' rank from 145 to 135
UPDATE solution_providers 
SET lifecycle_rank = 135, updated_at = NOW()
WHERE lifecycle_status = 'active';

UPDATE provider_industry_enrollments 
SET lifecycle_rank = 135, updated_at = NOW()
WHERE lifecycle_status = 'active';

-- Step 4: Update 'certified' rank from 150 to 140 for records with old rank
UPDATE solution_providers 
SET lifecycle_rank = 140, updated_at = NOW()
WHERE lifecycle_status = 'certified' AND lifecycle_rank = 150;

UPDATE provider_industry_enrollments 
SET lifecycle_rank = 140, updated_at = NOW()
WHERE lifecycle_status = 'certified' AND lifecycle_rank = 150;