-- Convert CA → CR where no CR already exists for same user+challenge
UPDATE public.user_challenge_roles
SET role_code = 'CR'
WHERE role_code = 'CA' AND is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.user_challenge_roles ucr2
    WHERE ucr2.user_id = user_challenge_roles.user_id
      AND ucr2.challenge_id = user_challenge_roles.challenge_id
      AND ucr2.role_code = 'CR' AND ucr2.is_active = true
  );

-- Deactivate remaining CA rows (duplicates where CR already existed)
UPDATE public.user_challenge_roles
SET is_active = false
WHERE role_code = 'CA' AND is_active = true;