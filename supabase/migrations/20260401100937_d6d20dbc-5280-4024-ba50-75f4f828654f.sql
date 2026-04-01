
-- Fix 6 governance field rule discrepancies identified in BA audit

-- 1. Expected Outcomes: STRUCTURED optional → required
UPDATE public.md_governance_field_rules
SET visibility = 'required', updated_at = now()
WHERE field_key = 'expected_outcomes' AND governance_mode = 'STRUCTURED';

-- 2. Gold Award: QUICK required → optional
UPDATE public.md_governance_field_rules
SET visibility = 'optional', updated_at = now()
WHERE field_key = 'gold_award' AND governance_mode = 'QUICK';

-- 3. Rejection Fee %: QUICK required → auto with default 10
UPDATE public.md_governance_field_rules
SET visibility = 'auto', default_value = '10', updated_at = now()
WHERE field_key = 'rejection_fee_pct' AND governance_mode = 'QUICK';

-- 4. Submission Deadline: QUICK optional → required
UPDATE public.md_governance_field_rules
SET visibility = 'required', updated_at = now()
WHERE field_key = 'submission_deadline' AND governance_mode = 'QUICK';

-- 5. Expected Timeline: QUICK optional → required
UPDATE public.md_governance_field_rules
SET visibility = 'required', updated_at = now()
WHERE field_key = 'expected_timeline' AND governance_mode = 'QUICK';

-- 6. Expected Timeline: STRUCTURED optional → required
UPDATE public.md_governance_field_rules
SET visibility = 'required', updated_at = now()
WHERE field_key = 'expected_timeline' AND governance_mode = 'STRUCTURED';
