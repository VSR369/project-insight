

# Interview Kit Tab Enhancements - Implementation Plan

## Summary

This plan addresses the following enhancements to the Interview Kit tab:

1. **Per-Question Actions**: Add Delete, Modify, and Add Custom Question capabilities
2. **Expected Response Display**: Show expected answer directly under Rating section (if configured)
3. **Fix Domain & Delivery Depth**: Ensure questions are correctly derived from Question Bank (already implemented but needs verification)
4. **Impact Analysis**: Ensure no disruption to existing functionality

---

## Current State Analysis

### What Exists (Working Correctly)

| Component | Status | Notes |
|-----------|--------|-------|
| `question_bank` table | ✓ | Has `usage_mode` ENUM with 'interview', 'both' values |
| `interview_question_responses` table | ✓ | Stores per-question ratings with FK to `interview_evaluations` |
| `interviewKitQuestionService.ts` | ✓ | Already queries `question_bank` with `usage_mode IN ('interview', 'both')` |
| `generateDomainQuestions()` | ✓ | Fetches from `question_bank` based on provider's specialities |
| `InterviewQuestionCard` | Needs Enhancement | Expected answer is in collapsible, not under Rating |

### What Needs Enhancement

1. **Expected Answer Display**: Currently in a collapsible button, should appear directly below Rating controls
2. **Per-Question Actions**: No edit/delete/add functionality exists
3. **Custom Question Support**: Database supports it (`question_source = 'proof_point'` can be extended), but UI doesn't support adding reviewer's own questions

---

## Database Impact Analysis

### Current `interview_question_responses` Schema

```typescript
{
  id: string;
  evaluation_id: string;        // FK to interview_evaluations
  question_source: string;      // 'interview_kit' | 'question_bank' | 'proof_point'
  question_id: string | null;   // FK to source table (nullable for custom)
  proof_point_id: string | null;
  question_text: string;        // Stored copy for audit trail
  expected_answer: string | null;
  rating: string | null;        // 'right' | 'wrong' | 'not_answered'
  comments: string | null;
  section_name: string;
  display_order: number;
  created_at, updated_at, created_by, updated_by
}
```

### Database Changes Required

**Add New Question Source Type**

We need to extend `question_source` to support reviewer-added questions:
- Add `'reviewer_custom'` as a valid question source value

Since `question_source` is a TEXT field with CHECK constraint, we need a migration:

```sql
-- Modify the CHECK constraint to allow 'reviewer_custom' source
ALTER TABLE interview_question_responses 
DROP CONSTRAINT IF EXISTS interview_question_responses_question_source_check;

ALTER TABLE interview_question_responses 
ADD CONSTRAINT interview_question_responses_question_source_check 
CHECK (question_source IN ('interview_kit', 'question_bank', 'proof_point', 'reviewer_custom'));
```

---

## Files to Modify

### 1. `src/components/reviewer/candidates/InterviewQuestionCard.tsx`

**Changes:**
- Move expected answer display from collapsible to directly under Rating controls
- Add action buttons: Edit Question, Delete Question
- Add props for `onDelete`, `onModify`
- Add state for edit mode
- Show "Reviewer Added" badge for custom questions

### 2. `src/components/reviewer/candidates/InterviewQuestionSection.tsx`

**Changes:**
- Add "Add Custom Question" button at section footer
- Pass delete/modify handlers to question cards
- Handle question reordering after delete

### 3. `src/hooks/queries/useInterviewKitSession.ts`

**Changes:**
- Add `useDeleteQuestionResponse` mutation
- Add `useModifyQuestionResponse` mutation  
- Add `useAddCustomQuestion` mutation
- Update session data after mutations

### 4. `src/components/reviewer/candidates/InterviewKitTabContent.tsx`

**Changes:**
- Add handlers for delete/modify/add operations
- Integrate with new mutations
- Show confirmation dialogs for destructive actions

### 5. `src/services/interviewKitQuestionService.ts`

**Verification Needed:**
- Confirm `generateDomainQuestions()` properly fetches from `question_bank`
- Add `expected_answer_guidance` field to domain questions (currently uses `correct_option` which is less helpful)

---

## Implementation Details

### A. Expected Answer Under Rating (Priority 1)

**Current UI Structure:**
```
[Question Header]
[Collapsible: Expected Answer] ← User wants this...
[Rating Controls]              ← ...moved below here
[Comments]
```

**New UI Structure:**
```
[Question Header]
[Action Buttons: Edit | Delete]
[Rating Controls]
[Expected Answer Panel]        ← Always visible if configured
[Comments]
```

### B. Per-Question Delete (Priority 2)

**Logic:**
1. Confirmation dialog: "Are you sure you want to delete this question?"
2. Delete from `interview_question_responses` table
3. Recalculate section scores
4. Update display order of remaining questions
5. Invalidate query cache

**Constraints:**
- Cannot delete if interview is already submitted (`evaluatedAt` is set)
- Minimum questions per section? (TBD - likely no minimum)

### C. Per-Question Modify (Priority 3)

**What Can Be Modified:**
- `question_text` - The question itself
- `expected_answer` - The expected answer guidance

**What Cannot Be Modified:**
- `question_source` - Maintain audit trail
- `question_id` - FK integrity
- `evaluation_id` - Session integrity

**Logic:**
1. Open inline edit mode or modal
2. Validate inputs (question text required, 1000 char limit)
3. Update record in `interview_question_responses`
4. Mark as modified (optional: add `is_modified` flag)

### D. Add Custom Question (Priority 4)

**UI Flow:**
1. Click "Add Question" button in section
2. Modal opens with:
   - Question Text (required, max 1000 chars)
   - Expected Answer (optional, max 500 chars)
   - Section dropdown (default: current section)
