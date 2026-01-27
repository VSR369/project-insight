

# Fix: Interview KIT Form Data Loss on Tab Switch

## Problem Summary

When users open the "Add Question" dialog, enter data, tab away to another browser tab, and return, the dialog closes and all entered data is lost. They must re-enter everything.

---

## Root Cause Analysis

| Issue | Description | Impact |
|-------|-------------|--------|
| React Query Default Behavior | `refetchOnWindowFocus: true` triggers data refresh when tab regains focus | Causes component re-renders while dialog is open |
| Form Reset on Re-render | `useEffect` in form resets fields when `open` changes or dependencies update | User-entered data cleared on focus return |
| Missing Stability Guards | Unlike proof-points forms, no `refetchOnWindowFocus: false` configured | Queries refetch aggressively |

---

## Solution

### Fix 1: Add Stability Options to Query Hooks

**File:** `src/hooks/queries/useInterviewKitQuestions.ts`

Add `refetchOnWindowFocus: false` to prevent data refetching when the user returns to the tab. This follows the pattern established in `useProviderSelectedTaxonomy.ts` per project memory `memory/features/proof-point-ui-stability-logic`.

```typescript
// useInterviewKitCompetencies
export function useInterviewKitCompetencies(includeInactive = false) {
  return useQuery({
    queryKey: ["interview_kit_competencies", { includeInactive }],
    queryFn: async () => { ... },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,  // ADD: Prevent refetch on tab return
    refetchOnMount: false,        // ADD: Data already cached
  });
}

// useInterviewKitQuestions
export function useInterviewKitQuestions(filters: InterviewKitQuestionsFilter = {}) {
  return useQuery({
    queryKey: ["interview_kit_questions", filters],
    queryFn: async () => { ... },
    refetchOnWindowFocus: false,  // ADD: Prevent refetch during form entry
  });
}
```

### Fix 2: Stabilize Form Reset Logic

**File:** `src/pages/admin/interview-kit/InterviewKitQuestionForm.tsx`

The current `useEffect` resets the form on every `open` change. Add a ref to track if form was already initialized to prevent unnecessary resets.

**Current Code (lines 108-133):**
```typescript
useEffect(() => {
  if (open) {
    if (question) {
      form.reset({ ... });
    } else {
      form.reset({ ... });
    }
  }
}, [open, question, defaultCompetencyId, form]);
```

**Fixed Code:**
```typescript
import { useEffect, useRef } from "react";

// Add ref to track initialization
const hasInitializedRef = useRef(false);

useEffect(() => {
  // Only reset on INITIAL open, not on every render
  if (open && !hasInitializedRef.current) {
    hasInitializedRef.current = true;
    if (question) {
      form.reset({ ... });
    } else {
      form.reset({ ... });
    }
  }
  
  // Reset the flag when dialog closes
  if (!open) {
    hasInitializedRef.current = false;
  }
}, [open, question, defaultCompetencyId, form]);
```

### Fix 3: Add Form Stability Key

**File:** `src/pages/admin/interview-kit/InterviewKitQuestionsPage.tsx`

Add a stable key to the form component to prevent unnecessary remounts.

```typescript
// Add state to track form session
const [formSessionId, setFormSessionId] = useState(0);

// Update when intentionally opening form
const openAddForm = () => {
  setEditingQuestion(null);
  setFormSessionId((id) => id + 1);
  setFormOpen(true);
};

// In JSX
<InterviewKitQuestionForm
  key={`form-${formSessionId}-${editingQuestion?.id || 'new'}`}
  open={formOpen}
  onOpenChange={(open) => {
    setFormOpen(open);
    if (!open) setEditingQuestion(null);
  }}
  question={editingQuestion}
  defaultCompetencyId={competencyId}
/>
```

---

## Files Changed

| File | Changes |
|------|---------|
| `src/hooks/queries/useInterviewKitQuestions.ts` | Add `refetchOnWindowFocus: false` and `refetchOnMount: false` to both query hooks |
| `src/pages/admin/interview-kit/InterviewKitQuestionForm.tsx` | Add `hasInitializedRef` to prevent form reset on re-renders |
| `src/pages/admin/interview-kit/InterviewKitQuestionsPage.tsx` | Add stable key pattern for form component |

---

## Pattern Reference

This fix follows the established pattern from:
- **Memory:** `memory/features/proof-point-ui-stability-logic`
- **Memory:** `memory/features/assessment-ui-stability-governance`
- **File:** `src/hooks/queries/useProviderSelectedTaxonomy.ts` (lines 130-134)

---

## Testing Checklist

After implementation:
- [ ] Open "Add Question" dialog
- [ ] Fill in all fields with test data
- [ ] Tab away to another browser tab
- [ ] Wait 5+ seconds
- [ ] Tab back to the app
- [ ] Verify dialog is still open
- [ ] Verify all entered data is preserved
- [ ] Submit the form successfully

