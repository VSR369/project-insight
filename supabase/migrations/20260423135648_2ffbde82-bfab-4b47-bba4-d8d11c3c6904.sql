CREATE OR REPLACE FUNCTION public.complete_curator_compliance(
  p_challenge_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge          record;
  v_governance         text;
  v_creator_required   boolean;
  v_complete_result    jsonb;
  v_request_result     jsonb;
BEGIN
  SELECT id, current_phase, governance_profile, operating_model,
         extended_brief, cu_compliance_mode, lc_compliance_complete,
         fc_compliance_complete, creator_approval_status, created_by
  INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_challenge_roles
    WHERE challenge_id = p_challenge_id AND user_id = p_user_id
      AND role_code = 'CU' AND is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the assigned Curator can complete compliance');
  END IF;

  v_governance := COALESCE(v_challenge.governance_profile, 'STRUCTURED');
  IF v_governance = 'LIGHTWEIGHT' THEN v_governance := 'QUICK'; END IF;
  IF v_governance = 'ENTERPRISE' THEN v_governance := 'CONTROLLED'; END IF;

  IF v_governance <> 'STRUCTURED' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'complete_curator_compliance is only valid for STRUCTURED governance');
  END IF;

  IF NOT COALESCE(v_challenge.cu_compliance_mode, false) THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Curator compliance mode not enabled — call send_to_legal_review first');
  END IF;

  IF v_challenge.lc_compliance_complete = true
     AND v_challenge.fc_compliance_complete = true
     AND v_challenge.creator_approval_status IN ('pending', 'approved') THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true);
  END IF;

  UPDATE public.challenges
     SET lc_compliance_complete = true,
         fc_compliance_complete = true,
         updated_at = now(),
         updated_by = p_user_id
   WHERE id = p_challenge_id;

  v_creator_required := COALESCE(
    (v_challenge.extended_brief ->> 'creator_approval_required')::boolean,
    false
  );

  IF v_creator_required THEN
    BEGIN
      v_request_result := public.request_creator_approval(p_challenge_id, p_user_id);
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false,
        'error', 'request_creator_approval failed: ' || SQLERRM);
    END;

    INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
    VALUES (p_challenge_id, p_user_id, 'CURATOR_COMPLIANCE_COMPLETE', 'HUMAN',
      jsonb_build_object('next', 'creator_approval_pending'), p_user_id);

    RETURN jsonb_build_object('success', true, 'awaiting', 'creator_approval', 'detail', v_request_result);
  ELSE
    BEGIN
      v_complete_result := public.complete_phase(p_challenge_id, p_user_id);
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false,
        'error', 'complete_phase failed: ' || SQLERRM);
    END;

    UPDATE public.challenges
       SET creator_approval_status = 'not_required'
     WHERE id = p_challenge_id
       AND (creator_approval_status IS NULL OR creator_approval_status = 'not_required');

    INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
    VALUES (p_challenge_id, p_user_id, 'CURATOR_COMPLIANCE_COMPLETE', 'HUMAN',
      jsonb_build_object('next', 'auto_published'), p_user_id);

    RETURN jsonb_build_object('success', true, 'awaiting', 'publication', 'detail', v_complete_result);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_legal_review(
  p_challenge_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge   record;
  v_governance  text;
  v_curator_id  uuid;
BEGIN
  SELECT id, current_phase, governance_profile, operating_model,
         lc_compliance_complete, fc_compliance_complete, creator_approval_status
  INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_challenge_roles
    WHERE challenge_id = p_challenge_id AND user_id = p_user_id
      AND role_code = 'LC' AND is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the assigned Legal Counsel can complete legal review');
  END IF;

  v_governance := COALESCE(v_challenge.governance_profile, 'STRUCTURED');
  IF v_governance = 'ENTERPRISE' THEN v_governance := 'CONTROLLED'; END IF;
  IF v_governance = 'LIGHTWEIGHT' THEN v_governance := 'QUICK'; END IF;

  IF v_governance <> 'CONTROLLED' THEN
    RAISE EXCEPTION 'complete_legal_review is only valid for CONTROLLED governance (got %)', v_governance;
  END IF;

  UPDATE public.challenges
     SET lc_compliance_complete = true,
         updated_at = now(),
         updated_by = p_user_id
   WHERE id = p_challenge_id;

  IF v_challenge.fc_compliance_complete = true THEN
    UPDATE public.challenges
       SET creator_approval_status = 'pending_curator_review',
           phase_status = 'AWAITING_CURATOR_PACK_REVIEW',
           updated_at = now(),
           updated_by = p_user_id
     WHERE id = p_challenge_id;

    SELECT user_id INTO v_curator_id
    FROM public.user_challenge_roles
    WHERE challenge_id = p_challenge_id AND role_code = 'CU' AND is_active = true
    LIMIT 1;

    IF v_curator_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, deep_link, metadata, created_by)
      VALUES (
        v_curator_id, 'PACK_READY_FOR_REVIEW',
        'Pack ready for your review',
        'Legal and Financial reviews are complete. Review and forward the pack to the Creator.',
        '/cogni/curation/' || p_challenge_id,
        jsonb_build_object('challenge_id', p_challenge_id),
        p_user_id
      );
    END IF;

    INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
    VALUES (p_challenge_id, p_user_id, 'LEGAL_REVIEW_COMPLETE', 'HUMAN',
      jsonb_build_object('pack_ready', true), p_user_id);

    RETURN jsonb_build_object('success', true, 'awaiting', 'curator_pack_review');
  END IF;

  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
  VALUES (p_challenge_id, p_user_id, 'LEGAL_REVIEW_COMPLETE', 'HUMAN',
    jsonb_build_object('awaiting_fc', true), p_user_id);

  RETURN jsonb_build_object('success', true, 'awaiting', 'financial_compliance');
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_financial_review(
  p_challenge_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge   record;
  v_governance  text;
  v_curator_id  uuid;
BEGIN
  SELECT id, current_phase, governance_profile, operating_model,
         lc_compliance_complete, fc_compliance_complete, creator_approval_status
  INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_challenge_roles
    WHERE challenge_id = p_challenge_id AND user_id = p_user_id
      AND role_code = 'FC' AND is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the assigned Financial Counsel can complete financial review');
  END IF;

  v_governance := COALESCE(v_challenge.governance_profile, 'STRUCTURED');
  IF v_governance = 'ENTERPRISE' THEN v_governance := 'CONTROLLED'; END IF;
  IF v_governance = 'LIGHTWEIGHT' THEN v_governance := 'QUICK'; END IF;

  IF v_governance <> 'CONTROLLED' THEN
    RAISE EXCEPTION 'complete_financial_review is only valid for CONTROLLED governance (got %)', v_governance;
  END IF;

  UPDATE public.challenges
     SET fc_compliance_complete = true,
         updated_at = now(),
         updated_by = p_user_id
   WHERE id = p_challenge_id;

  IF v_challenge.lc_compliance_complete = true THEN
    UPDATE public.challenges
       SET creator_approval_status = 'pending_curator_review',
           phase_status = 'AWAITING_CURATOR_PACK_REVIEW',
           updated_at = now(),
           updated_by = p_user_id
     WHERE id = p_challenge_id;

    SELECT user_id INTO v_curator_id
    FROM public.user_challenge_roles
    WHERE challenge_id = p_challenge_id AND role_code = 'CU' AND is_active = true
    LIMIT 1;

    IF v_curator_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, deep_link, metadata, created_by)
      VALUES (
        v_curator_id, 'PACK_READY_FOR_REVIEW',
        'Pack ready for your review',
        'Legal and Financial reviews are complete. Review and forward the pack to the Creator.',
        '/cogni/curation/' || p_challenge_id,
        jsonb_build_object('challenge_id', p_challenge_id),
        p_user_id
      );
    END IF;

    INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
    VALUES (p_challenge_id, p_user_id, 'FINANCIAL_REVIEW_COMPLETE', 'HUMAN',
      jsonb_build_object('pack_ready', true), p_user_id);

    RETURN jsonb_build_object('success', true, 'awaiting', 'curator_pack_review');
  END IF;

  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
  VALUES (p_challenge_id, p_user_id, 'FINANCIAL_REVIEW_COMPLETE', 'HUMAN',
    jsonb_build_object('awaiting_lc', true), p_user_id);

  RETURN jsonb_build_object('success', true, 'awaiting', 'financial_compliance');
