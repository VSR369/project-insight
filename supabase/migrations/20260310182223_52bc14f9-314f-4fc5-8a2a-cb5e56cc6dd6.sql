
-- ============================================================================
-- RBAC MOD-01: Resource Pool Management — Tables, RLS, Indexes, Triggers
-- BRD Ref: BR-PP-001–005, BR-POOL-001–003, BR-AVAIL-001–004
-- ============================================================================

-- 1. Master data: SLM Role Codes reference table
CREATE TABLE IF NOT EXISTS public.md_slm_role_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Seed role codes per BRD
INSERT INTO public.md_slm_role_codes (code, display_name, description, display_order) VALUES
  ('R3', 'Challenge Architect', 'Designs challenge structure and evaluation criteria', 1),
  ('R5_MP', 'Challenge Curator/MP', 'Curates and manages marketplace challenge lifecycle', 2),
  ('R6_MP', 'Innovation Director/MP', 'Oversees innovation strategy for marketplace challenges', 3),
  ('R7_MP', 'Expert Reviewer/MP', 'Reviews and evaluates solution proposals', 4);

-- 2. Master data: Proficiency Levels (for pool member proficiency dropdown)
CREATE TABLE IF NOT EXISTS public.md_proficiency_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Seed proficiency levels
INSERT INTO public.md_proficiency_levels (name, description, display_order) VALUES
  ('Junior', 'Entry-level proficiency with foundational knowledge', 1),
  ('Mid-Level', 'Intermediate proficiency with practical experience', 2),
  ('Senior', 'Advanced proficiency with deep domain expertise', 3),
  ('Principal', 'Expert-level proficiency with strategic leadership capability', 4);

-- 3. Platform Provider Pool — Core pool member table (BR-PP-001, BR-POOL-001)
CREATE TABLE IF NOT EXISTS public.platform_provider_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role_codes TEXT[] NOT NULL DEFAULT '{}',
  industry_ids UUID[] NOT NULL DEFAULT '{}',
  proficiency_id UUID REFERENCES public.md_proficiency_levels(id),
  max_concurrent INTEGER NOT NULL DEFAULT 1 CHECK (max_concurrent >= 1 AND max_concurrent <= 20),
  current_assignments INTEGER NOT NULL DEFAULT 0 CHECK (current_assignments >= 0),
  availability_status TEXT NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'partially_available', 'fully_booked')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Unique email constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_email_unique ON public.platform_provider_pool (email) WHERE is_active = TRUE;

-- Indexes for filtering (BR-POOL-003)
CREATE INDEX IF NOT EXISTS idx_pool_availability ON public.platform_provider_pool (availability_status) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_pool_role_codes ON public.platform_provider_pool USING GIN (role_codes) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_pool_industry_ids ON public.platform_provider_pool USING GIN (industry_ids) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_pool_proficiency ON public.platform_provider_pool (proficiency_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_pool_is_active ON public.platform_provider_pool (is_active);

-- 4. Challenge Role Assignment — Per-challenge assignments (BR-ASSIGN-001)
CREATE TABLE IF NOT EXISTS public.challenge_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL,
  pool_member_id UUID NOT NULL REFERENCES public.platform_provider_pool(id),
  role_code TEXT NOT NULL CHECK (role_code IN ('R3', 'R5_MP', 'R6_MP', 'R7_MP')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reassigned', 'completed', 'cancelled')),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reassigned_at TIMESTAMPTZ,
  reassignment_reason TEXT,
  replaced_by UUID REFERENCES public.challenge_role_assignments(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_cra_challenge ON public.challenge_role_assignments (challenge_id, status);
CREATE INDEX IF NOT EXISTS idx_cra_pool_member ON public.challenge_role_assignments (pool_member_id, status);

-- 5. Role Audit Log — Append-only (BR-PP-005)
CREATE TABLE IF NOT EXISTS public.role_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  before_state JSONB,
  after_state JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.role_audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.role_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.role_audit_log (actor_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- md_slm_role_codes — read for all authenticated
ALTER TABLE public.md_slm_role_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read role codes" ON public.md_slm_role_codes
  FOR SELECT TO authenticated USING (true);

-- md_proficiency_levels — read for all authenticated
ALTER TABLE public.md_proficiency_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read proficiency levels" ON public.md_proficiency_levels
  FOR SELECT TO authenticated USING (true);

-- platform_provider_pool — all tiers can read, supervisor+senior can write (BR-PP-003)
ALTER TABLE public.platform_provider_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All platform admins can read pool" ON public.platform_provider_pool
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Supervisor and senior admin can insert pool members" ON public.platform_provider_pool
  FOR INSERT TO authenticated WITH CHECK (
    public.is_supervisor_tier(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE id = auth.uid() AND admin_tier IN ('supervisor', 'senior_admin')
    )
  );
CREATE POLICY "Supervisor and senior admin can update pool members" ON public.platform_provider_pool
  FOR UPDATE TO authenticated USING (
    public.is_supervisor_tier(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE id = auth.uid() AND admin_tier IN ('supervisor', 'senior_admin')
    )
  );

-- challenge_role_assignments — platform admin read/write
ALTER TABLE public.challenge_role_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins can read assignments" ON public.challenge_role_assignments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Supervisor and senior admin can manage assignments" ON public.challenge_role_assignments
  FOR ALL TO authenticated USING (
    public.is_supervisor_tier(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE id = auth.uid() AND admin_tier IN ('supervisor', 'senior_admin')
    )
  );

-- role_audit_log — append-only: all can read, supervisor+senior can insert, NO update/delete
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins can read audit log" ON public.role_audit_log
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Platform admins can insert audit entries" ON public.role_audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- TRIGGER: Recalculate availability status (BR-AVAIL-001)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_recalculate_pool_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pool_id UUID;
  v_active_count INTEGER;
  v_max INTEGER;
  v_new_status TEXT;
BEGIN
  -- Determine which pool member to recalculate
  IF TG_OP = 'DELETE' THEN
    v_pool_id := OLD.pool_member_id;
  ELSE
    v_pool_id := NEW.pool_member_id;
  END IF;

  -- Count active assignments
  SELECT COUNT(*) INTO v_active_count
  FROM public.challenge_role_assignments
  WHERE pool_member_id = v_pool_id AND status = 'active';

  -- Get max concurrent
  SELECT max_concurrent INTO v_max
  FROM public.platform_provider_pool
  WHERE id = v_pool_id;

  IF v_max IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Determine status (BR-POOL-002)
  IF v_active_count >= v_max THEN
    v_new_status := 'fully_booked';
  ELSIF v_active_count >= v_max - 1 AND v_max > 1 THEN
    v_new_status := 'partially_available';
  ELSE
    v_new_status := 'available';
  END IF;

  -- Update pool member
  UPDATE public.platform_provider_pool
  SET current_assignments = v_active_count,
      availability_status = v_new_status,
      updated_at = NOW()
  WHERE id = v_pool_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_cra_recalculate_availability
AFTER INSERT OR UPDATE OR DELETE ON public.challenge_role_assignments
FOR EACH ROW EXECUTE FUNCTION public.fn_recalculate_pool_availability();

-- ============================================================================
-- TRIGGER: Auto-update updated_at on platform_provider_pool
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_pool_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pool_updated_at
BEFORE UPDATE ON public.platform_provider_pool
FOR EACH ROW EXECUTE FUNCTION public.fn_pool_updated_at();
