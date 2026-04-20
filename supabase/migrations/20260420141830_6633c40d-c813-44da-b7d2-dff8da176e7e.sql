-- ============================================================================
-- S7C — Creator approval pause between Phase 3 and Phase 4
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) request_creator_approval(p_challenge_id, p_user_id)
--    Pre-conditions:
--      lc_compliance_complete = true AND fc_compliance_complete = true
--      AND creator_approval_status NOT IN ('pending','approved')
--    Effects:
--      creator_approval_status        = 'pending'
--      creator_approval_requested_at  = now()
--      phase_status                   = 'CR_APPROVAL_PENDING'
--      audit_trail row, status_history row, notifications to active CR users
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_creator_approval(
  p_challenge_id uuid,
  p_user_id      uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_challenge RECORD;
  v_creator_id uuid;
  v_title text;
BEGIN
  SELECT id, lc_compliance_complete, fc_compliance_complete,
         creator_approval_status, current_phase, title, created_by
    INTO v_challenge
    FROM public.challenges
    WHERE id = p_challenge_id;

  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  IF v_challenge.lc_compliance_complete IS DISTINCT FROM TRUE
     OR v_challenge.fc_compliance_complete IS DISTINCT FROM TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Compliance not complete');
  END IF;

  -- Idempotent: if already pending or approved, no-op succeed.
  IF v_challenge.creator_approval_status IN ('pending', 'approved') THEN
    RETURN jsonb_build_object(
      'success', true,
      'phase_advanced', false,
      'awaiting', 'creator_approval',
      'idempotent', true,
      'creator_approval_status', v_challenge.creator_approval_status
    );
  END IF;

  UPDATE public.challenges
     SET creator_approval_status       = 'pending',
         creator_approval_requested_at = now(),
         phase_status                  = 'CR_APPROVAL_PENDING',
         updated_at                    = now(),
         updated_by                    = p_user_id
   WHERE id = p_challenge_id;

  v_title := v_challenge.title;

  -- Audit trail entry
  INSERT INTO public.audit_trail (user_id, challenge_id, action, method, details)
  VALUES (
    p_user_id, p_challenge_id, 'CREATOR_APPROVAL_REQUESTED', 'SYSTEM',
    jsonb_build_object(
      'from_status', 'PENDING_LC_REVIEW',
      'to_status',   'PENDING_CREATOR_APPROVAL'
    )
  );

  -- Status history (best-effort)
  BEGIN
    INSERT INTO public.challenge_status_history
      (challenge_id, from_status, to_status, changed_by, role, trigger_event, metadata)
    VALUES (
      p_challenge_id, 'PENDING_LC_REVIEW', 'PENDING_CREATOR_APPROVAL',
      p_user_id, 'SYSTEM', 'CREATOR_APPROVAL_REQUESTED',
      jsonb_build_object('phase', v_challenge.current_phase)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Schema may differ; do not block the workflow.
    NULL;
  END;

  -- Notify all active CR users on the challenge (deep-link to creator-review).
  INSERT INTO public.cogni_notifications (user_id, challenge_id, notification_type, title, message, action_url)
  SELECT DISTINCT ucr.user_id,
         p_challenge_id,
         'creator_approval_requested',
         'Your challenge is ready for approval',
         COALESCE(
           'Curation for "' || v_title || '" is complete. Please review and approve to proceed to publication.',
           'Curation is complete. Please review and approve to proceed to publication.'
         ),
         '/cogni/challenges/' || p_challenge_id::text || '/creator-review'
    FROM public.user_challenge_roles ucr
   WHERE ucr.challenge_id = p_challenge_id
     AND ucr.role_code   = 'CR'
     AND ucr.is_active   = true;

  -- Belt-and-braces: notify the Creator who originally created the challenge,
  -- in case the CR role grant is missing.
  IF v_challenge.created_by IS NOT NULL THEN
    INSERT INTO public.cogni_notifications (user_id, challenge_id, notification_type, title, message, action_url)
    SELECT v_challenge.created_by, p_challenge_id,
           'creator_approval_requested',
           'Your challenge is ready for approval',
           'Curation is complete. Please review and approve to proceed to publication.',
           '/cogni/challenges/' || p_challenge_id::text || '/creator-review'
     WHERE NOT EXISTS (
       SELECT 1 FROM public.user_challenge_roles ucr
        WHERE ucr.challenge_id = p_challenge_id
          AND ucr.user_id      = v_challenge.created_by
          AND ucr.role_code    = 'CR'
          AND ucr.is_active    = true
     );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'phase_advanced', false,
    'awaiting', 'creator_approval',
    'creator_approval_status', 'pending'
  );
END;
$function$;

-- ----------------------------------------------------------------------------
-- 2) complete_legal_review — modified to call request_creator_approval
--    instead of advancing phase when both compliance flags are true.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_legal_review(
  p_challenge_id uuid,
  p_user_id      uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_challenge RECORD;
  v_has_role BOOLEAN;
  v_compliance_phase INTEGER;
  v_creator_approval_result JSONB;
BEGIN
  SELECT id, current_phase, lc_compliance_complete, fc_compliance_complete,
         COALESCE(governance_mode_override, governance_profile, 'STRUCTURED') AS gov_mode
    INTO v_challenge
    FROM public.challenges
    WHERE id = p_challenge_id;

  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  SELECT phase_number INTO v_compliance_phase
    FROM public.md_lifecycle_phase_config
   WHERE governance_mode = v_challenge.gov_mode
     AND phase_type      = 'parallel_compliance'
     AND is_active       = true
   LIMIT 1;
  IF v_compliance_phase IS NULL THEN v_compliance_phase := 3; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_challenge_roles
     WHERE user_id = p_user_id
       AND challenge_id = p_challenge_id
       AND role_code = 'LC'
       AND is_active = true
  ) INTO v_has_role;

  IF NOT v_has_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'No LC role');
  END IF;

  IF v_challenge.current_phase != v_compliance_phase THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Not in compliance phase. Current: %s', v_challenge.current_phase)
    );
  END IF;

  UPDATE public.challenges
     SET lc_compliance_complete = true,
         updated_at = now(),
         updated_by = p_user_id
   WHERE id = p_challenge_id;

  INSERT INTO public.audit_trail (user_id, challenge_id, action, method, details)
  VALUES (
    p_user_id, p_challenge_id, 'LEGAL_REVIEW_COMPLETED', 'HUMAN',
    jsonb_build_object('flag', 'lc_compliance_complete')
  );

  -- New behaviour: if FC is also complete, request Creator approval (do NOT
  -- advance to Phase 4). Phase stays at the compliance phase.
  IF v_challenge.fc_compliance_complete = true THEN
    SELECT public.request_creator_approval(p_challenge_id, p_user_id)
      INTO v_creator_approval_result;
    RETURN jsonb_build_object(
      'success', true,
      'phase_advanced', false,
      'awaiting', 'creator_approval',
      'current_phase', v_compliance_phase,
      'creator_approval', v_creator_approval_result
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'phase_advanced', false,
    'current_phase', v_compliance_phase,
    'waiting_for', 'fc_compliance_complete'
  );
