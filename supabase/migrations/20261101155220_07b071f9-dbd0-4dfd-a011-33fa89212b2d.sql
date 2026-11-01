
-- 1. Status set registry -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.md_status_sets (
  set_code TEXT PRIMARY KEY,
  set_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.md_status_set_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_code TEXT NOT NULL REFERENCES public.md_status_sets(set_code) ON DELETE CASCADE,
  status_code TEXT NOT NULL,
  label TEXT NOT NULL,
  is_terminal BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  blocks_model_switch BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_status_set_values UNIQUE (set_code, status_code)
);
CREATE TABLE IF NOT EXISTS public.md_status_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_code TEXT NOT NULL REFERENCES public.md_status_sets(set_code) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  actor_rule TEXT NOT NULL,
  condition_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_status_transitions UNIQUE (set_code, from_status, to_status)
);
CREATE INDEX IF NOT EXISTS idx_md_status_set_values_set ON public.md_status_set_values(set_code);
CREATE INDEX IF NOT EXISTS idx_md_status_transitions_set ON public.md_status_transitions(set_code, from_status);

GRANT SELECT ON public.md_status_sets, public.md_status_set_values, public.md_status_transitions TO authenticated;
GRANT ALL ON public.md_status_sets, public.md_status_set_values, public.md_status_transitions TO service_role;
ALTER TABLE public.md_status_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.md_status_set_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.md_status_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read status sets" ON public.md_status_sets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in users read status values" ON public.md_status_set_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in users read status transitions" ON public.md_status_transitions FOR SELECT TO authenticated USING (true);

INSERT INTO public.md_status_sets(set_code,set_name) VALUES
 ('ST-24','Challenge status'),('ST-52','Challenge participation'),('ST-53','Submission'),
 ('ST-54','Evaluation'),('ST-55','Escrow'),('ST-56','Award line'),('ST-57','Dispute'),
 ('ST-58','Legal template version'),('ST-59','Curation checklist item')
ON CONFLICT (set_code) DO NOTHING;

INSERT INTO public.md_status_set_values(set_code,status_code,label,is_terminal,sort_order,blocks_model_switch) VALUES
 ('ST-24','DRAFT','Draft',false,1,false),('ST-24','IN_REVIEW','In Review',false,2,false),
 ('ST-24','SCHEDULED','Scheduled',false,3,true),('ST-24','PUBLISHED','Published',false,4,true),
 ('ST-24','EXTENDED','Extended',false,5,true),('ST-24','ABSTRACT_REVIEW','Abstract Review',false,6,true),
 ('ST-24','EVALUATION','Evaluation',false,7,true),('ST-24','AWARDED','Awarded',false,8,true),
 ('ST-24','DISPUTED','Disputed',false,9,true),('ST-24','COMPLETED','Completed',true,10,true),
 ('ST-24','CANCELLED','Cancelled',true,11,true),
 ('ST-52','JOINED','Joined',false,1,false),('ST-52','WITHDRAWN','Withdrawn',true,2,false),('ST-52','REMOVED','Removed for breach',true,3,false),
 ('ST-53','DRAFT','Draft',false,1,false),('ST-53','SUBMITTED','Submitted',false,2,false),('ST-53','WITHDRAWN','Withdrawn',true,3,false),
 ('ST-53','UNDER_REVIEW','Under Review',false,4,false),('ST-53','SHORTLISTED','Shortlisted',false,5,false),('ST-53','NOT_SHORTLISTED','Not Shortlisted',true,6,false),
 ('ST-53','WINNER','Winner',true,7,false),('ST-53','NOT_SELECTED','Not Selected',true,8,false),('ST-53','DISQUALIFIED','Disqualified',true,9,false),('ST-53','PURGED','Purged',true,10,false),
 ('ST-54','ASSIGNED','Assigned',false,1,false),('ST-54','CONFLICT_DECLARED','Conflict declared',true,2,false),('ST-54','IN_PROGRESS','In Progress',false,3,false),
 ('ST-54','SCORED','Scored',false,4,false),('ST-54','FLAGGED_FOR_MODERATION','Flagged for moderation',false,5,false),('ST-54','FINAL','Final',true,6,false),
 ('ST-55','NOT_REQUIRED','Not Required',true,1,false),('ST-55','PENDING_FUNDING','Pending Funding',false,2,false),('ST-55','FUNDED','Funded – Paid (Simulated)',false,3,false),
 ('ST-55','PARTLY_RELEASED','Partly Released',false,4,false),('ST-55','RELEASED','Released',true,5,false),('ST-55','REFUNDED','Refunded',true,6,false),
 ('ST-56','PROPOSED','Proposed',false,1,false),('ST-56','AWAITING_COUNTERSIGN','Awaiting Platform countersign',false,2,false),('ST-56','CONFIRMED','Confirmed',false,3,false),
 ('ST-56','ACCEPTED','Accepted',false,4,false),('ST-56','NOT_AWARDED','Not Awarded',true,5,false),('ST-56','DISPUTED','Disputed',false,6,false),('ST-56','PAID_SIMULATED','Paid (Simulated)',true,7,false),
 ('ST-57','RAISED','Raised',false,1,false),('ST-57','UNDER_REVIEW','Under Review',false,2,false),('ST-57','UPHELD','Upheld',true,3,false),('ST-57','REJECTED','Rejected',true,4,false),
 ('ST-58','DRAFT','Draft',false,1,false),('ST-58','ACTIVE','Active',false,2,false),('ST-58','RETIRED','Retired',true,3,false),
 ('ST-59','OPEN','Open',false,1,false),('ST-59','RESOLVED','Resolved',true,2,false),('ST-59','WAIVED','Waived with reason',true,3,false)
