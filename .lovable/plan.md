

# Unified Challenge Form: Dashboard View = New Challenge Layout

## Problem
The dashboard "View" action for CA/CR currently renders `ConversationalIntakeContent` in edit mode, but the pre-fill logic is incomplete. AM-submitted fields like `title`, `industry_segment_id`, `beneficiaries_mapping`, `budget_min/max` (range vs single amount), `expected_timeline`, `solution_expectations`, and `am_approval_required` are stored in the DB but have no corresponding fields in the `ConversationalIntakeContent` form. These AM-originated fields are silently dropped.

The user wants:
1. The exact same "New Challenge" layout (screenshot) for both create and view/edit
2. All AM data must appear — if a field exists in the DB payload but not in the hardcoded form, render it dynamically
3. No separate page layout for dashboard view

## Approach

### Single shared component with dynamic field rendering

Modify `ConversationalIntakeContent` to:

**A. Add missing AM fields to the form schema and UI:**
- `title` — Text input at the top (before "Describe your challenge")
- `industry_segment_id` — Industry segment dropdown (reuse `useIndustrySegmentOptions`)
- `beneficiaries_mapping` — Rich text field in the "Expand Challenge Details" collapsible
- `solution_expectations` — Rich text field (maps to AM's "What success looks like commercially")
- `budget_min` — Number input alongside `prize_amount` (show range: min–max)
- `expected_timeline` — Timeline urgency dropdown (1-3, 3-6, 6-12, 12+ months)

These fields render when the challenge data contains them (edit mode) or are available as optional fields in create mode.

**B. Dynamic field rendering for unknown `extended_brief` keys:**
In edit mode, after loading challenge data, iterate over `extended_brief` keys. Any key that doesn't match the 6 known fields (`context_background`, `root_causes`, `affected_stakeholders`, `scope_definition`, `preferred_approach`, `approaches_not_of_interest`) gets rendered as an additional textarea in the "Expand Challenge Details" section. This ensures no AM data is ever dropped.

**C. Pre-fill title from DB:**
The current pre-fill effect handles `problem_statement`, `scope`, `maturity_level`, `reward_structure`, `submission_deadline`, and `extended_brief`. Add pre-fill for `title`, `eligibility.industry_segment_id`, `phase_schedule.expected_timeline`, `reward_structure.budget_min`, and `scope` → `solution_expectations`.

**D. Update `useChallengeDetail` query:**
Add `title` to the select (already there) and ensure `eligibility` and `phase_schedule` are included in the query so the pre-fill logic can read `industry_segment_id` and `expected_timeline`.

## Files to Modify

| File | Change |
|---|---|
| `src/pages/cogniblend/ConversationalIntakePage.tsx` | Add `title`, `industry_segment_id`, `beneficiaries_mapping`, `solution_expectations`, `budget_min`, `expected_timeline` to schema + form + UI + pre-fill; add dynamic `extended_brief` renderer |
| `src/hooks/queries/useChallengeForm.ts` | Add `eligibility`, `phase_schedule` to the `useChallengeDetail` select clause |
| `src/pages/cogniblend/AMRequestViewPage.tsx` | No changes needed (already renders `ConversationalIntakeContent` in edit mode) |

## UI Layout (edit mode additions)

The form retains the exact screenshot layout. New fields are inserted contextually:

```text
[Title input]                          ← NEW (pre-filled from AM title)
[Template cards]
[Describe your challenge]              ← pre-filled from problem_statement
[Expected Outcomes]                    ← pre-filled from scope
[What do you need back? maturity]      ← pre-filled from maturity_level
[Industry Segment dropdown]            ← NEW (pre-filled from eligibility)
[Prize Amount / Budget Range]          ← enhanced: shows min–max if AM provided range
[Timeline Urgency dropdown]            ← NEW (pre-filled from phase_schedule)
[Submission Deadline]
[Supporting Files]
[▸ Expand Challenge Details]
  - Context & Background
  - Root Causes
  - Affected Stakeholders
  - Scope Definition
  - Preferred Approach
  - Approaches NOT of Interest
  - Beneficiaries Mapping          ← NEW
  - Solution Expectations          ← NEW
  - [Dynamic fields from extended_brief] ← NEW: any extra AM keys
[Update Challenge] [Go to Spec Review]
```

## Dynamic Field Rendering Detail

```typescript
// After known fields, render any extra extended_brief keys
const KNOWN_BRIEF_KEYS = new Set([
  'context_background', 'root_causes', 'affected_stakeholders',
  'scope_definition', 'preferred_approach', 'approaches_not_of_interest',
  'beneficiaries_mapping', 'solution_expectations', 'am_approval_required',
]);

// In the Expand section, after static fields:
{Object.entries(dynamicBriefFields).map(([key, value]) => (
  <ExpandField
    key={key}
    label={humanizeKey(key)}      // e.g. "custom_field" → "Custom Field"
    fieldName={`dynamic_${key}`}
    placeholder=""
    maxLength={2000}
    register={form.register}
    watchValue={form.watch(`dynamic_${key}`) ?? ''}
  />
))}
```

## Data Flow Summary

```text
AM submits SimpleIntakeForm
  → DB: challenges row (title, problem_statement, scope, reward_structure,
         eligibility, phase_schedule, extended_brief{...})

CA/CR clicks "View" on dashboard
  → /cogni/my-requests/:id/view
  → AMRequestViewPage renders ConversationalIntakeContent(mode="edit", challengeId=id)
  → useChallengeDetail fetches all fields
  → Pre-fill populates every form field including new ones
  → Dynamic renderer shows any extra extended_brief keys
  → User sees exact "New Challenge" layout, fully editable
  → "Update Challenge" saves back to DB
```

