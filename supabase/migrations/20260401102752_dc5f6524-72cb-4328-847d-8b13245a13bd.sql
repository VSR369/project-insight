
-- Drop and recreate with correct parameter name
DROP FUNCTION IF EXISTS public.get_phase_required_role(integer);

CREATE FUNCTION public.get_phase_required_role(p_phase INTEGER)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE p_phase
    WHEN 1 THEN 'CR'
    WHEN 2 THEN 'CR'
    WHEN 3 THEN 'CU'
    WHEN 4 THEN 'CU'
    WHEN 5 THEN 'CU'
    WHEN 6 THEN 'LC'
    WHEN 7 THEN 'FC'
    WHEN 8 THEN 'CU'
    WHEN 9 THEN 'ER'
    WHEN 10 THEN 'ER'
    WHEN 11 THEN 'CU'
    WHEN 12 THEN 'FC'
    WHEN 13 THEN 'CU'
    ELSE 'CR'
  END;
$$;

-- Drop and recreate roles_equivalent
DROP FUNCTION IF EXISTS public.roles_equivalent(text, text);

CREATE FUNCTION public.roles_equivalent(p_role1 TEXT, p_role2 TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    CASE
      WHEN p_role1 IN ('AM', 'RQ', 'CA') THEN 'CR'
      WHEN p_role1 = 'ID' THEN 'CU'
      ELSE p_role1
    END
  ) = (
    CASE
      WHEN p_role2 IN ('AM', 'RQ', 'CA') THEN 'CR'
      WHEN p_role2 = 'ID' THEN 'CU'
      ELSE p_role2
    END
  );
$$;