ON CONFLICT (set_code,status_code) DO NOTHING;

INSERT INTO public.md_status_transitions(set_code,from_status,to_status,actor_rule,condition_note) VALUES
 ('ST-24','DRAFT','IN_REVIEW','PHASE_OWNER','Creator submits (R4 Aggregator / R3 Marketplace)'),
 ('ST-24','IN_REVIEW','DRAFT','PHASE_OWNER','Curator returns modification points'),
 ('ST-24','IN_REVIEW','SCHEDULED','SYSTEM','Compliance complete and publication gates pass; future start date'),
 ('ST-24','IN_REVIEW','PUBLISHED','SYSTEM','Compliance complete and publication gates pass'),
 ('ST-24','SCHEDULED','PUBLISHED','SYSTEM','Start date reached'),
 ('ST-24','PUBLISHED','EXTENDED','PHASE_OWNER','Curator moves the deadline'),
 ('ST-24','PUBLISHED','ABSTRACT_REVIEW','SYSTEM','Abstract deadline'),
 ('ST-24','EXTENDED','ABSTRACT_REVIEW','SYSTEM','Abstract deadline'),
 ('ST-24','ABSTRACT_REVIEW','PUBLISHED','PHASE_OWNER','Expert Reviewer completes phase 6'),
 ('ST-24','PUBLISHED','EVALUATION','SYSTEM','Solution deadline'),
 ('ST-24','EXTENDED','EVALUATION','SYSTEM','Solution deadline'),
 ('ST-24','EVALUATION','AWARDED','AWARD_CONFIRMATION','Recommendation confirmed by a different person, or Senior Admin countersign'),
 ('ST-24','EVALUATION','COMPLETED','AWARD_CONFIRMATION','No award confirmed; escrow refunded, no platform fee'),
 ('ST-24','AWARDED','DISPUTED','SYSTEM','Dispute raised'),
 ('ST-24','DISPUTED','AWARDED','PLATFORM_SENIOR','Dispute decided'),
 ('ST-24','DISPUTED','EVALUATION','PLATFORM_SENIOR','Dispute decided'),
 ('ST-24','AWARDED','COMPLETED','SYSTEM','Every line Paid (Simulated) or Not Awarded, fee recorded, no open dispute'),
 ('ST-52','JOINED','WITHDRAWN','SOLUTION_PROVIDER',NULL),('ST-52','JOINED','REMOVED','PLATFORM_SENIOR','Reason required'),
 ('ST-53','DRAFT','SUBMITTED','SOLUTION_PROVIDER',NULL),('ST-53','SUBMITTED','WITHDRAWN','SOLUTION_PROVIDER',NULL),
 ('ST-53','SUBMITTED','UNDER_REVIEW','SYSTEM',NULL),('ST-53','UNDER_REVIEW','SHORTLISTED','PHASE_OWNER','Abstract'),
 ('ST-53','UNDER_REVIEW','NOT_SHORTLISTED','PHASE_OWNER','Abstract'),('ST-53','UNDER_REVIEW','WINNER','AWARD_CONFIRMATION','Solution'),
 ('ST-53','UNDER_REVIEW','NOT_SELECTED','AWARD_CONFIRMATION','Solution'),('ST-53','SUBMITTED','DISQUALIFIED','PHASE_OWNER','Reason required'),
 ('ST-53','UNDER_REVIEW','DISQUALIFIED','PHASE_OWNER','Reason required'),('ST-53','NOT_SELECTED','PURGED','SYSTEM','BR-LEG-008'),('ST-53','NOT_SHORTLISTED','PURGED','SYSTEM','BR-LEG-008'),
 ('ST-54','ASSIGNED','CONFLICT_DECLARED','REVIEWER',NULL),('ST-54','ASSIGNED','IN_PROGRESS','REVIEWER',NULL),('ST-54','IN_PROGRESS','SCORED','REVIEWER',NULL),
 ('ST-54','SCORED','FLAGGED_FOR_MODERATION','SYSTEM','Score spread above configured limit'),('ST-54','SCORED','FINAL','SYSTEM',NULL),('ST-54','FLAGGED_FOR_MODERATION','FINAL','PHASE_OWNER',NULL),
 ('ST-55','PENDING_FUNDING','FUNDED','FINANCE',NULL),('ST-55','FUNDED','PARTLY_RELEASED','SYSTEM',NULL),('ST-55','FUNDED','RELEASED','SYSTEM',NULL),
 ('ST-55','FUNDED','REFUNDED','SYSTEM',NULL),('ST-55','PARTLY_RELEASED','RELEASED','SYSTEM',NULL),('ST-55','PARTLY_RELEASED','REFUNDED','SYSTEM',NULL),
 ('ST-56','PROPOSED','CONFIRMED','AWARD_CONFIRMATION','Different person confirms'),('ST-56','PROPOSED','AWAITING_COUNTERSIGN','AWARD_CONFIRMATION','Same person would confirm'),
 ('ST-56','AWAITING_COUNTERSIGN','CONFIRMED','PLATFORM_SENIOR','Countersign'),('ST-56','CONFIRMED','ACCEPTED','SOLUTION_PROVIDER',NULL),
 ('ST-56','CONFIRMED','NOT_AWARDED','SYSTEM','Winner declines or acceptance period lapses'),('ST-56','ACCEPTED','PAID_SIMULATED','FINANCE','Only after dispute window closed with no open dispute'),
 ('ST-56','ACCEPTED','DISPUTED','SYSTEM',NULL),('ST-56','DISPUTED','ACCEPTED','PLATFORM_SENIOR',NULL),('ST-56','DISPUTED','NOT_AWARDED','PLATFORM_SENIOR',NULL),
 ('ST-57','RAISED','UNDER_REVIEW','PLATFORM_SENIOR',NULL),('ST-57','UNDER_REVIEW','UPHELD','PLATFORM_SENIOR',NULL),('ST-57','UNDER_REVIEW','REJECTED','PLATFORM_SENIOR',NULL),
 ('ST-58','DRAFT','ACTIVE','PLATFORM_SENIOR',NULL),('ST-58','ACTIVE','RETIRED','SYSTEM',NULL),
 ('ST-59','OPEN','RESOLVED','PHASE_OWNER',NULL),('ST-59','OPEN','WAIVED','PHASE_OWNER','Reason required')