END;
$$;

CREATE OR REPLACE FUNCTION public.request_creator_approval(
  p_challenge_id uuid,
  p_user_id uuid
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

  INSERT INTO public.audit_trail (user_id, challenge_id, action, method, details)
  VALUES (
    p_user_id, p_challenge_id, 'CREATOR_APPROVAL_REQUESTED', 'HUMAN',
    jsonb_build_object(
      'from_status', 'PENDING_LC_REVIEW',
      'to_status',   'PENDING_CREATOR_APPROVAL'
    )
  );

  BEGIN
    INSERT INTO public.challenge_status_history
      (challenge_id, from_status, to_status, changed_by, role, trigger_event, metadata)
    VALUES (
      p_challenge_id, 'PENDING_LC_REVIEW', 'PENDING_CREATOR_APPROVAL',
      p_user_id, 'SYSTEM', 'CREATOR_APPROVAL_REQUESTED',
      jsonb_build_object('phase', v_challenge.current_phase)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

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

CREATE OR REPLACE FUNCTION public.complete_phase(p_challenge_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
  v_current_phase INTEGER;
  v_next_phase INTEGER;
  v_actor_role TEXT;
  v_phase_config RECORD;
  v_gov_mode TEXT;
  v_creator_id UUID;
  v_role TEXT;
  v_temp_creator_status TEXT;
BEGIN
  SELECT c.* INTO v_challenge FROM public.challenges c WHERE c.id = p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  v_current_phase := v_challenge.current_phase;
  IF v_current_phase >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already at final phase');
  END IF;

  SELECT role_code INTO v_actor_role
  FROM public.user_challenge_roles
  WHERE challenge_id = p_challenge_id AND user_id = p_user_id AND is_active = true
  ORDER BY CASE role_code
    WHEN 'CU' THEN 1 WHEN 'FC' THEN 2 WHEN 'LC' THEN 3 WHEN 'CR' THEN 4 ELSE 99 END
  LIMIT 1;

  IF v_actor_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User has no active role on this challenge');
  END IF;

  v_gov_mode := COALESCE(v_challenge.governance_mode_override, v_challenge.governance_profile, 'STRUCTURED');
  IF v_gov_mode = 'LIGHTWEIGHT' THEN v_gov_mode := 'QUICK'; END IF;
  IF v_gov_mode = 'ENTERPRISE' THEN v_gov_mode := 'CONTROLLED'; END IF;

  SELECT * INTO v_phase_config
  FROM public.md_lifecycle_phase_config
  WHERE phase_number = v_current_phase AND governance_mode = v_gov_mode AND is_active = true
  LIMIT 1;

  IF v_phase_config IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', format('No lifecycle config for phase %s / %s', v_current_phase, v_gov_mode));
  END IF;

  IF NOT (v_actor_role = ANY(COALESCE(v_phase_config.allowed_role_codes, ARRAY[]::text[]))) THEN
    RETURN jsonb_build_object('success', false, 'error', format('Role %s cannot complete phase %s', v_actor_role, v_current_phase));
  END IF;

  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, phase_from, phase_to, details)
  VALUES (
    p_challenge_id,
    p_user_id,
    'PHASE_COMPLETED',
    'HUMAN',
    v_current_phase,
    v_current_phase,
    jsonb_build_object('phase_name', v_phase_config.phase_name, 'governance_mode', v_gov_mode)
  );

  IF COALESCE(v_phase_config.is_terminal, false) THEN
    UPDATE public.challenges
    SET phase_status = 'COMPLETED',
        updated_at = now(),
        updated_by = p_user_id
    WHERE id = p_challenge_id;

    RETURN jsonb_build_object('success', true, 'current_phase', v_current_phase, 'completed', true);
  END IF;

  v_next_phase := v_current_phase + 1;

  UPDATE public.challenges
  SET current_phase = v_next_phase,
      phase_status = CASE WHEN v_next_phase = 4 THEN 'PUBLISHED' ELSE COALESCE(phase_status, 'ACTIVE') END,
      creator_approval_status = CASE
        WHEN COALESCE(creator_approval_status, 'not_required') IN ('pending', 'rejected') THEN creator_approval_status
        ELSE 'not_required'
      END,
      published_at = CASE WHEN v_next_phase = 4 THEN COALESCE(published_at, now()) ELSE published_at END,
      updated_at = now(),
      updated_by = p_user_id
  WHERE id = p_challenge_id;

  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, phase_from, phase_to)
  VALUES (p_challenge_id, p_user_id, 'PHASE_ADVANCED', 'SYSTEM', v_current_phase, v_next_phase);

  IF v_current_phase = 1 AND v_next_phase = 2 THEN
    BEGIN
      SELECT created_by INTO v_creator_id FROM public.challenges WHERE id = p_challenge_id;
      IF v_creator_id IS NOT NULL THEN
        FOREACH v_role IN ARRAY ARRAY['CR','CU'] LOOP
          INSERT INTO public.user_challenge_roles (user_id, challenge_id, role_code, assigned_by, is_active, auto_assigned)
          VALUES (v_creator_id, p_challenge_id, v_role, p_creator_id, true, true)
          ON CONFLICT (user_id, challenge_id, role_code)
          DO UPDATE SET is_active = true, auto_assigned = true, updated_at = now();

          INSERT INTO public.audit_trail (user_id, challenge_id, action, method, details)
          VALUES (
            p_creator_id,
            p_challenge_id,
            'ROLE_AUTO_ASSIGNED',
            'SYSTEM',
            jsonb_build_object('role_code', v_role, 'governance_mode', v_gov_mode)
          );
        END LOOP;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object('success', true, 'current_phase', v_next_phase, 'completed', false);
END;
$$;