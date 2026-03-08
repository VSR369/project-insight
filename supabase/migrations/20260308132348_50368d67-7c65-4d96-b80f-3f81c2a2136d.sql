
-- =====================================================
-- MOD-07: System Master Data & Configuration
-- Phase 1: Schema upgrade, audit table, RPCs, seed data
-- =====================================================

-- 1.1 ALTER md_mpa_config — add missing columns
ALTER TABLE public.md_mpa_config
  ADD COLUMN IF NOT EXISTS param_type TEXT NOT NULL DEFAULT 'TEXT',
  ADD COLUMN IF NOT EXISTS param_group TEXT NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS min_value TEXT,
  ADD COLUMN IF NOT EXISTS max_value TEXT,
  ADD COLUMN IF NOT EXISTS is_critical BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_restart BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_by_id UUID REFERENCES public.platform_admin_profiles(id);

-- Add CHECK constraint for param_type
ALTER TABLE public.md_mpa_config
  ADD CONSTRAINT chk_mpa_config_param_type
  CHECK (param_type IN ('INTEGER', 'DECIMAL', 'TEXT', 'UUID', 'BOOLEAN'));

-- 1.2 Create md_mpa_config_audit table (immutable append-only)
CREATE TABLE IF NOT EXISTS public.md_mpa_config_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  param_key TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT NOT NULL,
  changed_by_id UUID NOT NULL REFERENCES public.platform_admin_profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_reason TEXT,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_mpa_config_audit_key ON public.md_mpa_config_audit(param_key, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_mpa_config_audit_who ON public.md_mpa_config_audit(changed_by_id, changed_at DESC);

-- RLS for audit table
ALTER TABLE public.md_mpa_config_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supervisor_select_config_audit"
  ON public.md_mpa_config_audit FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'platform_admin'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE user_id = auth.uid() AND admin_tier IN ('supervisor', 'senior_admin')
    )
  );

-- No INSERT/UPDATE/DELETE policies — writes only via SECURITY DEFINER RPC

-- 1.3 Seed / update the 15 canonical BRD parameters
-- First rename old keys to canonical keys
UPDATE public.md_mpa_config SET param_key = 'domain_weight_l1_industry' WHERE param_key = 'l1_weight';
UPDATE public.md_mpa_config SET param_key = 'domain_weight_l2_country' WHERE param_key = 'l2_weight';
UPDATE public.md_mpa_config SET param_key = 'domain_weight_l3_org_type' WHERE param_key = 'l3_weight';
UPDATE public.md_mpa_config SET param_key = 'queue_unclaimed_sla_hours' WHERE param_key = 'queue_unclaimed_sla';
UPDATE public.md_mpa_config SET param_key = 'queue_escalation_interval_hours' WHERE param_key = 'queue_escalation_repeat_interval';
UPDATE public.md_mpa_config SET param_key = 'admin_release_window_hours' WHERE param_key IN ('release_window_hours', 'admin_release_window');
UPDATE public.md_mpa_config SET param_key = 'sla_tier1_threshold_pct' WHERE param_key = 'tier1_threshold';
UPDATE public.md_mpa_config SET param_key = 'sla_tier2_threshold_pct' WHERE param_key = 'tier2_threshold';
UPDATE public.md_mpa_config SET param_key = 'sla_tier3_threshold_pct' WHERE param_key = 'tier3_threshold';
UPDATE public.md_mpa_config SET param_key = 'max_reassignments_per_verification' WHERE param_key = 'max_reassignments';
UPDATE public.md_mpa_config SET param_key = 'partially_available_threshold' WHERE param_key = 'partially_available_threshold';

