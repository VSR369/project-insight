ALTER TABLE public.md_mpa_config ADD COLUMN IF NOT EXISTS is_sensitive BOOLEAN NOT NULL DEFAULT false;

INSERT INTO public.md_mpa_config (param_key,param_value,param_type,param_group,label,unit,min_value,max_value,is_sensitive,description)
SELECT v.* FROM (VALUES
('config_change_reason_min_length','10','INTEGER','GOVERNANCE_RULES','Change reason – minimum length','characters','5','100',false,'Minimum characters required in the reason for any settings change (DEF-0533).'),
('config_change_reason_max_length','500','INTEGER','GOVERNANCE_RULES','Change reason – maximum length','characters','100','2000',false,'Maximum characters allowed in the reason for any settings change.'),
('challenge_min_open_period_days','14','INTEGER','CHALLENGE_TIMING','Minimum open period','days','1','180',true,'Minimum days a challenge stays open for submissions. Copied onto each challenge when created.'),
('challenge_prep_buffer_days','14','INTEGER','CHALLENGE_TIMING','Preparation buffer before start','days','0','90',true,'Days between submission for review and earliest start date.'),
('dispute_window_days','10','INTEGER','AWARDS_MONEY','Dispute window','days','1','60',true,'Days after award confirmation during which a submitting provider may raise a dispute.'),
('award_acceptance_period_days','14','INTEGER','AWARDS_MONEY','Award acceptance period','days','1','60',true,'Days a winner has to accept or decline an award.'),
('award_acceptance_reminder_days','7,2','TEXT','AWARDS_MONEY','Award acceptance reminders','days before end',NULL,NULL,false,'Comma-separated reminder offsets before the acceptance deadline.'),
('money_rounding_decimals','2','INTEGER','AWARDS_MONEY','Money rounding – decimals','decimals','0','4',true,'Decimal places used when rounding money (half-up).'),
('abstract_min_chars','300','INTEGER','FILE_LIMITS','Abstract – minimum length','characters','0','5000',false,'Minimum characters in an abstract.'),
('abstract_max_chars','3000','INTEGER','FILE_LIMITS','Abstract – maximum length','characters','100','20000',false,'Maximum characters in an abstract.'),
('abstract_max_files','3','INTEGER','FILE_LIMITS','Abstract – maximum files','files','0','20',false,'Maximum attachments with an abstract.'),
('abstract_max_file_mb','20','INTEGER','FILE_LIMITS','Abstract – maximum file size','MB','1','100',false,'Maximum size per abstract attachment.'),
('solution_summary_max_chars','5000','INTEGER','FILE_LIMITS','Solution summary – maximum length','characters','100','50000',false,'Maximum characters in a solution summary.'),
('solution_max_files','10','INTEGER','FILE_LIMITS','Solution – maximum files','files','0','50',false,'Maximum attachments with a full solution.'),
('solution_max_file_mb','100','INTEGER','FILE_LIMITS','Solution – maximum file size','MB','1','500',false,'Maximum size per solution attachment.'),
('challenge_attachment_max_files','10','INTEGER','FILE_LIMITS','Challenge brief – maximum files','files','0','50',false,'Maximum attachments on a challenge brief.'),
('challenge_attachment_max_file_mb','50','INTEGER','FILE_LIMITS','Challenge brief – maximum file size','MB','1','500',false,'Maximum size per challenge brief attachment.'),
('challenge_attachment_types','PDF,DOCX,XLSX,PPTX,ZIP,PNG,JPEG','TEXT','FILE_LIMITS','Challenge brief – allowed file types',NULL,NULL,NULL,false,'Comma-separated allowed file types.'),
('non_selected_purge_days','30','INTEGER','CHALLENGE_TIMING','Purge of non-selected submissions','days','7','365',true,'Days after Completed/Cancelled before non-selected abstracts and solutions are purged.'),
('working_week_days','MON,TUE,WED,THU,FRI','TEXT','CALENDAR','Working week',NULL,NULL,NULL,false,'Days counted as working days (UTC, platform level).'),
('working_week_timezone','UTC','TEXT','CALENDAR','Working-day time zone',NULL,NULL,NULL,false,'Time zone for counting working days.')
) AS v(param_key,param_value,param_type,param_group,label,unit,min_value,max_value,is_sensitive,description)
WHERE NOT EXISTS (SELECT 1 FROM public.md_mpa_config c WHERE c.param_key = v.param_key);

ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS config_snapshot JSONB;