END;
$function$;

-- ----------------------------------------------------------------------------
-- 3) complete_financial_review — same change as above.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_financial_review(
  p_challenge_id uuid,
  p_user_id      uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_challenge RECORD;
  v_has_role BOOLEAN;
  v_compliance_phase INTEGER;
  v_creator_approval_result JSONB;
BEGIN
  SELECT id, current_phase, lc_compliance_complete, fc_compliance_complete,
         COALESCE(governance_mode_override, governance_profile, 'STRUCTURED') AS gov_mode
    INTO v_challenge
    FROM public.challenges
    WHERE id = p_challenge_id;

  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  SELECT phase_number INTO v_compliance_phase
    FROM public.md_lifecycle_phase_config
   WHERE governance_mode = v_challenge.gov_mode
     AND phase_type      = 'parallel_compliance'
     AND is_active       = true
   LIMIT 1;
  IF v_compliance_phase IS NULL THEN v_compliance_phase := 3; END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_challenge_roles
     WHERE user_id = p_user_id
       AND challenge_id = p_challenge_id
       AND role_code = 'FC'
       AND is_active = true
  ) INTO v_has_role;

  IF NOT v_has_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'No FC role');
  END IF;

  IF v_challenge.current_phase != v_compliance_phase THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Not in compliance phase. Current: %s', v_challenge.current_phase)
    );
  END IF;

  UPDATE public.challenges
     SET fc_compliance_complete = true,
         updated_at = now(),
         updated_by = p_user_id
   WHERE id = p_challenge_id;

  INSERT INTO public.audit_trail (user_id, challenge_id, action, method, details)
  VALUES (
    p_user_id, p_challenge_id, 'FINANCIAL_REVIEW_COMPLETED', 'HUMAN',
    jsonb_build_object('flag', 'fc_compliance_complete')
  );

  IF v_challenge.lc_compliance_complete = true THEN
    SELECT public.request_creator_approval(p_challenge_id, p_user_id)
      INTO v_creator_approval_result;
    RETURN jsonb_build_object(
      'success', true,
      'phase_advanced', false,
      'awaiting', 'creator_approval',
      'current_phase', v_compliance_phase,
      'creator_approval', v_creator_approval_result
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'phase_advanced', false,
    'current_phase', v_compliance_phase,
    'waiting_for', 'lc_compliance_complete'
  );