-- Now upsert all 15 params with full metadata
INSERT INTO public.md_mpa_config (param_key, param_value, description, param_type, param_group, label, unit, min_value, max_value, is_critical)
VALUES
  ('domain_weight_l1_industry', '50', 'Weight for industry segment match in domain scoring', 'INTEGER', 'DOMAIN_WEIGHTS', 'Industry Match Weight (L1)', '%', '0', '100', true),
  ('domain_weight_l2_country', '30', 'Weight for country/HQ match in domain scoring', 'INTEGER', 'DOMAIN_WEIGHTS', 'Country Match Weight (L2)', '%', '0', '100', true),
  ('domain_weight_l3_org_type', '20', 'Weight for organization type match in domain scoring', 'INTEGER', 'DOMAIN_WEIGHTS', 'Org Type Match Weight (L3)', '%', '0', '100', true),
  ('default_max_concurrent_verifications', '10', 'Default maximum concurrent verifications per admin', 'INTEGER', 'CAPACITY', 'Default Max Concurrent Verifications', 'count', '1', '50', false),
  ('partially_available_threshold', '80', 'Workload percentage threshold for partially available status', 'INTEGER', 'CAPACITY', 'Partially Available Threshold', '%', '50', '100', false),
  ('minimum_admins_available', '1', 'Minimum number of admins that must remain available', 'INTEGER', 'CAPACITY', 'Minimum Admins Available', 'count', '1', '10', true),
  ('queue_unclaimed_sla_hours', '4', 'Hours before unclaimed queue entry triggers escalation', 'INTEGER', 'QUEUE', 'Unclaimed SLA Window', 'hours', '1', '72', false),
  ('queue_escalation_interval_hours', '2', 'Hours between repeated escalation notifications', 'INTEGER', 'QUEUE', 'Escalation Repeat Interval', 'hours', '1', '24', false),
  ('admin_release_window_hours', '2', 'Hours before admin can release a verification back to queue', 'INTEGER', 'QUEUE', 'Admin Release Window', 'hours', '1', '48', false),
  ('sla_tier1_threshold_pct', '80', 'SLA percentage threshold for Tier 1 warning', 'INTEGER', 'SLA_THRESHOLDS', 'Tier 1 Warning Threshold', '%', '10', '100', true),
  ('sla_tier2_threshold_pct', '100', 'SLA percentage threshold for Tier 2 breach', 'INTEGER', 'SLA_THRESHOLDS', 'Tier 2 Breach Threshold', '%', '50', '200', true),
  ('sla_tier3_threshold_pct', '150', 'SLA percentage threshold for Tier 3 critical escalation', 'INTEGER', 'SLA_THRESHOLDS', 'Tier 3 Critical Threshold', '%', '80', '300', true),
  ('executive_escalation_contact_id', NULL, 'UUID of the platform admin designated as executive escalation contact', 'UUID', 'ESCALATION', 'Executive Escalation Contact', NULL, NULL, NULL, true),
  ('max_reassignments_per_verification', '3', 'Maximum times a verification can be reassigned', 'INTEGER', 'REASSIGNMENT', 'Max Reassignments Per Verification', 'count', '1', '10', false),
  ('leave_reminder_lead_time_days', '1', 'Days before leave starts to send reminder notifications', 'INTEGER', 'REASSIGNMENT', 'Leave Reminder Lead Time', 'days', '1', '7', false),
  ('sla_duration', '48', 'SLA duration in hours for verification processing', 'INTEGER', 'QUEUE', 'SLA Duration', 'hours', '1', '168', true)
ON CONFLICT (param_key) DO UPDATE SET
  description = EXCLUDED.description,
  param_type = EXCLUDED.param_type,
  param_group = EXCLUDED.param_group,
  label = EXCLUDED.label,
  unit = EXCLUDED.unit,
  min_value = EXCLUDED.min_value,
  max_value = EXCLUDED.max_value,
  is_critical = EXCLUDED.is_critical,
  updated_at = NOW();

