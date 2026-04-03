-- ╔══════════════════════════════════════════════════════════╗
-- ║  PART A: Configurable lifecycle phase config table       ║
-- ╚══════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS public.md_lifecycle_phase_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  governance_mode TEXT NOT NULL CHECK (governance_mode IN ('QUICK','STRUCTURED','CONTROLLED')),
  phase_number INTEGER NOT NULL CHECK (phase_number BETWEEN 1 AND 10),
  phase_name TEXT NOT NULL,
  phase_description TEXT,
  required_role TEXT,
  secondary_role TEXT,
  phase_type TEXT NOT NULL DEFAULT 'seeker_manual'
    CHECK (phase_type IN ('seeker_manual','seeker_auto','solver_action','system_auto','parallel_compliance')),
  auto_complete BOOLEAN NOT NULL DEFAULT FALSE,
  gate_flags TEXT[],
  sla_days INTEGER DEFAULT 5,
  display_order INTEGER NOT NULL DEFAULT 0,
  icon_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (governance_mode, phase_number)
);

INSERT INTO public.md_lifecycle_phase_config (
  governance_mode, phase_number, phase_name, phase_description,
  required_role, secondary_role, phase_type, auto_complete,
  gate_flags, sla_days, display_order
) VALUES
('QUICK',1,'Create','Creator defines the challenge','CR',NULL,'seeker_manual',false,NULL,3,1),
('QUICK',2,'Curation','Platform defaults applied','CU',NULL,'seeker_auto',true,NULL,0,2),
('QUICK',3,'Compliance','Legal templates auto-attached, no escrow','LC','FC','seeker_auto',true,'{lc_compliance_complete,fc_compliance_complete}',0,3),
('QUICK',4,'Publication','Challenge goes live',NULL,NULL,'system_auto',true,NULL,0,4),
('QUICK',5,'Abstract submit','Solvers submit proposals',NULL,NULL,'solver_action',false,NULL,14,5),
('QUICK',6,'Abstract review','Expert evaluates abstracts','ER','FC','seeker_manual',false,NULL,7,6),
('QUICK',7,'Solution submit','Shortlisted solvers submit full solutions',NULL,NULL,'solver_action',false,NULL,21,7),
('QUICK',8,'Solution review','Expert evaluates full solutions','ER',NULL,'seeker_manual',false,NULL,7,8),
('QUICK',9,'Award decision','Creator confirms winner','CU',NULL,'seeker_manual',false,NULL,3,9),
('QUICK',10,'Payment','Direct payment processing','FC',NULL,'seeker_auto',true,NULL,0,10),
('STRUCTURED',1,'Create','Creator defines the challenge with standard fields','CR',NULL,'seeker_manual',false,NULL,5,1),
('STRUCTURED',2,'Curation','Curator reviews quality with 14-point checklist','CU',NULL,'seeker_manual',false,NULL,5,2),
('STRUCTURED',3,'Compliance','Legal review on curated version. Optional escrow.','LC','FC','parallel_compliance',false,'{lc_compliance_complete,fc_compliance_complete}',5,3),
('STRUCTURED',4,'Publication','Challenge goes live after compliance',NULL,NULL,'system_auto',true,NULL,0,4),
('STRUCTURED',5,'Abstract submit','Solvers submit proposals',NULL,NULL,'solver_action',false,NULL,14,5),
('STRUCTURED',6,'Abstract review','Expert evaluates abstracts with documented rationale','ER','FC','seeker_manual',false,NULL,7,6),
('STRUCTURED',7,'Solution submit','Shortlisted solvers submit full solutions',NULL,NULL,'solver_action',false,NULL,21,7),
('STRUCTURED',8,'Solution review','Expert evaluates with weighted scoring','ER',NULL,'seeker_manual',false,NULL,7,8),
('STRUCTURED',9,'Award decision','Curator recommends, Creator confirms','CU',NULL,'seeker_manual',false,NULL,5,9),
('STRUCTURED',10,'Payment','Financial controller processes payment','FC',NULL,'seeker_manual',false,NULL,5,10),
('CONTROLLED',1,'Create','Creator defines challenge with extended form and risk assessment','CR',NULL,'seeker_manual',false,NULL,5,1),
('CONTROLLED',2,'Curation','Full 14-point checklist + mandatory AI review + dual curation','CU',NULL,'seeker_manual',false,NULL,5,2),
('CONTROLLED',3,'Compliance','AI-powered legal review + mandatory escrow deposit','LC','FC','parallel_compliance',false,'{lc_compliance_complete,fc_compliance_complete}',3,3),
('CONTROLLED',4,'Publication','Challenge published with full audit snapshot',NULL,NULL,'system_auto',true,NULL,0,4),
('CONTROLLED',5,'Abstract submit','Solvers submit proposals',NULL,NULL,'solver_action',false,NULL,14,5),
('CONTROLLED',6,'Abstract review','Dual blind evaluation + milestone payment from escrow','ER','FC','seeker_manual',false,NULL,7,6),
('CONTROLLED',7,'Solution submit','Shortlisted solvers submit full solutions',NULL,NULL,'solver_action',false,NULL,21,7),
('CONTROLLED',8,'Solution review','Dual blind evaluation with anonymized scoring','ER',NULL,'seeker_manual',false,NULL,7,8),
('CONTROLLED',9,'Award decision','Curator recommends, Creator confirms with dual signoff','CU',NULL,'seeker_manual',false,NULL,5,9),
('CONTROLLED',10,'Payment','Escrow release with dual authorization + financial audit','FC',NULL,'seeker_manual',false,NULL,5,10)
ON CONFLICT (governance_mode, phase_number) DO NOTHING;

