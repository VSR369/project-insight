-- =============================================
-- vip_invitations: Add spec-required columns
-- =============================================

ALTER TABLE public.vip_invitations
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS invitation_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  ADD COLUMN IF NOT EXISTS invitee_email TEXT,
  ADD COLUMN IF NOT EXISTS invitee_name TEXT,
  ADD COLUMN IF NOT EXISTS industry_segment_id UUID REFERENCES public.industry_segments(id),
  ADD COLUMN IF NOT EXISTS personal_message TEXT,
  ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.solution_providers(id);

-- Migrate data from old columns to new
UPDATE public.vip_invitations SET invitee_email = email WHERE invitee_email IS NULL AND email IS NOT NULL;
UPDATE public.vip_invitations SET invitee_name = invited_name WHERE invitee_name IS NULL AND invited_name IS NOT NULL;
UPDATE public.vip_invitations SET invitation_token = token WHERE invitation_token IS NULL AND token IS NOT NULL;
UPDATE public.vip_invitations SET provider_id = accepted_by WHERE provider_id IS NULL AND accepted_by IS NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_vip_invitations_tenant ON public.vip_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vip_invitations_token ON public.vip_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_vip_invitations_industry ON public.vip_invitations(industry_segment_id);

-- RLS for vip_invitations (tenant-scoped)
DROP POLICY IF EXISTS "vip_invitations_select" ON public.vip_invitations;
CREATE POLICY "vip_invitations_select" ON public.vip_invitations
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "vip_invitations_insert" ON public.vip_invitations;
CREATE POLICY "vip_invitations_insert" ON public.vip_invitations
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "vip_invitations_update" ON public.vip_invitations;
CREATE POLICY "vip_invitations_update" ON public.vip_invitations
  FOR UPDATE TO authenticated
  USING (invited_by = auth.uid() OR accepted_by = auth.uid());

-- =============================================
-- provider_org_details: Add spec-required columns
-- =============================================

ALTER TABLE public.provider_org_details
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS org_type TEXT,
  ADD COLUMN IF NOT EXISTS org_website TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS manager_phone TEXT,
  ADD COLUMN IF NOT EXISTS manager_approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (manager_approval_status IN ('pending', 'approved', 'declined', 'expired', 'withdrawn'));

-- Migrate boolean to text status
UPDATE public.provider_org_details 
  SET manager_approval_status = CASE 
    WHEN manager_approved = true THEN 'approved' 
    ELSE 'pending' 
  END
  WHERE manager_approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_provider_org_details_tenant ON public.provider_org_details(tenant_id);
CREATE INDEX IF NOT EXISTS idx_provider_org_details_status ON public.provider_org_details(manager_approval_status);

-- =============================================
-- community_posts: Add spec-required columns
-- =============================================

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS tenant_id UUID,
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.community_posts(id);

CREATE INDEX IF NOT EXISTS idx_community_posts_tenant ON public.community_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_parent ON public.community_posts(parent_id);

-- RLS for community_posts (tenant-scoped)
DROP POLICY IF EXISTS "community_posts_select" ON public.community_posts;
CREATE POLICY "community_posts_select" ON public.community_posts
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "community_posts_insert" ON public.community_posts;
CREATE POLICY "community_posts_insert" ON public.community_posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "community_posts_update" ON public.community_posts;
CREATE POLICY "community_posts_update" ON public.community_posts
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);
