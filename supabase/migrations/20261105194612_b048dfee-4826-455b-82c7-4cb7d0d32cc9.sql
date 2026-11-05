-- ===== 1. Settings register: ranges / formats =====
ALTER TABLE public.md_mpa_config ADD COLUMN IF NOT EXISTS allowed_values text[];
ALTER TABLE public.md_mpa_config ADD COLUMN IF NOT EXISTS value_pattern text;

UPDATE public.md_mpa_config SET min_value='1', max_value='720' WHERE param_key='activation_link_expiry_hours';
UPDATE public.md_mpa_config SET min_value='1', max_value='50' WHERE param_key='max_delegated_admins_per_org';
UPDATE public.md_mpa_config SET min_value='10', max_value='200' WHERE param_key='sla_tier2_threshold_pct';
UPDATE public.md_mpa_config SET min_value='10', max_value='300' WHERE param_key='sla_tier3_threshold_pct';
UPDATE public.md_mpa_config SET allowed_values=ARRAY['open_claim','auto_assign'] WHERE param_key='org_verification_assignment_mode';
UPDATE public.md_mpa_config SET value_pattern='^[0-9]{1,2}(,[0-9]{1,2})*$' WHERE param_key='award_acceptance_reminder_days';
UPDATE public.md_mpa_config SET value_pattern='^(MON|TUE|WED|THU|FRI|SAT|SUN)(,(MON|TUE|WED|THU|FRI|SAT|SUN)){0,6}$',
  label='Working week', param_group='CALENDAR',
  description='Platform-level working week used for all business-day calculations.' WHERE param_key='working_week_days';
UPDATE public.md_mpa_config SET value_pattern='^TZ$' WHERE param_key='working_week_timezone';
UPDATE public.md_mpa_config SET value_pattern='^[A-Z0-9]{2,5}(,[A-Z0-9]{2,5})*$' WHERE param_key='challenge_attachment_types';
UPDATE public.md_mpa_config SET value_pattern='^[^@\s]+@[^@\s]+\.[^@\s]+$' WHERE param_key='executive_escalation_email';

INSERT INTO public.md_mpa_config (param_key, param_value, param_type, param_group, label, unit, min_value, max_value, description, is_sensitive)
VALUES ('solution_approach_summary_min_chars','200','INTEGER','FILE_LIMITS','Solution Approach Summary minimum','characters','0','5000',
        'Minimum length of the Approach Summary on a solution submission (abstracts use abstract_min_chars).', false)
ON CONFLICT (param_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.fn_validate_config_value()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_num numeric;
BEGIN
  IF NEW.param_type IN ('INTEGER','DECIMAL') THEN
    IF NEW.min_value IS NULL OR NEW.max_value IS NULL THEN
      RAISE EXCEPTION 'Setting % must have an allowed range.', NEW.param_key USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.param_value IS NOT NULL THEN
      BEGIN v_num := NEW.param_value::numeric;
      EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Value for % must be a number.', NEW.param_key USING ERRCODE = 'check_violation'; END;
      IF v_num < NEW.min_value::numeric OR v_num > NEW.max_value::numeric THEN
        RAISE EXCEPTION 'Value % for % is outside the allowed range % to %.', NEW.param_value, NEW.param_key, NEW.min_value, NEW.max_value
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  ELSIF NEW.param_type = 'TEXT' THEN
    IF NEW.allowed_values IS NULL AND NEW.value_pattern IS NULL THEN
      RAISE EXCEPTION 'Setting % must have allowed values or a format.', NEW.param_key USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.param_value IS NOT NULL THEN
      IF NEW.allowed_values IS NOT NULL AND NOT (NEW.param_value = ANY (NEW.allowed_values)) THEN
        RAISE EXCEPTION 'Value % for % is not one of the allowed values.', NEW.param_value, NEW.param_key USING ERRCODE = 'check_violation';
      END IF;
      IF NEW.value_pattern = '^TZ$' THEN
        IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW.param_value) THEN
          RAISE EXCEPTION 'Value % for % is not a known time zone.', NEW.param_value, NEW.param_key USING ERRCODE = 'check_violation';
        END IF;
      ELSIF NEW.value_pattern IS NOT NULL AND NEW.param_value !~ NEW.value_pattern THEN
        RAISE EXCEPTION 'Value % for % does not match the allowed format.', NEW.param_value, NEW.param_key USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_md_mpa_config_biu_validate ON public.md_mpa_config;
