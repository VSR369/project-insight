
-- Drop the duplicate table created by failed migration (it has wrong columns)
DROP TABLE IF EXISTS public.seeker_org_industries CASCADE;

-- It already exists with correct schema — skip table creation

-- GAP-17: supervisor_reassign_to_self RPC
CREATE OR REPLACE FUNCTION public.supervisor_reassign_to_self(p_verification_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_admin_name TEXT;
  v_is_supervisor BOOLEAN;
  v_old_admin_id UUID;
  v_old_assignment_id UUID;
BEGIN
  SELECT id, full_name, COALESCE(is_supervisor, admin_tier = 'supervisor')
  INTO v_admin_id, v_admin_name, v_is_supervisor
  FROM platform_admin_profiles
  WHERE user_id = auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ADMIN_NOT_FOUND');
  END IF;

  IF NOT v_is_supervisor THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_SUPERVISOR');
  END IF;

  SELECT va.id, va.assigned_admin_id
  INTO v_old_assignment_id, v_old_admin_id
  FROM verification_assignments va
  WHERE va.verification_id = p_verification_id AND va.is_current = true;

  IF v_old_assignment_id IS NOT NULL THEN
    UPDATE verification_assignments
    SET is_current = false, released_at = now(), release_reason = 'supervisor_reassigned'
    WHERE id = v_old_assignment_id;
  END IF;

  INSERT INTO verification_assignments (
    verification_id, assigned_admin_id, assignment_method, is_current, domain_match_score
  ) VALUES (
    p_verification_id, v_admin_id, 'supervisor_override', true, 0
  );

  UPDATE platform_admin_verifications
  SET assigned_admin_id = v_admin_id,
      assignment_method = 'supervisor_override',
      status = 'Under_Verification',
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = p_verification_id;

  INSERT INTO verification_assignment_log (
    verification_id, event_type, from_admin_id, to_admin_id, initiator, reason
  ) VALUES (
    p_verification_id, 'SUPERVISOR_REASSIGN', v_old_admin_id, v_admin_id,
    v_admin_name, 'Supervisor reassigned to self'
  );

  RETURN jsonb_build_object('success', true, 'assigned_to', v_admin_name);
END;
$$;
