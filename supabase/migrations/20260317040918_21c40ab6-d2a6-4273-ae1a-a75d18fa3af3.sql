
-- =============================================
-- M-01-C: 8 Solution Lifecycle Tables
-- Tables 11-18 per CogniBlend spec
-- =============================================

-- ─── Table 11: solutions ─────────────────────
CREATE TABLE IF NOT EXISTS public.solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id),
  current_phase INTEGER DEFAULT 7,
  phase_status TEXT DEFAULT 'ACTIVE',
  abstract_text TEXT,
  methodology TEXT,
  timeline TEXT,
  experience TEXT,
  ai_usage_declaration TEXT,
  full_solution_url TEXT,
  is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  encryption_key_ref TEXT,
  evaluation_grade TEXT,
  selection_status TEXT,
  ip_transfer_status TEXT,
  payment_status TEXT,
  governance_profile TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ─── Table 12: evaluation_records ────────────
CREATE TABLE IF NOT EXISTS public.evaluation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID NOT NULL REFERENCES public.solutions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  review_round INTEGER NOT NULL DEFAULT 1,
  individual_score NUMERIC,
  rubric_scores JSONB,
  commentary TEXT,
  ai_feasibility_score NUMERIC,
  ai_novelty_score NUMERIC,
  ai_plagiarism_score NUMERIC,
  conflict_declared BOOLEAN NOT NULL DEFAULT FALSE,
  conflict_action TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ─── Table 13: escrow_records ────────────────
CREATE TABLE IF NOT EXISTS public.escrow_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL UNIQUE REFERENCES public.challenges(id) ON DELETE CASCADE,
  escrow_status TEXT NOT NULL DEFAULT 'PENDING',
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  released_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL DEFAULT 0,
  rejection_fee_percentage NUMERIC NOT NULL DEFAULT 10,
  transaction_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ─── Table 14: ip_transfer_records ───────────
CREATE TABLE IF NOT EXISTS public.ip_transfer_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID NOT NULL REFERENCES public.solutions(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  ip_model TEXT NOT NULL,
  transfer_status TEXT NOT NULL DEFAULT 'DEFINED',
  initiated_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  seeker_signed_at TIMESTAMPTZ,
  solver_signed_at TIMESTAMPTZ,
  registration_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ─── Table 15: solution_access_log (append-only) ──
CREATE TABLE IF NOT EXISTS public.solution_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID NOT NULL REFERENCES public.solutions(id) ON DELETE CASCADE,
  accessor_id UUID NOT NULL REFERENCES auth.users(id),
  accessor_role TEXT,
  access_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER,
  ip_address TEXT,
  device_fingerprint TEXT
);

-- ─── Table 16: solver_profiles ───────────────
CREATE TABLE IF NOT EXISTS public.solver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  verification_level TEXT NOT NULL DEFAULT 'L0',
  reputation_score NUMERIC NOT NULL DEFAULT 0,
  challenge_count INTEGER NOT NULL DEFAULT 0,
  win_count INTEGER NOT NULL DEFAULT 0,
  avg_grade NUMERIC,
  avg_rating NUMERIC,
  expertise_domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  portfolio_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  portfolio_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ─── Table 17: dispute_records ───────────────
CREATE TABLE IF NOT EXISTS public.dispute_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  solution_id UUID REFERENCES public.solutions(id) ON DELETE SET NULL,
  raised_by UUID NOT NULL REFERENCES auth.users(id),
  dispute_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'FILED',
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  resolution TEXT,
  arbitrator_id UUID REFERENCES auth.users(id),
  filed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ─── Table 18: rating_records ────────────────
CREATE TABLE IF NOT EXISTS public.rating_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES auth.users(id),
  ratee_id UUID NOT NULL REFERENCES auth.users(id),
  rating INTEGER NOT NULL,
  feedback_text TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(challenge_id, rater_id, ratee_id)
);

-- =============================================
-- VALIDATION TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION public.trg_solutions_validate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_phase IS NOT NULL AND (NEW.current_phase < 7 OR NEW.current_phase > 13) THEN
    RAISE EXCEPTION 'current_phase must be between 7 and 13';
  END IF;
  IF NEW.evaluation_grade IS NOT NULL AND NEW.evaluation_grade NOT IN ('PLATINUM','GOLD','SILVER','REJECTED') THEN
    RAISE EXCEPTION 'evaluation_grade must be PLATINUM, GOLD, SILVER, or REJECTED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_solutions_validate ON public.solutions;
CREATE TRIGGER trg_solutions_validate
  BEFORE INSERT OR UPDATE ON public.solutions
  FOR EACH ROW EXECUTE FUNCTION public.trg_solutions_validate();

CREATE OR REPLACE FUNCTION public.trg_escrow_records_validate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.escrow_status NOT IN ('PENDING','FUNDED','PARTIAL_RELEASED','FINAL_RELEASED','REFUNDED','REJECTION_FEE') THEN
    RAISE EXCEPTION 'Invalid escrow_status value';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_escrow_records_validate ON public.escrow_records;
CREATE TRIGGER trg_escrow_records_validate
  BEFORE INSERT OR UPDATE ON public.escrow_records
  FOR EACH ROW EXECUTE FUNCTION public.trg_escrow_records_validate();

