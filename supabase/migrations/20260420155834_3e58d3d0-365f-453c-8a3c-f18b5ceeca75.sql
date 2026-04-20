-- ============================================================
-- F2: Auto-seed default legal documents as AI suggestions
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_default_legal_docs(
  p_challenge_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id        uuid;
  v_engagement    text;
  v_inserted      int := 0;
  v_actor         uuid;
BEGIN
  v_actor := COALESCE(p_user_id, auth.uid());

  SELECT organization_id, COALESCE(operating_model, 'IP')
    INTO v_org_id, v_engagement
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  -- AGG path: prefer org-specific templates if any
  IF v_engagement = 'AGG' AND v_org_id IS NOT NULL THEN
    INSERT INTO public.challenge_legal_docs (
      challenge_id, document_type, document_name, tier,
      status, lc_status, priority, rationale, content_summary,
      created_by, attached_by, assembled_from_template_id
    )
    SELECT
      p_challenge_id,
      COALESCE(t.document_code, t.document_type),
      t.document_name,
      t.tier,
      'ai_suggested',
      'pending',
      CASE WHEN t.is_mandatory THEN 'required' ELSE 'recommended' END,
      'Default ' || t.tier || ' template for your organization.',
      COALESCE(t.summary, t.description, ''),
      v_actor,
      v_actor,
      t.id
    FROM public.org_legal_document_templates t
    WHERE t.organization_id = v_org_id
      AND t.is_active = true
      AND t.version_status = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1 FROM public.challenge_legal_docs c
        WHERE c.challenge_id = p_challenge_id
          AND c.document_type = COALESCE(t.document_code, t.document_type)
          AND c.tier = t.tier
      );
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
  END IF;

  -- Platform fallback: if AGG has no org templates OR Marketplace path
  IF v_inserted = 0 THEN
    INSERT INTO public.challenge_legal_docs (
      challenge_id, document_type, document_name, tier,
      status, lc_status, priority, rationale, content_summary,
      created_by, attached_by, assembled_from_template_id
    )
    SELECT
      p_challenge_id,
      COALESCE(t.document_code, t.document_type),
      t.document_name,
      COALESCE(t.tier, 'TIER_1'),
      'ai_suggested',
      'pending',
      CASE WHEN COALESCE(t.is_mandatory, false) THEN 'required' ELSE 'recommended' END,
      'Default platform template — review, edit, then Accept to attach.',
      COALESCE(t.summary, t.description, ''),
      v_actor,
      v_actor,
      t.template_id
    FROM public.legal_document_templates t
    WHERE t.is_active = true
      AND t.version_status = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1 FROM public.challenge_legal_docs c
        WHERE c.challenge_id = p_challenge_id
          AND c.document_type = COALESCE(t.document_code, t.document_type)
          AND c.tier = COALESCE(t.tier, 'TIER_1')
      );
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'success',  true,
    'inserted', v_inserted,
    'engagement', v_engagement
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_legal_docs(uuid, uuid) TO authenticated;

-- ============================================================
-- Update send_to_legal_review to auto-seed defaults
-- ============================================================
CREATE OR REPLACE FUNCTION public.send_to_legal_review(p_challenge_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_challenge       record;
  v_governance      text;
  v_freeze_result   jsonb;
  v_assemble_result jsonb;
  v_seed_result     jsonb;
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

  -- Seed default legal docs as AI suggestions (idempotent)
  BEGIN
    v_seed_result := public.seed_default_legal_docs(p_challenge_id, p_user_id);
  EXCEPTION WHEN OTHERS THEN
    v_warnings := array_append(v_warnings, 'Seed warning: ' || SQLERRM);
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
      'seeded_docs',     v_seed_result,
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
    'seeded_docs',     v_seed_result,
    'warnings',        v_warnings
  );
END;
$function$;