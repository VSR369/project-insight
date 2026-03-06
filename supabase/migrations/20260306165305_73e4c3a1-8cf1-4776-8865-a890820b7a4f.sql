
-- ============================================================================
-- MOD-02: Auto-Assignment Engine — Database Schema
-- Tables: admin_notifications, verification_assignments, verification_assignment_log,
--         open_queue_entries, notification_audit_log
-- RPCs: execute_auto_assignment, get_eligible_admins_ranked
-- ============================================================================

-- 1. admin_notifications
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.platform_admin_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'ASSIGNMENT', 'TIER1_WARNING', 'TIER2_BREACH', 'TIER3_CRITICAL',
    'REASSIGNMENT_IN', 'REASSIGNMENT_OUT', 'QUEUE_ESCALATION', 'EMAIL_FAIL'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  deep_link TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_admin_unread ON public.admin_notifications(admin_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_type ON public.admin_notifications(type, created_at DESC);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admins see own notifications
CREATE POLICY "admin_own_notifications_select" ON public.admin_notifications
  FOR SELECT TO authenticated
  USING (
    admin_id IN (
      SELECT id FROM public.platform_admin_profiles WHERE user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'platform_admin'::app_role)
  );

-- Admins update (mark read) own notifications
CREATE POLICY "admin_own_notifications_update" ON public.admin_notifications
  FOR UPDATE TO authenticated
  USING (
    admin_id IN (
      SELECT id FROM public.platform_admin_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    admin_id IN (
      SELECT id FROM public.platform_admin_profiles WHERE user_id = auth.uid()
    )
  );

-- System inserts via SECURITY DEFINER functions only
CREATE POLICY "system_insert_notifications" ON public.admin_notifications
  FOR INSERT TO authenticated
  WITH CHECK (false);


-- 2. verification_assignments
CREATE TABLE IF NOT EXISTS public.verification_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL,
  assigned_admin_id UUID REFERENCES public.platform_admin_profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assignment_method TEXT NOT NULL CHECK (assignment_method IN (
    'AUTO_ASSIGNED', 'OPEN_QUEUE_CLAIMED', 'REASSIGNED_MANUAL',
    'REASSIGNED_SYSTEM', 'AFFINITY_RESUBMISSION'
  )),
  domain_match_score INTEGER DEFAULT 0,
  scoring_details JSONB DEFAULT '{}',
  fallback_reason TEXT,
  released_at TIMESTAMPTZ,
  release_reason TEXT,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_va_verification ON public.verification_assignments(verification_id, is_current);
CREATE INDEX idx_va_admin ON public.verification_assignments(assigned_admin_id, is_current);

ALTER TABLE public.verification_assignments ENABLE ROW LEVEL SECURITY;

-- Assigned admin reads own; supervisors read all
CREATE POLICY "va_select" ON public.verification_assignments
  FOR SELECT TO authenticated
  USING (
    assigned_admin_id IN (
      SELECT id FROM public.platform_admin_profiles WHERE user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'platform_admin'::app_role)
  );

-- No client inserts — system only via SECURITY DEFINER
CREATE POLICY "va_insert_deny" ON public.verification_assignments
  FOR INSERT TO authenticated
  WITH CHECK (false);


-- 3. verification_assignment_log
CREATE TABLE IF NOT EXISTS public.verification_assignment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  from_admin_id UUID REFERENCES public.platform_admin_profiles(id),
  to_admin_id UUID REFERENCES public.platform_admin_profiles(id),
  reason TEXT,
  initiator TEXT NOT NULL CHECK (initiator IN ('SYSTEM', 'ADMIN', 'SUPERVISOR')),
  scoring_snapshot JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_val_verification ON public.verification_assignment_log(verification_id, created_at DESC);
CREATE INDEX idx_val_event ON public.verification_assignment_log(event_type, created_at DESC);

ALTER TABLE public.verification_assignment_log ENABLE ROW LEVEL SECURITY;

-- Supervisors only
CREATE POLICY "val_supervisor_select" ON public.verification_assignment_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE user_id = auth.uid() AND admin_tier = 'supervisor'
    )
  );

CREATE POLICY "val_insert_deny" ON public.verification_assignment_log
  FOR INSERT TO authenticated
  WITH CHECK (false);


