
-- Insert seed challenge_role_assignments using the single existing pool member
-- Pool member: 3b8b2405-9f58-435d-9e28-e96fb2302e8f (has all 4 role codes)
-- Challenge 1 (Green Energy): full team (5 assignments)
-- Challenge 2 (AI Supply Chain): partial team (3 assignments)  
-- Challenge 3 (Patient Engagement): no assignments (pending)

INSERT INTO public.challenge_role_assignments (challenge_id, pool_member_id, role_code, status, assigned_at)
VALUES
  -- Challenge 1: Full team
  ('76369053-f682-408f-b921-e62bcf9547b9', '3b8b2405-9f58-435d-9e28-e96fb2302e8f', 'R3', 'active', NOW() - INTERVAL '4 days'),
  ('76369053-f682-408f-b921-e62bcf9547b9', '3b8b2405-9f58-435d-9e28-e96fb2302e8f', 'R5_MP', 'active', NOW() - INTERVAL '4 days'),
  ('76369053-f682-408f-b921-e62bcf9547b9', '3b8b2405-9f58-435d-9e28-e96fb2302e8f', 'R6_MP', 'active', NOW() - INTERVAL '4 days'),
  ('76369053-f682-408f-b921-e62bcf9547b9', '3b8b2405-9f58-435d-9e28-e96fb2302e8f', 'R7_MP', 'active', NOW() - INTERVAL '4 days'),
  ('76369053-f682-408f-b921-e62bcf9547b9', '3b8b2405-9f58-435d-9e28-e96fb2302e8f', 'R7_MP', 'active', NOW() - INTERVAL '4 days'),
  -- Challenge 2: Partial team
  ('ca6d23c0-588d-4f8f-ab95-4e67632445fa', '3b8b2405-9f58-435d-9e28-e96fb2302e8f', 'R3', 'active', NOW() - INTERVAL '2 days'),
  ('ca6d23c0-588d-4f8f-ab95-4e67632445fa', '3b8b2405-9f58-435d-9e28-e96fb2302e8f', 'R5_MP', 'active', NOW() - INTERVAL '2 days'),
  ('ca6d23c0-588d-4f8f-ab95-4e67632445fa', '3b8b2405-9f58-435d-9e28-e96fb2302e8f', 'R6_MP', 'active', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;
