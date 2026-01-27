

# Fix: Competency Question Fallback Logic

## Problem

The current fallback logic (Lines 187-199) in `interviewKitGenerationService.ts` can mix questions from different industry segments:

```typescript
// Current fallback - DANGEROUS: ignores industry_segment_id
const { data: fallbackQuestions } = await supabase
  .from("interview_kit_questions")
  .select("id, question_text, expected_answer, competency_id")
  .eq("competency_id", competency.id)
  .eq("is_active", true)  // Missing industry filter!
  .limit(5);
```

This means a provider enrolled in **Technology** could receive competency questions designed for **Manufacturing**.

---

## Solution

Update the fallback query to **always filter by industry segment** while relaxing only the expertise level:

```typescript
// Updated fallback - maintains industry filter, relaxes expertise level
const { data: fallbackQuestions } = await supabase
  .from("interview_kit_questions")
  .select("id, question_text, expected_answer, competency_id")
  .eq("competency_id", competency.id)
  .eq("industry_segment_id", industrySegmentId)  // Keep industry filter
  .eq("is_active", true)
  .limit(5);
```

---

## File to Modify

| File | Lines | Change |
|------|-------|--------|
| `src/services/interviewKitGenerationService.ts` | 187-199 | Add `.eq("industry_segment_id", industrySegmentId)` to fallback query |

---

## Code Change

**Before (Lines 187-199):**
```typescript
// If no exact match, fallback to any questions for this competency
if (!questions || questions.length === 0) {
  const { data: fallbackQuestions, error: fallbackError } = await supabase
    .from("interview_kit_questions")
    .select("id, question_text, expected_answer, competency_id")
    .eq("competency_id", competency.id)
    .eq("is_active", true)
    .limit(5);

  if (!fallbackError && fallbackQuestions) {
    questions = fallbackQuestions;
  }
}
```

**After:**
```typescript
// If no exact match, fallback to same industry but any expertise level
if (!questions || questions.length === 0) {
  const { data: fallbackQuestions, error: fallbackError } = await supabase
    .from("interview_kit_questions")
    .select("id, question_text, expected_answer, competency_id")
    .eq("competency_id", competency.id)
    .eq("industry_segment_id", industrySegmentId)  // Always match industry
    .eq("is_active", true)
    .limit(5);

  if (!fallbackError && fallbackQuestions) {
    questions = fallbackQuestions;
  }
}
```

---

## Filtering Hierarchy (After Fix)

| Priority | Filter Applied | Result |
|----------|----------------|--------|
| 1st try | Industry + Expertise + Competency | Exact match (ideal) |
| Fallback | Industry + Competency (any expertise) | Same industry, different experience level |
| No match | Skip competency section | No questions shown for that competency |

---

## Expected Behavior After Fix

| Scenario | Before (Broken) | After (Fixed) |
|----------|-----------------|---------------|
| Technology enrollment, no Technology questions | Shows Manufacturing questions | Shows no questions (correct) |
| Manufacturing L2, no L2 questions available | Shows any level questions from any industry | Shows Manufacturing questions from any level |
| Exact match exists | Works correctly | Works correctly |

---

## Verification After Implementation

After the code change:
1. Clear existing data: `DELETE FROM interview_question_responses; DELETE FROM interview_evaluations;`
2. Test with an enrollment that has no exact industry+expertise match
3. Verify questions shown are always from the same industry segment

