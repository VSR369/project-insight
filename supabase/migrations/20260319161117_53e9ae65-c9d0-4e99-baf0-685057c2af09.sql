
-- ============================================================
-- md_governance_field_rules: Supervisor-configurable per-field,
-- per-mode visibility & validation rules for challenge wizard.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.md_governance_field_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  governance_mode TEXT NOT NULL CHECK (governance_mode IN ('QUICK', 'STRUCTURED', 'CONTROLLED')),
  field_key TEXT NOT NULL,
  wizard_step INTEGER NOT NULL CHECK (wizard_step BETWEEN 0 AND 7),
  visibility TEXT NOT NULL DEFAULT 'optional' CHECK (visibility IN ('required', 'optional', 'hidden', 'auto', 'ai_drafted')),
  min_length INTEGER,
  max_length INTEGER,
  default_value TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (governance_mode, field_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_md_governance_field_rules_mode ON public.md_governance_field_rules(governance_mode, is_active);
CREATE INDEX IF NOT EXISTS idx_md_governance_field_rules_step ON public.md_governance_field_rules(governance_mode, wizard_step);

-- Enable RLS
ALTER TABLE public.md_governance_field_rules ENABLE ROW LEVEL SECURITY;

-- RLS: All authenticated users can read (master data)
CREATE POLICY "Anyone can read governance field rules"
  ON public.md_governance_field_rules FOR SELECT
  TO authenticated
  USING (true);

-- RLS: Only service_role can insert/update/delete (admin via edge function or direct)
CREATE POLICY "Service role manages governance field rules"
  ON public.md_governance_field_rules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- RPC: get_governance_field_rules — returns active rules for mode
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_governance_field_rules(p_governance_mode TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'field_key', field_key,
      'wizard_step', wizard_step,
      'visibility', visibility,
      'min_length', min_length,
      'max_length', max_length,
      'default_value', default_value,
      'display_order', display_order
    ) ORDER BY wizard_step, display_order
  )
  INTO v_result
  FROM public.md_governance_field_rules
  WHERE governance_mode = UPPER(p_governance_mode)
    AND is_active = TRUE;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- ============================================================
-- SEED DATA: Default rules matching current hardcoded behavior
-- ============================================================

