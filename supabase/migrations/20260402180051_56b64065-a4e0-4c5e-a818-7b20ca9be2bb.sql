-- Backfill missing QUICK-mode roles for 3 existing challenges
-- The Creator (376d7eb8-...) already has CR; add CU, ER, LC, FC
INSERT INTO public.user_challenge_roles (user_id, challenge_id, role_code, is_active, auto_assigned)
VALUES
  -- Challenge 170e577a (phase 3)
  ('376d7eb8-ce4f-48bd-ac35-4a666756af69', '170e577a-a992-41a3-bfc7-2b2919c97236', 'CU', true, true),
  ('376d7eb8-ce4f-48bd-ac35-4a666756af69', '170e577a-a992-41a3-bfc7-2b2919c97236', 'ER', true, true),
  ('376d7eb8-ce4f-48bd-ac35-4a666756af69', '170e577a-a992-41a3-bfc7-2b2919c97236', 'LC', true, true),
  ('376d7eb8-ce4f-48bd-ac35-4a666756af69', '170e577a-a992-41a3-bfc7-2b2919c97236', 'FC', true, true),
  -- Challenge 0f5d6315 (phase 3)
  ('376d7eb8-ce4f-48bd-ac35-4a666756af69', '0f5d6315-3423-4aed-a8c5-cf3e5483d132', 'CU', true, true),
  ('376d7eb8-ce4f-48bd-ac35-4a666756af69', '0f5d6315-3423-4aed-a8c5-cf3e5483d132', 'ER', true, true),
  ('376d7eb8-ce4f-48bd-ac35-4a666756af69', '0f5d6315-3423-4aed-a8c5-cf3e5483d132', 'LC', true, true),
  ('376d7eb8-ce4f-48bd-ac35-4a666756af69', '0f5d6315-3423-4aed-a8c5-cf3e5483d132', 'FC', true, true),
  -- Challenge 256477ec (phase 1)
  ('376d7eb8-ce4f-48bd-ac35-4a666756af69', '256477ec-3a37-4c2f-a9de-d40eb5f6f582', 'CU', true, true),
  ('376d7eb8-ce4f-48bd-ac35-4a666756af69', '256477ec-3a37-4c2f-a9de-d40eb5f6f582', 'ER', true, true),
  ('376d7eb8-ce4f-48bd-ac35-4a666756af69', '256477ec-3a37-4c2f-a9de-d40eb5f6f582', 'LC', true, true),
  ('376d7eb8-ce4f-48bd-ac35-4a666756af69', '256477ec-3a37-4c2f-a9de-d40eb5f6f582', 'FC', true, true)
ON CONFLICT DO NOTHING;