ON CONFLICT (set_code,from_status,to_status) DO NOTHING;

INSERT INTO public.md_status_transitions(set_code,from_status,to_status,actor_rule,condition_note)
SELECT 'ST-24', s, 'CANCELLED', 'CANCEL_RULE', 'Per DEF-0043'
FROM unnest(ARRAY['DRAFT','IN_REVIEW','SCHEDULED','PUBLISHED','EXTENDED','ABSTRACT_REVIEW','EVALUATION']) s
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_status_transition_allowed(p_set TEXT, p_from TEXT, p_to TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT p_from IS NOT DISTINCT FROM p_to OR EXISTS (
    SELECT 1 FROM public.md_status_transitions
    WHERE set_code = p_set AND from_status = p_from AND to_status = p_to);
$$;

-- 2. Phase-status map (DEF-0030) -------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_status_for_phase(p_phase INTEGER)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN p_phase IS NULL OR p_phase <= 1 THEN 'DRAFT'
    WHEN p_phase IN (2,3) THEN 'IN_REVIEW'
    WHEN p_phase IN (4,5,7) THEN 'PUBLISHED'
    WHEN p_phase = 6 THEN 'ABSTRACT_REVIEW'
    WHEN p_phase IN (8,9) THEN 'EVALUATION'
    ELSE 'AWARDED' END;
$$;

-- Back-fill existing challenges before the guard exists
UPDATE public.challenges SET status = CASE
  WHEN master_status IN ('CANCELLED','TERMINATED') THEN 'CANCELLED'
  WHEN master_status = 'COMPLETED' THEN 'COMPLETED'
  ELSE public.fn_status_for_phase(current_phase) END;

-- Express payment is owned by the Finance Coordinator (DEF-0145, OR-2)
UPDATE public.md_lifecycle_phase_config SET required_role = 'FC', auto_complete = false
WHERE governance_mode = 'QUICK' AND phase_number = 10;

-- 3. Award decisions and lines (DEF-0008 / 0145 / ST-56) -------------------
CREATE TABLE IF NOT EXISTS public.challenge_award_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  tenant_id UUID,
  outcome TEXT NOT NULL CHECK (outcome IN ('WINNER','NO_AWARD')),
  decision_status TEXT NOT NULL DEFAULT 'PROPOSED'
    CHECK (decision_status IN ('PROPOSED','AWAITING_COUNTERSIGN','CONFIRMED','RETURNED')),
  recommended_by UUID NOT NULL,
  recommended_role TEXT NOT NULL,
  recommendation_note TEXT,
  confirmed_by UUID,
  confirmer_role TEXT,
  confirmed_at TIMESTAMPTZ,
  countersigned_by UUID,
  countersigned_at TIMESTAMPTZ,
  returned_by UUID,
  return_reason TEXT,
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
CREATE INDEX IF NOT EXISTS idx_award_decisions_challenge ON public.challenge_award_decisions(challenge_id, decision_status);
CREATE INDEX IF NOT EXISTS idx_award_decisions_tenant ON public.challenge_award_decisions(tenant_id);

CREATE TABLE IF NOT EXISTS public.challenge_award_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES public.challenge_award_decisions(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  tenant_id UUID,
  submission_id UUID,
  prize_tier_id UUID,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_status TEXT NOT NULL DEFAULT 'PROPOSED',
  accepted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
CREATE INDEX IF NOT EXISTS idx_award_lines_decision ON public.challenge_award_lines(decision_id);
CREATE INDEX IF NOT EXISTS idx_award_lines_challenge ON public.challenge_award_lines(challenge_id, line_status);
CREATE INDEX IF NOT EXISTS idx_award_lines_tenant ON public.challenge_award_lines(tenant_id);

GRANT SELECT ON public.challenge_award_decisions, public.challenge_award_lines TO authenticated;
GRANT ALL ON public.challenge_award_decisions, public.challenge_award_lines TO service_role;
ALTER TABLE public.challenge_award_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_award_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenge role holders and platform admins read award decisions"
ON public.challenge_award_decisions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_challenge_roles u WHERE u.challenge_id = challenge_award_decisions.challenge_id AND u.user_id = auth.uid() AND u.is_active)
  OR EXISTS (SELECT 1 FROM public.platform_admin_profiles p WHERE p.user_id = auth.uid()));