INSERT INTO public.md_governance_field_rules (governance_mode, field_key, wizard_step, visibility, min_length, max_length, display_order) VALUES
-- === QUICK MODE — Step 1: Challenge Brief ===
('QUICK', 'title', 1, 'required', 1, 200, 1),
('QUICK', 'hook', 1, 'optional', NULL, 300, 2),
('QUICK', 'description', 1, 'optional', NULL, 2000, 3),
('QUICK', 'problem_statement', 1, 'required', 200, 5000, 4),
('QUICK', 'scope', 1, 'optional', NULL, 3000, 5),
('QUICK', 'domain_tags', 1, 'required', NULL, NULL, 6),
('QUICK', 'taxonomy_tags', 1, 'optional', NULL, 500, 7),
('QUICK', 'maturity_level', 1, 'required', NULL, NULL, 8),
('QUICK', 'context_background', 1, 'hidden', NULL, 5000, 9),
('QUICK', 'detailed_description', 1, 'hidden', NULL, 5000, 10),
('QUICK', 'root_causes', 1, 'hidden', NULL, 5000, 11),
('QUICK', 'affected_stakeholders', 1, 'hidden', NULL, 5000, 12),
('QUICK', 'current_deficiencies', 1, 'hidden', NULL, 5000, 13),
('QUICK', 'expected_outcomes', 1, 'optional', NULL, 5000, 14),
('QUICK', 'preferred_approach', 1, 'hidden', NULL, 5000, 15),
('QUICK', 'approaches_not_of_interest', 1, 'hidden', NULL, 5000, 16),
('QUICK', 'industry_segment_id', 1, 'optional', NULL, NULL, 17),
('QUICK', 'experience_countries', 1, 'optional', NULL, NULL, 18),
('QUICK', 'deliverables_list', 1, 'required', NULL, NULL, 19),
('QUICK', 'submission_guidelines', 1, 'optional', NULL, 3000, 20),
-- === QUICK MODE — Step 2: Evaluation ===
('QUICK', 'weighted_criteria', 2, 'required', NULL, NULL, 1),
-- === QUICK MODE — Step 3: Rewards ===
('QUICK', 'reward_type', 3, 'required', NULL, NULL, 1),
('QUICK', 'reward_description', 3, 'optional', NULL, 2000, 2),
('QUICK', 'currency_code', 3, 'required', NULL, NULL, 3),
('QUICK', 'platinum_award', 3, 'required', NULL, NULL, 4),
('QUICK', 'gold_award', 3, 'required', NULL, NULL, 5),
('QUICK', 'silver_award', 3, 'optional', NULL, NULL, 6),
('QUICK', 'num_rewarded_solutions', 3, 'required', NULL, NULL, 7),
('QUICK', 'effort_level', 3, 'optional', NULL, NULL, 8),
('QUICK', 'rejection_fee_pct', 3, 'required', NULL, NULL, 9),
('QUICK', 'payment_mode', 3, 'hidden', NULL, NULL, 10),
('QUICK', 'payment_milestones', 3, 'hidden', NULL, NULL, 11),
('QUICK', 'ip_model', 3, 'auto', NULL, NULL, 12),
-- === QUICK MODE — Step 4: Timeline ===
('QUICK', 'submission_deadline', 4, 'optional', NULL, NULL, 1),
('QUICK', 'expected_timeline', 4, 'optional', NULL, 200, 2),
('QUICK', 'review_duration', 4, 'hidden', NULL, NULL, 3),
('QUICK', 'phase_notes', 4, 'hidden', NULL, 2000, 4),
('QUICK', 'phase_durations', 4, 'optional', NULL, NULL, 5),
('QUICK', 'complexity_notes', 4, 'optional', NULL, 2000, 6),
('QUICK', 'complexity_params', 4, 'hidden', NULL, NULL, 7),
-- === QUICK MODE — Step 5: Provider Eligibility ===
('QUICK', 'eligible_participation_modes', 5, 'optional', NULL, NULL, 1),
('QUICK', 'solver_eligibility_id', 5, 'optional', NULL, NULL, 2),
('QUICK', 'solver_eligibility_ids', 5, 'optional', NULL, NULL, 3),
('QUICK', 'challenge_visibility', 5, 'required', NULL, NULL, 4),
('QUICK', 'challenge_enrollment', 5, 'required', NULL, NULL, 5),
('QUICK', 'challenge_submission', 5, 'required', NULL, NULL, 6),
('QUICK', 'required_expertise_level_id', 5, 'hidden', NULL, NULL, 7),
('QUICK', 'required_proficiencies', 5, 'hidden', NULL, NULL, 8),
('QUICK', 'required_sub_domains', 5, 'hidden', NULL, NULL, 9),
('QUICK', 'required_specialities', 5, 'hidden', NULL, NULL, 10),
('QUICK', 'eligibility', 5, 'required', NULL, 2000, 11),
('QUICK', 'permitted_artifact_types', 5, 'optional', NULL, NULL, 12),
('QUICK', 'submission_template_url', 5, 'hidden', NULL, NULL, 13),
('QUICK', 'targeting_filters', 5, 'hidden', NULL, NULL, 14),
-- === QUICK MODE — Step 6: Templates ===
('QUICK', 'solution_category_description', 6, 'optional', NULL, 2000, 1),

