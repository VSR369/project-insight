
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS solution_maturity_id UUID REFERENCES public.md_solution_maturity(id);

CREATE INDEX IF NOT EXISTS idx_challenges_solution_maturity ON public.challenges(solution_maturity_id);
