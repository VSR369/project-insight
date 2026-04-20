-- ============================================================================
-- S9R: Workflow Realignment v2 — Governance-driven compliance
-- ============================================================================

-- A0. Schema additions
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS cu_compliance_mode boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_challenges_cu_compliance_mode
  ON public.challenges (cu_compliance_mode)
  WHERE cu_compliance_mode = true;

DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.challenges'::regclass
    AND contype  = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%creator_approval_status%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.challenges DROP CONSTRAINT %I', v_constraint_name);
  END IF;

  ALTER TABLE public.challenges
    ADD CONSTRAINT challenges_creator_approval_status_check
    CHECK (
      creator_approval_status IS NULL OR creator_approval_status IN (
        'not_required',
        'pending_curator_review',
        'pending',
        'approved',
        'changes_requested'
      )
    );
END $$;

-- A5. Trigger: MP STRUCTURED/CONTROLLED forces creator_approval_required = true
CREATE OR REPLACE FUNCTION public.force_mp_creator_approval()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_governance text;
BEGIN
  v_governance := COALESCE(NEW.governance_profile, 'STRUCTURED');
  IF v_governance = 'LIGHTWEIGHT' THEN v_governance := 'QUICK'; END IF;
  IF v_governance = 'ENTERPRISE' THEN v_governance := 'CONTROLLED'; END IF;

  IF NEW.operating_model = 'MP'
     AND v_governance IN ('STRUCTURED', 'CONTROLLED') THEN
    NEW.extended_brief := jsonb_set(
      COALESCE(NEW.extended_brief, '{}'::jsonb),
      '{creator_approval_required}',
      'true'::jsonb,
      true
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_challenges_force_mp_creator_approval ON public.challenges;
CREATE TRIGGER trg_challenges_force_mp_creator_approval
  BEFORE INSERT OR UPDATE OF operating_model, governance_profile, extended_brief
  ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.force_mp_creator_approval();

-- A1. send_to_legal_review — governance-aware
CREATE OR REPLACE FUNCTION public.send_to_legal_review(
  p_challenge_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge       record;
  v_governance      text;
  v_freeze_result   jsonb;
  v_assemble_result jsonb;
  v_lc_user         uuid;
  v_fc_user         uuid;
  v_warnings        text[] := ARRAY[]::text[];
  v_awaiting        text;
BEGIN
  SELECT id, current_phase, lock_status, governance_profile, operating_model,
         organization_id, content_hash, extended_brief, cu_compliance_mode
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
    RETURN jsonb_build_object('success', false, 'error', 'Only the assigned Curator can send to legal review');
  END IF;

  v_governance := COALESCE(v_challenge.governance_profile, 'STRUCTURED');
  IF v_governance = 'LIGHTWEIGHT' THEN v_governance := 'QUICK'; END IF;
  IF v_governance = 'ENTERPRISE' THEN v_governance := 'CONTROLLED'; END IF;

  BEGIN
    v_freeze_result := public.freeze_curated_challenge(p_challenge_id, p_user_id);
  EXCEPTION WHEN OTHERS THEN
    v_warnings := array_append(v_warnings, 'Freeze warning: ' || SQLERRM);
  END;

  BEGIN
    v_assemble_result := public.assemble_cpa(p_challenge_id, p_user_id);
  EXCEPTION WHEN OTHERS THEN
    v_warnings := array_append(v_warnings, 'Assemble warning: ' || SQLERRM);
  END;

  IF v_governance = 'STRUCTURED' THEN
    UPDATE public.challenges
       SET cu_compliance_mode = true,
           updated_at = now(),
           updated_by = p_user_id
     WHERE id = p_challenge_id;
    v_awaiting := 'curator_compliance';

  ELSIF v_governance = 'CONTROLLED' THEN
    BEGIN
      v_lc_user := public.assign_workforce_role(p_challenge_id, 'LC', p_user_id);
    EXCEPTION WHEN OTHERS THEN
      v_warnings := array_append(v_warnings, 'LC assignment warning: ' || SQLERRM);
    END;

    BEGIN
      v_fc_user := public.assign_workforce_role(p_challenge_id, 'FC', p_user_id);
    EXCEPTION WHEN OTHERS THEN
      v_warnings := array_append(v_warnings, 'FC assignment warning: ' || SQLERRM);
    END;

    v_awaiting := 'lc_fc_compliance';
  ELSE
    v_awaiting := 'none';
  END IF;

  INSERT INTO public.audit_trail (
    challenge_id, user_id, action, method, details, created_by
  ) VALUES (
    p_challenge_id, p_user_id, 'SEND_TO_LEGAL_REVIEW', 'rpc',
    jsonb_build_object(
      'governance_mode', v_governance,
      'awaiting',        v_awaiting,
      'lc_user_id',      v_lc_user,
      'fc_user_id',      v_fc_user,
      'warnings',        v_warnings
    ),
    p_user_id
  );

  RETURN jsonb_build_object(
    'success',         true,
    'awaiting',        v_awaiting,
    'governance_mode', v_governance,
    'lc_user_id',      v_lc_user,
    'fc_user_id',      v_fc_user,
    'warnings',        v_warnings
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_to_legal_review(uuid, uuid) TO authenticated;

-- A2. complete_curator_compliance (STRUCTURED)
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
    VALUES (p_challenge_id, p_user_id, 'CURATOR_COMPLIANCE_COMPLETE', 'rpc',
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
    VALUES (p_challenge_id, p_user_id, 'CURATOR_COMPLIANCE_COMPLETE', 'rpc',
      jsonb_build_object('next', 'auto_published'), p_user_id);

    RETURN jsonb_build_object('success', true, 'awaiting', 'publication', 'detail', v_complete_result);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_curator_compliance(uuid, uuid) TO authenticated;

-- A3. complete_legal_review — CONTROLLED-only, hands back to Curator
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
    VALUES (p_challenge_id, p_user_id, 'LEGAL_REVIEW_COMPLETE', 'rpc',
      jsonb_build_object('pack_ready', true), p_user_id);

    RETURN jsonb_build_object('success', true, 'awaiting', 'curator_pack_review');
  END IF;

  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
  VALUES (p_challenge_id, p_user_id, 'LEGAL_REVIEW_COMPLETE', 'rpc',
    jsonb_build_object('awaiting_fc', true), p_user_id);

  RETURN jsonb_build_object('success', true, 'awaiting', 'financial_compliance');
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_legal_review(uuid, uuid) TO authenticated;

-- A3b. complete_financial_review — CONTROLLED-only, hands back to Curator
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
    VALUES (p_challenge_id, p_user_id, 'FINANCIAL_REVIEW_COMPLETE', 'rpc',
      jsonb_build_object('pack_ready', true), p_user_id);

    RETURN jsonb_build_object('success', true, 'awaiting', 'curator_pack_review');
  END IF;

  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
  VALUES (p_challenge_id, p_user_id, 'FINANCIAL_REVIEW_COMPLETE', 'rpc',
    jsonb_build_object('awaiting_lc', true), p_user_id);

  RETURN jsonb_build_object('success', true, 'awaiting', 'legal_compliance');
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_financial_review(uuid, uuid) TO authenticated;

-- A4. curator_forward_pack_to_creator
CREATE OR REPLACE FUNCTION public.curator_forward_pack_to_creator(
  p_challenge_id uuid,
  p_user_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge        record;
  v_creator_required boolean;
  v_request_result   jsonb;
  v_complete_result  jsonb;
BEGIN
  SELECT id, current_phase, governance_profile, operating_model,
         extended_brief, lc_compliance_complete, fc_compliance_complete,
         creator_approval_status, created_by
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
    RETURN jsonb_build_object('success', false, 'error', 'Only the assigned Curator can forward the pack');
  END IF;

  IF NOT (COALESCE(v_challenge.lc_compliance_complete, false)
          AND COALESCE(v_challenge.fc_compliance_complete, false)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Both LC and FC must complete review before forwarding');
  END IF;

  IF v_challenge.creator_approval_status <> 'pending_curator_review' THEN
    RETURN jsonb_build_object('success', false,
      'error', 'Pack is not in pending_curator_review state (current: ' ||
               COALESCE(v_challenge.creator_approval_status, 'null') || ')');
  END IF;

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
    VALUES (p_challenge_id, p_user_id, 'CURATOR_FORWARD_PACK', 'rpc',
      jsonb_build_object('next', 'creator_approval_pending', 'notes', p_notes), p_user_id);

    RETURN jsonb_build_object('success', true, 'awaiting', 'creator_approval', 'detail', v_request_result);
  ELSE
    UPDATE public.challenges
       SET creator_approval_status = 'not_required',
           updated_at = now(),
           updated_by = p_user_id
     WHERE id = p_challenge_id;

    BEGIN
      v_complete_result := public.complete_phase(p_challenge_id, p_user_id);
    EXCEPTION WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false,
        'error', 'complete_phase failed: ' || SQLERRM);
    END;

    INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
    VALUES (p_challenge_id, p_user_id, 'CURATOR_FORWARD_PACK', 'rpc',
      jsonb_build_object('next', 'auto_published', 'notes', p_notes), p_user_id);

    RETURN jsonb_build_object('success', true, 'awaiting', 'publication', 'detail', v_complete_result);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.curator_forward_pack_to_creator(uuid, uuid, text) TO authenticated;

-- A7. Backfill
UPDATE public.challenges
   SET extended_brief = jsonb_set(
     COALESCE(extended_brief, '{}'::jsonb),
     '{creator_approval_required}',
     'true'::jsonb,
     true
   )
 WHERE operating_model = 'MP'
   AND COALESCE(governance_profile, 'STRUCTURED') IN ('STRUCTURED', 'CONTROLLED', 'ENTERPRISE')
   AND COALESCE((extended_brief ->> 'creator_approval_required')::boolean, false) = false;

UPDATE public.user_challenge_roles ucr
   SET is_active = false,
       revoked_at = now()
  FROM public.challenges c
 WHERE ucr.challenge_id = c.id
   AND ucr.is_active = true
   AND ucr.role_code IN ('LC', 'FC')
   AND c.current_phase = 3
   AND COALESCE(c.governance_profile, 'STRUCTURED') = 'STRUCTURED';

UPDATE public.challenges
   SET cu_compliance_mode = true
 WHERE current_phase = 3
   AND COALESCE(governance_profile, 'STRUCTURED') = 'STRUCTURED'
   AND cu_compliance_mode = false;