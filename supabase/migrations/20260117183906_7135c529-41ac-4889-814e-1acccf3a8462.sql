
-- Insert quorum requirements with valid UUIDs
INSERT INTO interview_quorum_requirements (id, expertise_level_id, industry_segment_id, required_quorum_count, interview_duration_minutes, is_active)
VALUES 
  ('01234567-89ab-cdef-0123-456789abcde1', '7e198535-0774-4f72-a36a-11fa7cb0fc04', '41ee5438-f270-488c-aae1-b46c120bc276', 2, 60, true),
  ('01234567-89ab-cdef-0123-456789abcde2', '2046b071-dc36-4265-b40d-4f8d62cd408f', '41ee5438-f270-488c-aae1-b46c120bc276', 2, 60, true)
ON CONFLICT (id) DO NOTHING;
