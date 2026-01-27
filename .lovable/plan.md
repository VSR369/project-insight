
# Interview Kit Bug Fix - Implementation Plan

## Confirmed Understanding

### Your Rules (Exactly Implemented)

| Rule | Implementation | Expected Result |
|------|----------------|-----------------|
| **1. Domain & Delivery Depth** | Max 10 random questions from `question_bank` filtered by provider's specialities, industry, expertise | **Max 10 questions** |
| **2. Competencies** | 1-2 random questions per competency from `interview_kit_questions` (5 competencies configured) | **5-10 questions** |
| **3. Proof Points** | 1-2 template-based questions per proof point using description | **4-8 questions** (4 proof points) |
| **4. Edit/Delete** | Already implemented in `EditQuestionDialog`, `DeleteQuestionConfirm` | ✅ Working |
| **5. Add New Question** | Already implemented in `AddQuestionDialog` with `question_source: 'reviewer_custom'` | ✅ Working |
| **6. Comments NOT mandatory** | No validation on comments field for Wrong/Not Answered | ✅ Already correct |
| **7. Expected Response** | Displayed from `expected_answer_guidance` (domain) or templates (proof points) | ✅ Already correct |

### Expected Total: **19-28 questions** (NOT 1824)

---

## Root Cause Analysis

### Bug #1: Domain Questions Fail Silently
**File:** `src/services/interviewKitGenerationService.ts` line 145
```typescript
// CURRENT (BROKEN)
.eq('is_deleted', false)  // ❌ Column doesn't exist in provider_specialities
```
**Result:** Query throws error, returns empty array → 0 domain questions

### Bug #2: Wrong `section_type` Stored
**Evidence:** Database shows `section_type: "Proof Points Deep-Dive"` (display name) instead of `"proof_point"` (enum value)
**Result:** UI grouping breaks, wrong section counts

### Bug #3: Massive Question Duplication
**Evidence:** 1824 identical copies of single proof point question
**Cause:** Generation mutation called 1824 times (likely React StrictMode, rapid clicks, or retry loop)

---

## Fix Implementation

### Step 1: Clean Corrupted Data (SQL)

```sql
-- Delete 1824 corrupted responses
DELETE FROM interview_question_responses 
WHERE evaluation_id = 'd30f121d-7327-485d-a864-26da899db24a';

-- Delete corrupted evaluation
DELETE FROM interview_evaluations 
WHERE id = 'd30f121d-7327-485d-a864-26da899db24a';
```

### Step 2: Fix Generation Service

**File:** `src/services/interviewKitGenerationService.ts`

#### Fix 2.1: Remove Invalid Column Filter (Line 145)
```typescript
// BEFORE (broken)
.eq('is_deleted', false);

// AFTER (fixed) - Column doesn't exist, remove filter
// No is_deleted column in provider_specialities table
```

#### Fix 2.2: Add Fallback for Empty Specialities
When provider has no selected specialities, query question_bank via proficiency area hierarchy:

```typescript
// NEW: Fallback function
async function fetchDomainQuestionsByIndustryLevel(
  industrySegmentId: string,
  expertiseLevelId: string
): Promise<QuestionBankRow[]> {
  // Query question_bank joined through specialities → sub_domains → proficiency_areas
  // Filter by industry_segment_id and expertise_level_id
  // Return up to 50 questions to select 10 from
}

// UPDATED: generateDomainQuestions()
export async function generateDomainQuestions(context: EnrollmentContext): Promise<GeneratedQuestion[]> {
  const specResult = await fetchProviderSpecialities(context.providerId, context.enrollmentId);
  
  let questionsPool;
  if (specResult && specResult.length > 0) {
    // Use provider's selected specialities
    questionsPool = await fetchDomainQuestionsFromBank(specResult.map(s => s.speciality_id));
  } else {
    // FALLBACK: Use all questions for this industry/level
    console.log('[InterviewKit] No specialities found, using industry/level fallback');
    questionsPool = await fetchDomainQuestionsByIndustryLevel(
      context.industrySegmentId, 
      context.expertiseLevelId
    );
  }
  
  // Shuffle and select max 10
  const shuffled = shuffleArray(questionsPool);
  return shuffled.slice(0, DOMAIN_QUESTION_MAX).map(/* ... */);
}
```

