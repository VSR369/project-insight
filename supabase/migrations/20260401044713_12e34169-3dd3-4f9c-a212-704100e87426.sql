CREATE OR REPLACE FUNCTION public.trg_challenges_validate_cogniblend()
RETURNS trigger
LANGUAGE plpgsql
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
  IF NEW.maturity_level IS NOT NULL AND NEW.maturity_level NOT IN ('BLUEPRINT','POC','PROTOTYPE','PILOT','DEMO') THEN
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