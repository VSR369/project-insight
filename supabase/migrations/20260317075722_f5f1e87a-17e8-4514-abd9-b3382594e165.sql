
-- =============================================================
-- Function: update_master_status
-- =============================================================
CREATE OR REPLACE FUNCTION public.update_master_status(p_challenge_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_phase  INTEGER;
  v_phase_status   TEXT;
  v_new_master     TEXT;
BEGIN
  SELECT current_phase, phase_status
    INTO v_current_phase, v_phase_status
    FROM public.challenges
   WHERE id = p_challenge_id;

  IF v_current_phase IS NULL THEN
    RETURN;
  END IF;

  -- Terminal at any phase => CANCELLED
  IF v_phase_status = 'TERMINAL' THEN
    v_new_master := 'CANCELLED';

  -- Phase 13 completed => COMPLETED
  ELSIF v_current_phase = 13 AND v_phase_status = 'COMPLETED' THEN
    v_new_master := 'COMPLETED';

  -- Phase 5 completed (just published) => ACTIVE
  ELSIF v_current_phase >= 5 AND v_phase_status = 'COMPLETED' THEN
    v_new_master := 'ACTIVE';

  -- Phases 5+ in progress => ACTIVE
  ELSIF v_current_phase >= 5 THEN
    v_new_master := 'ACTIVE';

  -- Phases 1-4, not terminal => DRAFT
  ELSIF v_current_phase <= 4 AND v_phase_status IS DISTINCT FROM 'TERMINAL' THEN
    v_new_master := 'DRAFT';

  ELSE
    RETURN;
  END IF;

  UPDATE public.challenges
     SET master_status = v_new_master,
         updated_at = NOW()
   WHERE id = p_challenge_id
     AND (master_status IS DISTINCT FROM v_new_master);
END;
$$;

COMMENT ON FUNCTION public.update_master_status(UUID) IS
  'Derives and updates master_status based on current_phase and phase_status. Called by trigger on challenges.';

-- =============================================================
-- Trigger function wrapper
-- =============================================================
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

-- =============================================================
-- Trigger: fires after current_phase or phase_status changes
-- =============================================================
CREATE TRIGGER trg_challenges_sync_master_status
  AFTER UPDATE OF current_phase, phase_status ON public.challenges
  FOR EACH ROW
  WHEN (
    OLD.current_phase IS DISTINCT FROM NEW.current_phase
    OR OLD.phase_status IS DISTINCT FROM NEW.phase_status
  )
  EXECUTE FUNCTION public.fn_sync_master_status();
