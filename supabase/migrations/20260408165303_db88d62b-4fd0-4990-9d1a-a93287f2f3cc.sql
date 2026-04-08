
DROP FUNCTION IF EXISTS public.get_user_all_challenge_roles(uuid);

CREATE FUNCTION public.get_user_all_challenge_roles(p_user_id uuid)
RETURNS TABLE(
  challenge_id uuid,
  challenge_title text,
  current_phase integer,
  master_status text,
  operating_model text,
  phase_status text,
  role_codes text[],
  governance_mode text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id            AS challenge_id,
    c.title         AS challenge_title,
    COALESCE(c.current_phase, 0) AS current_phase,
    COALESCE(c.master_status, 'DRAFT') AS master_status,
    COALESCE(c.operating_model, 'MP') AS operating_model,
    COALESCE(c.phase_status, 'pending') AS phase_status,
    ARRAY_AGG(DISTINCT ucr.role_code ORDER BY ucr.role_code) AS role_codes,
    COALESCE(c.governance_mode_override, c.governance_profile, 'STRUCTURED') AS governance_mode
  FROM user_challenge_roles ucr
  JOIN challenges c ON c.id = ucr.challenge_id
  WHERE ucr.user_id = p_user_id
    AND ucr.is_active = true
    AND c.is_deleted = false
  GROUP BY c.id, c.title, c.current_phase, c.master_status, c.operating_model, c.phase_status, c.governance_mode_override, c.governance_profile
$$;