-- 1.4 RPC — update_config_param (API-07-01)
CREATE OR REPLACE FUNCTION public.update_config_param(
  p_param_key TEXT,
  p_new_value TEXT,
  p_change_reason TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_profile_id UUID;
  v_existing RECORD;
  v_old_value TEXT;
  v_int_val INTEGER;
  v_dec_val NUMERIC;
  v_min_val NUMERIC;
  v_max_val NUMERIC;
  v_sum INTEGER;
  v_t1 INTEGER;
  v_t2 INTEGER;
  v_t3 INTEGER;
BEGIN
  -- 1. Supervisor auth check
  SELECT id INTO v_admin_profile_id
    FROM public.platform_admin_profiles
   WHERE user_id = auth.uid()
     AND admin_tier = 'supervisor';

  IF v_admin_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PERMISSION_DENIED', 'detail', 'Supervisor access required');
  END IF;

  -- 2. Param existence check with row lock
  SELECT param_key, param_value, param_type, param_group, min_value, max_value
    INTO v_existing
    FROM public.md_mpa_config
   WHERE param_key = p_param_key
   FOR UPDATE;

  IF v_existing IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PARAM_NOT_FOUND', 'detail', 'Parameter not found: ' || p_param_key);
  END IF;

  v_old_value := v_existing.param_value;

  -- 3. NULL handling for UUID type (clearing executive contact)
  IF v_existing.param_type = 'UUID' AND (p_new_value IS NULL OR p_new_value = '') THEN
    -- Allow clearing UUID fields
    UPDATE public.md_mpa_config
       SET param_value = NULL,
           updated_at = NOW(),
           updated_by_id = v_admin_profile_id
     WHERE param_key = p_param_key;

    INSERT INTO public.md_mpa_config_audit (param_key, previous_value, new_value, changed_by_id, change_reason, ip_address)
    VALUES (p_param_key, v_old_value, 'NULL', v_admin_profile_id, p_change_reason, p_ip_address);

    RETURN jsonb_build_object('success', true, 'param_key', p_param_key, 'new_value', NULL);
  END IF;

  -- 4. Type validation
  IF v_existing.param_type = 'INTEGER' THEN
    BEGIN
      v_int_val := p_new_value::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'INVALID_TYPE', 'detail', 'Value must be an integer');
    END;
  ELSIF v_existing.param_type = 'DECIMAL' THEN
    BEGIN
      v_dec_val := p_new_value::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'INVALID_TYPE', 'detail', 'Value must be a decimal number');
    END;
  ELSIF v_existing.param_type = 'UUID' THEN
    -- Validate UUID format and existence in platform_admin_profiles
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM public.platform_admin_profiles WHERE id = p_new_value::UUID) THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_REFERENCE', 'detail', 'Referenced admin profile not found');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'INVALID_TYPE', 'detail', 'Value must be a valid UUID');
    END;
  ELSIF v_existing.param_type = 'BOOLEAN' THEN
    IF p_new_value NOT IN ('true', 'false') THEN
      RETURN jsonb_build_object('success', false, 'error', 'INVALID_TYPE', 'detail', 'Value must be true or false');
    END IF;
  END IF;

  -- 5. Range validation (for numeric types)
  IF v_existing.param_type IN ('INTEGER', 'DECIMAL') THEN
    IF v_existing.min_value IS NOT NULL THEN
      v_min_val := v_existing.min_value::NUMERIC;
      IF p_new_value::NUMERIC < v_min_val THEN
        RETURN jsonb_build_object('success', false, 'error', 'BELOW_MINIMUM', 'detail', 'Value must be >= ' || v_existing.min_value);
      END IF;
    END IF;
    IF v_existing.max_value IS NOT NULL THEN
      v_max_val := v_existing.max_value::NUMERIC;
      IF p_new_value::NUMERIC > v_max_val THEN
        RETURN jsonb_build_object('success', false, 'error', 'ABOVE_MAXIMUM', 'detail', 'Value must be <= ' || v_existing.max_value);
      END IF;
    END IF;
  END IF;

  -- 6. Domain weight sum validation (BR-MPA-014): L1+L2+L3 must = 100
  IF v_existing.param_group = 'DOMAIN_WEIGHTS' THEN
    SELECT
      CASE WHEN p_param_key = 'domain_weight_l1_industry' THEN p_new_value::INTEGER
           ELSE COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'domain_weight_l1_industry'), 50) END +
      CASE WHEN p_param_key = 'domain_weight_l2_country' THEN p_new_value::INTEGER
           ELSE COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'domain_weight_l2_country'), 30) END +
      CASE WHEN p_param_key = 'domain_weight_l3_org_type' THEN p_new_value::INTEGER
           ELSE COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'domain_weight_l3_org_type'), 20) END
    INTO v_sum;

    IF v_sum != 100 THEN
      RETURN jsonb_build_object('success', false, 'error', 'DOMAIN_WEIGHT_SUM_VIOLATION', 'detail', 'Domain weights must sum to 100. Current sum: ' || v_sum);
    END IF;
  END IF;

  -- 7. SLA tier ordering: T1 < T2 < T3
  IF v_existing.param_group = 'SLA_THRESHOLDS' THEN
    SELECT
      CASE WHEN p_param_key = 'sla_tier1_threshold_pct' THEN p_new_value::INTEGER
           ELSE COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'sla_tier1_threshold_pct'), 80) END,
      CASE WHEN p_param_key = 'sla_tier2_threshold_pct' THEN p_new_value::INTEGER
           ELSE COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'sla_tier2_threshold_pct'), 100) END,
      CASE WHEN p_param_key = 'sla_tier3_threshold_pct' THEN p_new_value::INTEGER
           ELSE COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'sla_tier3_threshold_pct'), 150) END
    INTO v_t1, v_t2, v_t3;

    IF NOT (v_t1 < v_t2 AND v_t2 < v_t3) THEN
      RETURN jsonb_build_object('success', false, 'error', 'SLA_TIER_ORDER_VIOLATION', 'detail', 'SLA thresholds must satisfy T1 < T2 < T3. Got: ' || v_t1 || ' / ' || v_t2 || ' / ' || v_t3);
    END IF;
  END IF;

  -- 8. Atomic: UPDATE config + INSERT audit
  UPDATE public.md_mpa_config
     SET param_value = p_new_value,
         updated_at = NOW(),
         updated_by_id = v_admin_profile_id
   WHERE param_key = p_param_key;

  INSERT INTO public.md_mpa_config_audit (param_key, previous_value, new_value, changed_by_id, change_reason, ip_address)
  VALUES (p_param_key, v_old_value, p_new_value, v_admin_profile_id, p_change_reason, p_ip_address);

  RETURN jsonb_build_object('success', true, 'param_key', p_param_key, 'new_value', p_new_value);
