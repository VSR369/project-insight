-- Step 1: Delete duplicate R7_MP assignment (same person assigned twice as R7_MP on same challenge)
DELETE FROM public.challenge_role_assignments
WHERE id = '260622bd-445d-488d-aff9-e0de255f64f0';

-- Step 2: Enforce unique constraint - same person cannot hold the same role twice on one active challenge
CREATE UNIQUE INDEX idx_unique_active_role_per_member
  ON public.challenge_role_assignments (challenge_id, pool_member_id, role_code)
  WHERE status = 'active';