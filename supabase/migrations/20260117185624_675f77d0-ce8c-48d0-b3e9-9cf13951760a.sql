-- Fix: Link existing interview_slots to composite_interview_slots via backing_slot_ids
-- The individual slots already exist, we just need to reference them

-- Jan 18 @ 10:00 composite slot
UPDATE composite_interview_slots SET backing_slot_ids = ARRAY[
  '11111111-1111-1111-1111-111111111111'::uuid,
  '55555555-5555-5555-5555-555555555555'::uuid
] WHERE id = 'cccc1111-cccc-1111-cccc-111111111111';

-- Jan 18 @ 14:00 composite slot
UPDATE composite_interview_slots SET backing_slot_ids = ARRAY[
  '22222222-2222-2222-2222-222222222222'::uuid,
  '66666666-6666-6666-6666-666666666666'::uuid
] WHERE id = 'cccc2222-cccc-2222-cccc-222222222222';

-- Jan 19 @ 10:00 composite slot
UPDATE composite_interview_slots SET backing_slot_ids = ARRAY[
  '33333333-3333-3333-3333-333333333333'::uuid,
  '77777777-7777-7777-7777-777777777777'::uuid
] WHERE id = 'cccc3333-cccc-3333-cccc-333333333333';

-- Jan 19 @ 14:00 composite slot
UPDATE composite_interview_slots SET backing_slot_ids = ARRAY[
  '44444444-4444-4444-4444-444444444444'::uuid,
  '88888888-8888-8888-8888-888888888888'::uuid
] WHERE id = 'cccc4444-cccc-4444-cccc-444444444444';