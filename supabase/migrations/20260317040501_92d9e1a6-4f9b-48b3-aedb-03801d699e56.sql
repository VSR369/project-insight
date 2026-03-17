
-- ============================================================
-- M-01-B: Challenge Tables Extension
-- ============================================================

-- 1. ALTER challenges — add missing CogniBlend columns
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS problem_statement text,
  ADD COLUMN IF NOT EXISTS scope text,
  ADD COLUMN IF NOT EXISTS deliverables jsonb,
  ADD COLUMN IF NOT EXISTS evaluation_criteria jsonb,
  ADD COLUMN IF NOT EXISTS reward_structure jsonb,
  ADD COLUMN IF NOT EXISTS master_status text DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS current_phase integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS phase_status text DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS operating_model text,
  ADD COLUMN IF NOT EXISTS governance_profile text,
  ADD COLUMN IF NOT EXISTS maturity_level text,
  ADD COLUMN IF NOT EXISTS complexity_score numeric,
  ADD COLUMN IF NOT EXISTS complexity_level text,
  ADD COLUMN IF NOT EXISTS complexity_parameters jsonb,
  ADD COLUMN IF NOT EXISTS ip_model text,
  ADD COLUMN IF NOT EXISTS phase_schedule jsonb,
  ADD COLUMN IF NOT EXISTS submission_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_fee_percentage numeric DEFAULT 10,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Validation trigger for challenges CogniBlend columns
CREATE OR REPLACE FUNCTION public.trg_challenges_validate_cogniblend()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- master_status
  IF NEW.master_status IS NOT NULL AND NEW.master_status NOT IN ('DRAFT','ACTIVE','COMPLETED','CANCELLED','ARCHIVED') THEN
    RAISE EXCEPTION 'Invalid master_status: %. Must be DRAFT, ACTIVE, COMPLETED, CANCELLED, or ARCHIVED', NEW.master_status;
  END IF;

  -- current_phase
  IF NEW.current_phase IS NOT NULL AND (NEW.current_phase < 1 OR NEW.current_phase > 13) THEN
    RAISE EXCEPTION 'current_phase must be between 1 and 13, got %', NEW.current_phase;
  END IF;

  -- phase_status
  IF NEW.phase_status IS NOT NULL AND NEW.phase_status NOT IN ('ACTIVE','COMPLETED','ON_HOLD','TERMINAL','BLOCKED','COMPLETED_BYPASSED') THEN
    RAISE EXCEPTION 'Invalid phase_status: %', NEW.phase_status;
  END IF;

  -- maturity_level
  IF NEW.maturity_level IS NOT NULL AND NEW.maturity_level NOT IN ('BLUEPRINT','POC','PROTOTYPE','PILOT') THEN
    RAISE EXCEPTION 'Invalid maturity_level: %', NEW.maturity_level;
  END IF;

  -- complexity_level
  IF NEW.complexity_level IS NOT NULL AND NEW.complexity_level NOT IN ('L1','L2','L3','L4','L5') THEN
    RAISE EXCEPTION 'Invalid complexity_level: %', NEW.complexity_level;
  END IF;

  -- ip_model
  IF NEW.ip_model IS NOT NULL AND NEW.ip_model NOT IN ('IP-EA','IP-NEL','IP-EL','IP-JO','IP-NONE') THEN
    RAISE EXCEPTION 'Invalid ip_model: %', NEW.ip_model;
  END IF;

  -- rejection_fee_percentage
  IF NEW.rejection_fee_percentage IS NOT NULL AND (NEW.rejection_fee_percentage < 5 OR NEW.rejection_fee_percentage > 20) THEN
    RAISE EXCEPTION 'rejection_fee_percentage must be between 5 and 20, got %', NEW.rejection_fee_percentage;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_challenges_validate_cogniblend ON public.challenges;
CREATE TRIGGER trg_challenges_validate_cogniblend
  BEFORE INSERT OR UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_challenges_validate_cogniblend();

-- ============================================================
-- 2. CREATE challenge_legal_docs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.challenge_legal_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_name text,
  tier text NOT NULL,
  maturity_level text,
  template_version text,
  status text DEFAULT 'ATTACHED',
  attached_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Validation trigger for challenge_legal_docs
CREATE OR REPLACE FUNCTION public.trg_challenge_legal_docs_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tier NOT IN ('TIER_1','TIER_2') THEN
    RAISE EXCEPTION 'Invalid tier: %. Must be TIER_1 or TIER_2', NEW.tier;
  END IF;
  IF NEW.status IS NOT NULL AND NEW.status NOT IN ('ATTACHED','TRIGGERED','SIGNED','EXPIRED') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be ATTACHED, TRIGGERED, SIGNED, or EXPIRED', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_challenge_legal_docs_validate
  BEFORE INSERT OR UPDATE ON public.challenge_legal_docs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_challenge_legal_docs_validate();

ALTER TABLE public.challenge_legal_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read legal docs"
  ON public.challenge_legal_docs FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can insert their own legal docs"
  ON public.challenge_legal_docs FOR INSERT
  TO authenticated WITH CHECK (attached_by = auth.uid());

CREATE POLICY "Users can update their own legal docs"
  ON public.challenge_legal_docs FOR UPDATE
  TO authenticated USING (attached_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_challenge_legal_docs_challenge_tier
  ON public.challenge_legal_docs(challenge_id, tier);

-- ============================================================
-- 3. CREATE amendment_records
-- ============================================================
CREATE TABLE IF NOT EXISTS public.amendment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  amendment_number integer NOT NULL,
  initiated_by uuid REFERENCES auth.users(id),
  reason text,
  scope_of_change text,
  status text,
  version_before integer,
  version_after integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Validation trigger for amendment_records
CREATE OR REPLACE FUNCTION public.trg_amendment_records_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS NOT NULL AND NEW.status NOT IN ('INITIATED','IMPLEMENTING','UNDER_REVIEW','APPROVED','REJECTED') THEN
    RAISE EXCEPTION 'Invalid amendment status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_amendment_records_validate
  BEFORE INSERT OR UPDATE ON public.amendment_records
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_amendment_records_validate();

ALTER TABLE public.amendment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read amendments"
  ON public.amendment_records FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can insert their own amendments"
  ON public.amendment_records FOR INSERT
  TO authenticated WITH CHECK (initiated_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_amendment_records_challenge_number
  ON public.amendment_records(challenge_id, amendment_number);

-- ============================================================
-- 4. CREATE challenge_package_versions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.challenge_package_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.challenge_package_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read package versions"
  ON public.challenge_package_versions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert package versions"
  ON public.challenge_package_versions FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_challenge_package_versions_challenge_version
  ON public.challenge_package_versions(challenge_id, version_number);
