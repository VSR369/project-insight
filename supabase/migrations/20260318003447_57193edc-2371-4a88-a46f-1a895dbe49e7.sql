-- Add CHECK constraint for phase_status including LEGAL_VERIFICATION_PENDING
-- Since there's currently no CHECK constraint, we add one with all known values.
ALTER TABLE public.challenges
ADD CONSTRAINT chk_challenges_phase_status
CHECK (phase_status IS NULL OR phase_status IN (
  'ACTIVE', 'COMPLETED', 'ON_HOLD', 'TERMINAL', 'BLOCKED',
  'LEGAL_VERIFICATION_PENDING'
));

COMMENT ON CONSTRAINT chk_challenges_phase_status ON public.challenges IS
  'Validates allowed phase_status values. LEGAL_VERIFICATION_PENDING is an Enterprise-only sub-state during Phase 2 legal attachment.';