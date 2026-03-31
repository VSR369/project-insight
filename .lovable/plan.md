

# Creator-Curator Format Alignment & Solution Maturity DB Integration

## Problem Analysis

Three issues need resolution:

### Issue 1: Solution Maturity — No DB Relationship
The `challenges.maturity_level` column stores a plain string (`BLUEPRINT`, `POC`, `PROTOTYPE`, `PILOT`). The new `md_solution_maturity` table exists but has no FK relationship. The creator form uses hardcoded `MATURITY_OPTIONS` (4 items with old codes) instead of fetching from `md_solution_maturity`.

### Issue 2: Creator → Curator Format Mismatches
The curator's `SECTION_FORMAT_CONFIG` defines the authoritative format for each section. Several creator form fields use the **wrong input format**, causing data shape mismatches when content flows to the curator:

| Creator Field | Creator Format | Curator Section | Curator Format | Status |
|---|---|---|---|---|
| `expected_outcomes` | RichTextEditor (string) | `expected_outcomes` | `line_items` (string[]) | **MISMATCH** |
| `affected_stakeholders` | RichTextEditor (string) | `affected_stakeholders` | `table` (columns: stakeholder_name, role, impact_description, adoption_challenge) | **MISMATCH** |
| `root_causes` | RichTextEditor (string) | `root_causes` | `line_items` (string[]) | **MISMATCH** |
| `current_deficiencies` | RichTextEditor (string) | `current_deficiencies` | `line_items` (string[]) | **MISMATCH** |
| `preferred_approach` | RichTextEditor (string) | `preferred_approach` | `line_items` (string[]) | **MISMATCH** |
| `approaches_not_of_interest` | RichTextEditor (string) | `approaches_not_of_interest` | `line_items` (string[]) | **MISMATCH** |
| `submission_guidelines` | Textarea (string) | `submission_guidelines` | `line_items` (string[]) | **MISMATCH** |
| `problem_statement` | RichTextEditor | `problem_statement` | `rich_text` | OK |
| `scope` | RichTextEditor | `scope` | `rich_text` | OK |
| `deliverables` | Numbered list (string[]) | `deliverables` | `line_items` | OK |
| `domain_tags` | Multi-select | `domain_tags` | `tag_input` | OK |
| `maturity_level` | Radio cards | `maturity_level` | `checkbox_single` | OK (single select) |

### Issue 3: No Documented Mapping Matrix
No centralized config maps creator fields to curator sections with format enforcement.

---

## Plan

### 1. Database Migration — FK + Solution Maturity Relationship

**Add FK column `solution_maturity_id` to `challenges` table:**

```sql
ALTER TABLE public.challenges
  ADD COLUMN solution_maturity_id UUID REFERENCES public.md_solution_maturity(id);

CREATE INDEX idx_challenges_solution_maturity ON public.challenges(solution_maturity_id);
```

The existing `maturity_level` string column is kept for backward compatibility (used by rate cards, legal docs, normalizer). A DB trigger or application logic will sync `solution_maturity_id` ↔ `maturity_level` code.

### 2. Creator Form — Fetch Solution Maturity from DB

**Modify `StepProblem.tsx`:**
- Remove hardcoded `MATURITY_OPTIONS` array
- Import `useSolutionMaturityList` hook
- Render radio cards dynamically from `md_solution_maturity` active records (ordered by `display_order`)
- Store `solution_maturity_id` (UUID) in form, derive `maturity_level` code on submit

**Modify `challengeFormSchema.ts`:**
- Change `maturity_level` from `z.enum([...])` to `z.string().min(1, 'Please select a maturity level')` (now stores the UUID)
- Add `solution_maturity_id` field

### 3. Fix Creator Format Mismatches (7 fields)

Replace RichTextEditor with format-appropriate inputs for these fields:

| Field | Change To | Component |
|---|---|---|
| `expected_outcomes` | Numbered line items (like deliverables) | Reuse deliverables-style drag list |
| `root_causes` | Numbered line items | Same drag list component |
| `current_deficiencies` | Numbered line items | Same drag list component |
| `preferred_approach` | Numbered line items | Same drag list component |
| `approaches_not_of_interest` | Numbered line items | Same drag list component |
| `submission_guidelines` | Numbered line items | Same drag list component |
| `affected_stakeholders` | Simplified structured entries | Name + Role + Impact fields per entry |

**Schema changes in `challengeFormSchema.ts`:**
- `expected_outcomes`: change from `z.string()` to `z.array(z.string()).default([''])`
- `root_causes`, `current_deficiencies`, `preferred_approach`, `approaches_not_of_interest`: same array pattern
- `submission_guidelines`: change to `z.array(z.string()).default([''])`
- `affected_stakeholders`: change to `z.array(z.object({ stakeholder_name, role, impact_description, adoption_challenge }))`

### 4. Update Submit/Save Hooks — Serialize in Curator-Compatible Format

**Modify `useSubmitSolutionRequest.ts` and `useSaveDraft`/`useUpdateDraft`:**
- `expected_outcomes`: save as `JSON.stringify({ items: arrayValues.map(v => ({ name: v })) })` (already partially done)
- Line item fields in `extended_brief`: save as JSON arrays instead of single strings
- `affected_stakeholders` in `extended_brief`: save as JSON array of row objects
- `submission_guidelines`: save as `JSON.stringify({ items: arrayValues.map(v => ({ name: v })) })`

### 5. Create Centralized Creator→Curator Mapping Config

**New file `src/lib/cogniblend/creatorCuratorFieldMap.ts`:**

A mapping matrix defining:
- Creator form field name → Curator section key
- Expected format (must match `SECTION_FORMAT_CONFIG`)
- DB column or JSONB path
- Serialization function

This becomes the authoritative reference for data flow between roles.

### 6. Extract Reusable Line Items Input Component

**New file `src/components/cogniblend/challenge-wizard/LineItemsInput.tsx`:**
- Drag-to-reorder numbered list (extracted from deliverables pattern in StepProblem)
- Props: `value: string[]`, `onChange`, `placeholder`, `label`, `minItems?`, `maxItems?`
- Reused by all 6 line-item fields

---

## Files Changed

| File | Action |
|---|---|
| `supabase/migrations/...` | Add `solution_maturity_id` FK column + index |
| `src/components/cogniblend/challenge-wizard/LineItemsInput.tsx` | **NEW** — reusable line items input |
| `src/components/cogniblend/challenge-wizard/StepProblem.tsx` | Fetch maturity from DB; replace RichTextEditor with line items for 6 fields; structured input for stakeholders |
| `src/components/cogniblend/challenge-wizard/challengeFormSchema.ts` | Update field types (string → array) for 6 fields; maturity_level to string UUID |
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | Serialize arrays in curator-compatible format |
| `src/lib/cogniblend/creatorCuratorFieldMap.ts` | **NEW** — authoritative mapping matrix |
| `src/integrations/supabase/types.ts` | Auto-updated after migration |

