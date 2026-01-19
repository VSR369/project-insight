-- Fix Manufacturing Booking: Reschedule to future date (Jan 21)
-- The current slot (Jan 19 08:30 UTC) has passed

-- Step 1: Create a new future slot for Manufacturing interview
INSERT INTO interview_slots (
  id,
  reviewer_id,
  start_at,
  end_at,
  status,
  created_at
)
VALUES (
  'd1e2f3a4-b5c6-7890-abcd-111222333444',
  '92f72cc0-e7e4-4458-bf36-e89830976f47',
  '2026-01-21 10:00:00+00',
  '2026-01-21 11:00:00+00',
  'booked',
  NOW()
);

-- Step 2: Create new composite slot for Manufacturing Jan 21
-- Using correct industry_segment_id: a333531e-8a60-4682-87df-a9fdc617a232
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
  'e2f3a4b5-c6d7-8901-bcde-222333444555',
  '7e198535-0774-4f72-a36a-11fa7cb0fc04',
  'a333531e-8a60-4682-87df-a9fdc617a232',
  '2026-01-21 10:00:00+00',
  '2026-01-21 11:00:00+00',
  ARRAY['d1e2f3a4-b5c6-7890-abcd-111222333444']::uuid[],
  1,
  'booked',
  NOW()
);

-- Step 3: Update Manufacturing booking to use new composite slot and future time
UPDATE interview_bookings
SET 
  composite_slot_id = 'e2f3a4b5-c6d7-8901-bcde-222333444555',
  scheduled_at = '2026-01-21 10:00:00+00',
  updated_at = NOW()
WHERE id = '19258cf0-77ba-40af-8b0c-1e5433c0e1aa';

-- Step 4: Update booking_reviewers to point to new slot
UPDATE booking_reviewers
SET slot_id = 'd1e2f3a4-b5c6-7890-abcd-111222333444'
WHERE booking_id = '19258cf0-77ba-40af-8b0c-1e5433c0e1aa';

-- Step 5: Mark old slots as cancelled (cleanup)
UPDATE interview_slots
SET status = 'cancelled', cancelled_at = NOW(), cancelled_reason = 'Rescheduled to future date'
WHERE id IN (
  'e69a2a8b-aabe-4fc5-be3b-ff1bfe1a07f9',
  '10cf1f0e-d03a-492f-8499-c5a01d3f53b8'
);

-- Step 6: Mark old composite slot as cancelled
UPDATE composite_interview_slots
SET status = 'cancelled', updated_at = NOW()
WHERE id = '4b7aece7-af3a-4c2a-b5c0-1a932d63bcb3';

-- Step 7: Create additional future availability slots for test reviewer (Jan 22-23)
INSERT INTO interview_slots (id, reviewer_id, start_at, end_at, status, created_at)
VALUES 
  (gen_random_uuid(), '92f72cc0-e7e4-4458-bf36-e89830976f47', 
   '2026-01-22 14:00:00+00', '2026-01-22 15:00:00+00', 'open', NOW()),
  (gen_random_uuid(), '92f72cc0-e7e4-4458-bf36-e89830976f47', 
   '2026-01-23 10:00:00+00', '2026-01-23 11:00:00+00', 'open', NOW());