3. Validate and save to `interview_question_responses`
4. Question appears at end of section

**Database Insert:**
```typescript
{
  evaluation_id: currentEvaluation.id,
  question_source: 'reviewer_custom',
  question_id: null,
  proof_point_id: null,
  question_text: inputText,
  expected_answer: inputExpected || null,
  rating: null,  // Not rated yet
  comments: null,
  section_name: selectedSection,
  display_order: lastOrderInSection + 1,
}
```

---

## New Component: AddCustomQuestionDialog

```typescript
interface AddCustomQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionName: string;
  availableSections: string[];
  onAdd: (question: { questionText: string; expectedAnswer: string | null; sectionName: string }) => void;
  isAdding?: boolean;
}
```

---

## New Component: ModifyQuestionDialog

```typescript
interface ModifyQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: InterviewQuestionResponse;
  onSave: (updates: { questionText: string; expectedAnswer: string | null }) => void;
  isSaving?: boolean;
}
```

---

## Verification: Domain & Delivery Depth Questions

**Current Implementation in `generateDomainQuestions()`:**

```typescript
// Get provider's selected specialities
const specialitiesResult = await supabase
  .from("provider_specialities")
  .select("speciality_id")
  .eq("enrollment_id", enrollmentId)
  .eq("is_deleted", false);

// Query question_bank with correct filters
const questionsResult = await supabase
  .from("question_bank")
  .select("id, question_text, correct_option, options, speciality_id")
  .in("speciality_id", specialityIds)
  .in("usage_mode", ["interview", "both"])
  .eq("is_deleted", false)
  .limit(50);
```

**Issue Found:** The expected answer is constructed from `correct_option` which shows "Correct: Option X" - not ideal for interview context.

**Fix:** Use `expected_answer_guidance` field from `question_bank` instead:

```typescript
const questionsResult = await supabase
  .from("question_bank")
  .select("id, question_text, correct_option, options, speciality_id, expected_answer_guidance")
  .in("speciality_id", specialityIds)
  .in("usage_mode", ["interview", "both"])
  .eq("is_deleted", false)
  .eq("is_active", true)  // Add this filter
  .limit(50);

// Update expected answer mapping
expectedAnswer: q.expected_answer_guidance || 
  (q.options ? `Correct: Option ${(q.correct_option || 0) + 1}` : null),
```

---

## Impact Analysis

### Tables Affected

| Table | Operation | Impact |
|-------|-----------|--------|
| `interview_question_responses` | INSERT/UPDATE/DELETE | Direct manipulation for CRUD |
| `interview_evaluations` | READ | FK reference only, no changes |
| `question_bank` | READ | Only for domain question generation |
| `interview_kit_questions` | READ | Only for competency question generation |
| `proof_points` | READ | Only for proof point question generation |

### Existing Functionality Preserved

1. **Auto-save ratings**: No change, debounced save continues to work
2. **Score calculation**: Updates after delete/add operations
3. **Submit validation**: Still validates all questions are rated
4. **PDF export**: Includes all questions including custom ones
5. **Review notes**: Completely separate, no impact

### Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Deleting questions affects score calculation | Recalculate stats after delete |
| Custom questions not persisted correctly | Use same save logic as auto-generated |
| Edit race conditions | Optimistic updates with cache invalidation |
| Submitted interviews modified | Disable all actions if `evaluatedAt` is set |

---

## Testing Checklist

- [ ] Expected answer displays under Rating (not in collapsible)
- [ ] Delete button visible for each question
- [ ] Delete shows confirmation dialog
- [ ] Delete removes question and recalculates score
- [ ] Delete disabled after interview submitted
- [ ] Modify button opens edit mode
- [ ] Modify saves changes and updates display
- [ ] Add Custom Question button visible in each section
- [ ] Custom question appears with "Reviewer Added" badge
- [ ] Custom question can be rated and commented
- [ ] Domain questions come from `question_bank` with `usage_mode = interview/both`
- [ ] Domain questions show `expected_answer_guidance` when available
- [ ] All sections maintain correct question counts
- [ ] PDF export includes all question types

---

## Implementation Order

1. **Phase 1: Database Migration** - Add 'reviewer_custom' to question_source check constraint
2. **Phase 2: Expected Answer Display** - Move from collapsible to inline under Rating
3. **Phase 3: Delete Functionality** - Add delete mutation and UI
4. **Phase 4: Modify Functionality** - Add modify mutation and dialog
5. **Phase 5: Add Custom Question** - Add creation mutation and dialog
6. **Phase 6: Domain Questions Fix** - Use `expected_answer_guidance` field
7. **Phase 7: Testing** - Verify all acceptance criteria

---

## Files Summary

| Action | File |
|--------|------|
| CREATE | `src/components/reviewer/candidates/AddCustomQuestionDialog.tsx` |
| CREATE | `src/components/reviewer/candidates/ModifyQuestionDialog.tsx` |
| CREATE | `src/components/reviewer/candidates/DeleteQuestionConfirmDialog.tsx` |
| MODIFY | `src/components/reviewer/candidates/InterviewQuestionCard.tsx` |
| MODIFY | `src/components/reviewer/candidates/InterviewQuestionSection.tsx` |
| MODIFY | `src/components/reviewer/candidates/InterviewKitTabContent.tsx` |
| MODIFY | `src/hooks/queries/useInterviewKitSession.ts` |
| MODIFY | `src/services/interviewKitQuestionService.ts` |
| MODIFY | `src/components/reviewer/candidates/index.ts` |
| MIGRATE | Add 'reviewer_custom' to question_source constraint |

