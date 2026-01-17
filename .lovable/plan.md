# Fix: Allow Navigation to Completed Steps Regardless of Intermediate Step Status

## Problem Identified

When you're on the **Proof Points screen** (step 5), the **Expertise step** (step 4) shows as:
- Green circle (completed) - CORRECT
- But has "Complete previous step first" tooltip - CONFUSING
- May not be clickable in some cases - WRONG

**Root Cause**: The `isCompletedButBlocked` logic incorrectly blocks navigation to earlier completed steps when an intermediate step (like Organization) is incomplete.

### Current Logic (Flawed)
```typescript
const isCompletedButBlocked = isCompleted && !isAccessible;
```

Where `isAccessible` requires ALL preceding steps to be complete. This means:
- If you're in `org_rep` mode with pending org approval
- Step 3 (Organization) is not complete
- Step 4 (Expertise) shows as "blocked" even though it's completed and you can already access step 5!

### This is Wrong Because:
1. If you're already ON step 5, you clearly passed steps 1-4
2. You should ALWAYS be able to go back to earlier steps you've completed
3. The "Complete previous step first" message makes no sense for a completed step

---

## Solution

### Change 1: Fix `isCompletedButBlocked` Logic in `WizardStepper.tsx`

The condition should NOT apply to steps before the current step. If you're on step 5, steps 1-4 should never be "blocked".

**Current (line 138):**
```typescript
const isCompletedButBlocked = isCompleted && !isAccessible;
```

**Fixed:**
```typescript
// Only show "blocked" state for steps AFTER the current step
// Steps before current step should always be navigable if completed
const isCompletedButBlocked = isCompleted && !isAccessible && step.id > currentStep;
```

### Change 2: Ensure `isClickable` Allows All Earlier Completed Steps

**Current (line 135):**
```typescript
const isClickable = !isLocked && (isCompleted || isCurrent || isNextAccessible);
```

This is actually correct - `isCompleted` makes it clickable. The issue is the confusing tooltip.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/WizardStepper.tsx` | Fix `isCompletedButBlocked` logic to only apply to steps after current step |

---

## Expected Behavior After Fix

| Scenario | Step 4 (Expertise) Behavior |
|----------|---------------------------|
| On Proof Points (step 5) | Green, clickable, NO blocking tooltip |
| Step 3 incomplete but user is on step 5 | Still green, still clickable |
| Lifecycle locked (assessment started) | Grey with lock icon and "Locked" tooltip |

---

## Code Change

In `src/components/layout/WizardStepper.tsx`, line 138:

```typescript
// BEFORE (buggy)
const isCompletedButBlocked = isCompleted && !isAccessible;

// AFTER (fixed)
// Only apply "completed but blocked" state to future steps, not past steps
// If user is already at step 5, they should be able to go back to step 4
const isCompletedButBlocked = isCompleted && !isAccessible && step.id > currentStep;
```

This simple one-line fix ensures that:
1. Steps BEFORE the current step are always navigable if completed
2. Steps AFTER the current step still show the "complete previous step first" message if blocked
3. No change to locking behavior (lifecycle locks still apply)

---

## Test Scenarios

1. Navigate to Proof Points (step 5)
2. Click on Expertise (step 4) - should navigate
3. Hover over Expertise (step 4) - should NOT show "Complete previous step first"
4. If in org_rep mode with pending approval, step 4 should still be clickable
5. If assessment started (lifecycle lock), step 4 should show lock icon

