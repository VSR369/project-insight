

# Permanent Fix: Insert `solution_type` into `ai_review_section_config`

## Root Cause

The `ai_review_section_config` table has rows for all 29 curation sections except `solution_type`. When the edge function queries this table for `section_key = 'solution_type'`, it gets zero rows and returns a 400 validation error. The fallback logic added previously is a band-aid.

## Permanent Fix

Insert a proper `solution_type` row into `ai_review_section_config` with:

- **role_context**: `curation`
- **section_key**: `solution_type`
- **section_label**: `Solution Type`
- **importance_level**: `Critical` (foundational — drives deliverables, complexity, solver expertise)
- **wave_number**: `2` (Wave 2, after problem_statement/scope)
- **tab_group**: `Scope & Complexity`
- **tone**: `Formal`
- **min_words**: `10`, **max_words**: `100`
- **cross_references**: `["problem_statement", "scope", "deliverables", "context_and_background"]`
- **review_instructions**: Detailed instructions telling the AI to select from the 15 valid solution type codes, return a JSON array, cross-reference against scope and deliverables
- **dos/donts**: Guide the AI to select multiple types when justified, not to default to a single type
- **required_elements**: Selected codes must map to valid `md_solution_types` entries
- **example_good/example_poor**: Concrete examples of well-selected vs poorly-selected solution types
- **quality_criteria**: JSONB with coverage and consistency checks
- **platform_preamble**: Same shared preamble as other curation sections (copied from `complexity`)

## Steps

1. **Insert row** into `ai_review_section_config` using the data insert tool (not a migration — this is data, not schema)
2. **Optionally remove** the fallback logic added to the edge function (cleanup), or keep it as defense-in-depth for any future new sections

## Files Affected

- No code files need changing (the edge function already reads from this table)
- One data insert into `ai_review_section_config`