-- 4. open_queue_entries
CREATE TABLE IF NOT EXISTS public.open_queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL UNIQUE,
  fallback_reason TEXT,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sla_deadline TIMESTAMPTZ,
  is_critical BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_by UUID REFERENCES public.platform_admin_profiles(id),
  claimed_at TIMESTAMPTZ,
  escalation_count INTEGER NOT NULL DEFAULT 0,
  last_escalated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oqe_unclaimed ON public.open_queue_entries(claimed_by, sla_deadline)
  WHERE claimed_by IS NULL;

ALTER TABLE public.open_queue_entries ENABLE ROW LEVEL SECURITY;

-- All admins can see unclaimed entries; supervisors see all
CREATE POLICY "oqe_select" ON public.open_queue_entries
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'platform_admin'::app_role)
  );

-- Admins can claim (update claimed_by)
CREATE POLICY "oqe_claim" ON public.open_queue_entries
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'platform_admin'::app_role)
    AND claimed_by IS NULL
  )
  WITH CHECK (
    claimed_by IN (
      SELECT id FROM public.platform_admin_profiles WHERE user_id = auth.uid()
    )
  );


-- 5. notification_audit_log
CREATE TABLE IF NOT EXISTS public.notification_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  recipient_id UUID REFERENCES public.platform_admin_profiles(id),
  recipient_email TEXT,
  verification_id UUID,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  email_retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  sms_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nal_status ON public.notification_audit_log(status, created_at DESC);

ALTER TABLE public.notification_audit_log ENABLE ROW LEVEL SECURITY;

-- Supervisors only
CREATE POLICY "nal_supervisor_select" ON public.notification_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE user_id = auth.uid() AND admin_tier = 'supervisor'
    )
  );

CREATE POLICY "nal_insert_deny" ON public.notification_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (false);


-- ============================================================================
-- RPC: execute_auto_assignment
-- 5-step algorithm: Eligibility -> Domain Scoring -> Workload -> Priority -> Assign/Fallback
-- ============================================================================