END;
$function$;

-- ----------------------------------------------------------------------------
-- 4) creator_finalize_approval(p_challenge_id, p_user_id, p_decision text)
--    Decisions: 'approved' | 'changes_requested'
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.creator_finalize_approval(
  p_challenge_id uuid,
  p_user_id      uuid,
  p_decision     text,
  p_reason       text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_has_role BOOLEAN;
  v_phase_result JSONB;
BEGIN
  IF p_decision NOT IN ('approved', 'changes_requested') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid decision');
  END IF;

  -- Caller must hold CR role (or be challenge creator) on this challenge.
  SELECT EXISTS(
    SELECT 1 FROM public.user_challenge_roles
     WHERE user_id = p_user_id
       AND challenge_id = p_challenge_id
       AND role_code = 'CR'
       AND is_active = true
  ) OR EXISTS(
    SELECT 1 FROM public.challenges
     WHERE id = p_challenge_id AND created_by = p_user_id
  ) INTO v_has_role;

  IF NOT v_has_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'Caller is not the Creator');
  END IF;

  IF p_decision = 'approved' THEN
    UPDATE public.challenges
       SET creator_approval_status = 'approved',
           creator_approved_at     = now(),
           creator_approval_notes  = COALESCE(p_reason, creator_approval_notes),
           phase_status            = 'READY_TO_PUBLISH',
           updated_at              = now(),
           updated_by              = p_user_id
     WHERE id = p_challenge_id;

    INSERT INTO public.audit_trail (user_id, challenge_id, action, method, details)
    VALUES (
      p_user_id, p_challenge_id, 'CREATOR_APPROVED', 'HUMAN',
      jsonb_build_object('decision', 'approved')
    );

    BEGIN
      INSERT INTO public.challenge_status_history
        (challenge_id, from_status, to_status, changed_by, role, trigger_event)
      VALUES (
        p_challenge_id, 'PENDING_CREATOR_APPROVAL', 'CREATOR_APPROVED',
        p_user_id, 'CR', 'CREATOR_FINALIZE_APPROVAL'
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Advance to Phase 4 (Publication) via the standard engine.
    SELECT public.complete_phase(p_challenge_id, p_user_id) INTO v_phase_result;

    -- Notify Curator(s) so they know it's ready to publish.
    INSERT INTO public.cogni_notifications (user_id, challenge_id, notification_type, title, message, action_url)
    SELECT DISTINCT ucr.user_id, p_challenge_id, 'creator_approved',
           'Creator approved the challenge',
           'The Creator has approved this challenge. It is now ready for publication.',
           '/cogni/challenges/' || p_challenge_id::text || '/publish'
      FROM public.user_challenge_roles ucr
     WHERE ucr.challenge_id = p_challenge_id
       AND ucr.role_code   = 'CU'
       AND ucr.is_active   = true;

    RETURN jsonb_build_object(
      'success', true,
      'decision', 'approved',
      'phase_advanced', true,
      'phase_result', v_phase_result
    );
  END IF;

  -- Decision = 'changes_requested'
  UPDATE public.challenges
     SET creator_approval_status = 'changes_requested',
         creator_approval_notes  = COALESCE(p_reason, creator_approval_notes),
         phase_status            = 'CR_CHANGES_REQUESTED',
         pass3_stale             = true,
         updated_at              = now(),
         updated_by              = p_user_id
   WHERE id = p_challenge_id;

  INSERT INTO public.audit_trail (user_id, challenge_id, action, method, details)
  VALUES (
    p_user_id, p_challenge_id, 'CREATOR_CHANGES_REQUESTED', 'HUMAN',
    jsonb_build_object('decision', 'changes_requested', 'reason', p_reason)
  );

  BEGIN
    INSERT INTO public.challenge_status_history
      (challenge_id, from_status, to_status, changed_by, role, trigger_event, metadata)
    VALUES (
      p_challenge_id, 'PENDING_CREATOR_APPROVAL', 'CREATOR_CHANGES_REQUESTED',
      p_user_id, 'CR', 'CREATOR_FINALIZE_APPROVAL',
      jsonb_build_object('reason', p_reason)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Notify Curator(s) and LC(s) so they can re-curate / re-run Pass 3.
  INSERT INTO public.cogni_notifications (user_id, challenge_id, notification_type, title, message, action_url)
  SELECT DISTINCT ucr.user_id, p_challenge_id, 'creator_changes_requested',
         'Creator requested changes',
         COALESCE('Creator feedback: ' || left(p_reason, 200), 'The Creator has requested re-curation.'),
         '/cogni/challenges/' || p_challenge_id::text || '/view'
    FROM public.user_challenge_roles ucr
   WHERE ucr.challenge_id = p_challenge_id
     AND ucr.role_code IN ('CU', 'LC')
     AND ucr.is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'decision', 'changes_requested',
    'phase_advanced', false
  );
END;
$function$;

-- ----------------------------------------------------------------------------
-- 5) Backfill: any challenge stuck with both compliance flags true at
--    Phase 3 and creator_approval_status NULL/'not_required' should now
--    enter the Creator-approval pause.
--
--    `not_required` was the legacy default — under the new flow, once both
--    LC and FC have signed off the Creator must explicitly approve.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, created_by
      FROM public.challenges
     WHERE lc_compliance_complete = true
       AND fc_compliance_complete = true
       AND current_phase = 3
       AND (creator_approval_status IS NULL OR creator_approval_status NOT IN ('pending', 'approved'))
  LOOP
    PERFORM public.request_creator_approval(rec.id, COALESCE(rec.created_by, '00000000-0000-0000-0000-000000000000'::uuid));
  END LOOP;
END;
$$;

-- ============================================================================
-- Permissions: keep RPCs callable by authenticated users; SECURITY DEFINER
-- already enforces business rules internally.
-- ============================================================================
REVOKE ALL ON FUNCTION public.request_creator_approval(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.creator_finalize_approval(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_creator_approval(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.creator_finalize_approval(uuid, uuid, text, text) TO authenticated;