CREATE TRIGGER trg_md_mpa_config_biu_validate BEFORE INSERT OR UPDATE ON public.md_mpa_config
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_config_value();

-- Signed-in read allow-list (add the two minimums)
DROP POLICY IF EXISTS authenticated_read_business_rule_numbers ON public.md_mpa_config;
CREATE POLICY authenticated_read_business_rule_numbers ON public.md_mpa_config
  FOR SELECT TO authenticated
  USING (COALESCE(is_sensitive,false) = false AND param_key IN (
    'return_reason_min_length','hold_reason_min_length','cancel_reason_min_length',
    'screening_commentary_min_length','qa_question_min_length','creator_response_timeout_days',
    'amendment_withdrawal_window_days','amendment_reacceptance_window_days',
    'curator_edit_rewrite_threshold_pct','solution_max_files',
    'solution_approach_summary_min_chars','abstract_min_chars'));

-- ===== 2. update_config_param: explicit tier refusal + format refusal =====
CREATE OR REPLACE FUNCTION public.fn_require_supervisor()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tier text; v_id uuid;
BEGIN
  SELECT id, admin_tier INTO v_id, v_tier FROM public.platform_admin_profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_tier IS DISTINCT FROM 'supervisor' THEN RETURN NULL; END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.fn_require_supervisor() FROM PUBLIC, anon, authenticated;

DO $do$
DECLARE v_def text;
BEGIN
  v_def := pg_get_functiondef('public.update_config_param(text,text,text,text)'::regprocedure);
  v_def := replace(v_def,
    $a$RETURN jsonb_build_object('success', false, 'error', 'PERMISSION_DENIED', 'detail', 'Supervisor access required');$a$,
    $a$RETURN jsonb_build_object('success', false, 'error', 'PERMISSION_DENIED', 'detail',
      CASE WHEN public.get_my_admin_tier(auth.uid()) IN ('admin','senior_admin')
           THEN 'Admin and Senior Admin cannot change settings. Only a Supervisor can.'
           ELSE 'Supervisor access required' END);$a$);
  v_def := replace(v_def,
    $a$  UPDATE public.md_mpa_config
     SET param_value = p_new_value, updated_at = NOW(), updated_by_id = v_admin_profile_id
   WHERE param_key = p_param_key;

  INSERT INTO public.md_mpa_config_audit (param_key, previous_value, new_value, changed_by_id, change_reason, ip_address)
  VALUES (p_param_key, v_old_value, p_new_value, v_admin_profile_id, p_change_reason, p_ip_address);$a$,
    $a$  BEGIN
    UPDATE public.md_mpa_config
       SET param_value = p_new_value, updated_at = NOW(), updated_by_id = v_admin_profile_id
     WHERE param_key = p_param_key;
  EXCEPTION WHEN check_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'OUT_OF_RANGE', 'detail', SQLERRM);
  END;

  INSERT INTO public.md_mpa_config_audit (param_key, previous_value, new_value, changed_by_id, change_reason, ip_address)
  VALUES (p_param_key, v_old_value, p_new_value, v_admin_profile_id, p_change_reason, p_ip_address);$a$);
  IF position('OUT_OF_RANGE' in v_def) = 0 OR position('Admin and Senior Admin' in v_def) = 0 THEN
    RAISE EXCEPTION 'update_config_param patch did not apply';
  END IF;
  EXECUTE v_def;
END $do$;

