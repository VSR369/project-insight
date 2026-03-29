-- challenge_prize_tiers table
CREATE TABLE IF NOT EXISTS public.challenge_prize_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL,
  rank INTEGER NOT NULL DEFAULT 1,
  percentage_of_pool NUMERIC NOT NULL DEFAULT 0 CHECK (percentage_of_pool >= 0 AND percentage_of_pool <= 100),
  fixed_amount NUMERIC CHECK (fixed_amount IS NULL OR fixed_amount >= 0),
  max_winners INTEGER NOT NULL DEFAULT 1 CHECK (max_winners >= 1),
  description TEXT,
  created_by_role TEXT CHECK (created_by_role IN ('am','creator','curator')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_prize_tiers_challenge ON public.challenge_prize_tiers(challenge_id, rank);

ALTER TABLE public.challenge_prize_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read prize tiers"
  ON public.challenge_prize_tiers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert prize tiers"
  ON public.challenge_prize_tiers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update prize tiers"
  ON public.challenge_prize_tiers FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete prize tiers"
  ON public.challenge_prize_tiers FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.seed_default_prize_tiers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.challenge_prize_tiers (challenge_id, tier_name, rank, percentage_of_pool, max_winners, description, is_default, created_by_role)
  VALUES
    (NEW.id, 'Platinum', 1, 55, 1, 'Top solution — best overall score across all evaluation criteria', true, 'am'),
    (NEW.id, 'Gold', 2, 23, 1, 'Runner-up — strong solution with minor gaps', true, 'am'),
    (NEW.id, 'Silver', 3, 13, 1, 'Third place — viable solution with notable differentiators', true, 'am'),
    (NEW.id, 'Honorable Mention', 4, 9, 3, 'Innovative approaches worthy of recognition', true, 'am');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_challenges_insert_seed_prize_tiers
  AFTER INSERT ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_prize_tiers();