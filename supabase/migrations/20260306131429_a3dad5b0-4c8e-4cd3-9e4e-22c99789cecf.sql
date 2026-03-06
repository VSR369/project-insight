
-- =====================================================
-- MOD-01: Platform Admin Profile Management
-- Tables, Indexes, RLS, Triggers, Seed Data
-- =====================================================

-- 1. platform_admin_profiles (system-level, no tenant_id)
CREATE TABLE IF NOT EXISTS public.platform_admin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL CHECK (char_length(full_name) >= 2 AND char_length(full_name) <= 100),
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  is_supervisor BOOLEAN NOT NULL DEFAULT FALSE,
  industry_expertise UUID[] NOT NULL DEFAULT '{}',
  country_region_expertise UUID[] DEFAULT '{}',
  org_type_expertise TEXT[] DEFAULT '{}',
  max_concurrent_verifications INTEGER NOT NULL DEFAULT 10 CHECK (max_concurrent_verifications >= 1 AND max_concurrent_verifications <= 100),
  current_active_verifications INTEGER NOT NULL DEFAULT 0 CHECK (current_active_verifications >= 0),
  availability_status TEXT NOT NULL DEFAULT 'Available' CHECK (availability_status IN ('Available', 'Partially_Available', 'Fully_Loaded', 'On_Leave', 'Inactive')),
  assignment_priority INTEGER NOT NULL DEFAULT 5 CHECK (assignment_priority >= 1 AND assignment_priority <= 10),
  leave_start_date DATE,
  leave_end_date DATE,
  last_assignment_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 2. platform_admin_profile_audit_log (immutable)
CREATE TABLE IF NOT EXISTS public.platform_admin_profile_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.platform_admin_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('CREATED', 'UPDATED', 'DEACTIVATED', 'AVAILABILITY_CHANGED', 'LEAVE_SCHEDULED', 'SUPERVISOR_CHANGED')),
  actor_id UUID,
  actor_type TEXT CHECK (actor_type IN ('SELF', 'SUPERVISOR', 'SYSTEM')),
  field_changed TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. admin_performance_metrics
CREATE TABLE IF NOT EXISTS public.admin_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID UNIQUE NOT NULL REFERENCES public.platform_admin_profiles(id) ON DELETE CASCADE,
  verifications_completed INTEGER NOT NULL DEFAULT 0,
  avg_processing_hours DECIMAL(6,2),
  sla_compliance_rate_pct DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 4. md_mpa_config (module config)
CREATE TABLE IF NOT EXISTS public.md_mpa_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  param_key TEXT UNIQUE NOT NULL,
  param_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_pap_availability ON public.platform_admin_profiles (availability_status);
CREATE INDEX IF NOT EXISTS idx_pap_industry_gin ON public.platform_admin_profiles USING GIN (industry_expertise);
CREATE INDEX IF NOT EXISTS idx_pap_supervisor ON public.platform_admin_profiles (is_supervisor) WHERE is_supervisor = TRUE;
CREATE INDEX IF NOT EXISTS idx_papal_admin_event ON public.platform_admin_profile_audit_log (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apm_admin ON public.admin_performance_metrics (admin_id);

-- =====================================================
-- RLS POLICIES (all use has_role())
-- =====================================================

-- platform_admin_profiles
ALTER TABLE public.platform_admin_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_select_profiles"
  ON public.platform_admin_profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "supervisor_insert_profiles"
  ON public.platform_admin_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'platform_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE user_id = auth.uid() AND is_supervisor = TRUE
    )
  );

CREATE POLICY "supervisor_update_profiles"
  ON public.platform_admin_profiles FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'platform_admin'::app_role)
    AND (
      -- Supervisors can update any profile
      EXISTS (
        SELECT 1 FROM public.platform_admin_profiles
        WHERE user_id = auth.uid() AND is_supervisor = TRUE
      )
      -- Self can update own availability/leave fields only
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "supervisor_delete_profiles"
  ON public.platform_admin_profiles FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'platform_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE user_id = auth.uid() AND is_supervisor = TRUE
    )
  );

-- platform_admin_profile_audit_log
ALTER TABLE public.platform_admin_profile_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_select_audit_log"
  ON public.platform_admin_profile_audit_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- INSERT only via service_role (edge functions) — no authenticated INSERT policy needed

-- admin_performance_metrics
ALTER TABLE public.admin_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_select_metrics"
  ON public.admin_performance_metrics FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- md_mpa_config
ALTER TABLE public.md_mpa_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admin_select_config"
  ON public.md_mpa_config FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "supervisor_modify_config"
  ON public.md_mpa_config FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'platform_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE user_id = auth.uid() AND is_supervisor = TRUE
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'platform_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE user_id = auth.uid() AND is_supervisor = TRUE
    )
  );

-- =====================================================
-- TRIGGERS & FUNCTIONS
-- =====================================================