-- ===== 3. Per-currency money thresholds =====
ALTER TABLE public.md_legal_review_thresholds ADD COLUMN IF NOT EXISTS param_key text NOT NULL DEFAULT 'legal_review_threshold';
ALTER TABLE public.md_legal_review_thresholds ADD COLUMN IF NOT EXISTS min_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.md_legal_review_thresholds ADD COLUMN IF NOT EXISTS max_amount numeric NOT NULL DEFAULT 1000000000;
CREATE INDEX IF NOT EXISTS idx_md_legal_review_thresholds_key_currency ON public.md_legal_review_thresholds (param_key, currency_code);

CREATE OR REPLACE FUNCTION public.fn_validate_money_threshold()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.currency_code !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'Currency must be a 3-letter code.' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.min_amount > NEW.max_amount OR NEW.threshold_amount < NEW.min_amount OR NEW.threshold_amount > NEW.max_amount THEN
    RAISE EXCEPTION 'Amount % % is outside the allowed range % to %.', NEW.threshold_amount, NEW.currency_code, NEW.min_amount, NEW.max_amount
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_md_legal_review_thresholds_biu_validate ON public.md_legal_review_thresholds;
CREATE TRIGGER trg_md_legal_review_thresholds_biu_validate BEFORE INSERT OR UPDATE ON public.md_legal_review_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_money_threshold();

DROP POLICY IF EXISTS "Supervisors can manage thresholds" ON public.md_legal_review_thresholds;

CREATE OR REPLACE FUNCTION public.update_money_threshold(p_threshold_id uuid, p_amount numeric, p_change_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin uuid := public.fn_require_supervisor(); r RECORD; v_min int; v_max int;
BEGIN
  IF v_admin IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PERMISSION_DENIED',
      'detail', 'Admin and Senior Admin cannot change settings. Only a Supervisor can.');
  END IF;
  SELECT COALESCE((SELECT param_value::int FROM md_mpa_config WHERE param_key='config_change_reason_min_length'),10),
         COALESCE((SELECT param_value::int FROM md_mpa_config WHERE param_key='config_change_reason_max_length'),500) INTO v_min, v_max;
  IF p_change_reason IS NULL OR length(btrim(p_change_reason)) NOT BETWEEN v_min AND v_max THEN
    RETURN jsonb_build_object('success', false, 'error', 'REASON_REQUIRED', 'detail', 'Enter a reason of '||v_min||' to '||v_max||' characters.');
  END IF;
  SELECT * INTO r FROM md_legal_review_thresholds WHERE id = p_threshold_id FOR UPDATE;
  IF r.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND'); END IF;
  BEGIN
    UPDATE md_legal_review_thresholds SET threshold_amount = p_amount, updated_at = now(), updated_by = auth.uid() WHERE id = p_threshold_id;
  EXCEPTION WHEN check_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'OUT_OF_RANGE', 'detail', SQLERRM);
  END;
  INSERT INTO md_mpa_config_audit (param_key, previous_value, new_value, changed_by_id, change_reason)
  VALUES (r.param_key||':'||r.currency_code||':'||COALESCE(r.governance_mode,''), r.threshold_amount::text, p_amount::text, v_admin, p_change_reason);
  RETURN jsonb_build_object('success', true);
END $$;
REVOKE ALL ON FUNCTION public.update_money_threshold(uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_money_threshold(uuid,numeric,text) TO authenticated;

-- ===== 4. Snapshots on enrolments, assessments, bookings, awards =====
CREATE OR REPLACE FUNCTION public.fn_config_snapshot_payload()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'taken_at', now(),
    'settings', (SELECT COALESCE(jsonb_object_agg(param_key, param_value), '{}'::jsonb) FROM md_mpa_config),
    'money_thresholds', (SELECT COALESCE(jsonb_agg(jsonb_build_object('key', param_key, 'currency', currency_code,
        'governance_mode', governance_mode, 'country_id', country_id, 'amount', threshold_amount)), '[]'::jsonb)
      FROM md_legal_review_thresholds WHERE is_active));
$$;
REVOKE ALL ON FUNCTION public.fn_config_snapshot_payload() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_set_config_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.config_snapshot := public.fn_config_snapshot_payload();
  ELSE
    NEW.config_snapshot := OLD.config_snapshot;
  END IF;
  RETURN NEW;
