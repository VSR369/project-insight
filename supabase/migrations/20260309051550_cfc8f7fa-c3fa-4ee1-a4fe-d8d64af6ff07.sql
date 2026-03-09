
-- ====================================================
-- 1. Insert org_verification_assignment_mode config param
-- ====================================================
INSERT INTO md_mpa_config (
  param_key, param_value, description, param_type, param_group,
  label, unit, min_value, max_value, is_critical, requires_restart
) VALUES (
  'org_verification_assignment_mode',
  'open_claim',
  'Controls whether seeker org verifications are auto-assigned via scoring engine or published for first-come-first-served claiming. Values: auto_assign, open_claim',
  'TEXT',
  'ASSIGNMENT',
  'Verification Assignment Mode',
  NULL, NULL, NULL,
  true,
  false
) ON CONFLICT DO NOTHING;

-- ====================================================
-- 2. Create claim_org_for_verification RPC (atomic claim with concurrency guard)
-- ====================================================
CREATE OR REPLACE FUNCTION public.claim_org_for_verification(
  p_org_id UUID,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_id UUID;
  v_current_status TEXT;
  v_claiming_admin_name TEXT;
  v_verification_id UUID;
  v_sla_duration INTEGER;
BEGIN
  SELECT verification_status INTO v_current_status
  FROM seeker_organizations WHERE id = p_org_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;

  IF v_current_status = 'under_verification' THEN
    SELECT pap.full_name INTO v_claiming_admin_name
    FROM platform_admin_verifications pav
    JOIN platform_admin_profiles pap ON pap.id = pav.assigned_admin_id
    WHERE pav.organization_id = p_org_id AND pav.is_current = true;
    RETURN jsonb_build_object(
      'success', false, 'error', 'already_claimed',
      'claimed_by', COALESCE(v_claiming_admin_name, 'Another admin')
    );
  END IF;

  IF v_current_status != 'payment_submitted' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization is not in a claimable status (current: ' || v_current_status || ')'
    );
  END IF;

  -- Atomic claim: update only if still payment_submitted
  UPDATE seeker_organizations
  SET verification_status = 'under_verification',
      verification_started_at = NOW(),
      updated_at = NOW(), updated_by = p_admin_id
  WHERE id = p_org_id AND verification_status = 'payment_submitted'
  RETURNING id INTO v_updated_id;

  IF v_updated_id IS NULL THEN
    SELECT pap.full_name INTO v_claiming_admin_name
    FROM platform_admin_verifications pav
    JOIN platform_admin_profiles pap ON pap.id = pav.assigned_admin_id
    WHERE pav.organization_id = p_org_id AND pav.is_current = true;
    RETURN jsonb_build_object(
      'success', false, 'error', 'already_claimed',
      'claimed_by', COALESCE(v_claiming_admin_name, 'Another admin')
    );
  END IF;

  SELECT COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'sla_hours_default'), 72)
  INTO v_sla_duration;

  UPDATE platform_admin_verifications
  SET is_current = false, updated_at = NOW()
  WHERE organization_id = p_org_id AND is_current = true;

  INSERT INTO platform_admin_verifications (
    organization_id, status, is_current, assigned_admin_id,
    assignment_method, sla_duration_seconds, sla_start_at, created_at
  ) VALUES (
    p_org_id, 'Under_Verification', true, p_admin_id,
    'open_claim', v_sla_duration * 3600, NOW(), NOW()
  ) RETURNING id INTO v_verification_id;

  RETURN jsonb_build_object('success', true, 'verification_id', v_verification_id);
END;
$$;

-- ====================================================
-- 3. Update fn_auto_assign_on_payment_submitted trigger to check mode
-- ====================================================
CREATE OR REPLACE FUNCTION public.fn_auto_assign_on_payment_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verification_id UUID;
  v_industry_ids UUID[];
  v_result JSONB;
  v_sla_duration INTEGER;
  v_assignment_mode TEXT;
BEGIN
  IF NEW.verification_status != 'payment_submitted' THEN RETURN NEW; END IF;
  IF OLD.verification_status IS NOT DISTINCT FROM 'payment_submitted' THEN RETURN NEW; END IF;

  SELECT COALESCE(
    (SELECT param_value FROM md_mpa_config WHERE param_key = 'org_verification_assignment_mode'),
    'open_claim'
  ) INTO v_assignment_mode;

  SELECT COALESCE((SELECT param_value::INTEGER FROM md_mpa_config WHERE param_key = 'sla_hours_default'), 72)
  INTO v_sla_duration;

  UPDATE platform_admin_verifications
  SET is_current = false, updated_at = NOW()
  WHERE organization_id = NEW.id AND is_current = true;

  IF v_assignment_mode = 'auto_assign' THEN
    SELECT COALESCE(array_agg(soi.industry_id), ARRAY[]::UUID[])
    INTO v_industry_ids
    FROM seeker_org_industries soi WHERE soi.organization_id = NEW.id;

    INSERT INTO platform_admin_verifications (
      organization_id, status, is_current, sla_duration_seconds, created_at
    ) VALUES (
      NEW.id, 'Pending_Assignment', true, v_sla_duration * 3600, NOW()
    ) RETURNING id INTO v_verification_id;

    SELECT execute_auto_assignment(
      p_verification_id := v_verification_id,
      p_industry_segments := v_industry_ids,
      p_hq_country := NEW.hq_country_id,
      p_org_type := NEW.organization_type_id
    ) INTO v_result;

    IF v_result IS NOT NULL AND (v_result->>'success')::BOOLEAN = true THEN
      UPDATE platform_admin_verifications
      SET status = 'Under_Verification',
          assigned_admin_id = (v_result->>'assigned_to')::UUID,
          assignment_method = v_result->>'method',
          sla_start_at = NOW(), updated_at = NOW()
      WHERE id = v_verification_id;
    END IF;
  ELSE
    INSERT INTO platform_admin_verifications (
      organization_id, status, is_current, sla_duration_seconds,
      assigned_admin_id, assignment_method, created_at
    ) VALUES (
      NEW.id, 'Pending_Assignment', true, v_sla_duration * 3600,
      NULL, 'open_claim', NOW()
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Auto-assignment trigger failed for org %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;
