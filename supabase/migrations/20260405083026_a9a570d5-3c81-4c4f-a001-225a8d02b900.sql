UPDATE public.md_governance_field_rules
SET visibility = 'hidden'
WHERE governance_mode = 'QUICK'
  AND field_key = 'weighted_criteria';