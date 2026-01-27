
# Interview Kit Bug Fix - Complete Resolution Plan

## 5-Why Analysis Summary

| Why | Question | Answer |
|-----|----------|--------|
| **1** | Why 1824 questions? | Generation was called 450+ times before mutex was added |
| **2** | Why wrong section_type? | The DATA is corrupted (duplicate calls), code is actually correct |
| **3** | Why 0 domain/competency? | Fallback query exists but corrupted eval blocks regeneration |
| **4** | Why blocked? | Existing corrupted evaluation triggers duplicate guard |
| **5** | Why not cleaned? | SQL provided but never executed; no UI mechanism to regenerate |

## Root Cause

The corrupted evaluation record (`d30f121d-7327-485d-a864-26da899db24a`) with 1824 proof point questions is blocking new generation. The code fixes are already in place but cannot take effect until the corrupted data is removed.

## Implementation Plan

### Phase 1: Database Cleanup

Execute SQL to remove corrupted data:

```sql
-- Delete 1824 corrupted responses
DELETE FROM interview_question_responses 
WHERE evaluation_id = 'd30f121d-7327-485d-a864-26da899db24a';

-- Delete corrupted evaluation
DELETE FROM interview_evaluations 
WHERE id = 'd30f121d-7327-485d-a864-26da899db24a';
```

### Phase 2: Add Auto-Generation on Tab Open

Per user preference, the Interview Kit should auto-generate when the tab opens (if not already generated).

**File: `src/components/reviewer/interview-kit/InterviewKitTabContent.tsx`**

Add a `useEffect` to trigger generation automatically when:
1. Tab is loaded (`kitData` is available)
2. Kit is NOT already generated (`!kitData.isGenerated`)
3. All required data is available (`bookingId`, `candidate`, `proofPointsData`)
4. Generation is not already in progress (`!generateKit.isPending`)

```typescript
// Add this useEffect after the existing hooks
useEffect(() => {
  // Auto-generate when tab opens if not already generated
  if (
    kitData &&
    !kitData.isGenerated &&
    bookingId &&
    candidate &&
    proofPointsData &&
    !generateKit.isPending &&
    !generateKit.isSuccess
  ) {
    console.log('[InterviewKit] Auto-generating on tab open...');
    generateKit.mutate({
      bookingId,
      context: {
        enrollmentId,
        industrySegmentId: candidate.industrySegmentId,
        expertiseLevelId: candidate.expertiseLevelId,
        providerId: candidate.providerId,
      },
      proofPoints: proofPointsData.proofPoints || [],
    });
  }
}, [kitData?.isGenerated, bookingId, candidate, proofPointsData, generateKit.isPending]);
```

### Phase 3: Add Regenerate Button (Optional Safety)

Add a "Regenerate" button that appears when the kit exists but may have issues. This deletes the existing evaluation and responses, then regenerates.

**File: `src/hooks/queries/useInterviewKit.ts`**

Add a new mutation `useRegenerateInterviewKit` that:
1. Deletes existing responses for the evaluation
2. Deletes the evaluation record
3. Triggers fresh generation

### Phase 4: Verify Generation Logic

The generation service code at `src/services/interviewKitGenerationService.ts` is already correct:

| Section | Source | Expected Count |
|---------|--------|----------------|
| Domain & Delivery Depth | `question_bank` via hierarchy fallback | **Max 10** |
| 5 Competencies | `interview_kit_questions` (100 questions exist) | **5-10** (1-2 each) |
| 4 Proof Points | Template-based from descriptions | **4-8** (1-2 each) |
| **TOTAL** | | **~19-28** |

## Technical Implementation Details

### File Changes

| File | Change |
|------|--------|
| `src/components/reviewer/interview-kit/InterviewKitTabContent.tsx` | Add `useEffect` for auto-generation on tab open |
| `src/hooks/queries/useInterviewKit.ts` | Add `useRegenerateInterviewKit` mutation (optional) |
| Database | Execute cleanup SQL |

### Auto-Generation Flow

```text
User opens Interview Kit tab
         ↓
useInterviewKitData fetches existing evaluation
         ↓
If kitData.isGenerated = false
         ↓
useEffect triggers generateKit.mutate()
         ↓
buildInterviewKit() generates:
  - 10 domain questions (from question_bank)
  - 5-10 competency questions (from interview_kit_questions)  
  - 4-8 proof point questions (from templates)
         ↓
Questions saved to interview_question_responses
         ↓
Query invalidated, UI refreshes with ~25 questions
```

### Section Type Grouping Fix

The UI groups questions by `section_type::section_name`. With correct data:
- `domain::Domain & Delivery Depth` (1 section)
- `competency::Solution Design & Architecture Thinking` (5 sections)
- `proof_point::Proof Points Deep-Dive` (1 section)

Total: **7 sections** displayed

## Verification Checklist

After implementation:

1. Execute cleanup SQL in Supabase SQL editor
2. Navigate to Interview Kit tab
3. Kit auto-generates on tab open (no button click needed)
4. Console shows: domain ~10, competency ~7, proofPoint ~6
5. UI shows 7 sections (1 domain + 5 competencies + 1 proof points)
6. Total questions: ~20-25
7. Score header shows correct max (e.g., 0/115)
8. Edit/Delete/Add buttons work for all sections
9. Comments field has NO validation requirement
10. Expected answer guidance shows for each question

## Expected Final Result

For this specific enrollment with:
- 4 proof points
- 5 competencies configured
- 2700 domain questions available

**Expected generation:**
- Domain & Delivery Depth: **10 questions**
- Solution Design & Architecture Thinking: **1-2 questions**
- Execution & Governance: **1-2 questions**
- Data/Tech Readiness & Tooling Awareness: **1-2 questions**
- Soft Skills for Solution Provider Success: **1-2 questions**
- Innovation & Co-creation Ability: **1-2 questions**
- Proof Points Deep-Dive: **4-8 questions**

**Total: ~20-25 questions** (not 1824)
