-- Drop existing function with old parameter name
DROP FUNCTION IF EXISTS public.get_phase_required_role(integer);

-- Recreate with updated role mappings
CREATE OR REPLACE FUNCTION public.get_phase_required_role(phase_number integer)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE phase_number
    WHEN 1 THEN 'CR'
    WHEN 2 THEN 'CR'
    WHEN 3 THEN 'CU'
    WHEN 4 THEN 'CU'
    WHEN 5 THEN 'CU'
    WHEN 6 THEN 'CU'
    WHEN 11 THEN 'CU'
    WHEN 13 THEN 'CU'
    ELSE 'UNKNOWN'
  END;
$$;

-- Helper: normalize any role code (legacy or current) to its canonical form
CREATE OR REPLACE FUNCTION public.normalize_role_code(code text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE code
    WHEN 'AM' THEN 'CR'
    WHEN 'RQ' THEN 'CR'
    WHEN 'CA' THEN 'CR'
    WHEN 'ID' THEN 'CU'
    ELSE code
  END;
$$;

-- Update roles_equivalent to use the normalizer for legacy compatibility
DROP FUNCTION IF EXISTS public.roles_equivalent(text, text);
CREATE OR REPLACE FUNCTION public.roles_equivalent(role_a text, role_b text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.normalize_role_code(role_a) = public.normalize_role_code(role_b);
$$;