-- === STRUCTURED MODE — Step 1: Challenge Brief ===
('STRUCTURED', 'title', 1, 'required', 1, 200, 1),
('STRUCTURED', 'hook', 1, 'optional', NULL, 300, 2),
('STRUCTURED', 'description', 1, 'optional', NULL, 2000, 3),
('STRUCTURED', 'problem_statement', 1, 'required', 300, 5000, 4),
('STRUCTURED', 'scope', 1, 'required', 150, 3000, 5),
('STRUCTURED', 'domain_tags', 1, 'required', NULL, NULL, 6),
('STRUCTURED', 'taxonomy_tags', 1, 'optional', NULL, 500, 7),
('STRUCTURED', 'maturity_level', 1, 'required', NULL, NULL, 8),
('STRUCTURED', 'context_background', 1, 'optional', NULL, 5000, 9),
('STRUCTURED', 'detailed_description', 1, 'optional', NULL, 5000, 10),
('STRUCTURED', 'root_causes', 1, 'optional', NULL, 5000, 11),
('STRUCTURED', 'affected_stakeholders', 1, 'optional', NULL, 5000, 12),
('STRUCTURED', 'current_deficiencies', 1, 'optional', NULL, 5000, 13),
('STRUCTURED', 'expected_outcomes', 1, 'optional', NULL, 5000, 14),
('STRUCTURED', 'preferred_approach', 1, 'optional', NULL, 5000, 15),
('STRUCTURED', 'approaches_not_of_interest', 1, 'optional', NULL, 5000, 16),
('STRUCTURED', 'industry_segment_id', 1, 'optional', NULL, NULL, 17),
('STRUCTURED', 'experience_countries', 1, 'optional', NULL, NULL, 18),
('STRUCTURED', 'deliverables_list', 1, 'required', NULL, NULL, 19),
('STRUCTURED', 'submission_guidelines', 1, 'optional', NULL, 3000, 20),
-- === STRUCTURED MODE — Step 2: Evaluation ===
('STRUCTURED', 'weighted_criteria', 2, 'required', NULL, NULL, 1),
-- === STRUCTURED MODE — Step 3: Rewards ===
('STRUCTURED', 'reward_type', 3, 'required', NULL, NULL, 1),
('STRUCTURED', 'reward_description', 3, 'optional', NULL, 2000, 2),
('STRUCTURED', 'currency_code', 3, 'required', NULL, NULL, 3),
('STRUCTURED', 'platinum_award', 3, 'required', NULL, NULL, 4),
('STRUCTURED', 'gold_award', 3, 'required', NULL, NULL, 5),
('STRUCTURED', 'silver_award', 3, 'optional', NULL, NULL, 6),
('STRUCTURED', 'num_rewarded_solutions', 3, 'required', NULL, NULL, 7),
('STRUCTURED', 'effort_level', 3, 'optional', NULL, NULL, 8),
('STRUCTURED', 'rejection_fee_pct', 3, 'required', NULL, NULL, 9),
('STRUCTURED', 'payment_mode', 3, 'required', NULL, NULL, 10),
('STRUCTURED', 'payment_milestones', 3, 'required', NULL, NULL, 11),
('STRUCTURED', 'ip_model', 3, 'required', NULL, NULL, 12),
-- === STRUCTURED MODE — Step 4: Timeline ===
('STRUCTURED', 'submission_deadline', 4, 'required', NULL, NULL, 1),
('STRUCTURED', 'expected_timeline', 4, 'optional', NULL, 200, 2),
('STRUCTURED', 'review_duration', 4, 'optional', NULL, NULL, 3),
('STRUCTURED', 'phase_notes', 4, 'optional', NULL, 2000, 4),
('STRUCTURED', 'phase_durations', 4, 'required', NULL, NULL, 5),
('STRUCTURED', 'complexity_notes', 4, 'optional', NULL, 2000, 6),
('STRUCTURED', 'complexity_params', 4, 'required', NULL, NULL, 7),
-- === STRUCTURED MODE — Step 5: Provider Eligibility ===
('STRUCTURED', 'eligible_participation_modes', 5, 'required', NULL, NULL, 1),
('STRUCTURED', 'solver_eligibility_id', 5, 'optional', NULL, NULL, 2),
('STRUCTURED', 'solver_eligibility_ids', 5, 'required', NULL, NULL, 3),
('STRUCTURED', 'challenge_visibility', 5, 'required', NULL, NULL, 4),
('STRUCTURED', 'challenge_enrollment', 5, 'required', NULL, NULL, 5),
('STRUCTURED', 'challenge_submission', 5, 'required', NULL, NULL, 6),
('STRUCTURED', 'required_expertise_level_id', 5, 'optional', NULL, NULL, 7),
('STRUCTURED', 'required_proficiencies', 5, 'optional', NULL, NULL, 8),
('STRUCTURED', 'required_sub_domains', 5, 'optional', NULL, NULL, 9),
('STRUCTURED', 'required_specialities', 5, 'optional', NULL, NULL, 10),
('STRUCTURED', 'eligibility', 5, 'required', NULL, 2000, 11),
('STRUCTURED', 'permitted_artifact_types', 5, 'required', NULL, NULL, 12),
('STRUCTURED', 'submission_template_url', 5, 'optional', NULL, NULL, 13),
('STRUCTURED', 'targeting_filters', 5, 'optional', NULL, NULL, 14),
-- === STRUCTURED MODE — Step 6: Templates ===
('STRUCTURED', 'solution_category_description', 6, 'optional', NULL, 2000, 1),

