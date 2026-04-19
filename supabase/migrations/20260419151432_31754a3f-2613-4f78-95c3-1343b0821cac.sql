-- ============================================================
-- Sprint 0: Lifecycle & Governance Fixes
-- ============================================================

-- Fix 5: STRUCTURED creator no longer auto-assigned LC
CREATE OR REPLACE FUNCTION public.auto_assign_roles_on_creation(
  p_challenge_id uuid,
  p_creator_id uuid,
  p_governance_profile text DEFAULT 'STRUCTURED'::text,
  p_operating_model text DEFAULT 'AGG'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_roles TEXT[]; v_role TEXT; v_assigned TEXT[] := '{}'; v_mode TEXT;
BEGIN
  IF p_challenge_id IS NOT NULL THEN
    BEGIN v_mode := resolve_challenge_governance(p_challenge_id);
    EXCEPTION WHEN OTHERS THEN v_mode := NULL; END;
  END IF;
  IF v_mode IS NULL THEN
    v_mode := CASE WHEN p_governance_profile IN ('LIGHTWEIGHT','QUICK') THEN 'QUICK'
      WHEN p_governance_profile = 'CONTROLLED' THEN 'CONTROLLED' ELSE 'STRUCTURED' END;
  END IF;

  IF v_mode = 'QUICK' THEN v_roles := ARRAY['CR','CU','ER','LC','FC'];
  ELSIF v_mode = 'STRUCTURED' THEN v_roles := ARRAY['CR'];  -- CHANGED: removed LC
  ELSIF v_mode = 'CONTROLLED' THEN v_roles := ARRAY['CR'];
  ELSE RETURN jsonb_build_object('roles_assigned','[]'::jsonb,'auto_assigned',false,'error','Unknown mode');
  END IF;

  FOREACH v_role IN ARRAY v_roles LOOP
    INSERT INTO public.user_challenge_roles (user_id, challenge_id, role_code, assigned_by, is_active, auto_assigned)
    VALUES (p_creator_id, p_challenge_id, v_role, p_creator_id, true, true)
    ON CONFLICT (user_id, challenge_id, role_code) DO UPDATE SET is_active = true, auto_assigned = true, updated_at = NOW();
    INSERT INTO public.audit_trail (user_id, challenge_id, action, method, details)
    VALUES (p_creator_id, p_challenge_id, 'ROLE_AUTO_ASSIGNED', 'SYSTEM',
      jsonb_build_object('role_code', v_role, 'governance_mode', v_mode));
    v_assigned := array_append(v_assigned, v_role);
  END LOOP;
  RETURN jsonb_build_object('roles_assigned', to_jsonb(v_assigned), 'governance_mode', v_mode, 'auto_assigned', true);
END; $function$;

-- Fixes 1, 2, 4: complete_phase corrections + LC/FC pool auto-assign
CREATE OR REPLACE FUNCTION public.complete_phase(p_challenge_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_phase INTEGER; v_phase_status TEXT; v_gov_mode TEXT;
  v_phase_config RECORD; v_next_config RECORD;
  v_can_perform BOOLEAN; v_next_phase INTEGER; v_same_actor BOOLEAN;
  v_recursive_result JSONB; v_auto_completed INTEGER[] := '{}';
  v_lc_complete BOOLEAN; v_fc_complete BOOLEAN;
  v_legal_doc_mode TEXT; v_escrow_mode TEXT;
  v_operating_model TEXT; v_org_id UUID; v_prize_pool NUMERIC;
  v_maturity_key TEXT;
  v_lc_pool_id UUID; v_lc_user_id UUID;
  v_fc_pool_id UUID; v_fc_user_id UUID;
BEGIN
  -- Step 1: Load current state
  SELECT current_phase, phase_status,
    COALESCE(governance_mode_override, governance_profile, 'STRUCTURED'),
    lc_compliance_complete, fc_compliance_complete
  INTO v_current_phase, v_phase_status, v_gov_mode, v_lc_complete, v_fc_complete
  FROM public.challenges WHERE id = p_challenge_id;
  IF v_current_phase IS NULL THEN RAISE EXCEPTION 'Challenge not found.'; END IF;
  IF v_phase_status IS DISTINCT FROM 'ACTIVE' THEN RAISE EXCEPTION 'Phase not active.'; END IF;

  -- Step 2: Load current phase config
  SELECT * INTO v_phase_config FROM public.md_lifecycle_phase_config
  WHERE governance_mode = v_gov_mode AND phase_number = v_current_phase AND is_active = true;

  -- Step 3: Permission check
  IF v_phase_config.required_role IS NOT NULL THEN
    SELECT public.can_perform(p_user_id, p_challenge_id, v_phase_config.required_role) INTO v_can_perform;
    IF v_can_perform IS NOT TRUE THEN
      RAISE EXCEPTION 'Permission denied for phase % (requires %).', v_current_phase, v_phase_config.required_role;
    END IF;
  END IF;

  -- Step 4: Gate checks — SKIP for auto_complete phases
  IF v_phase_config.gate_flags IS NOT NULL AND array_length(v_phase_config.gate_flags, 1) > 0
     AND NOT COALESCE(v_phase_config.auto_complete, false) THEN
    SELECT lc_compliance_complete, fc_compliance_complete INTO v_lc_complete, v_fc_complete
    FROM public.challenges WHERE id = p_challenge_id;
    IF 'lc_compliance_complete' = ANY(v_phase_config.gate_flags) AND NOT COALESCE(v_lc_complete, false) THEN
      RAISE EXCEPTION 'Gate: lc_compliance_complete = false'; END IF;
    IF 'fc_compliance_complete' = ANY(v_phase_config.gate_flags) AND NOT COALESCE(v_fc_complete, false) THEN
      RAISE EXCEPTION 'Gate: fc_compliance_complete = false'; END IF;
  END IF;

  -- Step 5: Mark current phase completed
  UPDATE public.challenges SET phase_status = 'COMPLETED', updated_at = NOW(), updated_by = p_user_id WHERE id = p_challenge_id;
  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, phase_from, phase_to, details)
  VALUES (p_challenge_id, p_user_id, 'PHASE_COMPLETED', 'HUMAN', v_current_phase, v_current_phase,
    jsonb_build_object('phase_name', v_phase_config.phase_name, 'governance_mode', v_gov_mode));
  UPDATE public.sla_timers SET status = 'COMPLETED', completed_at = NOW()
  WHERE challenge_id = p_challenge_id AND phase = v_current_phase AND status = 'ACTIVE';

  -- Step 6: Calculate next phase
  v_next_phase := CASE WHEN v_current_phase < 10 THEN v_current_phase + 1 ELSE NULL END;
  IF v_next_phase IS NULL THEN
    UPDATE public.challenges SET master_status = 'COMPLETED', completed_at = NOW(), updated_at = NOW(), updated_by = p_user_id WHERE id = p_challenge_id;
    RETURN jsonb_build_object('completed', true, 'lifecycle_complete', true, 'final_phase', v_current_phase, 'phases_auto_completed', to_jsonb(v_auto_completed));
  END IF;

  SELECT * INTO v_next_config FROM public.md_lifecycle_phase_config
  WHERE governance_mode = v_gov_mode AND phase_number = v_next_phase AND is_active = true;

  -- Step 7: Compliance setup when entering Phase 3
  IF v_next_phase = 3 THEN
    SELECT legal_doc_mode, escrow_mode INTO v_legal_doc_mode, v_escrow_mode
    FROM public.md_governance_mode_config WHERE governance_mode = v_gov_mode AND is_active = true LIMIT 1;

    SELECT operating_model, organization_id,
      COALESCE((reward_structure->>'platinum_award')::numeric, 0)
    INTO v_operating_model, v_org_id, v_prize_pool
    FROM public.challenges WHERE id = p_challenge_id;

    SELECT UPPER(TRIM(COALESCE(maturity_level, '')))
    INTO v_maturity_key
    FROM public.challenges WHERE id = p_challenge_id;

    IF v_legal_doc_mode = 'auto_apply' THEN
      UPDATE public.challenges SET lc_compliance_complete = TRUE WHERE id = p_challenge_id;
      BEGIN
        IF v_operating_model = 'AGG' AND v_org_id IS NOT NULL THEN
          INSERT INTO public.challenge_legal_docs
            (challenge_id, document_type, document_name, tier, status, lc_status, maturity_level, created_by)
          SELECT p_challenge_id, COALESCE(document_code, document_type), document_name, tier,
                 'auto_accepted', 'approved', v_maturity_key, p_user_id
          FROM public.org_legal_document_templates
          WHERE organization_id = v_org_id AND is_active = true AND version_status = 'ACTIVE'
          ON CONFLICT DO NOTHING;
        ELSE
          INSERT INTO public.challenge_legal_docs
            (challenge_id, document_type, document_name, tier, status, lc_status, maturity_level, created_by)
          SELECT p_challenge_id, document_code, document_name, 'TIER_1',
                 'auto_accepted', 'approved', v_maturity_key, p_user_id
          FROM public.legal_document_templates
          WHERE is_active = true AND version_status = 'ACTIVE'
            AND (required_for_maturity ? v_maturity_key OR required_for_maturity IS NULL)
          ON CONFLICT DO NOTHING;
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;

    IF v_gov_mode = 'STRUCTURED' AND v_legal_doc_mode = 'manual_review' THEN
      BEGIN
        IF v_operating_model = 'AGG' AND v_org_id IS NOT NULL THEN
          INSERT INTO public.challenge_legal_docs
            (challenge_id, document_type, document_name, tier, status, lc_status, maturity_level, created_by)
          SELECT p_challenge_id, COALESCE(document_code, document_type), document_name, tier,
                 'curator_reviewed', 'approved', v_maturity_key, p_user_id
          FROM public.org_legal_document_templates
          WHERE organization_id = v_org_id AND is_active = true AND version_status = 'ACTIVE'
          ON CONFLICT DO NOTHING;
        ELSE
          INSERT INTO public.challenge_legal_docs
            (challenge_id, document_type, document_name, tier, status, lc_status, maturity_level, created_by)
          SELECT p_challenge_id, document_code, document_name, 'TIER_1',
                 'curator_reviewed', 'approved', v_maturity_key, p_user_id
          FROM public.legal_document_templates
          WHERE is_active = true AND version_status = 'ACTIVE'
            AND (required_for_maturity ? v_maturity_key OR required_for_maturity IS NULL)
          ON CONFLICT DO NOTHING;
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
      UPDATE public.challenges
      SET lc_compliance_complete = TRUE, fc_compliance_complete = TRUE
      WHERE id = p_challenge_id;
    END IF;

    -- BUG FIX 1: 'formal_approval' -> 'ai_review'
    IF v_gov_mode = 'CONTROLLED' AND v_legal_doc_mode = 'ai_review' THEN
      UPDATE public.challenges SET lc_review_required = TRUE WHERE id = p_challenge_id;

      -- BUG FIX 4: Auto-assign LC (R9) and FC (R8) from platform pool
      BEGIN
        -- Pick next eligible LC pool member
        SELECT ppp.id, ppp.user_id INTO v_lc_pool_id, v_lc_user_id
        FROM public.platform_provider_pool ppp
        WHERE ppp.is_active = true
          AND 'R9' = ANY(ppp.role_codes)
          AND NOT EXISTS (
            SELECT 1 FROM public.challenge_role_assignments cra
            WHERE cra.challenge_id = p_challenge_id
              AND cra.role_code = 'LC'
              AND cra.status = 'active'
          )
        ORDER BY ppp.created_at ASC
        LIMIT 1;

        IF v_lc_pool_id IS NOT NULL THEN
          PERFORM public.auto_assign_challenge_role(
            p_challenge_id,
            v_lc_pool_id,
            v_lc_user_id,
            'R9',
            'LC',
            p_user_id,
            'PHASE_3'
          );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        BEGIN
          INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details)
          VALUES (p_challenge_id, p_user_id, 'LC_AUTO_ASSIGN_SKIPPED', 'SYSTEM',
            jsonb_build_object('reason', SQLERRM));
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END;

      BEGIN
        -- Pick next eligible FC pool member
        SELECT ppp.id, ppp.user_id INTO v_fc_pool_id, v_fc_user_id
        FROM public.platform_provider_pool ppp
        WHERE ppp.is_active = true
          AND 'R8' = ANY(ppp.role_codes)
          AND NOT EXISTS (
            SELECT 1 FROM public.challenge_role_assignments cra
            WHERE cra.challenge_id = p_challenge_id
              AND cra.role_code = 'FC'
              AND cra.status = 'active'
          )
        ORDER BY ppp.created_at ASC
        LIMIT 1;

        IF v_fc_pool_id IS NOT NULL THEN
          PERFORM public.auto_assign_challenge_role(
            p_challenge_id,
            v_fc_pool_id,
            v_fc_user_id,
            'R8',
            'FC',
            p_user_id,
            'PHASE_3'
          );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        BEGIN
          INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details)
          VALUES (p_challenge_id, p_user_id, 'FC_AUTO_ASSIGN_SKIPPED', 'SYSTEM',
            jsonb_build_object('reason', SQLERRM));
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END;
    END IF;

    -- BUG FIX 2: 'mandatory_escrow' -> 'mandatory'
    IF v_escrow_mode = 'mandatory' AND v_prize_pool > 0 THEN
      INSERT INTO public.escrow_transactions (challenge_id, amount, currency, status, created_by)
      VALUES (p_challenge_id, v_prize_pool, 'USD', 'PENDING', p_user_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Step 7b: Publication setup when entering Phase 4
  IF v_next_phase = 4 THEN
    UPDATE public.challenges
    SET challenge_visibility = 'public', published_at = COALESCE(published_at, NOW())
    WHERE id = p_challenge_id;
  END IF;

  -- Step 8: Advance to next phase
  UPDATE public.challenges
  SET current_phase = v_next_phase, phase_status = 'ACTIVE',
      updated_at = NOW(), updated_by = p_user_id
  WHERE id = p_challenge_id;
  PERFORM public.update_master_status(p_challenge_id);
  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, phase_from, phase_to, details)
  VALUES (p_challenge_id, p_user_id, 'PHASE_ADVANCED', 'SYSTEM', v_current_phase, v_next_phase,
    jsonb_build_object('from_phase', v_current_phase, 'to_phase', v_next_phase, 'governance_mode', v_gov_mode));

  -- Step 9: SLA timer for next phase (hardened with BEGIN/EXCEPTION)
  BEGIN
    IF v_next_config.sla_days IS NOT NULL AND v_next_config.sla_days > 0 THEN
      INSERT INTO public.sla_timers (challenge_id, phase, role_code, started_at, deadline_at, status)
      VALUES (
        p_challenge_id,
        v_next_phase,
        COALESCE(v_next_config.required_role, 'SYS'),
        NOW(),
        NOW() + make_interval(days => v_next_config.sla_days),
        'ACTIVE'
      )
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details)
      VALUES (p_challenge_id, p_user_id, 'SLA_TIMER_SKIPPED', 'SYSTEM',
        jsonb_build_object('phase', v_next_phase, 'reason', SQLERRM));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END;

  -- Step 10: Recursive auto-complete
  v_same_actor := (v_next_config.required_role IS NOT NULL AND v_next_config.required_role = v_phase_config.required_role)
    OR COALESCE(v_next_config.auto_complete, false);
  IF v_same_actor THEN
    v_auto_completed := v_auto_completed || v_next_phase;
    v_recursive_result := public.complete_phase(p_challenge_id, p_user_id);
    IF v_recursive_result ? 'phases_auto_completed' THEN
      FOR i IN 0..jsonb_array_length(v_recursive_result->'phases_auto_completed')-1 LOOP
        v_auto_completed := v_auto_completed || (v_recursive_result->'phases_auto_completed'->i)::integer;
      END LOOP;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'completed', true, 'previous_phase', v_current_phase, 'current_phase', v_next_phase,
    'governance_mode', v_gov_mode, 'phases_auto_completed', to_jsonb(v_auto_completed)
  );
END;
$function$;

-- Fix 3: Enable AI legal review for STRUCTURED governance
UPDATE public.md_governance_mode_config
SET ai_legal_review_enabled = true
WHERE governance_mode = 'STRUCTURED';

-- Fix 6: STRUCTURED Phase 3 auto-completes (Curator absorbs LC/FC duties)
UPDATE public.md_lifecycle_phase_config
SET auto_complete = true
WHERE governance_mode = 'STRUCTURED' AND phase_number = 3;