CREATE OR REPLACE FUNCTION public.fn_snapshot_challenge_config()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.config_snapshot IS NULL THEN
    SELECT jsonb_object_agg(param_key, param_value) INTO NEW.config_snapshot
      FROM public.md_mpa_config
     WHERE param_group IN ('CHALLENGE_TIMING','AWARDS_MONEY','FILE_LIMITS','CALENDAR');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_challenges_insert_snapshot_config ON public.challenges;
CREATE TRIGGER trg_challenges_insert_snapshot_config BEFORE INSERT ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.fn_snapshot_challenge_config();

CREATE OR REPLACE FUNCTION public.update_config_param(p_param_key text, p_new_value text, p_change_reason text DEFAULT NULL::text, p_ip_address text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_reason_min INTEGER;
  v_reason_max INTEGER;
BEGIN
  SELECT id INTO v_admin_profile_id
    FROM public.platform_admin_profiles
   WHERE user_id = auth.uid()
     AND admin_tier = 'supervisor';

  IF v_admin_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PERMISSION_DENIED', 'detail', 'Supervisor access required');
  END IF;

  SELECT COALESCE((SELECT param_value::INTEGER FROM public.md_mpa_config WHERE param_key = 'config_change_reason_min_length'), 10),
         COALESCE((SELECT param_value::INTEGER FROM public.md_mpa_config WHERE param_key = 'config_change_reason_max_length'), 500)
    INTO v_reason_min, v_reason_max;
  IF p_change_reason IS NULL OR length(btrim(p_change_reason)) < v_reason_min OR length(btrim(p_change_reason)) > v_reason_max THEN
    RETURN jsonb_build_object('success', false, 'error', 'REASON_REQUIRED', 'detail', 'Enter a reason of ' || v_reason_min || ' to ' || v_reason_max || ' characters for this change.');
  END IF;

  SELECT param_key, param_value, param_type, param_group, min_value, max_value
    INTO v_existing
    FROM public.md_mpa_config
   WHERE param_key = p_param_key
   FOR UPDATE;

  IF v_existing IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PARAM_NOT_FOUND', 'detail', 'Parameter not found: ' || p_param_key);
  END IF;

  v_old_value := v_existing.param_value;

  IF v_existing.param_type = 'UUID' AND (p_new_value IS NULL OR p_new_value = '') THEN
    UPDATE public.md_mpa_config
       SET param_value = NULL, updated_at = NOW(), updated_by_id = v_admin_profile_id
     WHERE param_key = p_param_key;
    INSERT INTO public.md_mpa_config_audit (param_key, previous_value, new_value, changed_by_id, change_reason, ip_address)
    VALUES (p_param_key, v_old_value, 'NULL', v_admin_profile_id, p_change_reason, p_ip_address);
    RETURN jsonb_build_object('success', true, 'param_key', p_param_key, 'new_value', NULL);
  END IF;

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

  UPDATE public.md_mpa_config
     SET param_value = p_new_value, updated_at = NOW(), updated_by_id = v_admin_profile_id
   WHERE param_key = p_param_key;

  INSERT INTO public.md_mpa_config_audit (param_key, previous_value, new_value, changed_by_id, change_reason, ip_address)
  VALUES (p_param_key, v_old_value, p_new_value, v_admin_profile_id, p_change_reason, p_ip_address);

  RETURN jsonb_build_object('success', true, 'param_key', p_param_key, 'new_value', p_new_value);
END;
$function$;