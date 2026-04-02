-- Step 1: Fix governance_mode_override on the 3 affected challenges
UPDATE challenges
SET governance_mode_override = 'CONTROLLED',
    updated_at = now()
WHERE id IN (
  '0f5d6315-3423-4aed-a8c5-cf3e5483d132',
  '256477ec-3a37-4c2f-a9de-d40eb5f6f582',
  '170e577a-a992-41a3-bfc7-2b2919c97236'
)
AND governance_mode_override = 'QUICK';

-- Step 2: Remove non-CR roles from Creator (CONTROLLED = role separation)
DELETE FROM user_challenge_roles
WHERE user_id = '376d7eb8-ce4f-48bd-ac35-4a666756af69'
  AND challenge_id IN (
    '0f5d6315-3423-4aed-a8c5-cf3e5483d132',
    '256477ec-3a37-4c2f-a9de-d40eb5f6f582',
    '170e577a-a992-41a3-bfc7-2b2919c97236'
  )
  AND role_code IN ('CU', 'ER', 'LC', 'FC');