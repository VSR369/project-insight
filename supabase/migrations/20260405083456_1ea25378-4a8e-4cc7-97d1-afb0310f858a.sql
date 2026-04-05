-- Fix QUICK: hide deliverables_list (no form renderer, wrong rule count)
UPDATE public.md_governance_field_rules SET visibility = 'hidden'
WHERE governance_mode = 'QUICK'
  AND field_key = 'deliverables_list'
  AND is_active = true;

-- Fix STRUCTURED: ip_model and expected_timeline should be optional, not required
UPDATE public.md_governance_field_rules SET visibility = 'optional'
WHERE governance_mode = 'STRUCTURED'
  AND field_key IN ('ip_model', 'expected_timeline')
  AND is_active = true;