CREATE POLICY "Challenge role holders and platform admins read award lines"
ON public.challenge_award_lines FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_challenge_roles u WHERE u.challenge_id = challenge_award_lines.challenge_id AND u.user_id = auth.uid() AND u.is_active)
  OR EXISTS (SELECT 1 FROM public.platform_admin_profiles p WHERE p.user_id = auth.uid()));

CREATE TRIGGER trg_award_decisions_updated_at BEFORE UPDATE ON public.challenge_award_decisions
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ST-56 transition guard on award lines
CREATE OR REPLACE FUNCTION public.fn_guard_award_line_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_window INTEGER; v_conf TIMESTAMPTZ;
BEGIN
  IF NEW.line_status IS DISTINCT FROM OLD.line_status THEN
    IF NOT public.is_status_transition_allowed('ST-56', OLD.line_status, NEW.line_status) THEN
      RAISE EXCEPTION 'You are not allowed to move this award line to %.', NEW.line_status;
    END IF;
    IF NEW.line_status = 'PAID_SIMULATED' THEN
      SELECT COALESCE((c.config_snapshot->>'dispute_window_days')::int,
                      (SELECT param_value::int FROM public.md_mpa_config WHERE param_key='dispute_window_days'), 10)
      INTO v_window FROM public.challenges c WHERE c.id = NEW.challenge_id;
      SELECT confirmed_at INTO v_conf FROM public.challenge_award_decisions WHERE id = NEW.decision_id;
      IF NEW.accepted_at IS NULL OR GREATEST(NEW.accepted_at, COALESCE(v_conf, NEW.accepted_at)) + make_interval(days => v_window) > now() THEN
        RAISE EXCEPTION 'This award line cannot be paid until the dispute window has closed.';
      END IF;
      IF EXISTS (SELECT 1 FROM public.dispute_records d WHERE d.challenge_id = NEW.challenge_id
                 AND upper(coalesce(d.status,'')) NOT IN ('RESOLVED','REJECTED','UPHELD','CLOSED','DISMISSED')) THEN
        RAISE EXCEPTION 'This award line cannot be paid while a dispute is open.';
      END IF;
      NEW.paid_at := now();
    END IF;
    IF NEW.line_status = 'ACCEPTED' THEN NEW.accepted_at := COALESCE(NEW.accepted_at, now()); END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_award_lines_guard_status BEFORE UPDATE ON public.challenge_award_lines
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_award_line_status();

