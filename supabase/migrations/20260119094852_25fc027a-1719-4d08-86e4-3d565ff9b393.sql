-- =====================================================
-- COMPLETE TEST DATA CLEANUP & FRESH START
-- Delete all solution provider test data to start from scratch
-- =====================================================

-- Step 1: Delete booking_reviewers (depends on interview_bookings)
DELETE FROM booking_reviewers 
WHERE booking_id IN (
  SELECT id FROM interview_bookings 
  WHERE provider_id IN ('c36013a0-5b22-4451-bd6e-052815912024', '9f3365d4-4d35-47f8-94ee-f42f3708ced9')
);

-- Step 2: Delete interview_bookings
DELETE FROM interview_bookings 
WHERE provider_id IN ('c36013a0-5b22-4451-bd6e-052815912024', '9f3365d4-4d35-47f8-94ee-f42f3708ced9');

-- Step 3: Delete assessment_attempt_responses (depends on assessment_attempts)
DELETE FROM assessment_attempt_responses 
WHERE attempt_id IN (
  SELECT id FROM assessment_attempts 
  WHERE provider_id IN ('c36013a0-5b22-4451-bd6e-052815912024', '9f3365d4-4d35-47f8-94ee-f42f3708ced9')
);

-- Step 4: Delete assessment_results_rollup (depends on assessment_attempts)
DELETE FROM assessment_results_rollup 
WHERE attempt_id IN (
  SELECT id FROM assessment_attempts 
  WHERE provider_id IN ('c36013a0-5b22-4451-bd6e-052815912024', '9f3365d4-4d35-47f8-94ee-f42f3708ced9')
);

-- Step 5: Delete assessment_attempts
DELETE FROM assessment_attempts 
WHERE provider_id IN ('c36013a0-5b22-4451-bd6e-052815912024', '9f3365d4-4d35-47f8-94ee-f42f3708ced9');

-- Step 6: Delete proof_point_speciality_tags (depends on proof_points)
DELETE FROM proof_point_speciality_tags 
WHERE proof_point_id IN (
  SELECT id FROM proof_points 
  WHERE provider_id IN ('c36013a0-5b22-4451-bd6e-052815912024', '9f3365d4-4d35-47f8-94ee-f42f3708ced9')
);

-- Step 7: Delete proof_point_links (depends on proof_points)
DELETE FROM proof_point_links 
WHERE proof_point_id IN (
  SELECT id FROM proof_points 
  WHERE provider_id IN ('c36013a0-5b22-4451-bd6e-052815912024', '9f3365d4-4d35-47f8-94ee-f42f3708ced9')
);

-- Step 8: Delete proof_point_files (depends on proof_points)
DELETE FROM proof_point_files 
WHERE proof_point_id IN (
  SELECT id FROM proof_points 
  WHERE provider_id IN ('c36013a0-5b22-4451-bd6e-052815912024', '9f3365d4-4d35-47f8-94ee-f42f3708ced9')
);

-- Step 9: Delete proof_points
DELETE FROM proof_points 
WHERE provider_id IN ('c36013a0-5b22-4451-bd6e-052815912024', '9f3365d4-4d35-47f8-94ee-f42f3708ced9');

-- Step 10: Delete provider_specialities
DELETE FROM provider_specialities 
WHERE provider_id IN ('c36013a0-5b22-4451-bd6e-052815912024', '9f3365d4-4d35-47f8-94ee-f42f3708ced9');

-- Step 11: Delete provider_proficiency_areas
DELETE FROM provider_proficiency_areas 
WHERE provider_id IN ('c36013a0-5b22-4451-bd6e-052815912024', '9f3365d4-4d35-47f8-94ee-f42f3708ced9');

-- Step 12: Delete provider_industry_enrollments
DELETE FROM provider_industry_enrollments 
WHERE provider_id IN ('c36013a0-5b22-4451-bd6e-052815912024', '9f3365d4-4d35-47f8-94ee-f42f3708ced9');

-- Step 13: Delete student_profiles (if any)
DELETE FROM student_profiles 
WHERE provider_id IN ('c36013a0-5b22-4451-bd6e-052815912024', '9f3365d4-4d35-47f8-94ee-f42f3708ced9');

-- Step 14: Delete solution_providers
DELETE FROM solution_providers 
WHERE id IN ('c36013a0-5b22-4451-bd6e-052815912024', '9f3365d4-4d35-47f8-94ee-f42f3708ced9');

-- Step 15: Delete profiles for these users
DELETE FROM profiles 
WHERE user_id IN ('32aec070-360a-4d73-a6dd-28961c629ca6', 'e63aa7fb-c4ff-4f00-bc26-c6c86dd83d28');

-- =====================================================
-- RESET TEST REVIEWER SLOTS
-- Clear all existing slots and create fresh future availability
-- =====================================================

-- Step 16: Delete all composite_interview_slots (orphaned now)
DELETE FROM composite_interview_slots;

-- Step 17: Delete all interview_slots for test reviewer and start fresh
DELETE FROM interview_slots 
WHERE reviewer_id = '92f72cc0-e7e4-4458-bf36-e89830976f47';

-- Step 18: Create fresh future availability slots (Jan 21-25, 2026)
-- Morning slots (09:00-10:00 UTC)
INSERT INTO interview_slots (id, reviewer_id, start_at, end_at, status, created_at)
VALUES 
  (gen_random_uuid(), '92f72cc0-e7e4-4458-bf36-e89830976f47', 
   '2026-01-21 09:00:00+00', '2026-01-21 10:00:00+00', 'open', NOW()),
  (gen_random_uuid(), '92f72cc0-e7e4-4458-bf36-e89830976f47', 
   '2026-01-22 09:00:00+00', '2026-01-22 10:00:00+00', 'open', NOW()),
  (gen_random_uuid(), '92f72cc0-e7e4-4458-bf36-e89830976f47', 
   '2026-01-23 09:00:00+00', '2026-01-23 10:00:00+00', 'open', NOW()),
  (gen_random_uuid(), '92f72cc0-e7e4-4458-bf36-e89830976f47', 
   '2026-01-24 09:00:00+00', '2026-01-24 10:00:00+00', 'open', NOW()),
  (gen_random_uuid(), '92f72cc0-e7e4-4458-bf36-e89830976f47', 
   '2026-01-25 09:00:00+00', '2026-01-25 10:00:00+00', 'open', NOW());

-- Afternoon slots (14:00-15:00 UTC)
INSERT INTO interview_slots (id, reviewer_id, start_at, end_at, status, created_at)
VALUES 
  (gen_random_uuid(), '92f72cc0-e7e4-4458-bf36-e89830976f47', 
   '2026-01-21 14:00:00+00', '2026-01-21 15:00:00+00', 'open', NOW()),
  (gen_random_uuid(), '92f72cc0-e7e4-4458-bf36-e89830976f47', 
   '2026-01-22 14:00:00+00', '2026-01-22 15:00:00+00', 'open', NOW()),
  (gen_random_uuid(), '92f72cc0-e7e4-4458-bf36-e89830976f47', 
   '2026-01-23 14:00:00+00', '2026-01-23 15:00:00+00', 'open', NOW()),
  (gen_random_uuid(), '92f72cc0-e7e4-4458-bf36-e89830976f47', 
   '2026-01-24 14:00:00+00', '2026-01-24 15:00:00+00', 'open', NOW()),
  (gen_random_uuid(), '92f72cc0-e7e4-4458-bf36-e89830976f47', 
   '2026-01-25 14:00:00+00', '2026-01-25 15:00:00+00', 'open', NOW());