END;
$$;

-- 1.5 RPC — get_config (API-07-02)
CREATE OR REPLACE FUNCTION public.get_config()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_object_agg(
    param_key,
    CASE param_type
      WHEN 'INTEGER' THEN to_jsonb(param_value::INTEGER)
      WHEN 'DECIMAL' THEN to_jsonb(param_value::NUMERIC)
      WHEN 'BOOLEAN' THEN to_jsonb(param_value::BOOLEAN)
      ELSE to_jsonb(param_value)
    END
  )
  INTO v_result
  FROM public.md_mpa_config
  WHERE param_value IS NOT NULL;

  RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$;

-- 1.6 Update consuming RPCs to use canonical param keys
-- Update execute_auto_assignment to use new keys
CREATE OR REPLACE FUNCTION public.execute_auto_assignment(
  p_industry_segment_id UUID,
  p_hq_country_id UUID,
  p_org_type_id UUID,
  p_verification_id UUID,
  p_assignment_method TEXT DEFAULT 'auto'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_w_l1 INTEGER;
  v_w_l2 INTEGER;
  v_w_l3 INTEGER;
  v_best_admin_id UUID;
  v_best_score INTEGER := -1;
  v_admin RECORD;
  v_score INTEGER;
  v_s_l1 INTEGER;
  v_s_l2 INTEGER;
  v_s_l3 INTEGER;
  v_max_concurrent INTEGER;
  v_current_load INTEGER;
  v_assignment_id UUID;
  v_priority_tie_count INTEGER;
BEGIN
  -- Read weights from config using CANONICAL keys
  SELECT
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'domain_weight_l1_industry'), 50),
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'domain_weight_l2_country'), 30),
    COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'domain_weight_l3_org_type'), 20)
  INTO v_w_l1, v_w_l2, v_w_l3;

  -- Find best matching available admin
  FOR v_admin IN
    SELECT
      p.id AS admin_id,
      p.max_concurrent_verifications,
      p.expertise_industry_ids,
      p.expertise_country_ids,
      p.expertise_org_type_ids
    FROM public.platform_admin_profiles p
    WHERE p.is_active = TRUE
      AND p.availability_status IN ('available', 'partially_available')
      AND p.admin_tier IN ('admin', 'senior_admin')
  LOOP
    -- Check capacity
    SELECT COALESCE(p.max_concurrent_verifications,
      (SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'default_max_concurrent_verifications'))
    INTO v_max_concurrent
    FROM platform_admin_profiles p WHERE p.id = v_admin.admin_id;

    IF v_max_concurrent IS NULL THEN v_max_concurrent := 10; END IF;

    SELECT COUNT(*) INTO v_current_load
      FROM public.verification_assignments
     WHERE admin_id = v_admin.admin_id
       AND status = 'active';

    IF v_current_load >= v_max_concurrent THEN CONTINUE; END IF;

    -- L1: Industry match
    v_s_l1 := CASE WHEN p_industry_segment_id = ANY(v_admin.expertise_industry_ids) THEN v_w_l1 ELSE 0 END;
    -- L2: Country match (exact or wildcard)
    IF p_hq_country_id = ANY(v_admin.expertise_country_ids) THEN
      v_s_l2 := v_w_l2;
    ELSIF EXISTS (SELECT 1 FROM unnest(v_admin.expertise_country_ids) AS cid WHERE cid::TEXT = '*') THEN
      v_s_l2 := v_w_l2 / 2;
    ELSE
      v_s_l2 := 0;
    END IF;
    -- L3: Org type match
    v_s_l3 := CASE WHEN p_org_type_id = ANY(v_admin.expertise_org_type_ids) THEN v_w_l3 ELSE 0 END;

    v_score := v_s_l1 + v_s_l2 + v_s_l3;

    IF v_score > v_best_score THEN
      v_best_score := v_score;
      v_best_admin_id := v_admin.admin_id;
    END IF;
  END LOOP;

  -- No eligible admin found
  IF v_best_admin_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Create assignment
  INSERT INTO public.verification_assignments (
    verification_id, admin_id, assigned_at, status,
    domain_match_score, assignment_method
  ) VALUES (
    p_verification_id, v_best_admin_id, NOW(), 'active',
    v_best_score, p_assignment_method
  )
  RETURNING id INTO v_assignment_id;

  -- Update verification
  UPDATE public.provider_verification_requests
     SET lifecycle_status = 'assigned',
         assigned_admin_id = v_best_admin_id,
         updated_at = NOW()
   WHERE id = p_verification_id;

  RETURN v_assignment_id;