-- 4. Challenge lifecycle guard (DEF-0008 / 0018 / 0030 / 0151) -------------
CREATE OR REPLACE FUNCTION public.fn_guard_challenge_lifecycle()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_target TEXT; v_outcome TEXT;
BEGIN
  -- No screen sets status or phase directly: only server steps (definer functions) may.
  IF current_user IN ('authenticated','anon')
     AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.current_phase IS DISTINCT FROM OLD.current_phase) THEN
    RAISE EXCEPTION 'You are not allowed to move this challenge to %.',
      COALESCE(NEW.status, public.fn_status_for_phase(NEW.current_phase));
  END IF;

  -- Phase and status change together
  IF NEW.current_phase IS DISTINCT FROM OLD.current_phase THEN
    NEW.status := public.fn_status_for_phase(NEW.current_phase);
  END IF;
  IF NEW.master_status IS DISTINCT FROM OLD.master_status THEN
    IF NEW.master_status IN ('CANCELLED','TERMINATED') THEN NEW.status := 'CANCELLED';
    ELSIF NEW.master_status = 'COMPLETED' THEN NEW.status := 'COMPLETED';
    END IF;
  END IF;

  -- Phase 9 ends only on a confirmed award decision
  IF OLD.current_phase = 9 AND NEW.current_phase IS DISTINCT FROM 9
     AND NOT EXISTS (SELECT 1 FROM public.challenge_award_decisions
                     WHERE challenge_id = NEW.id AND decision_status = 'CONFIRMED') THEN
    RAISE EXCEPTION 'You are not allowed to move this challenge to %.', NEW.status;
  END IF;

  -- Awarded -> Completed only when all lines settled and no dispute open
  IF NEW.status = 'COMPLETED' AND OLD.status IS DISTINCT FROM 'COMPLETED' AND OLD.status = 'AWARDED' THEN
    IF EXISTS (SELECT 1 FROM public.challenge_award_lines WHERE challenge_id = NEW.id
               AND line_status NOT IN ('PAID_SIMULATED','NOT_AWARDED'))
       OR EXISTS (SELECT 1 FROM public.dispute_records d WHERE d.challenge_id = NEW.id
               AND upper(coalesce(d.status,'')) NOT IN ('RESOLVED','REJECTED','UPHELD','CLOSED','DISMISSED')) THEN
      RAISE EXCEPTION 'You are not allowed to move this challenge to COMPLETED.';
    END IF;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND EXISTS (SELECT 1 FROM public.md_status_set_values WHERE set_code='ST-24' AND status_code = OLD.status)
     AND NOT public.is_status_transition_allowed('ST-24', OLD.status, NEW.status) THEN
    -- auto-chained phases (e.g. 2->3->4) may skip intermediate statuses; allow forward moves via the phase step
    IF NOT (NEW.current_phase IS DISTINCT FROM OLD.current_phase AND NEW.current_phase > COALESCE(OLD.current_phase,0)) THEN
      RAISE EXCEPTION 'You are not allowed to move this challenge to %.', NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_challenges_guard_lifecycle ON public.challenges;