CREATE OR REPLACE FUNCTION public.trg_ip_transfer_records_validate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.transfer_status NOT IN ('DEFINED','INITIATED','UNDER_REVIEW','CONFIRMED','REGISTERED','DISPUTED') THEN
    RAISE EXCEPTION 'Invalid transfer_status value';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ip_transfer_records_validate ON public.ip_transfer_records;
CREATE TRIGGER trg_ip_transfer_records_validate
  BEFORE INSERT OR UPDATE ON public.ip_transfer_records
  FOR EACH ROW EXECUTE FUNCTION public.trg_ip_transfer_records_validate();

CREATE OR REPLACE FUNCTION public.trg_solution_access_log_validate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.access_type NOT IN ('VIEW','DOWNLOAD','PRINT') THEN
    RAISE EXCEPTION 'access_type must be VIEW, DOWNLOAD, or PRINT';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_solution_access_log_validate ON public.solution_access_log;
CREATE TRIGGER trg_solution_access_log_validate
  BEFORE INSERT ON public.solution_access_log
  FOR EACH ROW EXECUTE FUNCTION public.trg_solution_access_log_validate();

CREATE OR REPLACE FUNCTION public.trg_solver_profiles_validate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.verification_level NOT IN ('L0','L1','L2','L3') THEN
    RAISE EXCEPTION 'verification_level must be L0, L1, L2, or L3';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_solver_profiles_validate ON public.solver_profiles;
CREATE TRIGGER trg_solver_profiles_validate
  BEFORE INSERT OR UPDATE ON public.solver_profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_solver_profiles_validate();

CREATE OR REPLACE FUNCTION public.trg_dispute_records_validate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.dispute_type NOT IN ('PAYMENT','EVALUATION','IP','QUALITY','PROCESS') THEN
    RAISE EXCEPTION 'Invalid dispute_type value';
  END IF;
  IF NEW.status NOT IN ('FILED','EVIDENCE','MEDIATION','ESCALATED','RESOLVED') THEN
    RAISE EXCEPTION 'Invalid dispute status value';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispute_records_validate ON public.dispute_records;
CREATE TRIGGER trg_dispute_records_validate
  BEFORE INSERT OR UPDATE ON public.dispute_records
  FOR EACH ROW EXECUTE FUNCTION public.trg_dispute_records_validate();

CREATE OR REPLACE FUNCTION public.trg_rating_records_validate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rating_records_validate ON public.rating_records;
CREATE TRIGGER trg_rating_records_validate
  BEFORE INSERT OR UPDATE ON public.rating_records
  FOR EACH ROW EXECUTE FUNCTION public.trg_rating_records_validate();

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_solutions_challenge ON public.solutions(challenge_id, provider_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_records_solution ON public.evaluation_records(solution_id, reviewer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_records_challenge ON public.escrow_records(challenge_id);
CREATE INDEX IF NOT EXISTS idx_solution_access_log_solution ON public.solution_access_log(solution_id, "timestamp");
CREATE INDEX IF NOT EXISTS idx_dispute_records_challenge ON public.dispute_records(challenge_id, status);
CREATE INDEX IF NOT EXISTS idx_rating_records_challenge ON public.rating_records(challenge_id);
CREATE INDEX IF NOT EXISTS idx_ip_transfer_records_solution ON public.ip_transfer_records(solution_id);
CREATE INDEX IF NOT EXISTS idx_solver_profiles_user ON public.solver_profiles(user_id);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.solutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view solutions" ON public.solutions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Providers can insert own solutions" ON public.solutions FOR INSERT TO authenticated WITH CHECK (provider_id = auth.uid());
CREATE POLICY "Providers can update own solutions" ON public.solutions FOR UPDATE TO authenticated USING (provider_id = auth.uid());

ALTER TABLE public.evaluation_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view evaluations" ON public.evaluation_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Reviewers can insert evaluations" ON public.evaluation_records FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "Reviewers can update own evaluations" ON public.evaluation_records FOR UPDATE TO authenticated USING (reviewer_id = auth.uid());

ALTER TABLE public.escrow_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view escrow" ON public.escrow_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert escrow" ON public.escrow_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update escrow" ON public.escrow_records FOR UPDATE TO authenticated USING (true);

ALTER TABLE public.ip_transfer_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view transfers" ON public.ip_transfer_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert transfers" ON public.ip_transfer_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update transfers" ON public.ip_transfer_records FOR UPDATE TO authenticated USING (true);

ALTER TABLE public.solution_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view access log" ON public.solution_access_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert access log" ON public.solution_access_log FOR INSERT TO authenticated WITH CHECK (accessor_id = auth.uid());

ALTER TABLE public.solver_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view solver profiles" ON public.solver_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own solver profile" ON public.solver_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own solver profile" ON public.solver_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.dispute_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view disputes" ON public.dispute_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can file disputes" ON public.dispute_records FOR INSERT TO authenticated WITH CHECK (raised_by = auth.uid());
CREATE POLICY "Filers can update own disputes" ON public.dispute_records FOR UPDATE TO authenticated USING (raised_by = auth.uid());

ALTER TABLE public.rating_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view ratings" ON public.rating_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can submit ratings" ON public.rating_records FOR INSERT TO authenticated WITH CHECK (rater_id = auth.uid());
CREATE POLICY "Users can update own ratings" ON public.rating_records FOR UPDATE TO authenticated USING (rater_id = auth.uid());