CREATE OR REPLACE FUNCTION public.execute_auto_assignment(
  p_verification_id UUID,
  p_industry_segments UUID[],
  p_hq_country UUID,
  p_org_type UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_weight_industry INTEGER;
  v_weight_country INTEGER;
  v_weight_org_type INTEGER;
  v_best_admin RECORD;
  v_scoring_snapshot JSONB;
  v_assignment_id UUID;
  v_pool_size INTEGER;
BEGIN
  -- Read weights from md_mpa_config
  SELECT
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'weight_industry_match'), 40) AS w_industry,
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'weight_country_match'), 30) AS w_country,
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'weight_org_type_match'), 30) AS w_org_type,
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'max_reassignments'), 3) AS max_reassign
  INTO v_config;

  v_weight_industry := v_config.w_industry;
  v_weight_country := v_config.w_country;
  v_weight_org_type := v_config.w_org_type;

  -- Step 1: Check affinity (BR-MPA-013) — prior admin for same org
  SELECT pap.id, pap.full_name, pap.admin_tier
  INTO v_best_admin
  FROM verification_assignments va
  JOIN platform_admin_profiles pap ON pap.id = va.assigned_admin_id
  WHERE va.verification_id = p_verification_id
    AND va.is_current = false
    AND pap.availability_status IN ('available', 'partially_available')
    AND pap.is_active = true
  ORDER BY va.assigned_at DESC
  LIMIT 1;

  IF v_best_admin.id IS NOT NULL THEN
    -- Affinity match found
    v_scoring_snapshot := jsonb_build_object(
      'method', 'AFFINITY_RESUBMISSION',
      'selected_admin_id', v_best_admin.id,
      'selected_admin_name', v_best_admin.full_name
    );

    INSERT INTO verification_assignments (
      verification_id, assigned_admin_id, assignment_method,
      domain_match_score, scoring_details
    ) VALUES (
      p_verification_id, v_best_admin.id, 'AFFINITY_RESUBMISSION',
      100, v_scoring_snapshot
    ) RETURNING id INTO v_assignment_id;

    INSERT INTO verification_assignment_log (
      verification_id, event_type, to_admin_id, reason, initiator, scoring_snapshot
    ) VALUES (
      p_verification_id, 'AUTO_ASSIGNED', v_best_admin.id,
      'Affinity resubmission routing', 'SYSTEM', v_scoring_snapshot
    );

    RETURN jsonb_build_object(
      'success', true,
      'assignment_id', v_assignment_id,
      'method', 'AFFINITY_RESUBMISSION',
      'assigned_to', v_best_admin.id
    );
  END IF;

  -- Step 2-5: Standard scoring engine
  -- Get eligible admins with scoring
  WITH eligible_admins AS (
    SELECT
      pap.id AS admin_id,
      pap.full_name,
      pap.admin_tier,
      pap.assignment_priority,
      pap.current_workload,
      pap.max_workload,
      -- L1: Industry domain score
      COALESCE(
        (SELECT COUNT(*)::INTEGER * v_weight_industry / GREATEST(array_length(p_industry_segments, 1), 1)
         FROM unnest(pap.industry_expertise) ie
         WHERE ie = ANY(p_industry_segments)),
        0
      ) AS industry_score,
      -- L2: Country match
      CASE WHEN p_hq_country = ANY(pap.country_expertise)
        THEN v_weight_country ELSE 0
      END AS country_score,
      -- L3: Org type match (if applicable)
      CASE WHEN p_org_type IS NOT NULL AND p_org_type = ANY(pap.org_type_expertise)
        THEN v_weight_org_type ELSE 0
      END AS org_type_score
    FROM platform_admin_profiles pap
    WHERE pap.is_active = true
      AND pap.availability_status IN ('available', 'partially_available')
      AND pap.current_workload < pap.max_workload
    FOR UPDATE OF pap NOWAIT
  ),
  scored_admins AS (
    SELECT *,
      (industry_score + country_score + org_type_score) AS total_score,
      CASE WHEN max_workload > 0
        THEN (current_workload::FLOAT / max_workload::FLOAT)
        ELSE 1.0
      END AS workload_ratio
    FROM eligible_admins
    WHERE industry_score > 0  -- L1 must be > 0 (two-pass: BR-MPA-012)
  )
  SELECT admin_id, full_name, admin_tier, total_score,
    industry_score, country_score, org_type_score,
    workload_ratio, assignment_priority
  INTO v_best_admin
  FROM scored_admins
  ORDER BY
    total_score DESC,          -- Highest domain score first
    workload_ratio ASC,        -- Lowest workload ratio
    assignment_priority ASC,   -- Lowest priority number = highest priority
    random()                   -- Random tiebreaker
  LIMIT 1;

  -- Get pool size for snapshot
  SELECT COUNT(*) INTO v_pool_size
  FROM platform_admin_profiles
  WHERE is_active = true
    AND availability_status IN ('available', 'partially_available');

  IF v_best_admin.admin_id IS NULL THEN
    -- Fallback: No eligible admin — add to open queue
    v_scoring_snapshot := jsonb_build_object(
      'method', 'FALLBACK_TO_QUEUE',
      'pool_size', v_pool_size,
      'reason', 'No eligible admin with L1 > 0'
    );

    INSERT INTO open_queue_entries (
      verification_id, fallback_reason,
      sla_deadline
    ) VALUES (
      p_verification_id,
      'No eligible admin found with matching industry expertise',
      NOW() + INTERVAL '24 hours'
    );

    INSERT INTO verification_assignment_log (
      verification_id, event_type, reason, initiator, scoring_snapshot
    ) VALUES (
      p_verification_id, 'FALLBACK_TO_QUEUE',
      'No eligible admin with L1 > 0', 'SYSTEM', v_scoring_snapshot
    );

    RETURN jsonb_build_object(
      'success', false,
      'method', 'FALLBACK_TO_QUEUE',
      'reason', 'No eligible admin found'
    );
  END IF;

  -- Build scoring snapshot
  v_scoring_snapshot := jsonb_build_object(
    'method', 'AUTO_ASSIGNED',
    'selected_admin_id', v_best_admin.admin_id,
    'selected_admin_name', v_best_admin.full_name,
    'total_score', v_best_admin.total_score,
    'industry_score', v_best_admin.industry_score,
    'country_score', v_best_admin.country_score,
    'org_type_score', v_best_admin.org_type_score,
    'workload_ratio', v_best_admin.workload_ratio,
    'pool_size', v_pool_size
  );

  -- Create assignment
  INSERT INTO verification_assignments (
    verification_id, assigned_admin_id, assignment_method,
    domain_match_score, scoring_details
  ) VALUES (
    p_verification_id, v_best_admin.admin_id, 'AUTO_ASSIGNED',
    v_best_admin.total_score, v_scoring_snapshot
  ) RETURNING id INTO v_assignment_id;

  -- Update workload
  UPDATE platform_admin_profiles
  SET current_workload = current_workload + 1,
      updated_at = NOW()
  WHERE id = v_best_admin.admin_id;

  -- Log
  INSERT INTO verification_assignment_log (
    verification_id, event_type, to_admin_id, reason, initiator, scoring_snapshot
  ) VALUES (
    p_verification_id, 'AUTO_ASSIGNED', v_best_admin.admin_id,
    'Standard engine assignment', 'SYSTEM', v_scoring_snapshot
  );

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', v_assignment_id,
    'method', 'AUTO_ASSIGNED',
    'assigned_to', v_best_admin.admin_id,
    'score', v_best_admin.total_score
  );