CREATE TRIGGER trg_challenges_guard_lifecycle BEFORE UPDATE ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_challenge_lifecycle();

-- 5. Step-owner resolution (BR-CHL-M07) ------------------------------------
CREATE OR REPLACE FUNCTION public.fn_user_has_challenge_role(p_user UUID, p_challenge UUID, p_roles TEXT[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_challenge_roles
                 WHERE user_id = p_user AND challenge_id = p_challenge AND is_active AND role_code = ANY(p_roles));
$$;

CREATE OR REPLACE FUNCTION public.fn_award_actor_roles(p_challenge UUID, OUT recommender_roles TEXT[], OUT confirmer_roles TEXT[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_model TEXT; v_mode TEXT;
BEGIN
  SELECT COALESCE(operating_model,'AGG'), COALESCE(governance_mode_override, governance_profile, 'STRUCTURED')
  INTO v_model, v_mode FROM public.challenges WHERE id = p_challenge;
  IF v_model = 'MP' THEN
    recommender_roles := ARRAY['R6_MP']; confirmer_roles := ARRAY['R2'];
  ELSIF v_mode = 'QUICK' THEN
    recommender_roles := ARRAY['CR','R4']; confirmer_roles := ARRAY['R6_AGG'];
  ELSE
    recommender_roles := ARRAY['CU','R5_AGG']; confirmer_roles := ARRAY['R6_AGG'];
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_finalise_award_decision(p_decision UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d RECORD;
BEGIN
  SELECT * INTO d FROM public.challenge_award_decisions WHERE id = p_decision;
  UPDATE public.challenge_award_decisions SET decision_status = 'CONFIRMED' WHERE id = p_decision;
  UPDATE public.challenge_award_lines SET line_status = 'CONFIRMED'
    WHERE decision_id = p_decision AND line_status IN ('PROPOSED','AWAITING_COUNTERSIGN');
  IF d.outcome = 'NO_AWARD' THEN
    UPDATE public.challenges SET phase_status = 'COMPLETED', master_status = 'COMPLETED',
      completed_at = now(), updated_at = now() WHERE id = d.challenge_id;
    INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details)
    VALUES (d.challenge_id, d.recommended_by, 'NO_AWARD_CONFIRMED', 'SYSTEM', jsonb_build_object('decision_id', p_decision));
    RETURN jsonb_build_object('success', true, 'status', 'COMPLETED', 'outcome', 'NO_AWARD');
  END IF;
  RETURN public.complete_phase(d.challenge_id, d.recommended_by) || jsonb_build_object('status','AWARDED');
END $$;

CREATE OR REPLACE FUNCTION public.recommend_award(p_challenge_id UUID, p_outcome TEXT, p_lines JSONB DEFAULT '[]'::jsonb, p_note TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); v_phase INT; v_roles RECORD; v_id UUID; v_tenant UUID; v_line JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not signed in.'; END IF;
  IF p_outcome NOT IN ('WINNER','NO_AWARD') THEN RAISE EXCEPTION 'Unknown award outcome.'; END IF;
  SELECT current_phase, tenant_id INTO v_phase, v_tenant FROM public.challenges WHERE id = p_challenge_id;
  IF v_phase IS DISTINCT FROM 9 THEN RAISE EXCEPTION 'An award can only be recommended during the award decision phase.'; END IF;
  SELECT * INTO v_roles FROM public.fn_award_actor_roles(p_challenge_id);
  IF NOT public.fn_user_has_challenge_role(v_uid, p_challenge_id, v_roles.recommender_roles) THEN
    RAISE EXCEPTION 'You are not allowed to recommend the award for this challenge.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.challenge_award_decisions WHERE challenge_id = p_challenge_id
             AND decision_status IN ('PROPOSED','AWAITING_COUNTERSIGN','CONFIRMED')) THEN
    RAISE EXCEPTION 'An award recommendation is already in progress for this challenge.';
  END IF;
  INSERT INTO public.challenge_award_decisions (challenge_id, tenant_id, outcome, recommended_by, recommended_role, recommendation_note, created_by)
  VALUES (p_challenge_id, v_tenant, p_outcome, v_uid, array_to_string(v_roles.recommender_roles, '/'), p_note, v_uid)
  RETURNING id INTO v_id;
  IF p_outcome = 'WINNER' THEN
    FOR v_line IN SELECT * FROM jsonb_array_elements(COALESCE(p_lines,'[]'::jsonb)) LOOP
      INSERT INTO public.challenge_award_lines (decision_id, challenge_id, tenant_id, submission_id, prize_tier_id, amount, created_by)
      VALUES (v_id, p_challenge_id, v_tenant, NULLIF(v_line->>'submission_id','')::uuid,
              NULLIF(v_line->>'prize_tier_id','')::uuid, COALESCE((v_line->>'amount')::numeric,0), v_uid);
    END LOOP;
  END IF;
  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details)
  VALUES (p_challenge_id, v_uid, 'AWARD_RECOMMENDED', 'HUMAN', jsonb_build_object('decision_id', v_id, 'outcome', p_outcome));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.confirm_award(p_decision_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); d RECORD; v_roles RECORD;
BEGIN
  SELECT * INTO d FROM public.challenge_award_decisions WHERE id = p_decision_id FOR UPDATE;
  IF d.id IS NULL OR d.decision_status <> 'PROPOSED' THEN RAISE EXCEPTION 'This award is not waiting for confirmation.'; END IF;
  SELECT * INTO v_roles FROM public.fn_award_actor_roles(d.challenge_id);
  IF NOT public.fn_user_has_challenge_role(v_uid, d.challenge_id, v_roles.confirmer_roles) THEN
    RAISE EXCEPTION 'You are not allowed to confirm the award for this challenge.';
  END IF;
  UPDATE public.challenge_award_decisions SET confirmed_by = v_uid, confirmed_at = now(),
    confirmer_role = array_to_string(v_roles.confirmer_roles,'/'), updated_by = v_uid WHERE id = p_decision_id;
  IF v_uid = d.recommended_by THEN
    UPDATE public.challenge_award_decisions SET decision_status = 'AWAITING_COUNTERSIGN' WHERE id = p_decision_id;
    UPDATE public.challenge_award_lines SET line_status = 'AWAITING_COUNTERSIGN' WHERE decision_id = p_decision_id AND line_status = 'PROPOSED';
    INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details)
    VALUES (d.challenge_id, v_uid, 'AWARD_AWAITING_COUNTERSIGN', 'HUMAN', jsonb_build_object('decision_id', p_decision_id));
    INSERT INTO public.cogni_notifications (user_id, challenge_id, notification_type, title, message)
    SELECT p.user_id, d.challenge_id, 'AWARD_COUNTERSIGN', 'Award awaiting Platform countersign',
           'The recommender and confirmer are the same person; your countersign is required.'
    FROM public.platform_admin_profiles p WHERE p.admin_tier IN ('senior_admin','supervisor');
    RETURN jsonb_build_object('success', true, 'status', 'AWAITING_COUNTERSIGN');
  END IF;
  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details)
  VALUES (d.challenge_id, v_uid, 'AWARD_CONFIRMED', 'HUMAN', jsonb_build_object('decision_id', p_decision_id));
  RETURN public.fn_finalise_award_decision(p_decision_id);