-- T1: fn_updated_at_pap — auto-set updated_at
CREATE OR REPLACE FUNCTION public.fn_updated_at_pap()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pap_updated_at
  BEFORE UPDATE ON public.platform_admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_updated_at_pap();

-- T2: fn_validate_industry_expertise — BR-MPA-003
CREATE OR REPLACE FUNCTION public.fn_validate_industry_expertise()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.industry_expertise IS NULL OR array_length(NEW.industry_expertise, 1) IS NULL OR array_length(NEW.industry_expertise, 1) < 1 THEN
    RAISE EXCEPTION 'At least one industry expertise is required (BR-MPA-003)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pap_validate_industry
  BEFORE INSERT OR UPDATE ON public.platform_admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_industry_expertise();

-- T3: fn_validate_leave_dates — BR-MPA-005
CREATE OR REPLACE FUNCTION public.fn_validate_leave_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- If either leave date is set, both must be set
  IF (NEW.leave_start_date IS NOT NULL AND NEW.leave_end_date IS NULL)
     OR (NEW.leave_start_date IS NULL AND NEW.leave_end_date IS NOT NULL) THEN
    RAISE EXCEPTION 'Both leave start and end dates must be provided together (BR-MPA-005)';
  END IF;
  -- End must be after start
  IF NEW.leave_start_date IS NOT NULL AND NEW.leave_end_date IS NOT NULL
     AND NEW.leave_end_date <= NEW.leave_start_date THEN
    RAISE EXCEPTION 'Leave end date must be after start date (BR-MPA-005)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pap_validate_leave
  BEFORE INSERT OR UPDATE ON public.platform_admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_leave_dates();

-- T4: fn_guard_min_admins — BR-MPA-001 & BR-MPA-002
CREATE OR REPLACE FUNCTION public.fn_guard_min_admins()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available_count INTEGER;
  v_supervisor_count INTEGER;
BEGIN
  -- BR-MPA-001: Cannot move last Available admin to On_Leave or Inactive
  IF OLD.availability_status = 'Available'
     AND NEW.availability_status IN ('On_Leave', 'Inactive')
  THEN
    SELECT COUNT(*) INTO v_available_count
    FROM public.platform_admin_profiles
    WHERE availability_status = 'Available'
      AND id != OLD.id;

    IF v_available_count < 1 THEN
      RAISE EXCEPTION 'Cannot change status: you are the last available admin (BR-MPA-001)';
    END IF;
  END IF;

  -- BR-MPA-002: Cannot remove last supervisor flag
  IF OLD.is_supervisor = TRUE AND NEW.is_supervisor = FALSE THEN
    SELECT COUNT(*) INTO v_supervisor_count
    FROM public.platform_admin_profiles
    WHERE is_supervisor = TRUE
      AND id != OLD.id;

    IF v_supervisor_count < 1 THEN
      RAISE EXCEPTION 'Cannot remove supervisor flag: you are the last supervisor (BR-MPA-002)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pap_guard_min_admins
  BEFORE UPDATE ON public.platform_admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_min_admins();

-- T5: fn_sync_admin_workload — BR-MPA-004
CREATE OR REPLACE FUNCTION public.fn_sync_admin_workload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ratio DECIMAL;
BEGIN
  -- Skip if manually set to On_Leave or Inactive
  IF NEW.availability_status IN ('On_Leave', 'Inactive') THEN
    RETURN NEW;
  END IF;

  -- Only recalculate when workload changes
  IF NEW.current_active_verifications IS DISTINCT FROM OLD.current_active_verifications
     OR NEW.max_concurrent_verifications IS DISTINCT FROM OLD.max_concurrent_verifications
  THEN
    v_ratio := NEW.current_active_verifications::DECIMAL / GREATEST(NEW.max_concurrent_verifications, 1);

    IF v_ratio >= 1.0 THEN
      NEW.availability_status := 'Fully_Loaded';
    ELSIF v_ratio >= 0.7 THEN
      NEW.availability_status := 'Partially_Available';
    ELSE
      NEW.availability_status := 'Available';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pap_sync_workload
  BEFORE UPDATE ON public.platform_admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_admin_workload();

-- =====================================================
-- SEED DATA for md_mpa_config
-- =====================================================
INSERT INTO public.md_mpa_config (param_key, param_value, description) VALUES
  ('executive_escalation_email', NULL, 'Email address for executive escalation when no admins are available'),
  ('l1_weight', '50', 'Weight for Level 1 workload distribution'),
  ('l2_weight', '30', 'Weight for Level 2 workload distribution'),
  ('l3_weight', '20', 'Weight for Level 3 workload distribution')
ON CONFLICT (param_key) DO NOTHING;

-- Grant permissions for service_role audit log inserts
GRANT INSERT ON public.platform_admin_profile_audit_log TO service_role;
GRANT ALL ON public.platform_admin_profiles TO service_role;
GRANT ALL ON public.admin_performance_metrics TO service_role;
GRANT ALL ON public.md_mpa_config TO service_role;
