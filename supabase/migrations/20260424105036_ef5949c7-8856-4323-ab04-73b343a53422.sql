-- F2: Org-level audit trigger for primary industry changes.
-- Logs INSERT/UPDATE/DELETE on seeker_org_industries when is_primary changes.
CREATE OR REPLACE FUNCTION public.fn_audit_org_primary_industry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_tenant UUID;
BEGIN
  -- Resolve tenant from the affected row (NEW for INS/UPD, OLD for DEL)
  SELECT tenant_id INTO v_tenant
  FROM public.seeker_organizations
  WHERE id = COALESCE(NEW.organization_id, OLD.organization_id);

  -- Skip if we cannot resolve actor (system/seed contexts) — audit requires changed_by
  IF v_actor IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF (TG_OP = 'INSERT' AND NEW.is_primary = TRUE) THEN
    INSERT INTO public.seeker_organization_audit
      (organization_id, tenant_id, field_name, old_value, new_value, change_reason, changed_by)
    VALUES
      (NEW.organization_id, v_tenant, 'primary_industry_id', NULL, NEW.industry_id::text,
       'Primary industry set on insert', v_actor);

  ELSIF (TG_OP = 'UPDATE' AND COALESCE(OLD.is_primary, FALSE) IS DISTINCT FROM COALESCE(NEW.is_primary, FALSE)) THEN
    INSERT INTO public.seeker_organization_audit
      (organization_id, tenant_id, field_name, old_value, new_value, change_reason, changed_by)
    VALUES
      (NEW.organization_id, v_tenant, 'is_primary_industry',
       CASE WHEN OLD.is_primary THEN NEW.industry_id::text ELSE NULL END,
       CASE WHEN NEW.is_primary THEN NEW.industry_id::text ELSE NULL END,
       'Primary industry flag changed', v_actor);

  ELSIF (TG_OP = 'DELETE' AND OLD.is_primary = TRUE) THEN
    INSERT INTO public.seeker_organization_audit
      (organization_id, tenant_id, field_name, old_value, new_value, change_reason, changed_by)
    VALUES
      (OLD.organization_id, v_tenant, 'primary_industry_id', OLD.industry_id::text, NULL,
       'Primary industry removed', v_actor);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_seeker_org_industries_primary_audit ON public.seeker_org_industries;
CREATE TRIGGER trg_seeker_org_industries_primary_audit
AFTER INSERT OR UPDATE OF is_primary OR DELETE
ON public.seeker_org_industries
FOR EACH ROW
EXECUTE FUNCTION public.fn_audit_org_primary_industry();