END $$;

CREATE OR REPLACE FUNCTION public.return_award(p_decision_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); d RECORD; v_roles RECORD; v_min INT; v_max INT;
BEGIN
  SELECT * INTO d FROM public.challenge_award_decisions WHERE id = p_decision_id FOR UPDATE;
  IF d.id IS NULL OR d.decision_status <> 'PROPOSED' THEN RAISE EXCEPTION 'This award is not waiting for confirmation.'; END IF;
  SELECT * INTO v_roles FROM public.fn_award_actor_roles(d.challenge_id);
  IF NOT public.fn_user_has_challenge_role(v_uid, d.challenge_id, v_roles.confirmer_roles) THEN
    RAISE EXCEPTION 'You are not allowed to return the award for this challenge.';
  END IF;
  SELECT COALESCE((SELECT param_value::int FROM public.md_mpa_config WHERE param_key='change_reason_min_chars'),10),
         COALESCE((SELECT param_value::int FROM public.md_mpa_config WHERE param_key='change_reason_max_chars'),500)
  INTO v_min, v_max;
  IF length(trim(coalesce(p_reason,''))) < v_min OR length(trim(p_reason)) > v_max THEN
    RAISE EXCEPTION 'A reason of % to % characters is required.', v_min, v_max;
  END IF;
  UPDATE public.challenge_award_decisions SET decision_status = 'RETURNED', returned_by = v_uid,
    returned_at = now(), return_reason = trim(p_reason), updated_by = v_uid WHERE id = p_decision_id;
  DELETE FROM public.challenge_award_lines WHERE decision_id = p_decision_id;
  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details)
  VALUES (d.challenge_id, v_uid, 'AWARD_RETURNED', 'HUMAN', jsonb_build_object('decision_id', p_decision_id, 'reason', trim(p_reason)));
