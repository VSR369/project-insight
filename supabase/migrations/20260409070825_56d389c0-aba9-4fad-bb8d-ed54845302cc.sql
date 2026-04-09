
-- PART A: Add evaluation config columns to challenges
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS evaluation_method TEXT NOT NULL DEFAULT 'SINGLE'
    CHECK (evaluation_method IN ('SINGLE', 'DELPHI')),
  ADD COLUMN IF NOT EXISTS evaluator_count INTEGER NOT NULL DEFAULT 1
    CHECK (evaluator_count BETWEEN 1 AND 5);

ALTER TABLE public.challenges
  ADD CONSTRAINT chk_evaluator_count_method
    CHECK (
      (evaluation_method = 'SINGLE' AND evaluator_count = 1)
      OR (evaluation_method = 'DELPHI' AND evaluator_count >= 2)
    );

-- PART B: Update governance mode config seed data
UPDATE public.md_governance_mode_config SET dual_evaluation_required = false, blind_evaluation = false WHERE governance_mode = 'QUICK';
UPDATE public.md_governance_mode_config SET dual_evaluation_required = true, blind_evaluation = false WHERE governance_mode = 'STRUCTURED';
UPDATE public.md_governance_mode_config SET dual_evaluation_required = true, blind_evaluation = true WHERE governance_mode = 'CONTROLLED';

-- Comments
COMMENT ON COLUMN public.md_governance_mode_config.dual_evaluation_required IS 'Whether Delphi (multi-evaluator) option is available to Creator. QUICK=locked to SINGLE.';
COMMENT ON COLUMN public.md_governance_mode_config.blind_evaluation IS 'Whether solver identity is hidden from evaluators. CONTROLLED=always enforced.';
COMMENT ON COLUMN public.challenges.evaluation_method IS 'SINGLE=one evaluator scores. DELPHI=multiple independent evaluators, scores aggregated.';
COMMENT ON COLUMN public.challenges.evaluator_count IS 'Number of evaluators. 1 for SINGLE, 2-5 for DELPHI.';
