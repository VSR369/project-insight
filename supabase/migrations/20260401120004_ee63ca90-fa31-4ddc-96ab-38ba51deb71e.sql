DROP FUNCTION IF EXISTS public.get_phase_required_role(INTEGER);

CREATE FUNCTION public.get_phase_required_role(p_phase INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN CASE p_phase
    WHEN 1  THEN 'CR'
    WHEN 2  THEN 'CR'
    WHEN 3  THEN 'CU'
    WHEN 4  THEN 'CU'
    WHEN 5  THEN 'CU'
    WHEN 6  THEN 'LC'
    WHEN 7  THEN 'FC'
    WHEN 8  THEN 'CU'
    WHEN 9  THEN 'ER'
    WHEN 10 THEN 'ER'
    WHEN 11 THEN 'CR'
    WHEN 12 THEN 'FC'
    WHEN 13 THEN 'CR'
    ELSE 'UNKNOWN'
  END;
END;
$$;