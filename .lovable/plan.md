

# Alignment of Tech Specifications with Current System

## Executive Summary

After thorough analysis of the codebase, I found that **most specifications are already implemented** in the current system. The main gaps are:
1. **Radio button UX issue** - Shows "not allowed" cursor initially due to CSS styling
2. **Submit Interview functionality** - Not yet implemented (missing validation and rollup to `interview_bookings`)
3. **Comments character limit** - Not enforced (spec: 500 chars)

The system already uses the correct database tables and relationships. No new tables are needed.

---

## Current System vs Specifications Mapping

| Spec Section | Current Implementation | Status |
|--------------|------------------------|--------|
| **B1. Review Notes** | `ExpertiseReviewActions.tsx` - Uses `expertise_flag_for_clarification` and `expertise_reviewer_notes` on `provider_industry_enrollments` | Already implemented |
| **B1. Interview Questions** | `InterviewQuestionCard.tsx` - Rating + Comments with autosave | Missing validation constraints |
| **C. Scoring Logic** | `useInterviewKitEvaluation.ts` - Right=5, Wrong/NA=0 | Already implemented |
| **D. Data Pull** | Uses correct tables: `solution_providers`, `provider_industry_enrollments`, `question_bank`, `interview_kit_questions` | Already implemented |
| **E. Database** | Uses `interview_evaluations` + `interview_question_responses` (not `interview_sessions`) | Correct - different naming but same concept |

---

## Issues to Fix

### Issue 1: Radio Button "Not Allowed" Cursor (HIGH PRIORITY)

**Root Cause**: The `RadioGroupItem` in `radio-group.tsx` uses `disabled:cursor-not-allowed` styling. The parent `RadioGroup` receives `disabled={isUpdating}` which briefly activates during mutation state changes, causing a flash of disabled cursor.

**Current Code (Line 143-148 in InterviewQuestionCard.tsx)**:
```tsx
<RadioGroup
  value={ratingValue}
  onValueChange={handleRatingChange}
  className="flex flex-wrap gap-4"
  disabled={isUpdating}  // This causes the issue
>
```

**Solution**: Remove the `disabled` prop from `RadioGroup` and instead handle it at the button/indicator level, or use a local loading indicator instead of disabling the entire group.

### Issue 2: Submit Interview Not Implemented (MEDIUM PRIORITY)

**Current State**: `useUpdateEvaluation()` exists but:
- No "Submit Interview" button in the UI
- No validation check for "all questions rated"
- No rollup to `interview_bookings` table (which has `interview_score_percentage`, `interview_score_out_of_10`, etc.)

**Required Implementation**:
1. Add submit validation: "Please rate all questions before submitting"
2. Calculate scores:
   - `interview_percent = (earned_marks / max_marks) * 100`
   - `interview_score_10 = (earned_marks / max_marks) * 10` (1 decimal)
3. Update `interview_bookings` with rollup values
4. Show success toast: "Interview submitted successfully"

### Issue 3: Comments Character Limit (LOW PRIORITY)

**Current**: No `maxLength` prop on comments textarea
**Spec**: Max 500 characters

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/reviewer/interview-kit/InterviewQuestionCard.tsx` | 1. Remove `disabled={isUpdating}` from RadioGroup<br>2. Add `maxLength={500}` to Comments textarea<br>3. Add character counter for comments |
| `src/components/reviewer/interview-kit/InterviewKitFooter.tsx` | Add Submit Interview button with validation |
| `src/hooks/queries/useInterviewKitEvaluation.ts` | Add `useSubmitInterview()` mutation that:<br>- Validates all questions rated<br>- Calculates score<br>- Updates `interview_bookings` with rollup |

---

## Database Schema Alignment

The spec mentions `interview_sessions` but the current system uses equivalent tables:

| Spec Table | Current Table | Notes |
|------------|---------------|-------|
| `interview_sessions` | `interview_evaluations` | Same purpose, different name |
| `interview_session_responses` | `interview_question_responses` | Same purpose, different name |
| `flag_for_clarification` | `expertise_flag_for_clarification` on `provider_industry_enrollments` | Expertise tab canonical field |
| `reviewer_notes` | `expertise_reviewer_notes` on `provider_industry_enrollments` | Expertise tab canonical field |

**Score rollup columns exist on `interview_bookings`**:
- `interview_score_percentage`
- `interview_score_out_of_10`
- `interview_total_questions`
- `interview_correct_count`
- `interview_submitted_at`
- `interview_submitted_by`

---

## Implementation Details

### 1. Fix Radio Button Cursor Issue

```tsx
// InterviewQuestionCard.tsx - Line 143-148
// BEFORE:
<RadioGroup
  disabled={isUpdating}  // Remove this
>

// AFTER:
<RadioGroup
  value={ratingValue}
  onValueChange={handleRatingChange}
  className="flex flex-wrap gap-4"
>
  {/* Individual items handle their own visual state */}