ALTER TABLE public.md_lifecycle_phase_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lifecycle config"
  ON public.md_lifecycle_phase_config FOR SELECT USING (true);

CREATE POLICY "Supervisors can manage lifecycle config"
  ON public.md_lifecycle_phase_config FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE user_id = auth.uid() AND admin_tier IN ('supervisor','senior_admin')
    )
  );

CREATE OR REPLACE FUNCTION public.get_phase_required_role(p_phase INTEGER, p_governance_mode TEXT DEFAULT 'STRUCTURED')
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT required_role FROM public.md_lifecycle_phase_config
  WHERE phase_number = p_phase AND governance_mode = p_governance_mode AND is_active = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_phase_required_role(p_phase INTEGER)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.get_phase_required_role(p_phase, 'STRUCTURED');
$$;

CREATE OR REPLACE FUNCTION public.get_phase_config(p_challenge_id UUID, p_phase INTEGER)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_gov TEXT; v_cfg RECORD;
BEGIN
  SELECT COALESCE(governance_mode_override, governance_profile, 'STRUCTURED')
    INTO v_gov FROM public.challenges WHERE id = p_challenge_id;
  SELECT * INTO v_cfg FROM public.md_lifecycle_phase_config
    WHERE governance_mode = v_gov AND phase_number = p_phase AND is_active = true;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'phase_number', v_cfg.phase_number, 'phase_name', v_cfg.phase_name,
    'required_role', v_cfg.required_role, 'secondary_role', v_cfg.secondary_role,
    'phase_type', v_cfg.phase_type, 'auto_complete', v_cfg.auto_complete,
    'gate_flags', v_cfg.gate_flags, 'sla_days', v_cfg.sla_days
  );
END; $$;