END $$;

DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['provider_industry_enrollments','assessment_attempts','interview_bookings','challenge_award_decisions'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS config_snapshot jsonb', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_biu_config_snapshot ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_biu_config_snapshot BEFORE INSERT OR UPDATE OF config_snapshot ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_set_config_snapshot()', t, t);
  END LOOP;
END $do$;

-- Challenges: server always sets the snapshot on insert; it cannot be changed later
CREATE OR REPLACE FUNCTION public.fn_snapshot_challenge_config()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT jsonb_object_agg(param_key, param_value) INTO NEW.config_snapshot
    FROM public.md_mpa_config
   WHERE param_group IN ('CHALLENGE_TIMING','AWARDS_MONEY','FILE_LIMITS','CALENDAR');
  NEW.config_snapshot := COALESCE(NEW.config_snapshot, '{}'::jsonb) || jsonb_build_object(
    'money_thresholds', public.fn_config_snapshot_payload()->'money_thresholds');
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.fn_freeze_challenge_config_snapshot()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.config_snapshot := OLD.config_snapshot; RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_challenges_update_freeze_config_snapshot ON public.challenges;
CREATE TRIGGER trg_challenges_update_freeze_config_snapshot BEFORE UPDATE OF config_snapshot ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.fn_freeze_challenge_config_snapshot();

-- ===== 5. Confidentiality =====
DROP POLICY IF EXISTS ccs_provider_select ON public.challenge_confidential_sections;

CREATE OR REPLACE FUNCTION public.get_challenge_org_displays(p_challenge_ids uuid[])
RETURNS TABLE(challenge_id uuid, org_display text, trade_brand_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ch.id,
    CASE WHEN ch.disclose_org_name OR public.fn_is_challenge_privileged(ch.id, auth.uid()) OR public.fn_is_challenge_winner(ch.id, auth.uid())
         THEN so.organization_name ELSE 'Seeking organisation: Confidential' END,
    CASE WHEN ch.disclose_org_name OR public.fn_is_challenge_privileged(ch.id, auth.uid()) OR public.fn_is_challenge_winner(ch.id, auth.uid())
         THEN so.trade_brand_name ELSE NULL END
  FROM public.challenges ch
  LEFT JOIN public.seeker_organizations so ON so.id = ch.organization_id
  WHERE auth.uid() IS NOT NULL AND ch.id = ANY (p_challenge_ids[1:100])
    AND ch.is_deleted = false AND ch.published_at IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_challenge_org_displays(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_challenge_org_displays(uuid[]) TO authenticated;

DO $do$
DECLARE v_def text;
BEGIN
  v_def := pg_get_functiondef('public.get_provider_challenge_view(uuid)'::regprocedure);
  v_def := replace(v_def, 'STABLE SECURITY DEFINER', 'VOLATILE SECURITY DEFINER');
  v_def := replace(v_def,
    $a$'storage_path', CASE WHEN v_privileged OR NOT a.is_confidential OR v_cpa THEN a.storage_path ELSE NULL END$a$,
    $a$'storage_path', CASE WHEN NOT a.is_confidential THEN a.storage_path ELSE NULL END$a$);
  v_def := replace(v_def, 'IF NOT v_privileged AND v_cpa AND v_has_conf THEN', 'IF (v_privileged OR v_cpa) AND v_has_conf THEN');
  v_def := replace(v_def, $a$jsonb_build_object('source', 'get_provider_challenge_view'), v_uid);$a$,
    $a$jsonb_build_object('source', 'get_provider_challenge_view', 'privileged', v_privileged), v_uid);$a$);
  IF position('VOLATILE SECURITY DEFINER' in v_def) = 0 OR position('IF (v_privileged OR v_cpa) AND v_has_conf' in v_def) = 0 THEN
    RAISE EXCEPTION 'get_provider_challenge_view patch did not apply';
  END IF;
  EXECUTE v_def;

  v_def := pg_get_functiondef('public.log_confidential_content_access(uuid,uuid,text)'::regprocedure);
  v_def := replace(v_def, 'SELECT a.id, a.challenge_id, a.file_name, a.is_confidential INTO v_att',
                          'SELECT a.id, a.challenge_id, a.file_name, a.is_confidential, a.storage_path INTO v_att');
  v_def := replace(v_def, $a$RETURN jsonb_build_object('success', true);$a$,
                          $a$RETURN jsonb_build_object('success', true, 'storage_path', v_att.storage_path);$a$);
  IF position('a.storage_path INTO v_att' in v_def) = 0 THEN RAISE EXCEPTION 'log_confidential patch did not apply'; END IF;
  EXECUTE v_def;
