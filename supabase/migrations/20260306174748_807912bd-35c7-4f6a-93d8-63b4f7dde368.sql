
-- ============================================================
-- MOD-03 Batch 1: Core tables, RPCs, triggers, RLS
-- ============================================================

-- -------------------------------------------------------
-- 1. Helper function: get current user's admin profile id
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_admin_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM platform_admin_profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- -------------------------------------------------------
-- 2. Table: platform_admin_verifications
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_admin_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  assigned_admin_id UUID REFERENCES public.platform_admin_profiles(id),
  assignment_method TEXT,
  status TEXT NOT NULL DEFAULT 'Pending_Assignment'
    CHECK (status IN ('Pending_Assignment','Under_Verification','Approved','Rejected','Returned_for_Correction')),
  sla_start_at TIMESTAMPTZ,
  sla_paused_duration_hours DECIMAL NOT NULL DEFAULT 0,
  sla_breached BOOLEAN NOT NULL DEFAULT FALSE,
  sla_breach_tier TEXT NOT NULL DEFAULT 'NONE'
    CHECK (sla_breach_tier IN ('NONE','TIER1','TIER2','TIER3')),
  sla_duration_seconds INTEGER NOT NULL DEFAULT 172800, -- 48hr default
  reassignment_count INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completed_by_admin_id UUID REFERENCES public.platform_admin_profiles(id),
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_pav_assigned_admin ON public.platform_admin_verifications(assigned_admin_id) WHERE assigned_admin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pav_status ON public.platform_admin_verifications(status);
CREATE INDEX IF NOT EXISTS idx_pav_sla_breach ON public.platform_admin_verifications(sla_breached, sla_breach_tier) WHERE sla_breached = TRUE;
CREATE INDEX IF NOT EXISTS idx_pav_org ON public.platform_admin_verifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_pav_current ON public.platform_admin_verifications(is_current) WHERE is_current = TRUE;

-- -------------------------------------------------------
-- 3. Table: verification_check_results
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES public.platform_admin_verifications(id) ON DELETE CASCADE,
  check_id TEXT NOT NULL CHECK (check_id IN ('V1','V2','V3','V4','V5','V6')),
  result TEXT NOT NULL DEFAULT 'Pending' CHECK (result IN ('Pass','Fail','Pending')),
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (verification_id, check_id)
);

CREATE INDEX IF NOT EXISTS idx_vcr_verification ON public.verification_check_results(verification_id);

-- -------------------------------------------------------
-- 4. RLS on platform_admin_verifications
-- -------------------------------------------------------
ALTER TABLE public.platform_admin_verifications ENABLE ROW LEVEL SECURITY;

-- Platform admins can see their own assignments
CREATE POLICY "pav_select_own" ON public.platform_admin_verifications
  FOR SELECT TO authenticated
  USING (
    assigned_admin_id = public.get_my_admin_profile_id()
  );

-- Supervisors can see all
CREATE POLICY "pav_select_supervisor" ON public.platform_admin_verifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE id = public.get_my_admin_profile_id()
        AND (is_supervisor = true OR admin_tier = 'supervisor')
    )
  );

-- Only assigned admin or supervisor can update
CREATE POLICY "pav_update" ON public.platform_admin_verifications
  FOR UPDATE TO authenticated
  USING (
    assigned_admin_id = public.get_my_admin_profile_id()
    OR EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE id = public.get_my_admin_profile_id()
        AND (is_supervisor = true OR admin_tier = 'supervisor')
    )
  );

-- System inserts (via SECURITY DEFINER RPCs)
CREATE POLICY "pav_insert_system" ON public.platform_admin_verifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'platform_admin')
  );

-- -------------------------------------------------------
-- 5. RLS on verification_check_results
-- -------------------------------------------------------
ALTER TABLE public.verification_check_results ENABLE ROW LEVEL SECURITY;

-- Read: assigned admin or supervisor
CREATE POLICY "vcr_select" ON public.verification_check_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admin_verifications pav
      WHERE pav.id = verification_id
        AND (
          pav.assigned_admin_id = public.get_my_admin_profile_id()
          OR EXISTS (
            SELECT 1 FROM public.platform_admin_profiles
            WHERE id = public.get_my_admin_profile_id()
              AND (is_supervisor = true OR admin_tier = 'supervisor')
          )
        )
    )
  );

-- Write: ONLY assigned admin (BR-MPA-039)
CREATE POLICY "vcr_update" ON public.verification_check_results
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admin_verifications pav
      WHERE pav.id = verification_id
        AND pav.assigned_admin_id = public.get_my_admin_profile_id()
    )
  );

