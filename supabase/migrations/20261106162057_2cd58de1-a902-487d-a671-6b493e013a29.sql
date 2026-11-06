ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS legal_review_required boolean NOT NULL DEFAULT false;

-- 1. Snapshot the legal-review threshold with the other governance limits at Submit
CREATE OR REPLACE FUNCTION public.fn_enforce_minimum_governance_mode()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_mode text; v_min text; v_limits jsonb; v_cur text; v_rank jsonb := '{"QUICK":1,"STRUCTURED":2,"CONTROLLED":3}';
BEGIN
  IF NEW.phase_status IS DISTINCT FROM 'COMPLETED' OR OLD.phase_status = 'COMPLETED' OR NEW.current_phase NOT IN (1,2) THEN
    RETURN NEW;
  END IF;
  v_mode := COALESCE(NEW.governance_mode_override, NEW.governance_profile, 'STRUCTURED');
  IF v_mode = 'LIGHTWEIGHT' THEN v_mode := 'QUICK'; ELSIF v_mode = 'ENTERPRISE' THEN v_mode := 'CONTROLLED'; END IF;
  v_cur := UPPER(COALESCE(NEW.currency_code, NEW.reward_structure->>'currency', 'USD'));
  IF NEW.current_phase = 1 THEN
    SELECT jsonb_object_agg(param_key, threshold_amount) || jsonb_build_object('currency', v_cur, 'taken_at', now())
      INTO v_limits FROM public.md_legal_review_thresholds
     WHERE currency_code = v_cur AND is_active
       AND param_key IN ('express_award_limit','high_rigor_award_threshold','legal_review_threshold');
    NEW.governance_threshold_snapshot := COALESCE(v_limits, jsonb_build_object('currency', v_cur, 'taken_at', now()));
  ELSE
    v_limits := NEW.governance_threshold_snapshot;
    IF v_limits IS NULL THEN RETURN NEW; END IF;
  END IF;
  v_min := private.fn_minimum_governance_mode(private.fn_challenge_award_pool(NEW.reward_structure, NEW.reward_amount),
                                              NEW.is_regulated, NEW.is_ip_sensitive, v_limits);
  IF (v_rank->>v_mode)::int < (v_rank->>v_min)::int THEN
    RAISE EXCEPTION 'This challenge requires at least % governance.',
      CASE v_min WHEN 'CONTROLLED' THEN 'High-Rigor' WHEN 'STRUCTURED' THEN 'Structured' ELSE 'Express' END
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $function$;

