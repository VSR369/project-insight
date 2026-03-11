
-- ============================================================================
-- RBAC Role Management: Schema Extension & New Tables
-- ============================================================================

-- 1a. Extend md_slm_role_codes with new columns
ALTER TABLE public.md_slm_role_codes
  ADD COLUMN IF NOT EXISTS model_applicability TEXT NOT NULL DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS is_core BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_required INTEGER NOT NULL DEFAULT 1;

-- Update existing MP roles
UPDATE public.md_slm_role_codes SET model_applicability = 'mp', is_core = false WHERE code IN ('R3', 'R5_MP', 'R6_MP', 'R7_MP');

-- Insert core roles (R2, R8, R9)
INSERT INTO public.md_slm_role_codes (code, display_name, description, display_order, is_active, model_applicability, is_core, min_required)
VALUES
  ('R2', 'Seeking Org Admin', 'Primary administrator for the seeking organization', 1, true, 'both', true, 1),
  ('R8', 'Finance Controller', 'Manages financial governance and billing approvals', 2, true, 'both', true, 1),
  ('R9', 'Compliance Officer', 'Ensures regulatory and policy compliance', 3, true, 'both', true, 1)
ON CONFLICT (code) DO NOTHING;

-- Insert AGG challenge roles (R4, R5_AGG, R6_AGG, R7_AGG)
INSERT INTO public.md_slm_role_codes (code, display_name, description, display_order, is_active, model_applicability, is_core, min_required)
VALUES
  ('R4', 'Aggregator Lead', 'Leads aggregator model engagements', 10, true, 'agg', false, 1),
  ('R5_AGG', 'Challenge Curator/AGG', 'Curates challenges for aggregator model', 11, true, 'agg', false, 1),
  ('R6_AGG', 'Innovation Director/AGG', 'Directs innovation for aggregator model', 12, true, 'agg', false, 1),
  ('R7_AGG', 'Expert Reviewer/AGG', 'Reviews solutions for aggregator model', 13, true, 'agg', false, 1)
ON CONFLICT (code) DO NOTHING;

-- Add unique constraint on code if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'md_slm_role_codes_code_key') THEN
    ALTER TABLE public.md_slm_role_codes ADD CONSTRAINT md_slm_role_codes_code_key UNIQUE (code);
  END IF;
END $$;

-- 1b. Create md_role_assignment_statuses master data table
CREATE TABLE IF NOT EXISTS public.md_role_assignment_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  color_class TEXT,
  display_order INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