END $$;

CREATE OR REPLACE FUNCTION public.countersign_award(p_decision_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); d RECORD;
BEGIN
  IF COALESCE(public.get_my_admin_tier(v_uid),'') NOT IN ('senior_admin','supervisor') THEN
    RAISE EXCEPTION 'Only a Platform Admin – Senior Admin or Supervisor can countersign an award.';
  END IF;
  SELECT * INTO d FROM public.challenge_award_decisions WHERE id = p_decision_id FOR UPDATE;
  IF d.id IS NULL OR d.decision_status <> 'AWAITING_COUNTERSIGN' THEN RAISE EXCEPTION 'This award is not awaiting countersign.'; END IF;
  IF v_uid IN (d.recommended_by, d.confirmed_by) THEN RAISE EXCEPTION 'You cannot countersign an award you recommended or confirmed.'; END IF;
  UPDATE public.challenge_award_decisions SET countersigned_by = v_uid, countersigned_at = now(), updated_by = v_uid WHERE id = p_decision_id;
  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details)
  VALUES (d.challenge_id, v_uid, 'AWARD_COUNTERSIGNED', 'HUMAN', jsonb_build_object('decision_id', p_decision_id));
  RETURN public.fn_finalise_award_decision(p_decision_id);
END $$;

REVOKE ALL ON FUNCTION public.fn_finalise_award_decision(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_award_actor_roles(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fn_user_has_challenge_role(UUID, UUID, TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recommend_award(UUID, TEXT, JSONB, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_award(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.return_award(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.countersign_award(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recommend_award(UUID, TEXT, JSONB, TEXT), public.confirm_award(UUID),
  public.return_award(UUID, TEXT), public.countersign_award(UUID), public.fn_award_actor_roles(UUID) TO authenticated;