-- 2. Pure rule: is legal review required for this challenge?
CREATE OR REPLACE FUNCTION private.fn_legal_review_required(p_challenge_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE c record; v_cur text; v_threshold numeric;
BEGIN
  SELECT reward_structure, reward_amount, currency_code, governance_threshold_snapshot INTO c
    FROM public.challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN RETURN false; END IF;
  v_cur := UPPER(COALESCE(c.currency_code, c.reward_structure->>'currency', 'USD'));
  v_threshold := NULLIF(c.governance_threshold_snapshot->>'legal_review_threshold','')::numeric;
  IF v_threshold IS NULL THEN  -- record from before the snapshot carried this value
    SELECT threshold_amount INTO v_threshold FROM public.md_legal_review_thresholds
     WHERE param_key = 'legal_review_threshold' AND currency_code = v_cur AND is_active LIMIT 1;
  END IF;
  IF v_threshold IS NULL THEN RETURN false; END IF;
  RETURN COALESCE(private.fn_challenge_award_pool(c.reward_structure, c.reward_amount), 0) >= v_threshold;
END $$;
REVOKE ALL ON FUNCTION private.fn_legal_review_required(uuid) FROM PUBLIC, anon, authenticated;

-- 3. Route: Structured challenges at/above threshold also go to a Legal Coordinator
CREATE OR REPLACE FUNCTION public.send_to_legal_review(p_challenge_id uuid, p_user_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_challenge record; v_governance text; v_freeze_result jsonb; v_assemble_result jsonb; v_seed_result jsonb;
  v_lc_user uuid; v_fc_user uuid; v_warnings text[] := ARRAY[]::text[]; v_awaiting text; v_legal_required boolean := false;
BEGIN
  SELECT id, governance_profile INTO v_challenge FROM public.challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Challenge not found'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_challenge_roles WHERE challenge_id = p_challenge_id AND user_id = p_user_id
                   AND role_code = 'CU' AND is_active = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the assigned Curator can send to legal review');
  END IF;
  v_governance := COALESCE(v_challenge.governance_profile, 'STRUCTURED');
  IF v_governance = 'LIGHTWEIGHT' THEN v_governance := 'QUICK'; END IF;
  IF v_governance = 'ENTERPRISE' THEN v_governance := 'CONTROLLED'; END IF;

  BEGIN v_freeze_result := public.freeze_curated_challenge(p_challenge_id, p_user_id);
  EXCEPTION WHEN OTHERS THEN v_warnings := array_append(v_warnings, 'Freeze warning: ' || SQLERRM); END;
  BEGIN v_assemble_result := public.assemble_cpa(p_challenge_id, p_user_id);
  EXCEPTION WHEN OTHERS THEN v_warnings := array_append(v_warnings, 'Assemble warning: ' || SQLERRM); END;
  BEGIN v_seed_result := public.seed_default_legal_docs(p_challenge_id, p_user_id);
  EXCEPTION WHEN OTHERS THEN v_warnings := array_append(v_warnings, 'Seed warning: ' || SQLERRM); END;

  IF v_governance = 'STRUCTURED' THEN
    v_legal_required := private.fn_legal_review_required(p_challenge_id);
    UPDATE public.challenges SET cu_compliance_mode = true, legal_review_required = v_legal_required,
           updated_at = now(), updated_by = p_user_id WHERE id = p_challenge_id;
    IF v_legal_required THEN
      BEGIN v_lc_user := public.assign_workforce_role(p_challenge_id, 'LC', p_user_id);
      EXCEPTION WHEN OTHERS THEN v_warnings := array_append(v_warnings, 'LC assignment warning: ' || SQLERRM); END;
      v_awaiting := 'curator_compliance_and_legal_review';
    ELSE
      v_awaiting := 'curator_compliance';
    END IF;
  ELSIF v_governance = 'CONTROLLED' THEN
    BEGIN v_lc_user := public.assign_workforce_role(p_challenge_id, 'LC', p_user_id);
    EXCEPTION WHEN OTHERS THEN v_warnings := array_append(v_warnings, 'LC assignment warning: ' || SQLERRM); END;
    BEGIN v_fc_user := public.assign_workforce_role(p_challenge_id, 'FC', p_user_id);
    EXCEPTION WHEN OTHERS THEN v_warnings := array_append(v_warnings, 'FC assignment warning: ' || SQLERRM); END;
    v_awaiting := 'lc_fc_compliance';
  ELSE
    v_awaiting := 'none';
  END IF;

  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
  VALUES (p_challenge_id, p_user_id, 'SEND_TO_LEGAL_REVIEW', 'rpc',
    jsonb_build_object('governance_mode', v_governance, 'awaiting', v_awaiting, 'legal_review_required', v_legal_required,
      'lc_user_id', v_lc_user, 'fc_user_id', v_fc_user, 'seeded_docs', v_seed_result, 'warnings', v_warnings), p_user_id);

  RETURN jsonb_build_object('success', true, 'awaiting', v_awaiting, 'governance_mode', v_governance,
    'legal_review_required', v_legal_required, 'lc_user_id', v_lc_user, 'fc_user_id', v_fc_user,
    'seeded_docs', v_seed_result, 'warnings', v_warnings);
END;
$function$;

-- 4. Curator cannot finish compliance until the Legal Coordinator has signed off
CREATE OR REPLACE FUNCTION public.complete_curator_compliance(p_challenge_id uuid, p_user_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_challenge record; v_governance text; v_creator_required boolean; v_complete_result jsonb; v_request_result jsonb;
BEGIN
  SELECT id, governance_profile, extended_brief, cu_compliance_mode, lc_compliance_complete, fc_compliance_complete,
         creator_approval_status, legal_review_required, legal_review_signed_off_at
    INTO v_challenge FROM public.challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Challenge not found'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_challenge_roles WHERE challenge_id = p_challenge_id AND user_id = p_user_id
                   AND role_code = 'CU' AND is_active = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the assigned Curator can complete compliance');
  END IF;
  v_governance := COALESCE(v_challenge.governance_profile, 'STRUCTURED');
  IF v_governance = 'LIGHTWEIGHT' THEN v_governance := 'QUICK'; END IF;
  IF v_governance = 'ENTERPRISE' THEN v_governance := 'CONTROLLED'; END IF;
  IF v_governance <> 'STRUCTURED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'complete_curator_compliance is only valid for STRUCTURED governance');
  END IF;
  IF NOT COALESCE(v_challenge.cu_compliance_mode, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Curator compliance mode not enabled — call send_to_legal_review first');
  END IF;
  IF v_challenge.lc_compliance_complete = true AND v_challenge.fc_compliance_complete = true
     AND v_challenge.creator_approval_status IN ('pending', 'approved') THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true);
  END IF;
  IF v_challenge.legal_review_required AND v_challenge.legal_review_signed_off_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'awaiting_legal_review',
      'message', 'The award pool is at or above the legal-review threshold. The Legal Coordinator must sign off first.');
  END IF;

  UPDATE public.challenges SET lc_compliance_complete = true, fc_compliance_complete = true,
         updated_at = now(), updated_by = p_user_id WHERE id = p_challenge_id;
  v_creator_required := COALESCE((v_challenge.extended_brief ->> 'creator_approval_required')::boolean, false);
  IF v_creator_required THEN
    BEGIN v_request_result := public.request_creator_approval(p_challenge_id, p_user_id);
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'request_creator_approval failed: ' || SQLERRM);
    END;
    INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
    VALUES (p_challenge_id, p_user_id, 'CURATOR_COMPLIANCE_COMPLETE', 'HUMAN', jsonb_build_object('next', 'creator_approval_pending'), p_user_id);
    RETURN jsonb_build_object('success', true, 'awaiting', 'creator_approval', 'detail', v_request_result);
  ELSE
    BEGIN v_complete_result := public.complete_phase(p_challenge_id, p_user_id);
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', 'complete_phase failed: ' || SQLERRM);
    END;
    UPDATE public.challenges SET creator_approval_status = 'not_required'
     WHERE id = p_challenge_id AND (creator_approval_status IS NULL OR creator_approval_status = 'not_required');
    INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
    VALUES (p_challenge_id, p_user_id, 'CURATOR_COMPLIANCE_COMPLETE', 'HUMAN', jsonb_build_object('next', 'auto_published'), p_user_id);
    RETURN jsonb_build_object('success', true, 'awaiting', 'publication', 'detail', v_complete_result);
  END IF;
END;
$function$;

ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS legal_review_signed_off_at timestamptz;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS legal_review_signed_off_by uuid;

-- 5. Legal Coordinator sign-off for Structured challenges routed by the threshold
ALTER FUNCTION public.complete_legal_review(uuid, uuid) RENAME TO complete_legal_review_controlled;
ALTER FUNCTION public.complete_legal_review_controlled(uuid, uuid) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.complete_legal_review_controlled(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.complete_legal_review(p_challenge_id uuid, p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE c record; v_gov text; v_curator uuid;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
  END IF;
  SELECT id, governance_profile, legal_review_required, legal_review_signed_off_at INTO c
    FROM public.challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Challenge not found'); END IF;
  v_gov := COALESCE(c.governance_profile, 'STRUCTURED');
  IF v_gov = 'ENTERPRISE' THEN v_gov := 'CONTROLLED'; ELSIF v_gov = 'LIGHTWEIGHT' THEN v_gov := 'QUICK'; END IF;
  IF v_gov = 'CONTROLLED' THEN
    RETURN private.complete_legal_review_controlled(p_challenge_id, p_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_challenge_roles WHERE challenge_id = p_challenge_id AND user_id = p_user_id
                   AND role_code = 'LC' AND is_active = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the assigned Legal Counsel can complete legal review');
  END IF;
  IF v_gov <> 'STRUCTURED' OR NOT c.legal_review_required THEN
    RETURN jsonb_build_object('success', false, 'error', 'Legal review is not required for this challenge');
  END IF;
  IF c.legal_review_signed_off_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true);
  END IF;
  UPDATE public.challenges SET legal_review_signed_off_at = now(), legal_review_signed_off_by = p_user_id,
         updated_at = now(), updated_by = p_user_id WHERE id = p_challenge_id;
  SELECT user_id INTO v_curator FROM public.user_challenge_roles
   WHERE challenge_id = p_challenge_id AND role_code = 'CU' AND is_active = true LIMIT 1;
  IF v_curator IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, deep_link, metadata, created_by)
    VALUES (v_curator, 'LEGAL_REVIEW_SIGNED_OFF', 'Legal review signed off',
      'The Legal Coordinator has signed off. You can now complete compliance.',
      '/cogni/curation/' || p_challenge_id, jsonb_build_object('challenge_id', p_challenge_id), p_user_id);
  END IF;
  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
  VALUES (p_challenge_id, p_user_id, 'LEGAL_REVIEW_SIGNED_OFF', 'HUMAN', jsonb_build_object('governance_mode', 'STRUCTURED'), p_user_id);
  RETURN jsonb_build_object('success', true, 'awaiting', 'curator_compliance');
END $$;
REVOKE ALL ON FUNCTION public.complete_legal_review(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_legal_review(uuid, uuid) TO authenticated;