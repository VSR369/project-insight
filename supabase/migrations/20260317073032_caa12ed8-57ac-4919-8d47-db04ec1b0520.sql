
CREATE OR REPLACE FUNCTION public.handle_phase1_bypass(
  p_challenge_id UUID,
  p_operating_model TEXT,
  p_phase1_enabled BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_id UUID;
BEGIN
  -- Only bypass for AGG model with phase1 disabled
  IF p_operating_model = 'AGG' AND p_phase1_enabled = false THEN
    -- Get the challenge creator
    SELECT created_by INTO v_creator_id
    FROM public.challenges
    WHERE id = p_challenge_id;

    -- Update challenge to skip to phase 2
    UPDATE public.challenges
    SET current_phase = 2,
        phase_status = 'ACTIVE',
        updated_at = NOW()
    WHERE id = p_challenge_id;

    -- Audit trail
    INSERT INTO public.audit_trail (
      challenge_id, user_id, action, method, details, phase_from, phase_to
    ) VALUES (
      p_challenge_id,
      v_creator_id,
      'PHASE_BYPASSED',
      'SYSTEM',
      '{"reason": "AGG_PHASE1_BYPASS", "phase_status": "COMPLETED_BYPASSED"}'::jsonb,
      1,
      2
    );
  END IF;
  -- MP or phase1_enabled = true: do nothing
END;
$$;
