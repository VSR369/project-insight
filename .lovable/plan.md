# Free Navigation with Action-Level Blocking

## Core UX Paradigm

**Navigation is ALWAYS free** - users can move between any wizard steps at any time.
**Actions are controlled** - saving/modifying data is blocked or warned based on rules and data dependencies.

---

## Implementation Status: ✅ COMPLETE

The unified navigation experience has been implemented with the following changes:

### Changes Made

1. **`src/services/wizardNavigationService.ts`**
   - Added `getFirstStep()` - returns first visible step for "Review" flow
   - Added `getNextStepForStatus()` - determines correct next step based on lifecycle status
   - Centralized all step routes and navigation logic

2. **`src/pages/Dashboard.tsx`**
   - Updated `handleContinueEnrollment()` to use navigation service
   - Added `handleReviewEnrollment()` for post-assessment review flow
   - Review button navigates to step 1, Continue uses lifecycle-aware navigation

3. **`src/components/layout/WizardLayout.tsx`**
   - Removed duplicate `STEP_ROUTES` definition, now uses `NAV_STEP_ROUTES` from service
   - Default back/continue handlers use centralized navigation service
   - `isViewMode` computed from lifecycle rank for automatic view-only styling

4. **Enrollment Pages Standardized**
   - `Registration.tsx` - Removed `hideBackButton`, uses default navigation (back → Dashboard)
   - `ParticipationMode.tsx` - Removed hardcoded `handleBack`, uses default navigation
   - `ExpertiseSelection.tsx` - Removed hardcoded back navigation logic, uses defaults
   - `ProofPoints.tsx` - Removed hardcoded `handleBack`, uses default navigation
   - `Assessment.tsx` - Removed hardcoded `handleBack`, uses default navigation

5. **`src/components/layout/WizardStepper.tsx`**
   - Locked + completed steps are clickable (view-only mode)
   - Clear "View Only" tooltip explains locked state
   - Visual distinction between view-only and truly locked steps

---

## Navigation Behavior

### Stepper (Top Circles)
- **Completed steps**: Always clickable, navigate to view/edit
- **Locked + Completed**: Clickable with "View Only" tooltip
- **Locked + Not Completed**: Not clickable, shows "Step Not Available" tooltip
- **Current step**: Highlighted, clickable
- **Next accessible step**: Slightly highlighted, clickable
- **Future steps**: Greyed out, not clickable

### Back/Continue (Footer Buttons)
- **Back**: Navigates to previous visible step (or Dashboard if step 1)
- **Continue**: Navigates to next visible step
- **View Only Badge**: Shows when step is in view mode
- **Button Styling**: `Continue` = primary, `View Next` = outline

### Dashboard Actions
- **Continue**: Uses `getNextStepForStatus()` to navigate to appropriate next step
- **Review**: Navigates to step 1 (Registration) for post-assessment review flow

---

## Business Rules Summary

| Scenario | Rule |
|----------|------|
| Navigate between steps | Always allowed (via stepper or back/continue) |
| Change Expertise (0 proof points) | Allowed freely |
| Change Expertise (has proof points) | Show cascade warning - confirm deletion |
| Change Participation Mode | Allowed (with cascade rules if dependent data) |
| Change Industry Segment | Constrained by lifecycle rules |
| Add Proof Point (no expertise) | Show info message - must select expertise first |

---

## Testing Checklist

- [x] Dashboard → Review → goes to Registration (Step 1)
- [x] Step 1: Back → Dashboard, Continue → Step 2
- [x] Step 2: Back → Step 1, Continue → Step 3 or 4 (based on mode)
- [x] Step 4: Back → previous, Continue → Step 5
- [x] Step 5: Back → Step 4, Continue → Step 6
- [x] Post-assessment: All completed steps show "View Only" badge
- [x] Post-assessment: All completed steps clickable in stepper
- [x] Post-assessment: VIEW NEXT button navigates sequentially
- [x] Stepper click on locked+completed step → navigates
- [x] Stepper click on locked+NOT completed step → shows tooltip, no navigation
