-- Insert composite interview slots for Manufacturing (Auto Components) industry segment
INSERT INTO composite_interview_slots (
  id, expertise_level_id, industry_segment_id, 
  start_at, end_at, available_reviewer_count, status
)
VALUES 
  -- Jan 18 @ 10:00 AM UTC
  ('cccc1111-cccc-1111-cccc-111111111111', 
   '7e198535-0774-4f72-a36a-11fa7cb0fc04', 
   'a333531e-8a60-4682-87df-a9fdc617a232',
   '2026-01-18 10:00:00+00', '2026-01-18 11:00:00+00', 2, 'open'),
  -- Jan 18 @ 2:00 PM UTC
  ('cccc2222-cccc-2222-cccc-222222222222', 
   '7e198535-0774-4f72-a36a-11fa7cb0fc04', 
   'a333531e-8a60-4682-87df-a9fdc617a232',
   '2026-01-18 14:00:00+00', '2026-01-18 15:00:00+00', 2, 'open'),
  -- Jan 19 @ 10:00 AM UTC
  ('cccc3333-cccc-3333-cccc-333333333333', 
   '7e198535-0774-4f72-a36a-11fa7cb0fc04', 
   'a333531e-8a60-4682-87df-a9fdc617a232',
   '2026-01-19 10:00:00+00', '2026-01-19 11:00:00+00', 2, 'open'),
  -- Jan 19 @ 2:00 PM UTC
  ('cccc4444-cccc-4444-cccc-444444444444', 
   '7e198535-0774-4f72-a36a-11fa7cb0fc04', 
   'a333531e-8a60-4682-87df-a9fdc617a232',
   '2026-01-19 14:00:00+00', '2026-01-19 15:00:00+00', 2, 'open');