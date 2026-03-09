-- 1. Security-definer helper to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_primary_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.seeking_org_admins
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND admin_tier = 'PRIMARY'
      AND status = 'active'
  );
$$;

-- 2. Primary admin can VIEW all admins in their org
CREATE POLICY "Primary admin can view org admins"
ON public.seeking_org_admins
FOR SELECT
TO authenticated
USING (public.is_primary_org_admin(organization_id));

-- 3. Primary admin can CREATE delegated admins in their org
CREATE POLICY "Primary admin can create delegated admins"
ON public.seeking_org_admins
FOR INSERT
TO authenticated
WITH CHECK (
  admin_tier = 'DELEGATED'
  AND public.is_primary_org_admin(organization_id)
);

-- 4. Primary admin can UPDATE delegated admins in their org
CREATE POLICY "Primary admin can update delegated admins"
ON public.seeking_org_admins
FOR UPDATE
TO authenticated
USING (
  admin_tier = 'DELEGATED'
  AND public.is_primary_org_admin(organization_id)
);

-- 5. Primary admin can create activation links for their org's admins
CREATE POLICY "Primary admin can create activation links"
ON public.admin_activation_links
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.seeking_org_admins sa
    WHERE sa.id = admin_id
      AND public.is_primary_org_admin(sa.organization_id)
  )
);

-- 6. Primary admin can also write to org_state_audit_log for their org
CREATE POLICY "Primary admin can write audit log"
ON public.org_state_audit_log
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_primary_org_admin(organization_id)
);