

# Update Fill Test Data & Creator Form Format Alignment

## Problem
The 2-tab `ChallengeCreatorForm` and its seed data (`creatorSeedContent.ts`) were NOT updated during the format alignment work. They still use:
- `expected_outcomes` as a plain string (RichTextEditor) instead of `string[]` (line items)
- Hardcoded `MATURITY_OPTIONS` with old codes (`blueprint`, `poc`, `prototype`, `pilot`) instead of DB-driven `md_solution_maturity`
- Context fields (`root_causes`, `current_deficiencies`, `preferred_approach`, `approaches_not_of_interest`, `affected_stakeholders`) as plain strings instead of arrays/structured data
- `submission_guidelines` missing entirely

The wizard form (`challengeFormSchema.ts`) was updated, but the simplified Creator form was not.

## Plan

### 1. Update `ChallengeCreatorForm.tsx` Schema (`buildCreatorSchema`)
- Change `expected_outcomes` from `z.string()` to `z.array(z.string()).min(1)`
- Change `root_causes`, `current_deficiencies`, `preferred_approach`, `approaches_not_of_interest` from `z.string()` to `z.array(z.string()).default([''])`
- Change `affected_stakeholders` from `z.string()` to `z.array(z.object({...})).default([])`
- Change `maturity_level` from `z.enum([...])` to `z.string().min(1)` — stores the maturity code from DB
- Add `solution_maturity_id` field (UUID)
- Update `CreatorFormValues` type and default values accordingly

### 2. Update `EssentialDetailsTab.tsx`
- Remove hardcoded `MATURITY_OPTIONS`
- Import `useSolutionMaturityList` hook, render maturity radio cards dynamically from DB
- Replace `RichTextEditor` for `expected_outcomes` with `LineItemsInput` component

### 3. Update `AdditionalContextTab.tsx`
- Replace `RichTextEditor` for `root_causes`, `current_deficiencies`, `preferred_approach`, `approaches_not_of_interest` with `LineItemsInput`
- Replace `RichTextEditor` for `affected_stakeholders` with structured entry fields (name + role + impact + adoption challenge)

### 4. Update `creatorSeedContent.ts` — Seed Data
Convert all affected fields from strings to proper formats:
- `expected_outcomes`: `string` → `string[]` (split existing text into individual outcomes)
- `maturity_level`: keep code but ensure it matches DB codes (`SOLUTION_PROTOTYPE`, `SOLUTION_POC`, etc.)
- `root_causes`, `current_deficiencies`, `preferred_approach`, `approaches_not_of_interest`: `string` → `string[]`
- `affected_stakeholders`: `string` → `Array<{ stakeholder_name, role, impact_description, adoption_challenge }>`

### 5. Update Submit/Save Logic in `ChallengeCreatorForm.tsx`
- Serialize `expected_outcomes` as `{ items: [...] }` JSON for DB
- Serialize line-item context fields as JSON arrays in `extended_brief`
- Serialize `affected_stakeholders` as JSON array in `extended_brief`
- Map `solution_maturity_id` when submitting
- Update draft load logic to parse arrays back from DB

### 6. Update `SeedContent` Type
- Change type definition to match new array-based fields

---

## Files Changed

| File | Action |
|---|---|
| `src/components/cogniblend/creator/creatorSeedContent.ts` | Convert seed data fields to array formats |
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | Update schema, type, defaults, submit/draft logic |
| `src/components/cogniblend/creator/EssentialDetailsTab.tsx` | DB-driven maturity, LineItemsInput for outcomes |
| `src/components/cogniblend/creator/AdditionalContextTab.tsx` | LineItemsInput for 4 fields, structured stakeholders |

