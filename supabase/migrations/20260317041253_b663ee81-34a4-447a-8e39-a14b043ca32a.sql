
-- ============================================================
-- M-01-D: Tables 19-22 — Cross-Cutting Tables
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- TABLE 19: audit_trail (Append-only)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id),
  solution_id UUID REFERENCES public.solutions(id),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  method TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  phase_from INTEGER,
  phase_to INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE public.audit_trail IS 'Append-only audit log for challenge/solution lifecycle actions';

-- Validation trigger for method column
CREATE OR REPLACE FUNCTION public.trg_audit_trail_validate_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.method NOT IN ('HUMAN', 'AUTO_COMPLETE', 'SYSTEM') THEN
    RAISE EXCEPTION 'Invalid method: %. Must be HUMAN, AUTO_COMPLETE, or SYSTEM', NEW.method;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_trail_validate
  BEFORE INSERT ON public.audit_trail
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_trail_validate_fn();

-- RLS: Append-only (SELECT + INSERT only)
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_trail_select" ON public.audit_trail
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "audit_trail_insert" ON public.audit_trail
  FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_challenge_time ON public.audit_trail(challenge_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_solution ON public.audit_trail(solution_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user ON public.audit_trail(user_id);

-- ──────────────────────────────────────────────────────────────
-- TABLE 20: legal_acceptance_ledger (Append-only)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.legal_acceptance_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  document_type TEXT NOT NULL,
  document_name TEXT,
  document_version TEXT,
  tier TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  phase_triggered INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE public.legal_acceptance_ledger IS 'Append-only ledger of legal document acceptances per challenge';

-- Validation trigger for tier column
CREATE OR REPLACE FUNCTION public.trg_legal_acceptance_ledger_validate_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tier IS NOT NULL AND NEW.tier NOT IN ('TIER_1', 'TIER_2') THEN
    RAISE EXCEPTION 'Invalid tier: %. Must be TIER_1 or TIER_2', NEW.tier;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_legal_acceptance_ledger_validate
  BEFORE INSERT ON public.legal_acceptance_ledger
  FOR EACH ROW EXECUTE FUNCTION public.trg_legal_acceptance_ledger_validate_fn();

-- RLS: Append-only (SELECT + INSERT only)
ALTER TABLE public.legal_acceptance_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "legal_acceptance_select" ON public.legal_acceptance_ledger
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "legal_acceptance_insert" ON public.legal_acceptance_ledger
  FOR INSERT TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_legal_acceptance_challenge ON public.legal_acceptance_ledger(challenge_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptance_user ON public.legal_acceptance_ledger(user_id);

-- ──────────────────────────────────────────────────────────────
-- TABLE 21: sla_timers
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sla_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.challenges(id) NOT NULL,
  phase INTEGER NOT NULL,
  role_code TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deadline_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  breached_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE public.sla_timers IS 'Phase-level SLA deadline tracking for challenge lifecycle';

-- Validation trigger for status column
CREATE OR REPLACE FUNCTION public.trg_sla_timers_validate_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('ACTIVE', 'PAUSED', 'BREACHED', 'COMPLETED') THEN
    RAISE EXCEPTION 'Invalid SLA timer status: %. Must be ACTIVE, PAUSED, BREACHED, or COMPLETED', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sla_timers_validate
  BEFORE INSERT OR UPDATE ON public.sla_timers
  FOR EACH ROW EXECUTE FUNCTION public.trg_sla_timers_validate_fn();

-- RLS: SELECT + INSERT + UPDATE for authenticated
ALTER TABLE public.sla_timers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sla_timers_select" ON public.sla_timers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sla_timers_insert" ON public.sla_timers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "sla_timers_update" ON public.sla_timers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sla_status ON public.sla_timers(challenge_id, status);
CREATE INDEX IF NOT EXISTS idx_sla_timers_deadline ON public.sla_timers(deadline_at) WHERE status = 'ACTIVE';

-- ──────────────────────────────────────────────────────────────
-- TABLE 22: cogni_notifications (named to avoid conflict with
-- existing admin_notifications table)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cogni_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  challenge_id UUID REFERENCES public.challenges(id),
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cogni_notifications IS 'CogniBlend user notifications for challenge lifecycle events';

-- RLS: SELECT/UPDATE own rows, INSERT for authenticated
ALTER TABLE public.cogni_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cogni_notifications_select_own" ON public.cogni_notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "cogni_notifications_insert" ON public.cogni_notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "cogni_notifications_update_own" ON public.cogni_notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.cogni_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_challenge ON public.cogni_notifications(challenge_id);