-- === CONTROLLED MODE — Step 1: Challenge Brief ===
('CONTROLLED', 'title', 1, 'required', 1, 200, 1),
('CONTROLLED', 'hook', 1, 'required', NULL, 300, 2),
('CONTROLLED', 'description', 1, 'required', NULL, 2000, 3),
('CONTROLLED', 'problem_statement', 1, 'required', 500, 5000, 4),
('CONTROLLED', 'scope', 1, 'required', 200, 3000, 5),
('CONTROLLED', 'domain_tags', 1, 'required', NULL, NULL, 6),
('CONTROLLED', 'taxonomy_tags', 1, 'optional', NULL, 500, 7),
('CONTROLLED', 'maturity_level', 1, 'required', NULL, NULL, 8),
('CONTROLLED', 'context_background', 1, 'required', NULL, 5000, 9),
('CONTROLLED', 'detailed_description', 1, 'required', NULL, 5000, 10),
('CONTROLLED', 'root_causes', 1, 'required', NULL, 5000, 11),
('CONTROLLED', 'affected_stakeholders', 1, 'required', NULL, 5000, 12),
('CONTROLLED', 'current_deficiencies', 1, 'required', NULL, 5000, 13),
('CONTROLLED', 'expected_outcomes', 1, 'required', NULL, 5000, 14),
('CONTROLLED', 'preferred_approach', 1, 'optional', NULL, 5000, 15),
('CONTROLLED', 'approaches_not_of_interest', 1, 'optional', NULL, 5000, 16),
('CONTROLLED', 'industry_segment_id', 1, 'required', NULL, NULL, 17),
('CONTROLLED', 'experience_countries', 1, 'required', NULL, NULL, 18),
('CONTROLLED', 'deliverables_list', 1, 'required', NULL, NULL, 19),
('CONTROLLED', 'submission_guidelines', 1, 'required', NULL, 3000, 20),
-- === CONTROLLED MODE — Step 2: Evaluation ===
('CONTROLLED', 'weighted_criteria', 2, 'required', NULL, NULL, 1),
-- === CONTROLLED MODE — Step 3: Rewards ===
('CONTROLLED', 'reward_type', 3, 'required', NULL, NULL, 1),
('CONTROLLED', 'reward_description', 3, 'required', NULL, 2000, 2),
('CONTROLLED', 'currency_code', 3, 'required', NULL, NULL, 3),
('CONTROLLED', 'platinum_award', 3, 'required', NULL, NULL, 4),
('CONTROLLED', 'gold_award', 3, 'required', NULL, NULL, 5),
('CONTROLLED', 'silver_award', 3, 'required', NULL, NULL, 6),
('CONTROLLED', 'num_rewarded_solutions', 3, 'required', NULL, NULL, 7),
('CONTROLLED', 'effort_level', 3, 'required', NULL, NULL, 8),
('CONTROLLED', 'rejection_fee_pct', 3, 'required', NULL, NULL, 9),
('CONTROLLED', 'payment_mode', 3, 'required', NULL, NULL, 10),
('CONTROLLED', 'payment_milestones', 3, 'required', NULL, NULL, 11),
('CONTROLLED', 'ip_model', 3, 'required', NULL, NULL, 12),
-- === CONTROLLED MODE — Step 4: Timeline ===
('CONTROLLED', 'submission_deadline', 4, 'required', NULL, NULL, 1),
('CONTROLLED', 'expected_timeline', 4, 'required', NULL, 200, 2),
('CONTROLLED', 'review_duration', 4, 'required', NULL, NULL, 3),
('CONTROLLED', 'phase_notes', 4, 'optional', NULL, 2000, 4),
('CONTROLLED', 'phase_durations', 4, 'required', NULL, NULL, 5),
('CONTROLLED', 'complexity_notes', 4, 'optional', NULL, 2000, 6),
('CONTROLLED', 'complexity_params', 4, 'required', NULL, NULL, 7),
-- === CONTROLLED MODE — Step 5: Provider Eligibility ===
('CONTROLLED', 'eligible_participation_modes', 5, 'required', NULL, NULL, 1),
('CONTROLLED', 'solver_eligibility_id', 5, 'required', NULL, NULL, 2),
('CONTROLLED', 'solver_eligibility_ids', 5, 'required', NULL, NULL, 3),
('CONTROLLED', 'challenge_visibility', 5, 'required', NULL, NULL, 4),
('CONTROLLED', 'challenge_enrollment', 5, 'required', NULL, NULL, 5),
('CONTROLLED', 'challenge_submission', 5, 'required', NULL, NULL, 6),
('CONTROLLED', 'required_expertise_level_id', 5, 'required', NULL, NULL, 7),
('CONTROLLED', 'required_proficiencies', 5, 'required', NULL, NULL, 8),
('CONTROLLED', 'required_sub_domains', 5, 'required', NULL, NULL, 9),
('CONTROLLED', 'required_specialities', 5, 'required', NULL, NULL, 10),
('CONTROLLED', 'eligibility', 5, 'required', NULL, 2000, 11),
('CONTROLLED', 'permitted_artifact_types', 5, 'required', NULL, NULL, 12),
('CONTROLLED', 'submission_template_url', 5, 'required', NULL, NULL, 13),
('CONTROLLED', 'targeting_filters', 5, 'required', NULL, NULL, 14),
-- === CONTROLLED MODE — Step 6: Templates ===
('CONTROLLED', 'solution_category_description', 6, 'required', NULL, 2000, 1);