CREATE POLICY "vcr_insert" ON public.verification_check_results
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admin_verifications pav
      WHERE pav.id = verification_id
        AND (
          pav.assigned_admin_id = public.get_my_admin_profile_id()
          OR public.has_role(auth.uid(), 'platform_admin')
        )
    )
  );

-- -------------------------------------------------------
-- 6. Trigger: immutable SLA start
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_immutable_sla_start()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.sla_start_at IS NOT NULL AND NEW.sla_start_at IS DISTINCT FROM OLD.sla_start_at THEN
    RAISE EXCEPTION 'sla_start_at cannot be modified once set';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pav_immutable_sla
  BEFORE UPDATE ON public.platform_admin_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_immutable_sla_start();

-- -------------------------------------------------------
-- 7. Trigger: sync admin workload on assignment changes
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_sync_admin_workload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_count INTEGER;
  v_max INTEGER;
BEGIN
  -- Determine which admin to recalculate
  IF TG_OP = 'DELETE' THEN
    v_admin_id := OLD.assigned_admin_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Recalc both old and new if changed
    IF OLD.assigned_admin_id IS DISTINCT FROM NEW.assigned_admin_id THEN
      -- Recalc old admin
      IF OLD.assigned_admin_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count
        FROM verification_assignments
        WHERE assigned_admin_id = OLD.assigned_admin_id AND is_current = true;

        SELECT max_concurrent_verifications INTO v_max
        FROM platform_admin_profiles WHERE id = OLD.assigned_admin_id;

        UPDATE platform_admin_profiles
        SET current_active_verifications = v_count,
            availability_status = CASE
              WHEN v_count = 0 THEN 'Available'
              WHEN v_count >= COALESCE(v_max, 5) THEN 'At Capacity'
              ELSE 'Partially Available'
            END,
            updated_at = now()
        WHERE id = OLD.assigned_admin_id;
      END IF;
    END IF;
    v_admin_id := NEW.assigned_admin_id;
  ELSE
    v_admin_id := NEW.assigned_admin_id;
  END IF;

  -- Recalc the target admin
  IF v_admin_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM verification_assignments
    WHERE assigned_admin_id = v_admin_id AND is_current = true;

    SELECT max_concurrent_verifications INTO v_max
    FROM platform_admin_profiles WHERE id = v_admin_id;

    UPDATE platform_admin_profiles
    SET current_active_verifications = v_count,
        availability_status = CASE
          WHEN v_count = 0 THEN 'Available'
          WHEN v_count >= COALESCE(v_max, 5) THEN 'At Capacity'
          ELSE 'Partially Available'
        END,
        updated_at = now()
    WHERE id = v_admin_id;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_admin_workload ON public.verification_assignments;
CREATE TRIGGER trg_sync_admin_workload
  AFTER INSERT OR UPDATE OR DELETE ON public.verification_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_admin_workload();

-- -------------------------------------------------------
-- 8. RPC: claim_from_queue (atomic claim with optimistic lock)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_from_queue(
  p_queue_entry_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_admin_name TEXT;
  v_verification_id UUID;
  v_queue_row open_queue_entries%ROWTYPE;
  v_release_window_hours NUMERIC;
BEGIN
  -- Get caller's admin profile
  SELECT id, full_name INTO v_admin_id, v_admin_name
  FROM platform_admin_profiles
  WHERE user_id = auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AN_ADMIN');
  END IF;

  -- Check workload capacity
  PERFORM 1 FROM platform_admin_profiles
  WHERE id = v_admin_id
    AND current_active_verifications >= max_concurrent_verifications;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'AT_CAPACITY');
  END IF;

  -- Optimistic lock: try to claim the queue entry
  BEGIN
    SELECT * INTO v_queue_row
    FROM open_queue_entries
    WHERE id = p_queue_entry_id
      AND claimed_by IS NULL
    FOR UPDATE NOWAIT;
  EXCEPTION WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'LOCK_CONFLICT');
  END;

  IF v_queue_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CLAIMED');
  END IF;

  v_verification_id := v_queue_row.verification_id;

  -- 1. Mark queue entry as claimed
  UPDATE open_queue_entries
  SET claimed_by = v_admin_id,
      claimed_at = now()
  WHERE id = p_queue_entry_id;

  -- 2. Mark any existing assignments as non-current
  UPDATE verification_assignments
  SET is_current = false, released_at = now(), release_reason = 'reassigned_via_queue_claim'
  WHERE verification_id = v_verification_id AND is_current = true;

  -- 3. Create new assignment
  INSERT INTO verification_assignments (
    verification_id, assigned_admin_id, assignment_method, is_current, domain_match_score
  ) VALUES (
    v_verification_id, v_admin_id, 'OPEN_QUEUE_CLAIMED', true, 0
  );

  -- 4. Update the verification record
  UPDATE platform_admin_verifications
  SET assigned_admin_id = v_admin_id,
      assignment_method = 'OPEN_QUEUE_CLAIMED',
      status = CASE WHEN status = 'Pending_Assignment' THEN 'Under_Verification' ELSE status END,
      sla_start_at = COALESCE(sla_start_at, now()),
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = v_verification_id;

  -- 5. Insert audit log
  INSERT INTO verification_assignment_log (
    verification_id, event_type, from_admin_id, to_admin_id,
    assignment_method, reason
  ) VALUES (
    v_verification_id, 'CLAIMED_FROM_QUEUE', NULL, v_admin_id,
    'OPEN_QUEUE_CLAIMED', 'Claimed from open queue by ' || v_admin_name
  );

  -- 6. Update admin's last assignment timestamp
  UPDATE platform_admin_profiles
  SET last_assignment_timestamp = now()
  WHERE id = v_admin_id;

  RETURN jsonb_build_object(
    'success', true,
    'verification_id', v_verification_id,
    'claimed_by_name', v_admin_name
  );
