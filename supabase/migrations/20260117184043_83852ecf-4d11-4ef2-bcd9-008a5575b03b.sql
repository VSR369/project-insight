
-- Insert test panel reviewers
INSERT INTO panel_reviewers (id, name, email, expertise_level_ids, industry_segment_ids, is_active)
VALUES 
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Dr. Sarah Chen', 'sarah.chen@test.com', 
   ARRAY['7e198535-0774-4f72-a36a-11fa7cb0fc04'::uuid, '2046b071-dc36-4265-b40d-4f8d62cd408f'::uuid],
   ARRAY['41ee5438-f270-488c-aae1-b46c120bc276'::uuid, '853821a3-5c45-42cf-b035-3f8609e025dc'::uuid],
   true),
  ('b2c3d4e5-f678-90ab-cdef-123456789012', 'James Wilson', 'james.wilson@test.com',
   ARRAY['7e198535-0774-4f72-a36a-11fa7cb0fc04'::uuid, '2046b071-dc36-4265-b40d-4f8d62cd408f'::uuid],
   ARRAY['41ee5438-f270-488c-aae1-b46c120bc276'::uuid, '853821a3-5c45-42cf-b035-3f8609e025dc'::uuid],
   true)
ON CONFLICT (id) DO NOTHING;

-- Insert individual interview slots (status = 'open')
INSERT INTO interview_slots (id, reviewer_id, start_at, end_at, status)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 
   (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '10 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '11 hours')::timestamptz, 'open'),
  ('22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '14 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '15 hours')::timestamptz, 'open'),
  ('33333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   (CURRENT_DATE + INTERVAL '2 days' + INTERVAL '10 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '2 days' + INTERVAL '11 hours')::timestamptz, 'open'),
  ('44444444-4444-4444-4444-444444444444', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   (CURRENT_DATE + INTERVAL '2 days' + INTERVAL '14 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '2 days' + INTERVAL '15 hours')::timestamptz, 'open'),
  ('55555555-5555-5555-5555-555555555555', 'b2c3d4e5-f678-90ab-cdef-123456789012',
   (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '10 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '11 hours')::timestamptz, 'open'),
  ('66666666-6666-6666-6666-666666666666', 'b2c3d4e5-f678-90ab-cdef-123456789012',
   (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '14 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '15 hours')::timestamptz, 'open'),
  ('77777777-7777-7777-7777-777777777777', 'b2c3d4e5-f678-90ab-cdef-123456789012',
   (CURRENT_DATE + INTERVAL '2 days' + INTERVAL '10 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '2 days' + INTERVAL '11 hours')::timestamptz, 'open'),
  ('88888888-8888-8888-8888-888888888888', 'b2c3d4e5-f678-90ab-cdef-123456789012',
   (CURRENT_DATE + INTERVAL '2 days' + INTERVAL '14 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '2 days' + INTERVAL '15 hours')::timestamptz, 'open')
ON CONFLICT (id) DO NOTHING;

-- Insert composite slots (status = 'open')
INSERT INTO composite_interview_slots (id, start_at, end_at, expertise_level_id, industry_segment_id, available_reviewer_count, backing_slot_ids, status)
VALUES 
  ('aaaa1111-aaaa-1111-aaaa-111111111111',
   (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '10 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '11 hours')::timestamptz,
   '7e198535-0774-4f72-a36a-11fa7cb0fc04', '41ee5438-f270-488c-aae1-b46c120bc276',
   2, ARRAY['11111111-1111-1111-1111-111111111111'::uuid, '55555555-5555-5555-5555-555555555555'::uuid], 'open'),
  ('aaaa2222-aaaa-2222-aaaa-222222222222',
   (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '14 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '15 hours')::timestamptz,
   '7e198535-0774-4f72-a36a-11fa7cb0fc04', '41ee5438-f270-488c-aae1-b46c120bc276',
   2, ARRAY['22222222-2222-2222-2222-222222222222'::uuid, '66666666-6666-6666-6666-666666666666'::uuid], 'open'),
  ('aaaa3333-aaaa-3333-aaaa-333333333333',
   (CURRENT_DATE + INTERVAL '2 days' + INTERVAL '10 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '2 days' + INTERVAL '11 hours')::timestamptz,
   '7e198535-0774-4f72-a36a-11fa7cb0fc04', '41ee5438-f270-488c-aae1-b46c120bc276',
   2, ARRAY['33333333-3333-3333-3333-333333333333'::uuid, '77777777-7777-7777-7777-777777777777'::uuid], 'open'),
  ('aaaa4444-aaaa-4444-aaaa-444444444444',
   (CURRENT_DATE + INTERVAL '2 days' + INTERVAL '14 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '2 days' + INTERVAL '15 hours')::timestamptz,
   '7e198535-0774-4f72-a36a-11fa7cb0fc04', '41ee5438-f270-488c-aae1-b46c120bc276',
   2, ARRAY['44444444-4444-4444-4444-444444444444'::uuid, '88888888-8888-8888-8888-888888888888'::uuid], 'open'),
  ('bbbb1111-bbbb-1111-bbbb-111111111111',
   (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '10 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '11 hours')::timestamptz,
   '2046b071-dc36-4265-b40d-4f8d62cd408f', '41ee5438-f270-488c-aae1-b46c120bc276',
   2, ARRAY['11111111-1111-1111-1111-111111111111'::uuid, '55555555-5555-5555-5555-555555555555'::uuid], 'open'),
  ('bbbb2222-bbbb-2222-bbbb-222222222222',
   (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '14 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '1 day' + INTERVAL '15 hours')::timestamptz,
   '2046b071-dc36-4265-b40d-4f8d62cd408f', '41ee5438-f270-488c-aae1-b46c120bc276',
   2, ARRAY['22222222-2222-2222-2222-222222222222'::uuid, '66666666-6666-6666-6666-666666666666'::uuid], 'open')
ON CONFLICT (id) DO NOTHING;
