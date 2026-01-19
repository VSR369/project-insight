-- Assign Test Reviewer to the existing booking for Test Provider (Manufacturing)
INSERT INTO public.booking_reviewers (
  reviewer_id,
  booking_id,
  slot_id,
  status,
  created_at
)
VALUES (
  '92f72cc0-e7e4-4458-bf36-e89830976f47',
  '19258cf0-77ba-40af-8b0c-1e5433c0e1aa',
  'aacc5a99-3766-4fb2-b2e9-032c43a27ae3',
  'assigned',
  NOW()
)
ON CONFLICT DO NOTHING;

-- Update the slot to booked status
UPDATE public.interview_slots
SET status = 'booked', updated_at = NOW()
WHERE id = 'aacc5a99-3766-4fb2-b2e9-032c43a27ae3';

-- Add clarification flag and reviewer notes for Action Required widget
UPDATE public.interview_bookings
SET 
  flag_for_clarification = TRUE,
  reviewer_notes = 'Please verify proof points for cloud migration project - need additional documentation.',
  updated_at = NOW()
WHERE id = '19258cf0-77ba-40af-8b0c-1e5433c0e1aa';