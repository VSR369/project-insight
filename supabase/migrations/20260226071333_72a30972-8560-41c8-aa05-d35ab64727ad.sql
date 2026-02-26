
-- ============================================================
-- org_admin_change_requests: Admin delegation/transfer requests
-- ============================================================
CREATE TABLE IF NOT EXISTS public.org_admin_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  requested_by UUID REFERENCES auth.users(id),
  current_admin_user_id UUID REFERENCES auth.users(id),
  new_admin_name TEXT,
  new_admin_email TEXT NOT NULL,
  new_admin_phone TEXT,
  request_type TEXT NOT NULL CHECK (request_type IN ('registration_delegate', 'post_login_change')),
  lifecycle_status TEXT NOT NULL DEFAULT 'pending' CHECK (lifecycle_status IN ('pending', 'approved', 'rejected', 'cancelled')),
  status_changed_at TIMESTAMPTZ,
  status_changed_by UUID REFERENCES auth.users(id),
  platform_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_admin_change_requests_tenant ON public.org_admin_change_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_org_admin_change_requests_org ON public.org_admin_change_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_admin_change_requests_status ON public.org_admin_change_requests(lifecycle_status, created_at DESC);

-- RLS
ALTER TABLE public.org_admin_change_requests ENABLE ROW LEVEL SECURITY;

-- Anon can insert during registration (unauthenticated flow)
CREATE POLICY "anon_insert_admin_change_requests"
  ON public.org_admin_change_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Authenticated users can read their own org's requests
CREATE POLICY "tenant_read_admin_change_requests"
  ON public.org_admin_change_requests
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT ou.organization_id FROM public.org_users ou WHERE ou.user_id = auth.uid()
    )
  );

-- Authenticated users can insert for their own org
CREATE POLICY "tenant_insert_admin_change_requests"
  ON public.org_admin_change_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT ou.organization_id FROM public.org_users ou WHERE ou.user_id = auth.uid()
    )
  );

-- Platform admins can see and update all
CREATE POLICY "platform_admin_all_admin_change_requests"
  ON public.org_admin_change_requests
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

-- Grant permissions
GRANT SELECT, INSERT ON public.org_admin_change_requests TO anon;
GRANT SELECT, INSERT, UPDATE ON public.org_admin_change_requests TO authenticated;
