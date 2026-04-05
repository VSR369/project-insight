

# Fix Creator Role — Schema, Field Rendering, Visual Separation, AI Review

## 5-Why Summary

1. **Form submit silently fails** — Zod schema validates hidden fields as required (e.g., `expected_outcomes.min(1)` in QUICK where it's hidden)
2. **Field name mismatch** — Schema uses `currency`/`budget_min`/`budget_max`, but `md_governance_field_rules` uses `currency_code`/`platinum_award`
3. **Wrong fields rendered per mode** — `EssentialDetailsTab` renders ~8 fields for ALL modes; should be 5/8/12
4. **Context tab shows for QUICK** — Should be hidden entirely
5. **No visual separation** — Config Panel and Form stack with no boundary
6. **`weighted_criteria` missing** — Not in schema, not in form, not in seed data
7. **`console.warn` violations** — DemoLoginPage lines 178, 184

## Changes (4 prompts from the uploaded plan)

### CR-1: Fix `creatorFormSchema.ts` (RC-1 + RC-2)

**File:** `src/components/cogniblend/creator/creatorFormSchema.ts`

- Rename `currency` to `currency_code`, `budget_min`/`budget_max` to `platinum_award` (single number)
- Add `weighted_criteria` field (array of `{name, weight}`, required for STRUCTURED+CONTROLLED, weights must total 100%)
- Add `deliverables_list` field (optional array)
- Make hidden fields truly optional with `.optional().default(...)` — `expected_outcomes`, `scope`, `maturity_level`, `ip_model` are optional+defaulted in QUICK
- QUICK: 5 required (title, problem_statement, domain_tags, currency_code, platinum_award)
- STRUCTURED: +3 required (scope, maturity_level, weighted_criteria) = 8
- CONTROLLED: +4 required (hook, context_background, ip_model, expected_timeline) = 12
- Update `CreatorFormValues` type to match new field names

**File:** `src/components/cogniblend/creator/creatorSeedContent.ts`
- Update seed data to use new field names (`currency_code`, `platinum_award`, add `weighted_criteria`)

**File:** `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`
- Update `defaultValues` to match new schema field names
- Update `buildPayload` to map `currency_code` → `currency`, `platinum_award` → budget fields

### CR-2: Fix field rendering (RC-3 + RC-4)

**File:** `src/components/cogniblend/creator/EssentialDetailsTab.tsx`
- Wrap ALL fields in `isFieldVisible()` consistently (maturity_level, expected_outcomes)
- Remove `expected_outcomes` from this tab (it's AI-drafted, not Creator-owned)
- Add `platinum_award` single number field (replacing budget_min/budget_max pair)

**File:** `src/components/cogniblend/creator/EssentialFieldRenderers.tsx`
- Replace budget_min/budget_max with single `platinum_award` number input
- Rename currency field to `currency_code`
- Add `weighted_criteria` section (delegates to new component)
- Wrap `maturity_level` in `isFieldVisible()` guard

**New file:** `src/components/cogniblend/creator/WeightedCriteriaEditor.tsx` (~80 lines)
- Simple list: criterion name + weight % inputs
- "Add criterion" button, remove button per row
- Shows total %, highlights red if not 100%
- Props: `control`, `isRequired`

**File:** `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`
- Hide Context tab for QUICK mode:
```
{governanceMode !== 'QUICK' && (
  <TabsTrigger value="context">...</TabsTrigger>
)}
```

### CR-3: Visual separation — Config Panel vs Form (RC-5 + RC-6)

**File:** `src/pages/cogniblend/ChallengeCreatePage.tsx`
- Wrap Configuration Panel in bordered card with "Step 1 -- Configure" label + GovernanceProfileBadge
- Add "Step 2 -- Create" label above the form with field count indicator
- Layout matches the wireframe from the uploaded document:

```text
+----------------------------------------------------------+
|  New Challenge                                            |
|                                                          |
|  +--- STEP 1 - CONFIGURE ---- [STRUCTURED] ------------+|
|  |  Industry Segment    [Healthcare v]                   ||
|  |  Governance Mode     [STRUCTURED v]                   ||
|  |  Engagement Model    [Aggregator v]                   ||
|  +-------------------------------------------------------+|
|                                                          |
|  STEP 2 - CREATE (8 required fields)                     |
|                                                          |
|  +- Essential Details -+- Additional Context -----------+|
|  |  Title *             |  (hidden for QUICK)            ||
|  |  Problem Statement * |                                ||
|  |  ...                 |                                ||
|  +------------------------------------------------------+|
|  | Fill Test | Save Draft | AI Review | Submit           ||
|  +------------------------------------------------------+|
+----------------------------------------------------------+
```

### CR-4: Align review fields + cleanup

**File:** `src/constants/creatorReviewFields.ts`
- Update field keys to match new schema: `currency` → `currency_code`, `budget_max` → `platinum_award`
- Add `weighted_criteria` to STRUCTURED and CONTROLLED lists
- Remove `ip_model` from STRUCTURED (it's optional there), keep in CONTROLLED

**File:** `src/pages/cogniblend/DemoLoginPage.tsx`
- Replace `console.warn` (lines 178, 184) with `logWarning()` from `@/lib/errorHandler`

## File Size Compliance

All files will stay under 200 lines:
- `creatorFormSchema.ts`: ~100 lines (schema + type)
- `EssentialDetailsTab.tsx`: ~95 lines
- `EssentialFieldRenderers.tsx`: ~120 lines
- `WeightedCriteriaEditor.tsx`: ~80 lines (NEW)
- `ChallengeCreatorForm.tsx`: ~190 lines (current 193, minor net change)
- `ChallengeCreatePage.tsx`: ~140 lines (current ~130, adding step labels)
- `DemoLoginPage.tsx`: ~360 lines (existing, only 2 lines changed)

## Execution Order

| # | What | Fixes | Why this order |
|---|------|-------|----------------|
| CR-1 | Schema fix | RC-1, RC-2 | Submit fails without this |
| CR-2 | Field rendering | RC-3, RC-4 | Depends on new schema fields |
| CR-3 | Visual separation | RC-5, RC-6 | Layout change, independent |
| CR-4 | Review fields + cleanup | Alignment | Final polish |

## Verification Checklist

- QUICK: Only 5 fields visible, no Context tab, submit works without filling scope/maturity/criteria
- STRUCTURED: 8 fields visible, Context tab optional, weighted_criteria editor works
- CONTROLLED: 12 fields visible, AI Review button says "Required", submit disabled until AI Review done
- No `console.warn` anywhere in modified files
- All files under 200 lines

