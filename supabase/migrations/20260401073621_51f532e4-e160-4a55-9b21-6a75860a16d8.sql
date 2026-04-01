UPDATE md_governance_field_rules 
SET visibility = 'hidden', updated_at = NOW()
WHERE governance_mode = 'QUICK' AND field_key = 'scope';

UPDATE md_governance_field_rules 
SET visibility = 'required', updated_at = NOW()
WHERE governance_mode = 'QUICK' AND field_key = 'expected_outcomes';