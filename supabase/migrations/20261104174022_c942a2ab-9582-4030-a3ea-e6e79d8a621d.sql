DO $$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.assemble_role_doc(uuid,text,uuid,text)'::regprocedure);
  IF position('WHERE false;' in d) = 0 THEN
    d := replace(d, '  -- 2. Org context', E'  SELECT * INTO v_org FROM public.seeker_organizations WHERE false;\n  -- 2. Org context');
    EXECUTE d;
  END IF;
END $$;