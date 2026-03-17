
-- Fix remaining test data issues for M-11 verification

-- 1. GATE-01: Set 2 more challenges to ACTIVE so tier limit triggers (3/3 = blocked)
UPDATE public.challenges
SET master_status = 'ACTIVE'
WHERE id IN (
  'eefb4458-ef38-486c-b347-dc76bb9576fd',
  '21eeec68-5aff-446a-8b22-e91f62f6fe12'
)
AND organization_id = '48c85c00-42e9-41c6-b90e-c7fc62e9f451';

-- 2. AGG bypass: Set one of user 58fa3afe's orgs to AGG + phase1_bypass
UPDATE public.seeker_organizations
SET operating_model = 'AGG',
    phase1_bypass = true
WHERE id = '3ebb4c6e-0b38-4844-aa0a-1923b5d06fd3';

-- 3. Ensure phase_status is ACTIVE on the test org challenges
UPDATE public.challenges
SET phase_status = 'ACTIVE'
WHERE organization_id = '48c85c00-42e9-41c6-b90e-c7fc62e9f451'
AND phase_status IS NULL;
