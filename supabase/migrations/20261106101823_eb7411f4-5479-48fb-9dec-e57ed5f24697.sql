ALTER TABLE public.md_legal_review_thresholds DROP CONSTRAINT IF EXISTS md_legal_review_thresholds_country_id_governance_mode_key;
ALTER TABLE public.md_legal_review_thresholds ADD CONSTRAINT md_legal_review_thresholds_country_mode_param_key UNIQUE (country_id, governance_mode, param_key);

INSERT INTO public.md_legal_review_thresholds (country_id, currency_code, threshold_amount, governance_mode, param_key, min_amount, max_amount)
SELECT t.country_id, t.currency_code, v.amt, v.mode, v.pk, 1, t.max_amount
FROM public.md_legal_review_thresholds t
JOIN (VALUES
 ('USD','express_award_limit','STRUCTURED',5000),('USD','high_rigor_award_threshold','CONTROLLED',25000),
 ('EUR','express_award_limit','STRUCTURED',5000),('EUR','high_rigor_award_threshold','CONTROLLED',25000),
 ('GBP','express_award_limit','STRUCTURED',4000),('GBP','high_rigor_award_threshold','CONTROLLED',20000),
 ('INR','express_award_limit','STRUCTURED',400000),('INR','high_rigor_award_threshold','CONTROLLED',2000000)
) v(cur,pk,mode,amt) ON v.cur = t.currency_code
WHERE t.param_key = 'legal_review_threshold'
ON CONFLICT (country_id, governance_mode, param_key) DO NOTHING;

-- Express limit may not exceed the High-Rigor threshold of the same currency
CREATE OR REPLACE FUNCTION public.fn_validate_governance_award_limits()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_other numeric;
BEGIN
  IF NEW.param_key NOT IN ('express_award_limit','high_rigor_award_threshold') THEN RETURN NEW; END IF;
  IF NEW.threshold_amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than 0' USING ERRCODE = 'check_violation'; END IF;
  SELECT threshold_amount INTO v_other FROM public.md_legal_review_thresholds
   WHERE currency_code = NEW.currency_code AND is_active AND id <> NEW.id
     AND param_key = CASE NEW.param_key WHEN 'express_award_limit' THEN 'high_rigor_award_threshold' ELSE 'express_award_limit' END
   LIMIT 1;
  IF v_other IS NOT NULL AND (
     (NEW.param_key = 'express_award_limit' AND NEW.threshold_amount > v_other) OR
     (NEW.param_key = 'high_rigor_award_threshold' AND NEW.threshold_amount < v_other)) THEN
    RAISE EXCEPTION 'The Express award limit may not exceed the High-Rigor award threshold for %', NEW.currency_code USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.fn_validate_governance_award_limits() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_md_legal_review_thresholds_biu_award_limits ON public.md_legal_review_thresholds;
CREATE TRIGGER trg_md_legal_review_thresholds_biu_award_limits BEFORE INSERT OR UPDATE ON public.md_legal_review_thresholds
FOR EACH ROW EXECUTE FUNCTION public.fn_validate_governance_award_limits();

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS is_regulated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_ip_sensitive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS governance_threshold_snapshot jsonb;

-- Total award pool from the reward structure
CREATE OR REPLACE FUNCTION private.fn_challenge_award_pool(p_reward jsonb, p_reward_amount numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT COALESCE(
    NULLIF(COALESCE((p_reward->>'platinum_award')::numeric,0) + COALESCE((p_reward->>'gold_award')::numeric,0)
         + COALESCE((p_reward->>'silver_award')::numeric,0) + COALESCE((p_reward->>'bronze_award')::numeric,0), 0),
    (p_reward->>'budget_max')::numeric, p_reward_amount, 0)
$$;

-- Minimum mode: QUICK / STRUCTURED / CONTROLLED
CREATE OR REPLACE FUNCTION private.fn_minimum_governance_mode(p_pool numeric, p_regulated boolean, p_ip boolean, p_limits jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN p_regulated OR p_ip THEN 'CONTROLLED'
    WHEN p_limits IS NULL OR p_limits->>'express_award_limit' IS NULL THEN 'STRUCTURED'
    WHEN p_limits->>'high_rigor_award_threshold' IS NOT NULL AND p_pool >= (p_limits->>'high_rigor_award_threshold')::numeric THEN 'CONTROLLED'
    WHEN p_pool >= (p_limits->>'express_award_limit')::numeric THEN 'STRUCTURED'
    ELSE 'QUICK' END
$$;

CREATE OR REPLACE FUNCTION public.fn_enforce_minimum_governance_mode()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
     WHERE currency_code = v_cur AND is_active AND param_key IN ('express_award_limit','high_rigor_award_threshold');
    NEW.governance_threshold_snapshot := COALESCE(v_limits, jsonb_build_object('currency', v_cur, 'taken_at', now()));
  ELSE
    v_limits := NEW.governance_threshold_snapshot;
    IF v_limits IS NULL THEN RETURN NEW; END IF; -- legacy work in progress keeps running
  END IF;

  v_min := private.fn_minimum_governance_mode(private.fn_challenge_award_pool(NEW.reward_structure, NEW.reward_amount),
                                              NEW.is_regulated, NEW.is_ip_sensitive, v_limits);
  IF (v_rank->>v_mode)::int < (v_rank->>v_min)::int THEN
    RAISE EXCEPTION 'This challenge requires at least % governance.',
      CASE v_min WHEN 'CONTROLLED' THEN 'High-Rigor' WHEN 'STRUCTURED' THEN 'Structured' ELSE 'Express' END
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.fn_enforce_minimum_governance_mode() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_challenges_bu_minimum_mode ON public.challenges;
CREATE TRIGGER trg_challenges_bu_minimum_mode BEFORE UPDATE OF phase_status ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_minimum_governance_mode();

-- Client helper: minimum mode for a draft (used to hide Express / warn early)
CREATE OR REPLACE FUNCTION public.get_minimum_governance_mode(p_currency text, p_pool numeric, p_regulated boolean, p_ip_sensitive boolean)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.fn_minimum_governance_mode(p_pool, p_regulated, p_ip_sensitive,
    (SELECT jsonb_object_agg(param_key, threshold_amount) FROM public.md_legal_review_thresholds
      WHERE currency_code = UPPER(p_currency) AND is_active AND param_key IN ('express_award_limit','high_rigor_award_threshold')))
$$;
REVOKE EXECUTE ON FUNCTION public.get_minimum_governance_mode(text, numeric, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_minimum_governance_mode(text, numeric, boolean, boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION private.fn_minimum_governance_mode(numeric, boolean, boolean, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.fn_challenge_award_pool(jsonb, numeric) FROM PUBLIC;