END;
$$;

-- -------------------------------------------------------
-- 9. RPC: release_to_queue (release within window)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_to_queue(
  p_verification_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_admin_name TEXT;
  v_assignment verification_assignments%ROWTYPE;
  v_release_window_hours NUMERIC;
  v_window_deadline TIMESTAMPTZ;
BEGIN
  -- Get caller's admin profile
  SELECT id, full_name INTO v_admin_id, v_admin_name
  FROM platform_admin_profiles
  WHERE user_id = auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AN_ADMIN');
  END IF;

  -- Get current assignment
  SELECT * INTO v_assignment
  FROM verification_assignments
  WHERE verification_id = p_verification_id
    AND assigned_admin_id = v_admin_id
    AND is_current = true;

  IF v_assignment.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_ASSIGNED_TO_YOU');
  END IF;

  -- Get configurable release window (default 2 hours)
  SELECT COALESCE(
    (SELECT param_value::NUMERIC FROM md_mpa_config WHERE param_key = 'release_window_hours'),
    2
  ) INTO v_release_window_hours;

  v_window_deadline := v_assignment.assigned_at + (v_release_window_hours || ' hours')::INTERVAL;

  IF now() > v_window_deadline THEN
    RETURN jsonb_build_object('success', false, 'error', 'RELEASE_WINDOW_EXPIRED');
  END IF;

  -- 1. Release the assignment
  UPDATE verification_assignments
  SET is_current = false, released_at = now(), release_reason = COALESCE(p_reason, 'released_by_admin')
  WHERE id = v_assignment.id;

  -- 2. Update verification — unassign
  UPDATE platform_admin_verifications
  SET assigned_admin_id = NULL,
      assignment_method = NULL,
      status = 'Pending_Assignment',
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = p_verification_id;

  -- 3. Return to open queue (re-insert or update existing)
  INSERT INTO open_queue_entries (verification_id, entered_at, fallback_reason)
  VALUES (p_verification_id, now(), 'released_by_admin: ' || COALESCE(p_reason, 'no reason'))
  ON CONFLICT (verification_id) DO UPDATE
  SET claimed_by = NULL, claimed_at = NULL, entered_at = now(),
      fallback_reason = 'released_by_admin: ' || COALESCE(p_reason, 'no reason');

  -- 4. Audit log
  INSERT INTO verification_assignment_log (
    verification_id, event_type, from_admin_id, to_admin_id,
    assignment_method, reason
  ) VALUES (
    p_verification_id, 'RELEASED_TO_QUEUE', v_admin_id, NULL,
    'RELEASE', COALESCE(p_reason, 'Released to queue by ' || v_admin_name)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- -------------------------------------------------------
-- 10. Seed V1-V6 check rows trigger (auto-create on verification insert)
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_seed_verification_checks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO verification_check_results (verification_id, check_id)
  VALUES
    (NEW.id, 'V1'),
    (NEW.id, 'V2'),
    (NEW.id, 'V3'),
    (NEW.id, 'V4'),
    (NEW.id, 'V5'),
    (NEW.id, 'V6');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_verification_checks
  AFTER INSERT ON public.platform_admin_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_seed_verification_checks();

-- -------------------------------------------------------
-- 11. Add open_queue_entries unique constraint on verification_id if missing
-- -------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'open_queue_entries_verification_id_key'
  ) THEN
    ALTER TABLE public.open_queue_entries ADD CONSTRAINT open_queue_entries_verification_id_key UNIQUE (verification_id);
  END IF;
END $$;