EXCEPTION
  WHEN lock_not_available THEN
    -- 55P03 — concurrent assignment in progress
    RETURN jsonb_build_object(
      'success', false,
      'method', 'CONCURRENT_CONFLICT',
      'reason', 'Another assignment is in progress, retry'
    );
END;
$$;


-- ============================================================================
-- RPC: get_eligible_admins_ranked (read-only preview for MOD-06 reassignment UI)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_eligible_admins_ranked(
  p_industry_segments UUID[],
  p_hq_country UUID,
  p_org_type UUID DEFAULT NULL,
  p_exclude_admin_id UUID DEFAULT NULL
)
RETURNS TABLE (
  admin_id UUID,
  full_name TEXT,
  admin_tier TEXT,
  total_score INTEGER,
  industry_score INTEGER,
  country_score INTEGER,
  org_type_score INTEGER,
  workload_ratio FLOAT,
  assignment_priority INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weight_industry INTEGER;
  v_weight_country INTEGER;
  v_weight_org_type INTEGER;
BEGIN
  SELECT
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'weight_industry_match'), 40),
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'weight_country_match'), 30),
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'weight_org_type_match'), 30)
  INTO v_weight_industry, v_weight_country, v_weight_org_type;

  RETURN QUERY
  SELECT
    pap.id,
    pap.full_name,
    pap.admin_tier,
    (
      COALESCE(
        (SELECT COUNT(*)::INTEGER * v_weight_industry / GREATEST(array_length(p_industry_segments, 1), 1)
         FROM unnest(pap.industry_expertise) ie
         WHERE ie = ANY(p_industry_segments)),
        0
      )
      + CASE WHEN p_hq_country = ANY(pap.country_expertise) THEN v_weight_country ELSE 0 END
      + CASE WHEN p_org_type IS NOT NULL AND p_org_type = ANY(pap.org_type_expertise) THEN v_weight_org_type ELSE 0 END
    ) AS total_score,
    COALESCE(
      (SELECT COUNT(*)::INTEGER * v_weight_industry / GREATEST(array_length(p_industry_segments, 1), 1)
       FROM unnest(pap.industry_expertise) ie
       WHERE ie = ANY(p_industry_segments)),
      0
    ) AS industry_score,
    CASE WHEN p_hq_country = ANY(pap.country_expertise) THEN v_weight_country ELSE 0 END AS country_score,
    CASE WHEN p_org_type IS NOT NULL AND p_org_type = ANY(pap.org_type_expertise) THEN v_weight_org_type ELSE 0 END AS org_type_score,
    CASE WHEN pap.max_workload > 0
      THEN (pap.current_workload::FLOAT / pap.max_workload::FLOAT)
      ELSE 1.0
    END AS workload_ratio,
    pap.assignment_priority
  FROM platform_admin_profiles pap
  WHERE pap.is_active = true
    AND pap.availability_status IN ('available', 'partially_available')
    AND (p_exclude_admin_id IS NULL OR pap.id != p_exclude_admin_id)
  ORDER BY total_score DESC, workload_ratio ASC, pap.assignment_priority ASC;
END;
$$;
