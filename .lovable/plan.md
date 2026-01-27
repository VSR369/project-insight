
# Interview Kit - Domain & Delivery Depth Missing + Add Custom Question Issue

## Critical Analysis & Root Cause Investigation

### Executive Summary

After thorough analysis of the codebase, database schema, and service logic, I've identified **TWO critical bugs** causing the "Domain & Delivery Depth" section to be completely missing, plus verified the Add Custom Question functionality status.

---

## Root Cause Analysis (5-Why Approach)

### Issue 1: Domain & Delivery Depth Section Missing

**Symptom**: The "Domain & Delivery Depth" section is completely absent from the Interview Kit

**Investigation Path:**

| Layer | File | Finding |
|-------|------|---------|
| UI | `InterviewKitTabContent.tsx` | Renders sections from `sectionedQuestions` Map - OK |
| Hooks | `useInterviewKitSession.ts` | Calls `generateAllInterviewQuestions()` - OK |
| Service | `interviewKitQuestionService.ts` | Contains `generateDomainQuestions()` - **BUG FOUND** |
| Database | `provider_specialities` | No `is_deleted` column exists - **SCHEMA MISMATCH** |
| Database | `question_bank` | No `is_deleted` column exists - **SCHEMA MISMATCH** |

**Root Cause 1: Invalid `is_deleted` Filter on `provider_specialities`**

```typescript
// Line 67-68 in interviewKitQuestionService.ts - BROKEN
const specialitiesResult = await supabase
  .from("provider_specialities")
  .select("speciality_id")
  .eq("enrollment_id", enrollmentId)
  .eq("is_deleted", false);  // ❌ COLUMN DOES NOT EXIST
```

**Verified Schema:**
```text
provider_specialities columns:
- id (uuid) 
- provider_id (uuid)
- speciality_id (uuid)
- created_at (timestamp)
- enrollment_id (uuid)
⚠️ NO is_deleted column
```

**Result**: Query fails silently → Returns empty array → No domain questions generated

**Root Cause 2: Invalid `is_deleted` Filter on `question_bank`**

```typescript
// Line 84 in interviewKitQuestionService.ts - BROKEN
const questionsResult = await supabase
  .from("question_bank")
  .select("...")
  .in("speciality_id", specialityIds)
  .in("usage_mode", ["interview", "both"])
  .eq("is_deleted", false)  // ❌ COLUMN DOES NOT EXIST
  .eq("is_active", true)
```

**Verified Schema:**
```text
question_bank columns:
- id, speciality_id, question_text, options, correct_option
- is_active (boolean) ✓ EXISTS
- usage_mode (enum) ✓ EXISTS
- expected_answer_guidance (text) ✓ EXISTS
⚠️ NO is_deleted column
```

**Result**: Query fails → Returns no questions → "Domain & Delivery Depth" section empty

---

### Issue 2: Add Custom Question - Verification

**Status: UI Components Exist and Are Correctly Integrated**

| Component | Status | Notes |
|-----------|--------|-------|
| `AddCustomQuestionDialog.tsx` | ✓ Created | Fully implemented with validation |
| `InterviewQuestionSection.tsx` | ✓ Integrated | "Add Custom Question" button at line 141-151 |
| `InterviewKitTabContent.tsx` | ✓ Integrated | Handler and dialog state at lines 178-207 |
| `useAddCustomQuestion` hook | ✓ Exists | Mutation at lines 417-463 |