```

### 2. Add Comments Character Limit

```tsx
// InterviewQuestionCard.tsx - Line 198-209
const MAX_COMMENTS_CHARS = 500;

<div className="space-y-2">
  <Label className="text-sm font-medium flex justify-between">
    <span>Comments</span>
    <span className="text-xs text-muted-foreground">
      {comments.length}/{MAX_COMMENTS_CHARS}
    </span>
  </Label>
  <Textarea
    placeholder="Add your assessment comments here... (optional)"
    value={comments}
    onChange={(e) => {
      if (e.target.value.length <= MAX_COMMENTS_CHARS) {
        setComments(e.target.value);
        setHasLocalChanges(true);
      }
    }}
    maxLength={MAX_COMMENTS_CHARS}
    className="min-h-[80px] resize-none"
  />
</div>
```

### 3. Add Submit Interview Mutation

```tsx
// useInterviewKitEvaluation.ts - New hook
interface SubmitInterviewParams {
  bookingId: string;
  evaluationId: string;
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  scoreOutOf10: number;
}

export function useSubmitInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SubmitInterviewParams) => {
      const userId = await getCurrentUserId();

      // Update interview_bookings with rollup
      const { error } = await supabase
        .from("interview_bookings")
        .update({
          interview_total_questions: params.totalQuestions,
          interview_correct_count: params.correctCount,
          interview_score_percentage: params.scorePercentage,
          interview_score_out_of_10: params.scoreOutOf10,
          interview_submitted_at: new Date().toISOString(),
          interview_submitted_by: userId,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq("id", params.bookingId);

      if (error) throw new Error(error.message);

      // Update evaluation with overall score
      const evalUpdates = await withUpdatedBy({
        overall_score: params.scoreOutOf10,
        outcome: params.scorePercentage >= 60 ? 'pass' : 'fail',
        evaluated_at: new Date().toISOString(),
      });

      await supabase
        .from("interview_evaluations")
        .update(evalUpdates)
        .eq("id", params.evaluationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-kit-evaluation"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-detail"] });
      toast.success("Interview submitted successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "submit_interview" });
    },
  });
}
```

### 4. Update Footer with Submit Button

```tsx
// InterviewKitFooter.tsx
export function InterviewKitFooter({ 
  allRated, 
  totalScore,
  maxScore,
  totalQuestions,
  correctCount,
  bookingId,
  evaluationId,
  onExport 
}: InterviewKitFooterProps) {
  const submitInterview = useSubmitInterview();
  
  const scorePercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const scoreOutOf10 = maxScore > 0 ? (totalScore / maxScore) * 10 : 0;

  const handleSubmit = () => {
    if (!allRated) {
      toast.error("Please rate all questions before submitting");
      return;
    }
    
    submitInterview.mutate({
      bookingId,
      evaluationId,
      totalQuestions,
      correctCount,
      scorePercentage,
      scoreOutOf10: Math.round(scoreOutOf10 * 10) / 10, // 1 decimal
    });
  };

  return (
    <div className="flex items-center justify-between pt-4 border-t">
      <div className="text-sm text-muted-foreground">
        {allRated 
          ? `Score: ${scoreOutOf10.toFixed(1)}/10 (${scorePercentage.toFixed(0)}%)`
          : "Complete all ratings to submit"}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!allRated}
          onClick={onExport}
        >
          <FileDown className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <Button
          size="sm"
          disabled={!allRated || submitInterview.isPending}
          onClick={handleSubmit}
        >
          {submitInterview.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Submit Interview
        </Button>
      </div>
    </div>
  );
}
```

---

## Specifications Marked as "Not Applicable"

| Spec Item | Reason |
|-----------|--------|
| `interview_sessions` table | System uses `interview_evaluations` - same purpose |
| "Delete note: set field to NULL" | Already implemented with empty string check |
| API endpoints (`GET /providers/{provider_id}/interview-kit`) | This is a SPA using Supabase directly, not REST APIs |
| F1-F4 API contracts | Not applicable - using React Query + Supabase |

---

## Toast Messages Alignment

| Action | Current | Spec | Status |
|--------|---------|------|--------|
| Question rating saved | Silent (no toast) | "Saved." | Optional - autosave is silent by design |
| Delete note | "Question removed" | "Note removed." | Adjust message |
| Submit success | "Evaluation submitted" | "Interview submitted successfully." | Update message |
| Validation failure | Not implemented | "Please rate all questions before submitting." | Add validation |

---

## Summary of Changes

### High Priority
1. Fix radio button cursor issue (remove `disabled` from RadioGroup)

### Medium Priority  
2. Add Submit Interview button with validation
3. Add `useSubmitInterview()` mutation
4. Update `interview_bookings` with score rollup

### Low Priority
5. Add comments character limit (500 chars)
6. Align toast messages with spec

### No Changes Needed
- Review Notes (already using canonical fields)
- Scoring logic (already correct: Right=5, Wrong/NA=0)
- Data pull logic (already using correct tables)
- Database relations (already correct)