END;
$$;

-- Update reassign_verification to use canonical keys
CREATE OR REPLACE FUNCTION public.reassign_verification(
  p_verification_id UUID,
  p_reason TEXT,
  p_initiator TEXT DEFAULT 'ADMIN',
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verification RECORD;
  v_from_admin_id UUID;
  v_max_reassignments INT;
  v_audit_reason TEXT;
  v_new_assignment_id UUID;
BEGIN
  -- Read max from config with CANONICAL key
  SELECT COALESCE(param_value::INTEGER, 3)
    INTO v_max_reassignments
    FROM md_mpa_config
   WHERE param_key = 'max_reassignments_per_verification';
  IF v_max_reassignments IS NULL THEN
    v_max_reassignments := 3;
  END IF;

  -- Validate verification exists and is assigned
  SELECT pvr.id, pvr.lifecycle_status, pvr.assigned_admin_id, pvr.reassignment_count,
         pvr.industry_segment_id, pvr.hq_country_id, pvr.organization_type_id
    INTO v_verification
    FROM public.provider_verification_requests pvr
   WHERE pvr.id = p_verification_id;

  IF v_verification IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'VERIFICATION_NOT_FOUND');
  END IF;

  IF v_verification.lifecycle_status != 'assigned' THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_IN_ASSIGNED_STATUS');
  END IF;

  v_from_admin_id := v_verification.assigned_admin_id;

  -- BR-MPA-045: Limit check blocks ADMIN only
  IF p_initiator = 'ADMIN' AND v_verification.reassignment_count >= v_max_reassignments THEN
    RETURN jsonb_build_object('success', false, 'error', 'REASSIGNMENT_LIMIT_REACHED');
  END IF;

  -- Deactivate current assignment
  UPDATE public.verification_assignments
     SET status = 'reassigned',
         completed_at = NOW()
   WHERE verification_id = p_verification_id
     AND admin_id = v_from_admin_id
     AND status = 'active';

  -- Increment reassignment count
  UPDATE public.provider_verification_requests
     SET reassignment_count = COALESCE(reassignment_count, 0) + 1,
         updated_at = NOW()
   WHERE id = p_verification_id;

  -- Attempt auto-assignment with canonical method
  v_new_assignment_id := execute_auto_assignment(
    v_verification.industry_segment_id,
    v_verification.hq_country_id,
    v_verification.organization_type_id,
    p_verification_id,
    p_initiator
  );

  -- Audit log
  v_audit_reason := COALESCE(p_reason, 'Reassigned by ' || p_initiator);
  INSERT INTO public.verification_audit_log (
    verification_id, action, from_admin_id, to_admin_id,
    reason, performed_by, ip_address, created_at
  ) VALUES (
    p_verification_id, 'reassigned', v_from_admin_id,
    CASE WHEN v_new_assignment_id IS NOT NULL THEN
      (SELECT admin_id FROM verification_assignments WHERE id = v_new_assignment_id)
    ELSE NULL END,
    v_audit_reason, auth.uid(), p_ip_address, NOW()
  );

  -- If no admin found, place in open queue
  IF v_new_assignment_id IS NULL THEN
    PERFORM place_in_open_queue(p_verification_id);
    RETURN jsonb_build_object('success', true, 'result', 'PLACED_IN_QUEUE');
  END IF;

  RETURN jsonb_build_object('success', true, 'result', 'REASSIGNED', 'assignment_id', v_new_assignment_id);
END;
$$;

-- Add breadcrumb path name for system-config
-- (handled in AdminHeader pathNames map in frontend)
