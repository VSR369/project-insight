CREATE OR REPLACE FUNCTION trg_seeking_org_admins_primary_domain_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- For PRIMARY admins, force domain_scope to "ALL"
  IF NEW.admin_tier = 'PRIMARY' THEN
    NEW.domain_scope := '"ALL"'::jsonb;
  END IF;
  RETURN NEW;
END;
$$;