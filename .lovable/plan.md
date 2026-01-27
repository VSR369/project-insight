
# Fix: Radio Button Rating Delay in Interview Kit

## Problem

When clicking a radio button to rate a question, there's a ~2-9 second delay before the UI updates. The user expects instantaneous feedback.

## Root Cause Analysis

The `useUpdateQuestionRating()` mutation calls `queryClient.invalidateQueries()` on success, which triggers a **full refetch** of the `useInterviewKitEvaluation` query. This query performs:

1. `supabase.auth.getUser()` - Auth check
2. Query `panel_reviewers` - Reviewer lookup
3. Query `interview_evaluations` - Evaluation record
4. Query `interview_question_responses` - All questions (can be 20+ questions)
5. Map and process all data

This refetch takes 1-2+ seconds, causing the perceived delay.

## Solution: Optimistic Updates

Replace `invalidateQueries` with **optimistic cache updates** using `setQueryData`. The UI updates immediately, and the database update happens in the background.

---

## Technical Changes

### File: `src/hooks/queries/useInterviewKitEvaluation.ts`

#### Change 1: Add optimistic update in `useUpdateQuestionRating()`

Replace the current mutation pattern:

```typescript
// BEFORE (lines 335-361)
export function useUpdateQuestionRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, rating, comments }: UpdateRatingParams) => {
      const score = rating === 'right' ? 5 : 0;
      const updates = await withUpdatedBy({
        rating,
        score,
        ...(comments !== undefined && { comments }),
      });
      const { error } = await supabase
        .from("interview_question_responses")
        .update(updates)
        .eq("id", questionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-kit-evaluation"] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "update_question_rating" });
    },
  });
}
```

**With:**

```typescript
// AFTER - Optimistic Update Pattern
export function useUpdateQuestionRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, rating, comments }: UpdateRatingParams) => {
      const score = rating === 'right' ? 5 : 0;
      const updates = await withUpdatedBy({
        rating,
        score,
        ...(comments !== undefined && { comments }),
      });
      const { error } = await supabase
        .from("interview_question_responses")
        .update(updates)
        .eq("id", questionId);
      if (error) throw new Error(error.message);
      
      // Return the updated data for optimistic update
      return { questionId, rating, score, comments };
    },
    onMutate: async ({ questionId, rating, comments }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["interview-kit-evaluation"] });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ queryKey: ["interview-kit-evaluation"] });

      // Optimistically update the cache
      queryClient.setQueriesData(
        { queryKey: ["interview-kit-evaluation"] },
        (old: InterviewKitData | null | undefined) => {
          if (!old) return old;
          
          const score = rating === 'right' ? 5 : 0;
          const updatedQuestions = old.questions.map(q =>
            q.id === questionId
              ? { ...q, rating, score, comments: comments ?? q.comments }
              : q
          );
          
          // Recalculate stats
          const activeQuestions = updatedQuestions.filter(q => !q.isDeleted);
          const ratedQuestions = activeQuestions.filter(q => q.rating !== null);
          const totalScore = activeQuestions.reduce((sum, q) => sum + q.score, 0);
          const maxScore = activeQuestions.length * 5;

          // Also update grouped questions
          const domainQuestions = updatedQuestions.filter(q => 
            q.sectionType === 'domain' || q.sectionName === 'Domain & Delivery Depth'
          );
          const proofPointQuestions = updatedQuestions.filter(q =>
            q.sectionType === 'proof_point' || q.sectionName === 'Proof Points Deep-Dive'
          );
          
          return {
            ...old,
            questions: updatedQuestions,
            domainQuestions: domainQuestions.filter(q => !q.isDeleted),
            proofPointQuestions: proofPointQuestions.filter(q => !q.isDeleted),
            totalQuestions: activeQuestions.length,
            ratedQuestions: ratedQuestions.length,
            allRated: ratedQuestions.length === activeQuestions.length && activeQuestions.length > 0,
            totalScore,
            maxScore,
          };
        }
      );

      return { previousData };
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      handleMutationError(error, { operation: "update_question_rating" });
    },
    onSettled: () => {
      // Background refetch to ensure consistency (non-blocking)
      // Removed to prevent UI flicker - database is source of truth
      // queryClient.invalidateQueries({ queryKey: ["interview-kit-evaluation"] });
    },
  });
}
```

---

## How It Works

| Step | Before (Slow) | After (Fast) |
|------|---------------|--------------|
| 1. Click radio | Start mutation | Start mutation |
| 2. UI Update | Wait for DB | **Immediate** (cache update) |
| 3. DB Update | Execute | Execute (background) |
| 4. Refetch | Full query refetch | No refetch needed |
| 5. Total Time | ~2-9 seconds | ~50ms |

---

## Key Implementation Points

1. **`onMutate`**: Runs **before** the mutation, updates the cache immediately
2. **`previousData`**: Saved for rollback if the mutation fails
3. **`onError`**: Restores the previous cache state if DB update fails
4. **`onSettled`**: Could optionally refetch, but not needed here (cache is accurate)
5. **Score recalculation**: Done in-memory during optimistic update

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/queries/useInterviewKitEvaluation.ts` | Replace `invalidateQueries` with optimistic update pattern in `useUpdateQuestionRating()` |

---

## Testing Verification

1. Open Interview Kit tab
2. Click any rating radio button (Right/Wrong/Not Answered)
3. **Expected**: Immediate visual feedback (<100ms)
4. **Previous**: 2-9 second delay
5. Verify: Dashboard stats update instantly
6. Verify: Score counter updates instantly
7. Verify: If database error occurs, rating reverts to previous state
