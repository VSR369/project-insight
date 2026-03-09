-- Phase 1: SOA Module — domain_scope migration + config params + activation link fields

-- 1. Drop existing default, alter to JSONB, set new default
ALTER TABLE public.seeking_org_admins ALTER COLUMN domain_scope DROP DEFAULT;
ALTER TABLE public.seeking_org_admins ALTER COLUMN domain_scope TYPE JSONB USING domain_scope::jsonb;
ALTER TABLE public.seeking_org_admins ALTER COLUMN domain_scope SET DEFAULT '{}'::jsonb;

-- 2. Add missing fields to seeking_org_admins for delegated admin support
ALTER TABLE public.seeking_org_admins
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT;

-- 3. Add used_at to admin_activation_links for tracking
ALTER TABLE public.admin_activation_links
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

-- 4. Insert SOA config params into md_mpa_config
INSERT INTO public.md_mpa_config (param_key, param_value, description, param_type, param_group, label, is_critical, requires_restart)
VALUES 
  ('activation_link_expiry_hours', '72', 'Hours before activation link expires', 'INTEGER', 'soa_provisioning', 'Activation Link Expiry (hours)', false, false),
  ('max_delegated_admins_per_org', '5', 'Maximum delegated admins allowed per organization', 'INTEGER', 'soa_provisioning', 'Max Delegated Admins Per Org', false, false)
ON CONFLICT (param_key) DO NOTHING;

-- 5. Add indexes
CREATE INDEX IF NOT EXISTS idx_seeking_org_admins_org_tier ON public.seeking_org_admins(organization_id, admin_tier);
CREATE INDEX IF NOT EXISTS idx_seeking_org_admins_email ON public.seeking_org_admins(email);
CREATE INDEX IF NOT EXISTS idx_admin_activation_links_token ON public.admin_activation_links(token);
CREATE INDEX IF NOT EXISTS idx_admin_activation_links_admin_status ON public.admin_activation_links(admin_id, status);