CREATE OR REPLACE FUNCTION public.complete_phase(p_challenge_id UUID, p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_current_phase INTEGER; v_phase_status TEXT; v_gov_mode TEXT;
  v_phase_config RECORD; v_next_config RECORD;
  v_can_perform BOOLEAN; v_next_phase INTEGER; v_same_actor BOOLEAN;
  v_recursive_result JSONB; v_auto_completed INTEGER[] := '{}';
  v_lc_complete BOOLEAN; v_fc_complete BOOLEAN;
  v_legal_doc_mode TEXT; v_escrow_mode TEXT;
BEGIN
  SELECT current_phase, phase_status,
    COALESCE(governance_mode_override, governance_profile, 'STRUCTURED'),
    lc_compliance_complete, fc_compliance_complete
  INTO v_current_phase, v_phase_status, v_gov_mode, v_lc_complete, v_fc_complete
  FROM public.challenges WHERE id = p_challenge_id;
  IF v_current_phase IS NULL THEN RAISE EXCEPTION 'Challenge not found.'; END IF;
  IF v_phase_status IS DISTINCT FROM 'ACTIVE' THEN RAISE EXCEPTION 'Phase not active.'; END IF;

  SELECT * INTO v_phase_config FROM public.md_lifecycle_phase_config
  WHERE governance_mode = v_gov_mode AND phase_number = v_current_phase AND is_active = true;

  IF v_phase_config.required_role IS NOT NULL THEN
    SELECT public.can_perform(p_user_id, p_challenge_id, v_phase_config.required_role) INTO v_can_perform;
    IF v_can_perform IS NOT TRUE THEN
      RAISE EXCEPTION 'Permission denied for phase % (requires %).', v_current_phase, v_phase_config.required_role;
    END IF;
  END IF;

  IF v_phase_config.gate_flags IS NOT NULL AND array_length(v_phase_config.gate_flags, 1) > 0 THEN
    SELECT lc_compliance_complete, fc_compliance_complete INTO v_lc_complete, v_fc_complete
    FROM public.challenges WHERE id = p_challenge_id;
    IF 'lc_compliance_complete' = ANY(v_phase_config.gate_flags) AND NOT COALESCE(v_lc_complete, false) THEN
      RAISE EXCEPTION 'Gate: lc_compliance_complete = false'; END IF;
    IF 'fc_compliance_complete' = ANY(v_phase_config.gate_flags) AND NOT COALESCE(v_fc_complete, false) THEN
      RAISE EXCEPTION 'Gate: fc_compliance_complete = false'; END IF;
  END IF;

  UPDATE public.challenges SET phase_status = 'COMPLETED', updated_at = NOW(), updated_by = p_user_id WHERE id = p_challenge_id;
  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, phase_from, phase_to, details)
  VALUES (p_challenge_id, p_user_id, 'PHASE_COMPLETED', 'HUMAN', v_current_phase, v_current_phase,
    jsonb_build_object('phase_name', v_phase_config.phase_name, 'governance_mode', v_gov_mode));
  UPDATE public.sla_timers SET status = 'COMPLETED', completed_at = NOW()
  WHERE challenge_id = p_challenge_id AND phase = v_current_phase AND status = 'ACTIVE';

  v_next_phase := CASE WHEN v_current_phase < 10 THEN v_current_phase + 1 ELSE NULL END;
  IF v_next_phase IS NULL THEN
    UPDATE public.challenges SET master_status = 'COMPLETED', completed_at = NOW(), updated_at = NOW(), updated_by = p_user_id WHERE id = p_challenge_id;
    RETURN jsonb_build_object('completed', true, 'lifecycle_complete', true, 'final_phase', v_current_phase, 'phases_auto_completed', to_jsonb(v_auto_completed));
  END IF;

  SELECT * INTO v_next_config FROM public.md_lifecycle_phase_config
  WHERE governance_mode = v_gov_mode AND phase_number = v_next_phase AND is_active = true;

  IF v_next_config.phase_type = 'parallel_compliance' THEN
    SELECT legal_doc_mode, escrow_mode INTO v_legal_doc_mode, v_escrow_mode
    FROM public.md_governance_mode_config WHERE governance_mode = v_gov_mode AND is_active = true LIMIT 1;
    IF v_legal_doc_mode = 'auto_apply' THEN
      UPDATE public.challenges SET lc_compliance_complete = TRUE WHERE id = p_challenge_id;
    END IF;
    IF v_escrow_mode IN ('not_applicable', 'optional') THEN
      UPDATE public.challenges SET fc_compliance_complete = TRUE WHERE id = p_challenge_id;
    END IF;
  END IF;

  UPDATE public.challenges SET current_phase = v_next_phase, phase_status = 'ACTIVE',
    master_status = CASE WHEN v_next_phase >= 4 THEN 'ACTIVE' ELSE master_status END,
    published_at = CASE WHEN v_next_phase = 4 THEN COALESCE(published_at, NOW()) ELSE published_at END,
    updated_at = NOW(), updated_by = p_user_id WHERE id = p_challenge_id;
  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, phase_from, phase_to)
  VALUES (p_challenge_id, p_user_id, 'PHASE_ADVANCED', 'SYSTEM', v_current_phase, v_next_phase);

  IF v_next_config.required_role IS NULL OR v_next_config.auto_complete THEN
    IF v_next_config.phase_type = 'solver_action' THEN
      RETURN jsonb_build_object('completed', true, 'lifecycle_complete', false, 'current_phase', v_next_phase,
        'waiting_for', 'Solver submissions', 'phases_auto_completed', to_jsonb(v_auto_completed));
    END IF;
    v_auto_completed := v_auto_completed || v_next_phase;
    v_recursive_result := public.complete_phase(p_challenge_id, p_user_id);
    IF v_recursive_result ? 'phases_auto_completed' THEN
      SELECT array_agg(elem::integer) INTO v_auto_completed
      FROM (SELECT unnest(v_auto_completed) AS elem UNION
            SELECT jsonb_array_elements_text(v_recursive_result->'phases_auto_completed')::integer) sub;
    END IF;
    RETURN jsonb_build_object('completed', true,
      'lifecycle_complete', COALESCE((v_recursive_result->>'lifecycle_complete')::boolean, false),
      'current_phase', COALESCE((v_recursive_result->>'current_phase')::integer, v_next_phase),
      'phases_auto_completed', to_jsonb(v_auto_completed));
  END IF;

  SELECT public.can_perform(p_user_id, p_challenge_id, v_next_config.required_role) INTO v_same_actor;
  IF v_same_actor THEN
    IF v_next_config.gate_flags IS NOT NULL AND array_length(v_next_config.gate_flags, 1) > 0 THEN
      SELECT lc_compliance_complete, fc_compliance_complete INTO v_lc_complete, v_fc_complete
      FROM public.challenges WHERE id = p_challenge_id;
      IF ('lc_compliance_complete' = ANY(v_next_config.gate_flags) AND NOT COALESCE(v_lc_complete, false))
         OR ('fc_compliance_complete' = ANY(v_next_config.gate_flags) AND NOT COALESCE(v_fc_complete, false)) THEN
        RETURN jsonb_build_object('completed', true, 'lifecycle_complete', false, 'current_phase', v_next_phase,
          'waiting_for', 'Compliance review', 'phases_auto_completed', to_jsonb(v_auto_completed));
      END IF;
    END IF;
    v_auto_completed := v_auto_completed || v_next_phase;
    v_recursive_result := public.complete_phase(p_challenge_id, p_user_id);
    IF v_recursive_result ? 'phases_auto_completed' THEN
      SELECT array_agg(elem::integer) INTO v_auto_completed
      FROM (SELECT unnest(v_auto_completed) AS elem UNION
            SELECT jsonb_array_elements_text(v_recursive_result->'phases_auto_completed')::integer) sub;
    END IF;
    RETURN jsonb_build_object('completed', true,
      'lifecycle_complete', COALESCE((v_recursive_result->>'lifecycle_complete')::boolean, false),
      'current_phase', COALESCE((v_recursive_result->>'current_phase')::integer, v_next_phase),
      'phases_auto_completed', to_jsonb(v_auto_completed));
  END IF;

  RETURN jsonb_build_object('completed', true, 'lifecycle_complete', false,
    'current_phase', v_next_phase, 'phases_auto_completed', to_jsonb(v_auto_completed));
