

# Fix: Persist AI Refinement Content and Review State to Database

## Problem

When an AM/RQ user accepts an AI refinement in the SimpleIntakeForm:

1. **Refined content is only set in the form state** (`setValue`) — it is never saved to the database via the `useUpdateChallenge` mutation
2. **AI review state** (`aiReviews` with addressed flags) is never written back to the `ai_section_reviews` JSONB column
3. On navigation away and back, both the refined content and review statuses are lost

## Fix — File: `src/components/cogniblend/SimpleIntakeForm.tsx`

### Change 1: `handleAcceptRefinement` — Save content + reviews to DB

Currently (lines 311-327):
- Calls `setValue(formField, newContent)` — form-only, lost on navigation
- Updates `aiReviews` state in memory only

Fix: After updating form state, call `updateChallenge.mutate()` to persist both the refined field value AND the updated `ai_section_reviews` to the database. The field mapping is:

| sectionKey | DB column |
|---|---|
| `problem_statement` | `problem_statement` |
| `scope` | `scope` |
| `beneficiaries_mapping` | `extended_brief.beneficiaries_mapping` |

### Change 2: `handleMarkAddressed` — Persist review state

Currently (lines 333-338): Only updates local state. Fix: Also save the updated `ai_section_reviews` JSONB to the database.

### Change 3: Batch review handler — Persist review results

After receiving batch AI review results (line 299), save them to `ai_section_reviews` in the database so they survive navigation.

### Change 4: `handleSingleSectionReview` — Persist re-review results

Same pattern: after updating local state, write to DB.

## Technical Details

All four handlers will use the existing `useUpdateChallenge` mutation. The `updateChallenge` ref needs to be accessible from the component body (it already is — declared at line ~270 area).

For `beneficiaries_mapping`, since it lives in `extended_brief` JSONB, the update payload will merge with existing `extended_brief`:
```typescript
const payload = sectionKey === 'beneficiaries_mapping'
  ? { extended_brief: { ...existingChallenge?.extended_brief, beneficiaries_mapping: newContent }, ai_section_reviews: updatedReviews }
  : { [dbColumn]: newContent, ai_section_reviews: updatedReviews };
updateChallenge.mutate({ challengeId, payload });
```

**Files modified**: 1 (`src/components/cogniblend/SimpleIntakeForm.tsx`)
**No database changes needed** — `ai_section_reviews` column already exists.

