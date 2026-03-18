
-- Step 0: Add termination_type column
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS termination_type TEXT;

-- Step 0b: Add check on it
ALTER TABLE public.challenges
  ADD CONSTRAINT chk_challenges_termination_type
  CHECK (termination_type IS NULL OR termination_type IN ('USER_CANCELLED', 'ADMIN_TERMINATED', 'AUTO_TERMINATED'));

-- Step 1: Update validation trigger to accept new statuses
CREATE OR REPLACE FUNCTION public.trg_challenges_validate_cogniblend()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.master_status IS NOT NULL AND NEW.master_status NOT IN ('IN_PREPARATION','ACTIVE','COMPLETED','CANCELLED','TERMINATED') THEN
    RAISE EXCEPTION 'Invalid master_status: %. Must be IN_PREPARATION, ACTIVE, COMPLETED, CANCELLED, or TERMINATED', NEW.master_status;
  END IF;
  IF NEW.current_phase IS NOT NULL AND (NEW.current_phase < 1 OR NEW.current_phase > 13) THEN
    RAISE EXCEPTION 'current_phase must be between 1 and 13, got %', NEW.current_phase;
  END IF;
  IF NEW.phase_status IS NOT NULL AND NEW.phase_status NOT IN ('ACTIVE','COMPLETED','ON_HOLD','TERMINAL','BLOCKED','COMPLETED_BYPASSED','LEGAL_VERIFICATION_PENDING') THEN
    RAISE EXCEPTION 'Invalid phase_status: %', NEW.phase_status;
  END IF;
  IF NEW.maturity_level IS NOT NULL AND NEW.maturity_level NOT IN ('BLUEPRINT','POC','PROTOTYPE','PILOT') THEN
    RAISE EXCEPTION 'Invalid maturity_level: %', NEW.maturity_level;
  END IF;
  IF NEW.complexity_level IS NOT NULL AND NEW.complexity_level NOT IN ('L1','L2','L3','L4','L5') THEN
    RAISE EXCEPTION 'Invalid complexity_level: %', NEW.complexity_level;
  END IF;
  IF NEW.ip_model IS NOT NULL AND NEW.ip_model NOT IN ('IP-EA','IP-NEL','IP-EL','IP-JO','IP-NONE') THEN
    RAISE EXCEPTION 'Invalid ip_model: %', NEW.ip_model;
  END IF;
  IF NEW.rejection_fee_percentage IS NOT NULL AND (NEW.rejection_fee_percentage < 5 OR NEW.rejection_fee_percentage > 20) THEN
    RAISE EXCEPTION 'rejection_fee_percentage must be between 5 and 20, got %', NEW.rejection_fee_percentage;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 2: Migrate data
UPDATE public.challenges SET master_status = 'IN_PREPARATION' WHERE master_status IN ('DRAFT', 'ARCHIVED');

-- Step 3: Add CHECK constraint for master_status
ALTER TABLE public.challenges
  ADD CONSTRAINT chk_challenges_master_status
  CHECK (master_status IN ('IN_PREPARATION', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'TERMINATED'));

-- Step 4: Replace update_master_status
CREATE OR REPLACE FUNCTION public.update_master_status(p_challenge_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_phase   INTEGER;
  v_phase_status    TEXT;
  v_termination_type TEXT;
  v_new_master      TEXT;
BEGIN
  SELECT current_phase, phase_status, termination_type
    INTO v_current_phase, v_phase_status, v_termination_type
    FROM public.challenges
   WHERE id = p_challenge_id;

  IF v_current_phase IS NULL THEN RETURN; END IF;

  IF v_phase_status = 'TERMINAL' THEN
    IF v_termination_type IN ('ADMIN_TERMINATED', 'AUTO_TERMINATED') THEN
      v_new_master := 'TERMINATED';
    ELSE
      v_new_master := 'CANCELLED';
    END IF;
  ELSIF v_current_phase = 13 AND v_phase_status = 'COMPLETED' THEN
    v_new_master := 'COMPLETED';
  ELSIF v_current_phase >= 5 THEN
    v_new_master := 'ACTIVE';
  ELSIF v_current_phase <= 4 AND v_phase_status IS DISTINCT FROM 'TERMINAL' THEN
    v_new_master := 'IN_PREPARATION';
  ELSE
    RETURN;
  END IF;

  UPDATE public.challenges
     SET master_status = v_new_master, updated_at = NOW()
   WHERE id = p_challenge_id
     AND (master_status IS DISTINCT FROM v_new_master);
END;
$$;

-- Step 5: Update trigger
DROP TRIGGER IF EXISTS trg_challenges_sync_master_status ON public.challenges;

CREATE OR REPLACE FUNCTION public.fn_sync_master_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.update_master_status(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_challenges_sync_master_status
  AFTER UPDATE OF current_phase, phase_status, termination_type
  ON public.challenges
  FOR EACH ROW
  WHEN (
    OLD.current_phase IS DISTINCT FROM NEW.current_phase
    OR OLD.phase_status IS DISTINCT FROM NEW.phase_status
    OR OLD.termination_type IS DISTINCT FROM NEW.termination_type
  )
  EXECUTE FUNCTION fn_sync_master_status();