INSERT INTO public.md_role_assignment_statuses (code, display_name, color_class, display_order)
VALUES
  ('invited', 'Invited', 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', 1),
  ('active', 'Active', 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', 2),
  ('inactive', 'Inactive', 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', 3),
  ('suspended', 'Suspended', 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', 4),
  ('expired', 'Expired', 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', 5)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.md_role_assignment_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read role assignment statuses" ON public.md_role_assignment_statuses
  FOR SELECT TO authenticated USING (true);

-- 1c. Create role_assignments table
CREATE TABLE IF NOT EXISTS public.role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.seeker_organizations(id) ON DELETE CASCADE,
  role_code TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'invited',
  domain_tags JSONB DEFAULT '{}',
  model_applicability TEXT NOT NULL DEFAULT 'both',
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_role_assignments_org_role_status ON public.role_assignments (org_id, role_code, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_role_assignments_unique_active ON public.role_assignments (org_id, role_code, user_email)
  WHERE status IN ('invited', 'active');

ALTER TABLE public.role_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read role assignments" ON public.role_assignments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert role assignments" ON public.role_assignments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update role assignments" ON public.role_assignments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 1d. Create role_readiness_cache table
CREATE TABLE IF NOT EXISTS public.role_readiness_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.seeker_organizations(id) ON DELETE CASCADE,
  engagement_model TEXT NOT NULL,
  overall_status TEXT NOT NULL DEFAULT 'not_ready',
  missing_roles TEXT[] DEFAULT '{}',
  total_required INTEGER DEFAULT 0,
  total_filled INTEGER DEFAULT 0,
  responsible_admin_contact JSONB DEFAULT '{}',
  last_computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE (org_id, engagement_model)
);

ALTER TABLE public.role_readiness_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read role readiness" ON public.role_readiness_cache
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage role readiness" ON public.role_readiness_cache
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 1e. Create rbac_admin_contact table
CREATE TABLE IF NOT EXISTS public.rbac_admin_contact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_intl TEXT,
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.rbac_admin_contact ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read admin contact" ON public.rbac_admin_contact
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage admin contact" ON public.rbac_admin_contact
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 1f. Create md_rbac_msme_config table
CREATE TABLE IF NOT EXISTS public.md_rbac_msme_config (
  org_id UUID PRIMARY KEY REFERENCES public.seeker_organizations(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  enabled_by UUID REFERENCES auth.users(id),
  enabled_at TIMESTAMPTZ
);

ALTER TABLE public.md_rbac_msme_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read msme config" ON public.md_rbac_msme_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage msme config" ON public.md_rbac_msme_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 1g. Add org_id to role_audit_log
ALTER TABLE public.role_audit_log ADD COLUMN IF NOT EXISTS org_id UUID;

-- 1h. Trigger: Recompute role_readiness_cache on role_assignments changes
CREATE OR REPLACE FUNCTION public.fn_recompute_role_readiness()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_model TEXT;
  v_admin_contact JSONB;
BEGIN
  -- Determine affected org_id
  v_org_id := COALESCE(NEW.org_id, OLD.org_id);

  -- Get admin contact
  SELECT jsonb_build_object('name', ac.name, 'email', ac.email, 'phone_intl', ac.phone_intl)
  INTO v_admin_contact
  FROM public.rbac_admin_contact ac
  LIMIT 1;

  v_admin_contact := COALESCE(v_admin_contact, '{}'::jsonb);

  -- Recompute for each engagement model
  FOR v_model IN SELECT DISTINCT unnest(ARRAY['mp', 'agg']) LOOP
    INSERT INTO public.role_readiness_cache (org_id, engagement_model, overall_status, missing_roles, total_required, total_filled, responsible_admin_contact, last_computed_at, updated_at)
    SELECT
      v_org_id,
      v_model,
      CASE WHEN COUNT(*) FILTER (WHERE ra_count = 0) = 0 THEN 'ready' ELSE 'not_ready' END,
      ARRAY_AGG(r.code) FILTER (WHERE ra_count = 0),
      COUNT(*)::int,
      COUNT(*) FILTER (WHERE ra_count > 0)::int,
      v_admin_contact,
      NOW(),
      NOW()
    FROM (
      SELECT r.code, r.min_required,
        COALESCE((SELECT COUNT(*) FROM public.role_assignments ra
          WHERE ra.org_id = v_org_id AND ra.role_code = r.code AND ra.status = 'active'), 0) AS ra_count
      FROM public.md_slm_role_codes r
      WHERE r.is_active = true
        AND (r.model_applicability = v_model OR r.model_applicability = 'both')
    ) sub
    CROSS JOIN (SELECT code FROM public.md_slm_role_codes LIMIT 0) r
    ON CONFLICT (org_id, engagement_model) DO UPDATE SET
      overall_status = EXCLUDED.overall_status,
      missing_roles = EXCLUDED.missing_roles,
      total_required = EXCLUDED.total_required,
      total_filled = EXCLUDED.total_filled,
      responsible_admin_contact = EXCLUDED.responsible_admin_contact,
      last_computed_at = NOW(),
      updated_at = NOW();
  END LOOP;

  -- Simplified approach: direct upsert per model
  -- MP model
  WITH role_stats AS (
    SELECT
      r.code,
      COALESCE((SELECT COUNT(*) FROM public.role_assignments ra
        WHERE ra.org_id = v_org_id AND ra.role_code = r.code AND ra.status = 'active'), 0) AS filled_count
    FROM public.md_slm_role_codes r
    WHERE r.is_active = true
      AND (r.model_applicability = 'mp' OR r.model_applicability = 'both')
  )
  INSERT INTO public.role_readiness_cache (org_id, engagement_model, overall_status, missing_roles, total_required, total_filled, responsible_admin_contact, last_computed_at, updated_at)
  SELECT
    v_org_id,
    'mp',
    CASE WHEN COUNT(*) FILTER (WHERE filled_count = 0) = 0 THEN 'ready' ELSE 'not_ready' END,
    COALESCE(ARRAY_AGG(code) FILTER (WHERE filled_count = 0), '{}'),
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE filled_count > 0)::int,
    v_admin_contact,
    NOW(),
    NOW()
  FROM role_stats
  ON CONFLICT (org_id, engagement_model) DO UPDATE SET
    overall_status = EXCLUDED.overall_status,
    missing_roles = EXCLUDED.missing_roles,
    total_required = EXCLUDED.total_required,
    total_filled = EXCLUDED.total_filled,
    responsible_admin_contact = EXCLUDED.responsible_admin_contact,
    last_computed_at = NOW(),
    updated_at = NOW();

  -- AGG model
  WITH role_stats AS (
    SELECT
      r.code,
      COALESCE((SELECT COUNT(*) FROM public.role_assignments ra
        WHERE ra.org_id = v_org_id AND ra.role_code = r.code AND ra.status = 'active'), 0) AS filled_count
    FROM public.md_slm_role_codes r
    WHERE r.is_active = true
      AND (r.model_applicability = 'agg' OR r.model_applicability = 'both')
  )
  INSERT INTO public.role_readiness_cache (org_id, engagement_model, overall_status, missing_roles, total_required, total_filled, responsible_admin_contact, last_computed_at, updated_at)
  SELECT
    v_org_id,
    'agg',
    CASE WHEN COUNT(*) FILTER (WHERE filled_count = 0) = 0 THEN 'ready' ELSE 'not_ready' END,
    COALESCE(ARRAY_AGG(code) FILTER (WHERE filled_count = 0), '{}'),
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE filled_count > 0)::int,
    v_admin_contact,
    NOW(),
    NOW()
  FROM role_stats
  ON CONFLICT (org_id, engagement_model) DO UPDATE SET
    overall_status = EXCLUDED.overall_status,
    missing_roles = EXCLUDED.missing_roles,
    total_required = EXCLUDED.total_required,
    total_filled = EXCLUDED.total_filled,
    responsible_admin_contact = EXCLUDED.responsible_admin_contact,
    last_computed_at = NOW(),
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_role_assignments_recompute_readiness ON public.role_assignments;

CREATE TRIGGER trg_role_assignments_recompute_readiness
  AFTER INSERT OR UPDATE OR DELETE ON public.role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_recompute_role_readiness();
