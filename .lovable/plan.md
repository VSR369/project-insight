# Plan: Clean Up Provider Test Data Only

## Objective
Delete all provider operational/transactional data to enable fresh testing of two industry enrollment lifecycles. Master data remains untouched.

## Provider IDs to Clean
- `b0a56517-cabf-4dbf-82ec-28f63b9c171b` (Srinivasa Rao)
- `b6463a7d-c852-453d-b5f5-9f1395dd9d68` (Second test provider)

## SQL Cleanup Script (Execute in Supabase SQL Editor)

```sql
-- =====================================================
-- PROVIDER DATA CLEANUP SCRIPT
-- Cleans ONLY provider operational data
-- Master data tables are NOT touched
-- =====================================================

-- Step 1: Delete proof point related data (deepest children first)
DELETE FROM proof_point_speciality_tags 
WHERE proof_point_id IN (
  SELECT id FROM proof_points 
  WHERE provider_id IN (
    'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
    'b6463a7d-c852-453d-b5f5-9f1395dd9d68'
  )
);

DELETE FROM proof_point_files 
WHERE proof_point_id IN (
  SELECT id FROM proof_points 
  WHERE provider_id IN (
    'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
    'b6463a7d-c852-453d-b5f5-9f1395dd9d68'
  )
);

DELETE FROM proof_point_links 
WHERE proof_point_id IN (
  SELECT id FROM proof_points 
  WHERE provider_id IN (
    'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
    'b6463a7d-c852-453d-b5f5-9f1395dd9d68'
  )
);

DELETE FROM proof_points 
WHERE provider_id IN (
  'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
  'b6463a7d-c852-453d-b5f5-9f1395dd9d68'
);

-- Step 2: Delete assessment related data
DELETE FROM assessment_attempt_responses 
WHERE attempt_id IN (
  SELECT id FROM assessment_attempts 
  WHERE provider_id IN (
    'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
    'b6463a7d-c852-453d-b5f5-9f1395dd9d68'
  )
);

DELETE FROM assessment_results_rollup 
WHERE attempt_id IN (
  SELECT id FROM assessment_attempts 
  WHERE provider_id IN (
    'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
    'b6463a7d-c852-453d-b5f5-9f1395dd9d68'
  )
);

DELETE FROM assessment_attempts 
WHERE provider_id IN (
  'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
  'b6463a7d-c852-453d-b5f5-9f1395dd9d68'
);

-- Step 3: Delete question exposure logs
DELETE FROM question_exposure_log 
WHERE provider_id IN (
  'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
  'b6463a7d-c852-453d-b5f5-9f1395dd9d68'
);

-- Step 4: Delete provider selections
DELETE FROM provider_specialities 
WHERE provider_id IN (
  'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
  'b6463a7d-c852-453d-b5f5-9f1395dd9d68'
);

DELETE FROM provider_proficiency_areas 
WHERE provider_id IN (
  'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
  'b6463a7d-c852-453d-b5f5-9f1395dd9d68'
);

-- Step 5: Delete organization data
DELETE FROM solution_provider_organizations 
WHERE provider_id IN (
  'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
  'b6463a7d-c852-453d-b5f5-9f1395dd9d68'
);

-- Step 6: Delete student profiles
DELETE FROM student_profiles 
WHERE provider_id IN (
  'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
  'b6463a7d-c852-453d-b5f5-9f1395dd9d68'
);

-- Step 7: Delete industry enrollments
DELETE FROM provider_industry_enrollments 
WHERE provider_id IN (
  'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
  'b6463a7d-c852-453d-b5f5-9f1395dd9d68'
);

-- Step 8: Delete main provider records
DELETE FROM solution_providers 
WHERE id IN (
  'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
  'b6463a7d-c852-453d-b5f5-9f1395dd9d68'
);

-- Step 9: Delete user profiles (linked to auth.users)
DELETE FROM profiles 
WHERE user_id IN (
  SELECT user_id FROM solution_providers 
  WHERE id IN (
    'b0a56517-cabf-4dbf-82ec-28f63b9c171b',
    'b6463a7d-c852-453d-b5f5-9f1395dd9d68'
  )
);
```

## Verification Query (Run After Cleanup)

```sql
-- Verify all provider data is cleaned
SELECT 'solution_providers' as table_name, COUNT(*) as remaining FROM solution_providers
UNION ALL
SELECT 'provider_industry_enrollments', COUNT(*) FROM provider_industry_enrollments
UNION ALL
SELECT 'proof_points', COUNT(*) FROM proof_points
UNION ALL
SELECT 'provider_proficiency_areas', COUNT(*) FROM provider_proficiency_areas
UNION ALL
SELECT 'solution_provider_organizations', COUNT(*) FROM solution_provider_organizations
UNION ALL
SELECT 'assessment_attempts', COUNT(*) FROM assessment_attempts;
```

## Execution Steps

1. Go to Supabase Dashboard > SQL Editor
2. Copy and paste the cleanup script above
3. Execute the script
4. Run the verification query to confirm cleanup
5. You can now register fresh and test two industry enrollment lifecycles

## What Remains Untouched
- All master data (industries, expertise levels, proficiency taxonomy, etc.)
- Question bank
- Capability tags
- Countries
- Organization types
- Participation modes
- Lifecycle stages
- Academic taxonomy
- Invitations

## After Cleanup - Fresh Test Flow
1. Register new provider account
2. Select first industry (e.g., Manufacturing)
3. Complete full enrollment lifecycle
4. Add second industry via "Add Industry" button
5. Complete second industry enrollment lifecycle
6. Verify both enrollments work independently