END $do$;

-- ===== 6. Certification: no direct approval by Basic Admin =====
DO $do$
DECLARE v_def text;
BEGIN
  v_def := pg_get_functiondef('public.finalize_certification(uuid,numeric,uuid)'::regprocedure);
  v_def := replace(v_def, $a$BEGIN
  -- Get current attempt count$a$, $a$BEGIN
  IF COALESCE(auth.role(),'') <> 'service_role' THEN
    IF auth.uid() IS NULL OR p_certifying_user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'You can only finalise certification as yourself.';
    END IF;
    IF NOT EXISTS (
         SELECT 1 FROM public.panel_reviewers pr
         JOIN public.booking_reviewers br ON br.reviewer_id = pr.id
         JOIN public.interview_bookings ib ON ib.id = br.booking_id
         WHERE ib.enrollment_id = p_enrollment_id AND pr.user_id = auth.uid() AND pr.is_active = true)
       AND NOT EXISTS (
         SELECT 1 FROM public.platform_admin_profiles pap
         JOIN public.tier_permissions tp ON tp.tier = pap.admin_tier
         WHERE pap.user_id = auth.uid() AND tp.permission_key = 'interview.approve_certifications' AND tp.is_enabled)
    THEN
      RAISE EXCEPTION 'Certification approval refused: your admin tier does not have the Approve Certifications permission and you are not the interviewing reviewer.';
    END IF;
  END IF;
  -- Get current attempt count$a$);
  IF position('Certification approval refused' in v_def) = 0 THEN RAISE EXCEPTION 'finalize_certification patch did not apply'; END IF;
  EXECUTE v_def;
END $do$;

-- ===== 7. Agreement rename =====
UPDATE public.legal_document_templates
   SET document_name = replace(replace(document_name, 'Prize & Work Agreement', 'Platform Workforce Agreement'), 'Prize and Work Agreement', 'Platform Workforce Agreement'),
       content = replace(replace(content, 'Prize & Work Agreement', 'Platform Workforce Agreement'), 'Prize and Work Agreement', 'Platform Workforce Agreement')
 WHERE document_name ILIKE '%prize%work%' OR content ILIKE '%prize & work agreement%' OR content ILIKE '%prize and work agreement%';

-- ===== 8. Missing RLS policy =====
DROP POLICY IF EXISTS background_jobs_platform_admin_read ON public.background_jobs;
CREATE POLICY background_jobs_platform_admin_read ON public.background_jobs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'platform_admin'::app_role));

