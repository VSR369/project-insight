CREATE OR REPLACE FUNCTION trg_seeking_org_admins_primary_domain_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.admin_tier = 'PRIMARY' AND NEW.domain_scope != '"ALL"'::jsonb THEN
    RAISE EXCEPTION 'PRIMARY admin must have domain_scope = ALL (BR-SOA-007)';
  END IF;
  RETURN NEW;
END;
$$;