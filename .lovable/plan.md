

# Audit: Section Format Config — Spec vs Implementation

## Discrepancies Found

| Section | Your Spec | Current Implementation | Issue |
|---------|-----------|----------------------|-------|
| `submission_guidelines` | `line_items` | `rich_text` | Wrong format |
| `expected_outcomes` | `line_items` | **Missing entirely** | Section not defined |
| `eligibility` | `checkbox_multi`, masterDataTable: `solver_profiles` | **Missing** (merged into `visibility_eligibility` as `rich_text`) | Wrong — should be separate checkbox section |
| `visibility` | `checkbox_multi`, masterDataTable: `visibility_options` | **Missing** (merged into `visibility_eligibility` as `rich_text`) | Wrong — should be separate checkbox section |
| `complexity` | `checkbox_single`, masterDataTable: `complexity_levels` | `custom` (no masterDataTable) | Wrong format, missing master data ref |
| `ip_model` | `checkbox_single`, masterDataTable: `ip_models` | `rich_text` (no masterDataTable) | Wrong format entirely |
| `reward_structure` | `table`, columns: `[prize_tier, amount, currency, payment_trigger]` | `structured_fields` (no columns) | Wrong format, missing columns |
| `evaluation_criteria` columns | `[parameter, weight_percent, scoring_type, evaluator_role]` | `[criterion_name, weight_percentage, scoring_type, evaluator_role]` | Column name mismatch (`parameter` vs `criterion_name`, `weight_percent` vs `weight_percentage`) |

## Sections NOT in Your Spec but Present in Code

| Section | Current Format | Action Needed |
|---------|---------------|---------------|
| `domain_tags` | `tag_input` | Not in spec — keep or remove? |
| `hook` | `rich_text` | Not in spec — keep or remove? |
| `extended_brief` | `custom` | Not in spec — keep or remove? |
| `challenge_visibility` | `select` | Not in spec — keep or remove? |
| `effort_level` | `radio` | Not in spec — keep or remove? |
| `visibility_eligibility` | `rich_text` | Should be split into `eligibility` + `visibility` per spec |

## Sections Correctly Implemented

| Section | Format | Status |
|---------|--------|--------|
| `problem_statement` | `rich_text` | Correct |
| `scope` | `rich_text` | Correct |
| `deliverables` | `line_items` | Correct |
| `maturity_level` | `checkbox_single` + masterDataTable | Correct |
| `legal_docs` | `table` + correct columns + aiCanDraft:false | Correct |
| `escrow_funding` | `structured_fields` + aiCanDraft:false | Correct |
| `phase_schedule` | `schedule_table` + correct columns | Correct |
| `submission_deadline` | `date` | Correct |

## Extra Format Types Not in Your Spec

Your spec defines 8 format types. The implementation has 4 extra: `select`, `radio`, `tag_input`, `custom`. These are used by sections not in your spec (`challenge_visibility`, `effort_level`, `domain_tags`, `extended_brief`, `complexity`).

## Proposed Fix

**File: `src/lib/cogniblend/curationSectionFormats.ts`**

1. Change `submission_guidelines` format from `rich_text` to `line_items`
2. Add `expected_outcomes` as `line_items` with `aiUsesContext: ['spec.expected_outcomes']`
3. Remove `visibility_eligibility` — replace with two separate entries:
   - `eligibility`: `checkbox_multi`, masterDataTable: `solver_profiles`
   - `visibility`: `checkbox_multi`, masterDataTable: `visibility_options`
4. Change `complexity` from `custom` to `checkbox_single`, add masterDataTable: `complexity_levels`
5. Change `ip_model` from `rich_text` to `checkbox_single`, add masterDataTable: `ip_models`
6. Change `reward_structure` from `structured_fields` to `table`, add columns: `[prize_tier, amount, currency, payment_trigger]`
7. Align `evaluation_criteria` column names to spec: `parameter`, `weight_percent`
8. Keep `domain_tags`, `hook`, `extended_brief`, `challenge_visibility`, `effort_level` as-is (they exist in the app but were not in the 16-section spec — removal would break existing functionality)

**File: `src/components/cogniblend/curation/renderers/CheckboxMultiSectionRenderer.tsx`** — New file for `checkbox_multi` format (master-data-driven multi-select checkboxes for eligibility/visibility)

**File: `src/hooks/cogniblend/useCurationMasterData.ts`** — Add `eligibilityOptions` and update complexity/ip_model to use master data tables

**File: `src/pages/cogniblend/CurationReviewPage.tsx`** — Update the section dispatcher switch to handle:
- `submission_guidelines` as line items instead of rich text
- `expected_outcomes` as new line items section
- `eligibility` and `visibility` as checkbox_multi (replacing `visibility_eligibility`)
- `complexity` and `ip_model` as checkbox_single with master data
- `reward_structure` as table with columns
- Corrected eval criteria column names

**File: `src/components/cogniblend/curation/renderers/index.ts`** — Export new `CheckboxMultiSectionRenderer`

