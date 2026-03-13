
-- org_shadow_pricing: Org-level shadow pricing overrides
CREATE TABLE public.org_shadow_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.md_subscription_tiers(id),
  country_id UUID REFERENCES public.countries(id),
  shadow_charge_per_challenge NUMERIC NOT NULL DEFAULT 0,
  currency_code VARCHAR(5) NOT NULL DEFAULT 'USD',
  currency_symbol VARCHAR(5) NOT NULL DEFAULT '$',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  UNIQUE (organization_id, tier_id, country_id)
);

CREATE INDEX idx_org_shadow_pricing_tenant ON public.org_shadow_pricing(tenant_id);
CREATE INDEX idx_org_shadow_pricing_org_tier_country ON public.org_shadow_pricing(organization_id, tier_id, country_id);

ALTER TABLE public.org_shadow_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_org_shadow_pricing" ON public.org_shadow_pricing
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_insert_org_shadow_pricing" ON public.org_shadow_pricing
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_update_org_shadow_pricing" ON public.org_shadow_pricing
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_delete_org_shadow_pricing" ON public.org_shadow_pricing
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "platform_admin_select_org_shadow_pricing" ON public.org_shadow_pricing
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role));

-- Validation trigger
CREATE OR REPLACE FUNCTION public.trg_org_shadow_pricing_validate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.shadow_charge_per_challenge < 0 THEN
    RAISE EXCEPTION 'shadow_charge_per_challenge must be >= 0';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_org_shadow_pricing_validate_update
  BEFORE UPDATE ON public.org_shadow_pricing
  FOR EACH ROW EXECUTE FUNCTION public.trg_org_shadow_pricing_validate();
