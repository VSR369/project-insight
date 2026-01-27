
# Fix: Add New Question - CHECK Constraint Violation

## Root Cause Analysis

**Error**: `new row for relation "interview_question_responses" violates check constraint "interview_question_responses_question_source_check"`

**Database CHECK constraint allows**:
- `'interview_kit'`
- `'question_bank'`
- `'proof_point'`
- `'reviewer_custom'`

**Code is sending**: `'custom'`

The mismatch is in `useInterviewKitEvaluation.ts` line 473 where `question_source: 'custom'` is being inserted, but the database constraint expects `'reviewer_custom'`.

---

## Fix Required

### File: `src/hooks/queries/useInterviewKitEvaluation.ts`

**Change line 473**:

```typescript
// BEFORE (line 473)
question_source: 'custom' as const,

// AFTER
question_source: 'reviewer_custom' as const,
```

---

## Additional Type Updates Required

### File: `src/hooks/queries/useInterviewKitEvaluation.ts`

**Update the `InterviewQuestionResponse` interface (line 30)**:

```typescript
// BEFORE
questionSource: 'question_bank' | 'interview_kit' | 'proof_point' | 'custom';

// AFTER
questionSource: 'question_bank' | 'interview_kit' | 'proof_point' | 'reviewer_custom';
```

---

## Impact Assessment

| Location | Current Value | Fixed Value |
|----------|---------------|-------------|
| `useAddCustomQuestion` mutation (line 473) | `'custom'` | `'reviewer_custom'` |
| `InterviewQuestionResponse.questionSource` type (line 30) | includes `'custom'` | includes `'reviewer_custom'` |
| Question grouping logic | No change needed | Uses `sectionType`, not `questionSource` |
| Question card rendering | No change needed | Displays based on `sectionType` |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/queries/useInterviewKitEvaluation.ts` | Change `'custom'` to `'reviewer_custom'` in type definition and insert data |

---

## Testing Verification

After fix:
1. Open Interview Kit tab for any candidate
2. Click "Add Question" on any section
3. Enter question text (10+ characters)
4. Click "Add Question" button
5. **Expected**: Question is added successfully with toast "Question added"
6. **Previous behavior**: Error "Failed to add_custom_question"
