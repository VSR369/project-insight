-- Create panel_reviewers record for reviewer@test.local
-- Valid values: invitation_status = DRAFT/PENDING/SENT/ACCEPTED/EXPIRED
--               enrollment_source = invitation/self_signup
INSERT INTO public.panel_reviewers (
  user_id,
  email,
  name,
  is_active,
  approval_status,
  invitation_status,
  enrollment_source,
  industry_segment_ids,
  expertise_level_ids,
  created_at,
  updated_at
) VALUES (
  '8314328b-840f-4943-8681-7e34d8a2b25e',
  'reviewer@test.local',
  'Test Reviewer',
  true,
  'approved',
  'ACCEPTED',
  'invitation',
  ARRAY[]::uuid[],
  ARRAY[]::uuid[],
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;