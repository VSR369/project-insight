
-- Role Authority Matrix: defines ALL valid phase transitions, required roles, and status pairs
CREATE TABLE IF NOT EXISTS public.role_authority_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase INTEGER NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  required_role TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(phase, from_status, to_status)
);

-- Index for fast lookups
CREATE INDEX idx_ram_phase_status ON public.role_authority_matrix(phase, from_status, to_status);

-- RLS: read-only for authenticated, no client writes
ALTER TABLE public.role_authority_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_ram"
  ON public.role_authority_matrix FOR SELECT TO authenticated
  USING (TRUE);

-- ═══════════════════════════════════════════════════════════
-- Seed: 22 valid transitions from BRD §6.2
-- Phase completion transitions (ACTIVE → COMPLETED)
-- ═══════════════════════════════════════════════════════════
INSERT INTO public.role_authority_matrix (phase, from_status, to_status, required_role, description) VALUES
  -- Phase 1: Solution Request (AM for MP, RQ for AGG — use AM as default, AGG bypass handled separately)
  (1,  'ACTIVE', 'COMPLETED', 'AM', 'Solution Request completion'),
  (2,  'ACTIVE', 'COMPLETED', 'CR', 'Challenge Creation completion'),
  (3,  'ACTIVE', 'COMPLETED', 'CU', 'Curation completion'),
  (4,  'ACTIVE', 'COMPLETED', 'ID', 'Innovation Director approval'),
  (5,  'ACTIVE', 'COMPLETED', 'ID', 'Publication sign-off'),
  -- Phase 6 is skipped (5→7)
  -- Phase 7: Solver submissions (no seeker role — solver-driven)
  (7,  'ACTIVE', 'COMPLETED', 'ER', 'Submission window closed / evaluation start'),
  (8,  'ACTIVE', 'COMPLETED', 'ER', 'Evaluation completion'),
  (9,  'ACTIVE', 'COMPLETED', 'FC', 'Financial clearance'),
  (10, 'ACTIVE', 'COMPLETED', 'ER', 'Final review completion'),
  (11, 'ACTIVE', 'COMPLETED', 'ID', 'Award decision'),
  (12, 'ACTIVE', 'COMPLETED', 'FC', 'Payment processing'),
  (13, 'ACTIVE', 'COMPLETED', 'ID', 'Closure sign-off'),

  -- Hold transitions (any phase actor can hold)
  (1,  'ACTIVE', 'ON_HOLD',   'AM', 'Hold Phase 1'),
  (2,  'ACTIVE', 'ON_HOLD',   'CR', 'Hold Phase 2'),
  (3,  'ACTIVE', 'ON_HOLD',   'CU', 'Hold Phase 3'),
  (4,  'ACTIVE', 'ON_HOLD',   'ID', 'Hold Phase 4'),
  (5,  'ACTIVE', 'ON_HOLD',   'ID', 'Hold Phase 5'),

  -- Resume from hold
  (1,  'ON_HOLD', 'ACTIVE',   'AM', 'Resume Phase 1'),
  (2,  'ON_HOLD', 'ACTIVE',   'CR', 'Resume Phase 2'),
  (3,  'ON_HOLD', 'ACTIVE',   'CU', 'Resume Phase 3'),
  (4,  'ON_HOLD', 'ACTIVE',   'ID', 'Resume Phase 4'),
  (5,  'ON_HOLD', 'ACTIVE',   'ID', 'Resume Phase 5')
ON CONFLICT (phase, from_status, to_status) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- Update validate_phase_transition to check the matrix
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.validate_phase_transition(
  p_challenge_id UUID,
  p_user_id UUID,
  p_from_status TEXT,
  p_to_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_phase   INTEGER;
  v_required_role   TEXT;
  v_has_permission  BOOLEAN;
BEGIN
  -- 1. Block transitions FROM terminal states
  IF p_from_status = 'TERMINAL' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Cannot transition from TERMINAL status. This state is permanent.'
    );
  END IF;

  -- 2. Block reversal from COMPLETED back to ACTIVE
  IF p_from_status = 'COMPLETED' AND p_to_status = 'ACTIVE' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Cannot revert a COMPLETED phase back to ACTIVE.'
    );
  END IF;

  -- 3. Get current phase
  SELECT current_phase INTO v_current_phase
    FROM public.challenges
   WHERE id = p_challenge_id;

  IF v_current_phase IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Challenge not found.'
    );
  END IF;

  -- 4. TERMINAL transitions are always allowed for the phase owner (cancellation)
  IF p_to_status = 'TERMINAL' THEN
    SELECT required_role INTO v_required_role
      FROM public.role_authority_matrix
     WHERE phase = v_current_phase
       AND from_status = p_from_status
       AND to_status = 'COMPLETED';
    -- Fall back to get_phase_required_role if no matrix entry
    IF v_required_role IS NULL THEN
      SELECT public.get_phase_required_role(v_current_phase) INTO v_required_role;
    END IF;

    IF v_required_role IS NOT NULL THEN
      BEGIN
        SELECT public.can_perform(p_user_id, p_challenge_id, v_required_role) INTO v_has_permission;
      EXCEPTION WHEN undefined_function THEN
        v_has_permission := true;
      END;
      IF NOT COALESCE(v_has_permission, false) THEN
        RETURN jsonb_build_object(
          'valid', false,
          'error', format('User does not have the required role (%s) for phase %s.', v_required_role, v_current_phase)
        );
      END IF;
    END IF;

    RETURN jsonb_build_object('valid', true, 'error', null);
  END IF;

  -- 5. Check the Role Authority Matrix for the transition
  SELECT required_role INTO v_required_role
    FROM public.role_authority_matrix
   WHERE phase = v_current_phase
     AND from_status = p_from_status
     AND to_status = p_to_status;

  IF v_required_role IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('Transition %s → %s is not permitted at phase %s. Not found in the Role Authority Matrix.', p_from_status, p_to_status, v_current_phase)
    );
  END IF;

  -- 6. Check user has the required role
  BEGIN
    SELECT public.can_perform(p_user_id, p_challenge_id, v_required_role) INTO v_has_permission;
  EXCEPTION WHEN undefined_function THEN
    v_has_permission := true;
  END;

  IF NOT COALESCE(v_has_permission, false) THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('User does not have the required role (%s) for phase %s.', v_required_role, v_current_phase)
    );
  END IF;

  -- 7. All checks passed
  RETURN jsonb_build_object('valid', true, 'error', null);
END;
$$;