#### Fix 2.3: Add Debug Logging
```typescript
// In buildInterviewKit()
console.log('[InterviewKit] Generation Results:', {
  domain: domainQuestions.length,      // Expected: up to 10
  competency: competencyQuestions.length, // Expected: 5-10
  proofPoint: proofPointQuestions.length, // Expected: 4-8
  total: totalCount,                    // Expected: ~19-28
});
```

### Step 3: Strengthen Duplicate Prevention

**File:** `src/hooks/queries/useInterviewKit.ts`

#### Fix 3.1: Add Mutex for Generation
```typescript
// In useGenerateInterviewKit
export function useGenerateInterviewKit() {
  const queryClient = useQueryClient();
  const generatingRef = useRef(false);  // Add mutex

  return useMutation({
    mutationFn: async (params) => {
      // Prevent double execution
      if (generatingRef.current) {
        throw new Error('Generation already in progress');
      }
      generatingRef.current = true;
      
      try {
        // ... existing logic
      } finally {
        generatingRef.current = false;
      }
    },
  });
}
```

#### Fix 3.2: Improve UI Button Protection
```typescript
// In InterviewKitTabContent.tsx
// Already has disabled={generateKit.isPending} but ensure stable reference
const handleGenerateKit = useCallback(async () => {
  if (generateKit.isPending) return;  // Extra guard
  // ... rest
}, [generateKit.isPending, /* deps */]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/interviewKitGenerationService.ts` | Remove `is_deleted` filter, add fallback query, add debug logging |
| `src/hooks/queries/useInterviewKit.ts` | Add generation mutex to prevent duplicates |
| Database | Execute cleanup SQL to delete corrupted data |

---

## Expected Results After Fix

### Question Generation

| Section | Source | Count |
|---------|--------|-------|
| Domain & Delivery Depth | `question_bank` | **10** (max) |
| Solution Design & Architecture | `interview_kit_questions` | **1-2** |
| Execution & Governance | `interview_kit_questions` | **1-2** |
| Data/Tech Readiness | `interview_kit_questions` | **1-2** |
| Soft Skills | `interview_kit_questions` | **1-2** |
| Innovation & Co-creation | `interview_kit_questions` | **1-2** |
| Proof Points Deep-Dive | Template-based from 4 proof points | **4-8** |
| **TOTAL** | | **~19-28** |

### Score Display

For 25 questions: Max score = 25 × 5 = **125 points**
- Score header shows: `0/125` (not `0/9120`)
- Progress shows: `0/25 rated` (not `0/1824`)

---

## Validation Checklist

After implementation:

1. [ ] Delete corrupted evaluation from database (SQL)
2. [ ] Navigate to Interview Kit tab
3. [ ] Click "Generate Interview Kit" ONCE
4. [ ] Console shows: domain ~10, competency ~5-10, proofPoint ~4-8
5. [ ] UI shows 7 sections (1 domain + 5 competencies + 1 proof points)
6. [ ] Total questions: **~20-28** (not 1824)
7. [ ] Score header shows correct max (e.g., 0/125)
8. [ ] Each section shows correct question count
9. [ ] Edit/Delete/Add buttons work for all question types
10. [ ] Comments field has NO validation requirement

---

## Technical Summary

| Issue | Root Cause | Fix |
|-------|------------|-----|
| 0 domain questions | `is_deleted` column doesn't exist | Remove filter, add fallback |
| 0 competency questions | Domain failure blocked generation | Fix domain query |
| 1824 proof point copies | No mutex, called 1824 times | Add `generatingRef` mutex |
| Wrong section grouping | `section_type` stored as display name | Already correct in code, data corruption |
| Score 9120 | 1824 questions × 5 pts each | Fix question count |