**However**: The Add Custom Question button **will not appear** if no questions exist in any section, because:
1. No sections are generated (due to Bug #1)
2. Without sections, the section loop doesn't render
3. Therefore, "Add Custom Question" buttons never appear

---

## Data Availability Analysis

| Data Source | Count | Status |
|-------------|-------|--------|
| `question_bank` (interview-eligible) | 10,800 | ✅ Rich data available |
| `interview_kit_questions` | 400 | ✅ Active competency questions |
| `provider_specialities` | 0 | ⚠️ No test data in DB |
| `proof_points` | 3+ | ✅ Some proof points exist |

**Important Note**: Even without provider_specialities data, the service should NOT crash. It should gracefully show "Proof Points Deep-Dive" and "Competency Questions" sections even if "Domain & Delivery Depth" has 0 questions.

---

## Complete Fix Implementation

### Fix 1: Remove Invalid `is_deleted` Filters from Question Service

**File**: `src/services/interviewKitQuestionService.ts`

**Changes Required:**

1. **Line 63-68**: Remove `.eq("is_deleted", false)` from provider_specialities query
2. **Line 79-86**: Remove `.eq("is_deleted", false)` from question_bank query

**Before:**
```typescript
// Line 63-68
const specialitiesResult = await supabase
  .from("provider_specialities")
  .select("speciality_id")
  .eq("enrollment_id", enrollmentId)
  .eq("is_deleted", false);  // REMOVE THIS

// Line 79-86
const questionsResult = await supabase
  .from("question_bank")
  .select("id, question_text, correct_option, options, speciality_id, expected_answer_guidance")
  .in("speciality_id", specialityIds)
  .in("usage_mode", ["interview", "both"])
  .eq("is_deleted", false)  // REMOVE THIS
  .eq("is_active", true)
```

**After:**
```typescript
// Line 63-67
const specialitiesResult = await supabase
  .from("provider_specialities")
  .select("speciality_id")
  .eq("enrollment_id", enrollmentId);
  // Removed: .eq("is_deleted", false) - column doesn't exist

// Line 78-84
const questionsResult = await supabase
  .from("question_bank")
  .select("id, question_text, correct_option, options, speciality_id, expected_answer_guidance")
  .in("speciality_id", specialityIds)
  .in("usage_mode", ["interview", "both"])
  .eq("is_active", true);
  // Removed: .eq("is_deleted", false) - column doesn't exist, is_active is sufficient
```

---

### Fix 2: Add "Create First Section" Option When No Questions Generated

When all three question sources return empty arrays, the UI should still allow the reviewer to add questions manually. This requires enhancing the "No Questions Available" state.

**File**: `src/components/reviewer/candidates/InterviewKitTabContent.tsx`

**Enhancement at lines 310-320:**

**Current behavior**: Shows static alert with no actions
**New behavior**: Shows alert with "Create Custom Interview" button that creates a default section

```typescript
// If no questions but booking exists, allow reviewer to add custom questions
if (!sessionData || sessionData.questions.length === 0) {
  return (
    <div className="space-y-4">
      <Alert>
        <ClipboardList className="h-4 w-4" />
        <AlertTitle>No Auto-Generated Questions</AlertTitle>
        <AlertDescription>
          No interview questions could be auto-generated for this candidate. 
          This may happen if the candidate hasn't selected specialities yet.
          You can still add custom interview questions manually.
        </AlertDescription>
      </Alert>
      
      {/* Allow adding custom section */}
      <Card className="border-dashed border-2">
        <CardContent className="p-6 text-center">
          <Button onClick={() => handleAddQuestion('Custom Interview Questions')}>
            <Plus className="h-4 w-4 mr-2" />
            Start Custom Interview
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Add your own interview questions to evaluate this candidate
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Fix 3: Ensure Default Section Exists for Custom Questions

**File**: `src/hooks/queries/useInterviewKitSession.ts`

When returning session data with no generated questions, ensure at least one default section exists in `sectionNames`:

```typescript
// After line 177, add fallback section
const sectionNames = Array.from(sectionNamesSet);

// Ensure at least one section exists for custom questions
if (sectionNames.length === 0) {
  sectionNames.push('Custom Interview Questions');
  sectionedQuestions.set('Custom Interview Questions', []);
}
```

---

## Impact Analysis

### Tables Affected

| Table | Operation | Change |
|-------|-----------|--------|
| `provider_specialities` | SELECT | Remove invalid filter |
| `question_bank` | SELECT | Remove invalid filter |
| `interview_question_responses` | No change | Already correct |

### Existing Functionality Preserved

| Feature | Impact | Risk Level |
|---------|--------|------------|
| Auto-save ratings | None | ✅ Safe |
| Score calculation | None | ✅ Safe |
| Submit validation | None | ✅ Safe |
| PDF export | None | ✅ Safe |
| Proof Points Deep-Dive | None | ✅ Safe |
| Competency Questions | None | ✅ Safe |
| Delete/Modify Question | None | ✅ Safe |
| Add Custom Question | Enhanced | ✅ Safe |

### Risk Mitigation

1. **Schema Validation**: Confirmed via direct DB queries - columns verified
2. **Soft Delete Semantics**: `is_active = false` is the correct filter for question_bank (already used)
3. **provider_specialities**: Has no soft-delete mechanism - direct records only

---

## Files to Modify

| File | Change Type | Lines |
|------|-------------|-------|
| `src/services/interviewKitQuestionService.ts` | Bug Fix | 67-68, 84 |
| `src/components/reviewer/candidates/InterviewKitTabContent.tsx` | Enhancement | 310-320 |
| `src/hooks/queries/useInterviewKitSession.ts` | Enhancement | 177-178 |

---

## Testing Checklist

After implementing fixes:

- [ ] Domain & Delivery Depth section appears when provider has specialities
- [ ] Proof Points Deep-Dive section appears when provider has proof points
- [ ] Competency sections appear based on industry/expertise level match
- [ ] "Add Custom Question" button visible in each section
- [ ] Custom questions can be added when no auto-generated questions exist
- [ ] All existing functionality (rating, delete, modify) continues to work
- [ ] PDF export includes all question types

---

## Summary of Changes

1. **CRITICAL BUG FIX**: Remove `.eq("is_deleted", false)` from `provider_specialities` query (column doesn't exist)
2. **CRITICAL BUG FIX**: Remove `.eq("is_deleted", false)` from `question_bank` query (column doesn't exist)  
3. **UX ENHANCEMENT**: Add fallback UI when no questions are generated to allow manual question creation
4. **UX ENHANCEMENT**: Ensure default section exists for custom questions even with empty data
