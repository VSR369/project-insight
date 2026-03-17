
-- Fix search_path on M-01-C validation triggers
CREATE OR REPLACE FUNCTION public.trg_solutions_validate()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
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

CREATE OR REPLACE FUNCTION public.trg_escrow_records_validate()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.escrow_status NOT IN ('PENDING','FUNDED','PARTIAL_RELEASED','FINAL_RELEASED','REFUNDED','REJECTION_FEE') THEN
    RAISE EXCEPTION 'Invalid escrow_status value';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_ip_transfer_records_validate()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.transfer_status NOT IN ('DEFINED','INITIATED','UNDER_REVIEW','CONFIRMED','REGISTERED','DISPUTED') THEN
    RAISE EXCEPTION 'Invalid transfer_status value';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_solution_access_log_validate()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.access_type NOT IN ('VIEW','DOWNLOAD','PRINT') THEN
    RAISE EXCEPTION 'access_type must be VIEW, DOWNLOAD, or PRINT';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_solver_profiles_validate()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_level NOT IN ('L0','L1','L2','L3') THEN
    RAISE EXCEPTION 'verification_level must be L0, L1, L2, or L3';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_dispute_records_validate()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
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

CREATE OR REPLACE FUNCTION public.trg_rating_records_validate()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;
