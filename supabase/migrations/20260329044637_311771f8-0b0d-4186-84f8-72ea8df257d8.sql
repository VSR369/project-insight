
-- ============================================================
-- Migration: Create non_monetary_incentives + challenge_incentive_selections + seed
-- ============================================================

-- Non-monetary incentive registry
CREATE TABLE IF NOT EXISTS public.non_monetary_incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  cash_equivalent_min NUMERIC NOT NULL CHECK (cash_equivalent_min >= 0),
  cash_equivalent_max NUMERIC NOT NULL CHECK (cash_equivalent_max >= cash_equivalent_min),
  applicable_maturity_levels TEXT[] NOT NULL DEFAULT ARRAY['blueprint','poc','pilot'],
  minimum_complexity TEXT NOT NULL DEFAULT 'L1',
  seeker_requirement TEXT NOT NULL,
  credibility_note TEXT NOT NULL,
  solver_appeal TEXT NOT NULL CHECK (solver_appeal IN ('high','very_high','exceptional')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_nmi_active ON public.non_monetary_incentives (is_active, display_order);

ALTER TABLE public.non_monetary_incentives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nmi_select_authenticated" ON public.non_monetary_incentives FOR SELECT TO authenticated USING (true);
CREATE POLICY "nmi_insert_authenticated" ON public.non_monetary_incentives FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "nmi_update_authenticated" ON public.non_monetary_incentives FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "nmi_delete_authenticated" ON public.non_monetary_incentives FOR DELETE TO authenticated USING (true);

-- Challenge-incentive selections join table
CREATE TABLE IF NOT EXISTS public.challenge_incentive_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  incentive_id UUID NOT NULL REFERENCES public.non_monetary_incentives(id),
  seeker_commitment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(challenge_id, incentive_id)
);

CREATE INDEX IF NOT EXISTS idx_cis_challenge ON public.challenge_incentive_selections (challenge_id);
CREATE INDEX IF NOT EXISTS idx_cis_incentive ON public.challenge_incentive_selections (incentive_id);

ALTER TABLE public.challenge_incentive_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cis_select_authenticated" ON public.challenge_incentive_selections FOR SELECT TO authenticated USING (true);
CREATE POLICY "cis_insert_authenticated" ON public.challenge_incentive_selections FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cis_update_authenticated" ON public.challenge_incentive_selections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cis_delete_authenticated" ON public.challenge_incentive_selections FOR DELETE TO authenticated USING (true);

-- Seed 6 default incentives
INSERT INTO public.non_monetary_incentives (name, description, cash_equivalent_min, cash_equivalent_max, applicable_maturity_levels, minimum_complexity, seeker_requirement, credibility_note, solver_appeal, display_order) VALUES
('Pilot / Implementation Contract', 'Winner gets first right of refusal for the follow-on implementation contract', 10000, 100000, ARRAY['poc','pilot'], 'L3', 'Signed Letter of Intent for follow-on work with budget range specified', 'High credibility when seeker is large/medium enterprise with procurement authority. Low credibility for startups without confirmed funding.', 'exceptional', 1),
('Incubation / Accelerator Access', E'Access to sponsor''s incubation program with funding pathways, workspace, and ecosystem', 5000, 30000, ARRAY['blueprint','poc','pilot'], 'L2', E'Confirmed slot in sponsor''s accelerator program with start date', 'High for seekers with established accelerator programs. Not credible as a vague promise.', 'very_high', 2),
('Mentorship from Sponsor C-Suite', E'Direct access to sponsor''s senior leadership — 3+ sessions over 6 months', 3000, 15000, ARRAY['blueprint','poc','pilot'], 'L2', 'Named executive(s) committed with scheduled availability', 'High when named executive is a recognized industry leader. Low for generic "senior manager" access.', 'very_high', 3),
('Co-authorship / IP Recognition', 'Published case study or research paper with solver credited as co-author', 2000, 10000, ARRAY['blueprint','poc'], 'L2', 'Commitment to publish in named venue (journal, conference, or industry report)', 'Very high for academic seekers and R&D-heavy enterprises. Less valued by solvers focused on commercial work.', 'high', 4),
('Global Visibility & Case Study Feature', E'Winner featured in sponsor''s annual report, conference presentation, or press release', 2000, 8000, ARRAY['blueprint','poc','pilot'], 'L1', 'Marketing team commitment to produce and distribute the case study', 'High for recognizable brands. Limited value if sponsor is unknown.', 'high', 5),
('Talent Pipeline / Hiring Fast-track', 'Solver or solver team members skip to final round for named positions at sponsor', 5000, 25000, ARRAY['blueprint','poc','pilot'], 'L2', 'Named open positions with HR confirmation of fast-track process', E'Very high for blue-chip employers. Must specify actual positions, not vague "future opportunities".', 'very_high', 6);
