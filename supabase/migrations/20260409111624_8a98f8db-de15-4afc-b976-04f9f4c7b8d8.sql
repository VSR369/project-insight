-- =====================================================
-- Fix: Enforce 5-8-12 Creator field visibility rule
-- QUICK=5 required, STRUCTURED=8+2, CONTROLLED=12+6
-- =====================================================

-- Step 1: Reset ALL to hidden
UPDATE md_governance_field_rules SET visibility = 'hidden' WHERE governance_mode = 'QUICK';
UPDATE md_governance_field_rules SET visibility = 'hidden' WHERE governance_mode = 'STRUCTURED';
UPDATE md_governance_field_rules SET visibility = 'hidden' WHERE governance_mode = 'CONTROLLED';

-- ── QUICK MODE: 5 required ──
UPDATE md_governance_field_rules SET visibility = 'required'
WHERE governance_mode = 'QUICK'
  AND field_key IN ('title', 'problem_statement', 'domain_tags', 'currency_code', 'platinum_award');

-- QUICK auto-defaults
UPDATE md_governance_field_rules SET visibility = 'auto'
WHERE governance_mode = 'QUICK'
  AND field_key IN (
    'reward_type', 'challenge_visibility', 'challenge_enrollment',
    'challenge_submission', 'eligibility', 'maturity_level',
    'num_rewarded_solutions', 'gold_award', 'rejection_fee_pct', 'ip_model'
  );

-- ── STRUCTURED MODE: 8 required + 2 optional ──
UPDATE md_governance_field_rules SET visibility = 'required'
WHERE governance_mode = 'STRUCTURED'
  AND field_key IN (
    'title', 'problem_statement', 'scope', 'domain_tags',
    'currency_code', 'platinum_award', 'maturity_level', 'weighted_criteria'
  );

UPDATE md_governance_field_rules SET visibility = 'optional'
WHERE governance_mode = 'STRUCTURED'
  AND field_key IN ('context_background', 'expected_timeline');

-- STRUCTURED auto-defaults
UPDATE md_governance_field_rules SET visibility = 'auto'
WHERE governance_mode = 'STRUCTURED'
  AND field_key IN (
    'reward_type', 'challenge_visibility', 'challenge_enrollment',
    'challenge_submission', 'eligibility', 'num_rewarded_solutions',
    'gold_award', 'rejection_fee_pct', 'ip_model', 'deliverables_list'
  );

-- ── CONTROLLED MODE: 18 required ──
-- Essential tab (12)
UPDATE md_governance_field_rules SET visibility = 'required'
WHERE governance_mode = 'CONTROLLED'
  AND field_key IN (
    'title', 'problem_statement', 'scope', 'domain_tags',
    'currency_code', 'platinum_award', 'maturity_level', 'weighted_criteria',
    'hook', 'context_background', 'ip_model', 'expected_timeline'
  );

-- Additional Context tab (6)
UPDATE md_governance_field_rules SET visibility = 'required'
WHERE governance_mode = 'CONTROLLED'
  AND field_key IN (
    'preferred_approach', 'approaches_not_of_interest',
    'current_deficiencies', 'root_causes',
    'affected_stakeholders', 'expected_outcomes'
  );

-- CONTROLLED auto-defaults
UPDATE md_governance_field_rules SET visibility = 'auto'
WHERE governance_mode = 'CONTROLLED'
  AND field_key IN (
    'reward_type', 'challenge_visibility', 'challenge_enrollment',
    'challenge_submission', 'eligibility', 'num_rewarded_solutions',
    'gold_award', 'rejection_fee_pct', 'deliverables_list'
  );