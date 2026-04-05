

# Fix Field Rules for QUICK + STRUCTURED Governance

## What's needed
One SQL data update (not a schema change) to fix two issues:

1. **QUICK mode**: `deliverables_list` is still `required` in DB — should be `hidden` (no form renderer exists but the rule count is wrong)
2. **STRUCTURED mode**: `ip_model` and `expected_timeline` are `required` — should be `optional` (only 8 fields should be required, not 10)

Note: `weighted_criteria` for QUICK was already fixed in the previous migration.

## Change: SQL data update (3 lines)

Use the Supabase insert/update tool (not migration, since this is a data update):

```sql
UPDATE public.md_governance_field_rules SET visibility = 'hidden'
WHERE governance_mode = 'QUICK'
  AND field_key = 'deliverables_list'
  AND is_active = true;

UPDATE public.md_governance_field_rules SET visibility = 'optional'
WHERE governance_mode = 'STRUCTURED'
  AND field_key IN ('ip_model', 'expected_timeline')
  AND is_active = true;
```

## Result
- QUICK: 5 required fields (title, problem_statement, domain_tags, currency_code, platinum_award)
- STRUCTURED: 8 required fields (title, problem_statement, scope, domain_tags, maturity_level, weighted_criteria, currency_code, platinum_award)
- CONTROLLED: unchanged at 12

No TypeScript changes needed — the form reads visibility from the DB via `isFieldVisible()`.

