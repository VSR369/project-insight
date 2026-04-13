
-- Drop old CHECK constraint
ALTER TABLE public.performance_score_weights
  DROP CONSTRAINT performance_score_weights_dimension_check;

-- Add new CHECK with spec dimension names (keep old names too for backward compat)
ALTER TABLE public.performance_score_weights
  ADD CONSTRAINT performance_score_weights_dimension_check
  CHECK (dimension IN (
    'quality','consistency','engagement','responsiveness','expertise_depth','community_impact',
    'community_engagement','abstracts_submitted','solution_quality','complexity_handled','win_achievement','knowledge_contrib'
  ));

-- Now insert the spec dimensions
DELETE FROM public.performance_score_weights
  WHERE dimension IN ('quality','consistency','engagement','responsiveness','expertise_depth','community_impact');

INSERT INTO public.performance_score_weights (dimension, weight) VALUES
  ('community_engagement', 0.10),
  ('abstracts_submitted', 0.15),
  ('solution_quality', 0.25),
  ('complexity_handled', 0.20),
  ('win_achievement', 0.20),
  ('knowledge_contrib', 0.10)
ON CONFLICT (dimension) DO UPDATE SET weight = EXCLUDED.weight;