-- ===== 9. Exposed functions: least privilege =====
DO $do$
DECLARE
  f RECORD;
  v_client text[] := ARRAY[
    'assemble_cpa','assemble_role_doc','assign_challenge_role','book_interview_slot','bulk_insert_questions','can_perform',
    'cancel_booked_slot_by_reviewer','cancel_interview_booking','check_duplicate_organization','check_legal_gate','check_lifecycle_locks',
    'check_model_authority','check_sla_status','check_tier_limit','claim_from_queue','claim_org_for_verification','complete_curator_compliance',
    'complete_financial_review','complete_legal_review','complete_phase','complete_verification_action','confirm_award','countersign_award',
    'creator_finalize_approval','curator_forward_pack_to_creator','delete_questions_by_specialities','execute_expertise_change_reset',
    'execute_expertise_change_reset_v2','execute_industry_change_reset','execute_industry_change_reset_v2','finalize_certification',
    'freeze_for_legal_review','generate_terms_acceptance_hash','get_cascade_impact_counts','get_cascade_impact_counts_v2',
    'get_eligible_admins_ranked','get_enrollment_lifecycle_info','get_governance_field_rules','get_mandatory_fields',
    'get_provider_challenge_view','get_question_count_by_specialities','get_realtime_admin_metrics','get_solution_secure',
    'get_submission_secure','get_tier_usage','get_unread_count','get_user_all_challenge_roles','get_user_dashboard_data',
    'get_valid_transitions','handle_orphaned_proof_points','handle_orphaned_proof_points_v2','has_role','initialize_challenge',
    'invite_provider_to_challenge','is_reviewer_assigned_to_booking','is_reviewer_for_provider','legal_template_health',
    'list_certified_providers_for_challenge','log_audit','log_confidential_content_access','mark_all_read','mark_notification_read',
    'place_in_open_queue','provider_challenge_access','pulse_award_xp','pulse_calculate_level','pulse_cards_award_reputation',
    'pulse_cards_get_reputation','pulse_get_streak_multiplier','pulse_update_streak','reassign_verification','recommend_award',
    'release_to_queue','request_reassignment','reset_enrollment_for_expertise_change','reset_enrollment_for_expertise_upgrade',
    'resolve_active_legal_template','resolve_quick_cpa_template','return_award','revoke_challenge_invitation','seed_default_legal_docs',
    'send_to_legal_review','submit_question','supervisor_reassign_to_self','sync_escrow_record_from_installments','unfreeze_for_recuration',
    'update_config_param','update_domain_weights','update_enrollment_lifecycle','validate_gate_02','validate_role_assignment',
    'get_challenge_org_displays','update_money_threshold'];
  v_anon text[] := ARRAY['generate_terms_acceptance_hash','check_duplicate_organization'];
  v_in_policy_anon boolean; v_in_policy_auth boolean; v_in_invoker boolean; v_sig text;
BEGIN
  FOR f IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args, t.typname AS rettype
    FROM pg_proc p JOIN pg_type t ON t.oid = p.prorettype
    WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    v_sig := format('public.%I(%s)', f.proname, f.args);
    IF f.rettype IN ('trigger','event_trigger') THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_sig);
      CONTINUE;
    END IF;
    SELECT
      bool_or(('public' = ANY(roles) OR 'anon' = ANY(roles))),
      bool_or(true)
    INTO v_in_policy_anon, v_in_policy_auth
    FROM pg_policies
    WHERE coalesce(qual,'') ~ ('\m'||f.proname||'\(') OR coalesce(with_check,'') ~ ('\m'||f.proname||'\(');
    SELECT EXISTS (SELECT 1 FROM pg_proc p2 WHERE NOT p2.prosecdef AND p2.oid <> f.oid
                     AND p2.pronamespace = 'public'::regnamespace AND p2.prosrc ~ ('\m'||f.proname||'\('))
        OR EXISTS (SELECT 1 FROM pg_views v WHERE v.schemaname = 'public' AND v.definition ~ ('\m'||f.proname||'\('))
        OR EXISTS (SELECT 1 FROM pg_attrdef ad WHERE pg_get_expr(ad.adbin, ad.adrelid) ~ ('\m'||f.proname||'\('))
      INTO v_in_invoker;

    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', v_sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_sig);
    IF COALESCE(v_in_policy_anon,false) OR v_in_invoker OR f.proname = ANY(v_anon) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', v_sig);
    ELSE
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', v_sig);
    END IF;
    IF COALESCE(v_in_policy_auth,false) OR v_in_invoker OR f.proname = ANY(v_client) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_sig);
    ELSE
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', v_sig);
    END IF;
  END LOOP;
END $do$;

-- ===== 10. Fixed search_path on functions missing it =====
DO $do$
DECLARE f RECORD;
BEGIN
  FOR f IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f'
      AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) c WHERE c LIKE 'search_path=%')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', f.proname, f.args);
  END LOOP;
END $do$;