END; $$;

CREATE OR REPLACE FUNCTION public.auto_assign_roles_on_creation(
  p_challenge_id UUID, p_creator_id UUID,
  p_governance_profile TEXT DEFAULT 'STRUCTURED', p_operating_model TEXT DEFAULT 'AGG'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  ELSIF v_mode = 'STRUCTURED' THEN v_roles := ARRAY['CR','LC'];
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
END; $$;

CREATE OR REPLACE FUNCTION public.complete_legal_review(p_challenge_id UUID, p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_challenge RECORD; v_has_role BOOLEAN; v_phase_result JSONB; v_compliance_phase INTEGER;
BEGIN
  SELECT id, current_phase, lc_compliance_complete, fc_compliance_complete,
    COALESCE(governance_mode_override, governance_profile, 'STRUCTURED') AS gov_mode
  INTO v_challenge FROM challenges WHERE id = p_challenge_id;
  IF v_challenge IS NULL THEN RETURN jsonb_build_object('success',false,'error','Challenge not found'); END IF;

  SELECT phase_number INTO v_compliance_phase FROM md_lifecycle_phase_config
  WHERE governance_mode = v_challenge.gov_mode AND phase_type = 'parallel_compliance' AND is_active = true LIMIT 1;
  IF v_compliance_phase IS NULL THEN v_compliance_phase := 3; END IF;

  SELECT EXISTS(SELECT 1 FROM user_challenge_roles
    WHERE user_id = p_user_id AND challenge_id = p_challenge_id AND role_code = 'LC' AND is_active = true) INTO v_has_role;
  IF NOT v_has_role THEN RETURN jsonb_build_object('success',false,'error','No LC role'); END IF;
  IF v_challenge.current_phase != v_compliance_phase THEN
    RETURN jsonb_build_object('success',false,'error',format('Not in compliance phase. Current: %s',v_challenge.current_phase)); END IF;

  UPDATE challenges SET lc_compliance_complete = true, updated_at = now(), updated_by = p_user_id WHERE id = p_challenge_id;
  INSERT INTO audit_trail (user_id, challenge_id, action, method, details)
  VALUES (p_user_id, p_challenge_id, 'LEGAL_REVIEW_COMPLETED', 'RPC', jsonb_build_object('flag','lc_compliance_complete'));

  IF v_challenge.fc_compliance_complete = true THEN
    SELECT public.complete_phase(p_challenge_id, p_user_id) INTO v_phase_result;
    RETURN jsonb_build_object('success',true,'phase_advanced',true,
      'current_phase',(v_phase_result->>'current_phase')::integer,'phase_result',v_phase_result);
  END IF;
  RETURN jsonb_build_object('success',true,'phase_advanced',false,'current_phase',v_compliance_phase,'waiting_for','fc_compliance_complete');
END; $$;

CREATE OR REPLACE FUNCTION public.complete_financial_review(p_challenge_id UUID, p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_challenge RECORD; v_has_role BOOLEAN; v_phase_result JSONB; v_compliance_phase INTEGER;
BEGIN
  SELECT id, current_phase, lc_compliance_complete, fc_compliance_complete,
    COALESCE(governance_mode_override, governance_profile, 'STRUCTURED') AS gov_mode
  INTO v_challenge FROM challenges WHERE id = p_challenge_id;
  IF v_challenge IS NULL THEN RETURN jsonb_build_object('success',false,'error','Challenge not found'); END IF;
  SELECT phase_number INTO v_compliance_phase FROM md_lifecycle_phase_config
  WHERE governance_mode = v_challenge.gov_mode AND phase_type = 'parallel_compliance' AND is_active = true LIMIT 1;
  IF v_compliance_phase IS NULL THEN v_compliance_phase := 3; END IF;
  SELECT EXISTS(SELECT 1 FROM user_challenge_roles
    WHERE user_id = p_user_id AND challenge_id = p_challenge_id AND role_code = 'FC' AND is_active = true) INTO v_has_role;
  IF NOT v_has_role THEN RETURN jsonb_build_object('success',false,'error','No FC role'); END IF;
  IF v_challenge.current_phase != v_compliance_phase THEN
    RETURN jsonb_build_object('success',false,'error',format('Not in compliance phase. Current: %s',v_challenge.current_phase)); END IF;
  UPDATE challenges SET fc_compliance_complete = true, updated_at = now(), updated_by = p_user_id WHERE id = p_challenge_id;
  INSERT INTO audit_trail (user_id, challenge_id, action, method, details)
  VALUES (p_user_id, p_challenge_id, 'FINANCIAL_REVIEW_COMPLETED', 'RPC', jsonb_build_object('flag','fc_compliance_complete'));
  IF v_challenge.lc_compliance_complete = true THEN
    SELECT public.complete_phase(p_challenge_id, p_user_id) INTO v_phase_result;
    RETURN jsonb_build_object('success',true,'phase_advanced',true,
      'current_phase',(v_phase_result->>'current_phase')::integer,'phase_result',v_phase_result);
  END IF;
  RETURN jsonb_build_object('success',true,'phase_advanced',false,'current_phase',v_compliance_phase,'waiting_for','lc_compliance_complete');
END; $$;
