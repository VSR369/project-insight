
# Interview Kit Questions Not Displaying - Fix Plan

## Root Cause Identified

**Data Mismatch**: The database contains 1,824 question records, but they are stored with incorrect `section_type` values:

| What Database Has | What Code Expects |
|-------------------|-------------------|
| `"Proof Points Deep-Dive"` | `"proof_point"` |
| (full display names) | (short enum values) |

The filtering logic in `useInterviewKitEvaluation.ts` lines 180-184 expects:
- `'domain'` for Domain & Delivery Depth questions
- `'proof_point'` for Proof Points Deep-Dive questions  
- `'competency'` for Competency questions

But the existing data has the full section names stored in `section_type`, causing all filters to return empty arrays.

---

## Solution: Two-Part Fix

### Part 1: Database Data Cleanup (SQL)

Clean up the corrupted data and regenerate fresh questions:

```sql
-- Delete all corrupted interview question responses 
DELETE FROM interview_question_responses;

-- Reset interview evaluations so questions regenerate fresh
DELETE FROM interview_evaluations;
```

This clears the corrupted data and allows the system to regenerate questions with correct `section_type` values.

### Part 2: Code Enhancement - Make Filtering More Robust

Update the filtering logic in `useInterviewKitEvaluation.ts` to handle both old and new data formats (defensive coding):

**File**: `src/hooks/queries/useInterviewKitEvaluation.ts`

**Changes at lines 179-189**:

```typescript
// Group questions by section - handle both old (full name) and new (enum) formats
const isDomainQuestion = (q: InterviewQuestionResponse) => 
  q.sectionType === 'domain' || q.sectionName === 'Domain & Delivery Depth';

const isProofPointQuestion = (q: InterviewQuestionResponse) =>
  q.sectionType === 'proof_point' || q.sectionName === 'Proof Points Deep-Dive';

const isCompetencyQuestion = (q: InterviewQuestionResponse) =>
  q.sectionType === 'competency' || 
  (!isDomainQuestion(q) && !isProofPointQuestion(q));

const domainQuestions = questions.filter(isDomainQuestion);
const proofPointQuestions = questions.filter(isProofPointQuestion);
const competencyQuestions = new Map<string, InterviewQuestionResponse[]>();

for (const q of questions.filter(isCompetencyQuestion)) {
  const key = q.sectionLabel || q.sectionName;
  const existing = competencyQuestions.get(key) || [];
  existing.push(q);
  competencyQuestions.set(key, existing);
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/queries/useInterviewKitEvaluation.ts` | Update filtering logic (lines 179-189) to be backward-compatible |

---

## Database Commands to Execute

Run in Supabase SQL Editor:

```sql
-- Clear corrupted question responses
DELETE FROM interview_question_responses;

-- Clear evaluations to trigger fresh generation
DELETE FROM interview_evaluations;
```

---

## Implementation Steps

1. **Modify filtering logic** in `useInterviewKitEvaluation.ts`:
   - Add helper functions to detect question types by either `section_type` OR `section_name`
   - This makes the code backward-compatible with any existing data

2. **User action**: Run the SQL cleanup commands in Supabase
   - This clears the 1,824 corrupted records
   - Next time the Interview Kit tab is opened, questions will regenerate correctly

3. **Verify**: After cleanup, new questions will be generated with correct `section_type` values like `'domain'`, `'proof_point'`, `'competency'`

---

## Why This Happened

The old implementation (which was deleted) stored `section_type` as the full display name instead of a short enum. The new implementation correctly uses enum values, but the existing data in the database was never cleaned up.

---

## Expected Outcome

After this fix:
- ✅ Existing corrupted data will be cleared
- ✅ New questions will generate with correct `section_type` values
- ✅ Questions will display properly in all sections:
  - Domain & Delivery Depth: Max 10 from question_bank
  - Proof Points Deep-Dive: 1-2 per proof point
  - Competencies: 1-2 per competency
- ✅ Filtering will work with both old and new data formats (defensive coding)
