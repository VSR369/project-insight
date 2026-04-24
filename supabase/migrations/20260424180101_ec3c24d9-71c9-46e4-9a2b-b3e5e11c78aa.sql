-- ============================================================================
-- Harden RLS on org-level configuration tables to PRIMARY Seeking Org Admin
-- ============================================================================

-- 1. Helper: active PRIMARY Seeking Org Admin for the given organization.
CREATE OR REPLACE FUNCTION public.is_primary_seeking_admin(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.seeking_org_admins
    WHERE user_id = p_user_id
      AND organization_id = p_organization_id
      AND admin_tier = 'PRIMARY'
      AND status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_primary_seeking_admin(UUID, UUID)
  TO authenticated;

COMMENT ON FUNCTION public.is_primary_seeking_admin(UUID, UUID) IS
  'Returns true when the caller is the active PRIMARY Seeking Org Admin for the given organization. Used by RLS to gate sensitive org-level configuration mutations.';

-- 2. Helper: legacy fallback — pre-SO-Admin org owner.
CREATE OR REPLACE FUNCTION public.is_legacy_org_owner(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_users ou
    WHERE ou.user_id = p_user_id
      AND ou.organization_id = p_tenant_id
      AND ou.is_active = true
      AND ou.role = 'owner'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_legacy_org_owner(UUID, UUID)
  TO authenticated;

COMMENT ON FUNCTION public.is_legacy_org_owner(UUID, UUID) IS
  'Back-compat fallback: legacy org_users.role=owner. Used alongside is_primary_seeking_admin so existing owners are not locked out before tier migration.';

-- 3. org_legal_document_templates: PRIMARY-only mutations.
DROP POLICY IF EXISTS "Org admins can manage legal templates"
  ON public.org_legal_document_templates;

CREATE POLICY "Primary admin can manage legal templates"
  ON public.org_legal_document_templates
  FOR ALL
  USING (
    public.is_primary_seeking_admin(auth.uid(), organization_id)
    OR public.is_legacy_org_owner(auth.uid(), tenant_id)
  )
  WITH CHECK (
    public.is_primary_seeking_admin(auth.uid(), organization_id)
    OR public.is_legacy_org_owner(auth.uid(), tenant_id)
  );

-- 4. org_finance_config: PRIMARY-only mutations.
DROP POLICY IF EXISTS "Org admins can manage finance config"
  ON public.org_finance_config;

CREATE POLICY "Primary admin can manage finance config"
  ON public.org_finance_config
  FOR ALL
  USING (
    public.is_primary_seeking_admin(auth.uid(), organization_id)
    OR public.is_legacy_org_owner(auth.uid(), tenant_id)
  )
  WITH CHECK (
    public.is_primary_seeking_admin(auth.uid(), organization_id)
    OR public.is_legacy_org_owner(auth.uid(), tenant_id)
  );

-- 5. org_compliance_config: PRIMARY-only mutations.
DROP POLICY IF EXISTS "Org admins can manage compliance config"
  ON public.org_compliance_config;

CREATE POLICY "Primary admin can manage compliance config"
  ON public.org_compliance_config
  FOR ALL
  USING (
    public.is_primary_seeking_admin(auth.uid(), organization_id)
    OR public.is_legacy_org_owner(auth.uid(), tenant_id)
  )
  WITH CHECK (
    public.is_primary_seeking_admin(auth.uid(), organization_id)
    OR public.is_legacy_org_owner(auth.uid(), tenant_id)
  );

-- 6. org_custom_fields: PRIMARY-only mutations.
DROP POLICY IF EXISTS "Org admins can manage custom fields"
  ON public.org_custom_fields;

CREATE POLICY "Primary admin can manage custom fields"
  ON public.org_custom_fields
  FOR ALL
  USING (
    public.is_primary_seeking_admin(auth.uid(), organization_id)
    OR public.is_legacy_org_owner(auth.uid(), tenant_id)
  )
  WITH CHECK (
    public.is_primary_seeking_admin(auth.uid(), organization_id)
    OR public.is_legacy_org_owner(auth.uid(), tenant_id)
  );