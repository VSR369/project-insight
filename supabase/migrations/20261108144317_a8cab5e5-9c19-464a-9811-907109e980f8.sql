CREATE OR REPLACE FUNCTION public.enforce_governance_escalation_only()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old_mode text;
  v_new_mode text;
  v_modes text[] := ARRAY['QUICK','STRUCTURED','CONTROLLED'];
BEGIN
  v_new_mode := CASE upper(coalesce(NEW.governance_mode_override,NEW.governance_profile,'STRUCTURED')) WHEN 'LIGHTWEIGHT' THEN 'QUICK' WHEN 'ENTERPRISE' THEN 'CONTROLLED' ELSE upper(coalesce(NEW.governance_mode_override,NEW.governance_profile,'STRUCTURED')) END;
  IF TG_OP = 'UPDATE' THEN
    v_old_mode := CASE upper(coalesce(OLD.governance_mode_override,OLD.governance_profile,'STRUCTURED')) WHEN 'LIGHTWEIGHT' THEN 'QUICK' WHEN 'ENTERPRISE' THEN 'CONTROLLED' ELSE upper(coalesce(OLD.governance_mode_override,OLD.governance_profile,'STRUCTURED')) END;
    IF v_old_mode = v_new_mode AND NEW.operating_model IS NOT DISTINCT FROM OLD.operating_model THEN RETURN NEW; END IF;
  END IF;
  IF NOT v_new_mode = ANY(v_modes) THEN RAISE EXCEPTION 'Please select a governance mode' USING ERRCODE='check_violation'; END IF;
  IF coalesce(NEW.operating_model,'MP') = 'MP' AND v_new_mode = 'QUICK' THEN
    RAISE EXCEPTION 'Marketplace challenges require Structured or High-Rigor governance.' USING ERRCODE='check_violation';
  END IF;
  IF TG_OP = 'INSERT' OR v_old_mode = v_new_mode THEN RETURN NEW; END IF;
  IF OLD.status = 'DRAFT' THEN RETURN NEW; END IF;
  IF OLD.current_phase IS DISTINCT FROM 2 OR OLD.phase_status IN ('COMPLETED','COMPLETED_BYPASSED','TERMINAL')
    OR auth.uid() IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.user_challenge_roles r WHERE r.challenge_id=OLD.id AND r.user_id=auth.uid() AND r.role_code='CU' AND r.is_active)
    OR array_position(v_modes,v_new_mode) <= array_position(v_modes,v_old_mode)
  THEN
    RAISE EXCEPTION 'After submission, only the assigned Curator may raise governance during Curation.' USING ERRCODE='insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_governance_escalation_only() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_challenges_insert_governance_selection BEFORE INSERT ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.enforce_governance_escalation_only();
COMMENT ON FUNCTION public.enforce_governance_escalation_only() IS 'DEF-0013 / BR-CHL-M01 / OR-3: new Marketplace selections exclude Express; after Draft only assigned Curator may raise during Curation. Unrelated legacy edits are unaffected.';