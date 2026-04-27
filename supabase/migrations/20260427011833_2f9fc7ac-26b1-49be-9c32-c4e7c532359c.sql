
-- ─────────────────────────────────────────────────────────────────────────
-- Phase 9 v4 — Prompt 4 (DB foundation)
-- ─────────────────────────────────────────────────────────────────────────

-- 1) Concurrent-amendment serialization
CREATE UNIQUE INDEX IF NOT EXISTS uq_amendment_records_one_in_flight
  ON public.amendment_records (challenge_id)
  WHERE COALESCE(status, 'INITIATED') NOT IN ('APPROVED', 'REJECTED', 'WITHDRAWN');

COMMENT ON INDEX public.uq_amendment_records_one_in_flight IS
  'Phase 9 v4 — Prompt 4. Enforces one in-flight amendment per challenge. Violations surface as Postgres 23505 and are translated by the UI mutation into a user-friendly message.';

-- 2) Governance escalation-only guard (post-publish)
CREATE OR REPLACE FUNCTION public.enforce_governance_escalation_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_old_mode TEXT;
  v_new_mode TEXT;
BEGIN
  IF COALESCE(NEW.current_phase, 0) < 4 THEN RETURN NEW; END IF;

  v_old_mode := UPPER(COALESCE(OLD.governance_mode_override, OLD.governance_profile, 'STRUCTURED'));
  v_new_mode := UPPER(COALESCE(NEW.governance_mode_override, NEW.governance_profile, 'STRUCTURED'));

  IF v_old_mode = v_new_mode THEN RETURN NEW; END IF;

  IF v_old_mode = 'STRUCTURED' AND v_new_mode = 'CONTROLLED' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Governance change forbidden post-publish: % → %. Only STRUCTURED → CONTROLLED escalation is allowed.',
    v_old_mode, v_new_mode
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_challenges_governance_escalation_only ON public.challenges;
CREATE TRIGGER trg_challenges_governance_escalation_only
  BEFORE UPDATE OF governance_mode_override, governance_profile ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_governance_escalation_only();

-- 3) amendment_scope_normalize helper
CREATE OR REPLACE FUNCTION public.amendment_scope_normalize(p_scope TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v TEXT := UPPER(TRIM(COALESCE(p_scope, '')));
BEGIN
  IF v = '' THEN RETURN 'OTHER'; END IF;
  IF v IN ('LEGAL', 'LEGAL_TERMS', 'LEGAL TERMS') THEN RETURN 'LEGAL'; END IF;
  IF v IN ('FINANCIAL', 'FINANCE', 'PRICING', 'REWARD') THEN RETURN 'FINANCIAL'; END IF;
  IF v IN ('ESCROW', 'ESCROW_TERMS', 'FUNDING') THEN RETURN 'ESCROW'; END IF;
  IF v IN ('EDITORIAL', 'COPY', 'TYPO', 'CLARIFICATION') THEN RETURN 'EDITORIAL'; END IF;
  IF v IN ('SCOPE_CHANGE', 'SCOPE', 'DELIVERABLES') THEN RETURN 'SCOPE_CHANGE'; END IF;
  IF v IN ('GOVERNANCE_CHANGE', 'GOVERNANCE_ESCALATION', 'GOVERNANCE') THEN RETURN 'GOVERNANCE_CHANGE'; END IF;
  RETURN 'OTHER';
END;
$$;

GRANT EXECUTE ON FUNCTION public.amendment_scope_normalize(TEXT) TO authenticated;

-- 4) Extend notification_routing.event_type CHECK to allow amendment fan-out events
ALTER TABLE public.notification_routing
  DROP CONSTRAINT IF EXISTS notification_routing_event_type_check;

ALTER TABLE public.notification_routing
  ADD CONSTRAINT notification_routing_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'SLA_WARNING','SLA_BREACH','PHASE_COMPLETE','ROLE_ASSIGNED',
    'AMENDMENT_INITIATED','CHALLENGE_RETURNED','CHALLENGE_REJECTED',
    'SOLUTION_SUBMITTED','EVALUATION_COMPLETE','ESCROW_EVENT',
    'DISPUTE_FILED','IP_TRANSFER',
    'AMENDMENT_APPROVED_LEGAL','AMENDMENT_APPROVED_FINANCIAL',
    'AMENDMENT_APPROVED_GOVERNANCE_ESCALATION','AMENDMENT_REACCEPT_REQUIRED'
  ]));

-- 5) Insert (or upsert) routing rows for amendment fan-out
INSERT INTO public.notification_routing
  (phase, event_type, primary_recipient_role, cc_roles, escalation_roles, is_active)
VALUES
  (99, 'AMENDMENT_APPROVED_LEGAL',                  'LC', ARRAY['CU','CR']::text[],            ARRAY[]::text[], true),
  (99, 'AMENDMENT_APPROVED_FINANCIAL',              'FC', ARRAY['LC','CU','CR']::text[],       ARRAY[]::text[], true),
  (99, 'AMENDMENT_APPROVED_GOVERNANCE_ESCALATION',  'CU', ARRAY['LC','FC','CR']::text[],       ARRAY[]::text[], true),
  (99, 'AMENDMENT_REACCEPT_REQUIRED',               'CU', ARRAY[]::text[],                     ARRAY[]::text[], true)
ON CONFLICT (phase, event_type) DO UPDATE SET
  primary_recipient_role = EXCLUDED.primary_recipient_role,
  cc_roles = EXCLUDED.cc_roles,
  escalation_roles = EXCLUDED.escalation_roles,
  is_active = true;
