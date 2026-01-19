-- Phase 1: Advance Tech enrollment to assessment_passed
UPDATE provider_industry_enrollments
SET 
  lifecycle_status = 'assessment_passed',
  lifecycle_rank = 110,
  updated_at = NOW()
WHERE id = 'fa70c0a7-e710-496b-b87e-69e791eff721';

-- Phase 2: Create composite slot for Tech enrollment using Test Reviewer's Jan 20 slot
INSERT INTO composite_interview_slots (
  id,
  expertise_level_id,
  industry_segment_id,
  start_at,
  end_at,
  backing_slot_ids,
  available_reviewer_count,
  status,
  created_at
)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '7e198535-0774-4f72-a36a-11fa7cb0fc04',
  'b1a248ce-15b9-4733-a035-a904a786fe30',
  '2026-01-20 08:30:00+00',
  '2026-01-20 09:30:00+00',
  ARRAY['c0277e41-4e01-40f0-9799-120dfca59475']::uuid[],
  1,
  'booked',
  NOW()
);

-- Phase 3: Create interview booking for Tech enrollment
INSERT INTO interview_bookings (
  id,
  provider_id,
  enrollment_id,
  composite_slot_id,
  scheduled_at,
  status,
  flag_for_clarification,
  created_at
)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'c36013a0-5b22-4451-bd6e-052815912024',
  'fa70c0a7-e710-496b-b87e-69e791eff721',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '2026-01-20 08:30:00+00',
  'scheduled',
  FALSE,
  NOW()
);

-- Phase 4: Link Test Reviewer to the booking
INSERT INTO booking_reviewers (
  reviewer_id,
  booking_id,
  slot_id,
  status,
  created_at
)
VALUES (
  '92f72cc0-e7e4-4458-bf36-e89830976f47',
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'c0277e41-4e01-40f0-9799-120dfca59475',
  'assigned',
  NOW()
);

-- Phase 5: Update the slot to booked status
UPDATE interview_slots
SET status = 'booked', updated_at = NOW()
WHERE id = 'c0277e41-4e01-40f0-9799-120dfca59475';

-- Phase 6: Advance Tech enrollment to panel_scheduled
UPDATE provider_industry_enrollments
SET 
  lifecycle_status = 'panel_scheduled',
  lifecycle_rank = 120,
  updated_at = NOW()
WHERE id = 'fa70c0a7-e710-496b-b87e-69e791eff721';