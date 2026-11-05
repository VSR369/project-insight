DROP FUNCTION IF EXISTS public.get_challenge_org_displays(uuid[]);
DROP FUNCTION IF EXISTS public.update_money_threshold(uuid,numeric,text);

-- Money thresholds through update_config_param using key 'money:<threshold uuid>'
DO $do$
DECLARE v_def text;
BEGIN
  v_def := pg_get_functiondef('public.update_config_param(text,text,text,text)'::regprocedure);
  v_def := replace(v_def, $a$  SELECT param_key, param_value, param_type, param_group, min_value, max_value
    INTO v_existing$a$, $a$  IF p_param_key LIKE 'money:%' THEN
    DECLARE r RECORD; v_amt numeric;
    BEGIN
      BEGIN v_amt := p_new_value::numeric; EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_TYPE', 'detail', 'Amount must be a number'); END;
      SELECT * INTO r FROM public.md_legal_review_thresholds WHERE id = substring(p_param_key from 7)::uuid FOR UPDATE;
      IF r.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'PARAM_NOT_FOUND', 'detail', p_param_key); END IF;
      BEGIN
        UPDATE public.md_legal_review_thresholds SET threshold_amount = v_amt, updated_at = now(), updated_by = auth.uid() WHERE id = r.id;
      EXCEPTION WHEN check_violation THEN
        RETURN jsonb_build_object('success', false, 'error', 'OUT_OF_RANGE', 'detail', SQLERRM);
      END;
      INSERT INTO public.md_mpa_config_audit (param_key, previous_value, new_value, changed_by_id, change_reason, ip_address)
      VALUES (r.param_key||':'||r.currency_code||':'||COALESCE(r.governance_mode,''), r.threshold_amount::text, v_amt::text, v_admin_profile_id, p_change_reason, p_ip_address);
      RETURN jsonb_build_object('success', true, 'param_key', p_param_key, 'new_value', v_amt);
    END;
  END IF;

  SELECT param_key, param_value, param_type, param_group, min_value, max_value
    INTO v_existing$a$);
  IF position('money:%' in v_def) = 0 THEN RAISE EXCEPTION 'money patch did not apply'; END IF;
  EXECUTE v_def;
END $do$;

-- Stored provider-facing organisation label on challenges
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS org_display_name text;

CREATE OR REPLACE FUNCTION public.fn_set_challenge_org_display()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT COALESCE((NEW.extended_brief->>'is_anonymous')::boolean, false) THEN
    SELECT COALESCE(so.trade_brand_name, so.organization_name) INTO NEW.org_display_name
      FROM public.seeker_organizations so WHERE so.id = NEW.organization_id;
  ELSE
    NEW.org_display_name := 'Seeking organisation: Confidential';
  END IF;
  NEW.org_display_name := COALESCE(NEW.org_display_name, 'Seeking organisation: Confidential');
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.fn_set_challenge_org_display() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_challenges_biu_org_display ON public.challenges;
CREATE TRIGGER trg_challenges_biu_org_display BEFORE INSERT OR UPDATE OF organization_id, extended_brief, org_display_name ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_challenge_org_display();

ALTER TABLE public.challenges DISABLE TRIGGER USER;
UPDATE public.challenges ch SET org_display_name =
  CASE WHEN NOT COALESCE((ch.extended_brief->>'is_anonymous')::boolean, false)
       THEN COALESCE((SELECT COALESCE(so.trade_brand_name, so.organization_name) FROM public.seeker_organizations so WHERE so.id = ch.organization_id),
                     'Seeking organisation: Confidential')
       ELSE 'Seeking organisation: Confidential' END;
ALTER TABLE public.challenges ENABLE TRIGGER USER;