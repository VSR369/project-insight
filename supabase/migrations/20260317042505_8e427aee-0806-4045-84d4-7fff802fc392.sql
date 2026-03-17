
-- Function 3: get_phase_required_role
-- Maps each lifecycle phase to the role that must act
CREATE OR REPLACE FUNCTION public.get_phase_required_role(p_phase integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_phase
    WHEN 1  THEN 'AM'
    WHEN 2  THEN 'CR'
    WHEN 3  THEN 'CU'
    WHEN 4  THEN 'ID'
    WHEN 5  THEN 'ID'
    WHEN 6  THEN 'ID'
    WHEN 7  THEN NULL
    WHEN 8  THEN 'ER'
    WHEN 9  THEN 'FC'
    WHEN 10 THEN 'ER'
    WHEN 11 THEN 'ID'
    WHEN 12 THEN 'FC'
    WHEN 13 THEN 'ID'
    ELSE NULL
  END;
$$;

-- Function 4: get_user_all_challenge_roles
-- Returns all challenges and roles for a given user
CREATE OR REPLACE FUNCTION public.get_user_all_challenge_roles(p_user_id uuid)
RETURNS TABLE(
  challenge_id uuid,
  challenge_title text,
  role_codes text[],
  current_phase integer,
  phase_status text,
  master_status text,
  operating_model text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS challenge_id,
    c.title AS challenge_title,
    array_agg(ucr.role_code) AS role_codes,
    c.current_phase,
    c.phase_status,
    c.master_status,
    c.operating_model
  FROM public.user_challenge_roles ucr
  JOIN public.challenges c ON ucr.challenge_id = c.id
  WHERE ucr.user_id = p_user_id
    AND ucr.is_active = true
  GROUP BY c.id, c.title, c.current_phase, c.phase_status, c.master_status, c.operating_model;
$$;
