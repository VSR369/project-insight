# Free Navigation with Action-Level Blocking

## Core UX Paradigm

**Navigation is ALWAYS free** - users can move between any wizard steps at any time.
**Actions are controlled** - saving/modifying data is blocked or warned based on rules and data dependencies.

---

## Business Rules Summary

| Scenario | Rule |
|----------|------|
| Navigate between steps | Always allowed (no blocking) |
| Change Expertise (0 proof points) | Allowed freely |
| Change Expertise (has proof points) | Show cascade warning - must delete proof points first OR confirm cascade deletion |
| Change Participation Mode | Always allowed (with cascade rules if dependent data exists) |
| Change Industry Segment | Constrained by lifecycle rules and requires cascade handling |
| Add Proof Point (no expertise selected) | Show info message - must select expertise first |

---

## Files to Modify

### 1. `src/components/layout/WizardLayout.tsx`

**Current Issue:** Navigation is blocked based on step completion status.

**Changes:**
- Simplify `isStepAccessible` to return `true` for all visible steps
- Remove blocking logic from `handleStepClick` - allow free navigation
- Remove special case checks that block navigation (org incomplete, proficiency areas missing, etc.)

**Before (lines 222-239):**
```typescript
const isStepAccessible = (stepId: number): boolean => {
  const stepIndex = visibleSteps.findIndex(s => s.id === stepId);
  if (stepIndex === -1) return false;
  
  // Check all preceding visible steps are complete
  for (let i = 0; i < stepIndex; i++) {
    const precedingStep = visibleSteps[i];
    if (!completedSteps.includes(precedingStep.id)) {
      return false;
    }
  }
  return true;
};
```

**After:**
```typescript
const isStepAccessible = (stepId: number): boolean => {
  // All visible steps are always accessible - navigation is free
  return visibleSteps.some(s => s.id === stepId);
};
```

**Also update `handleStepClick` (lines 263-312):**
- Remove all blocking checks for navigation
- Simply navigate to the requested step
- Keep only the dialog for mode-blocked scenario (when org approval is pending)

---

### 2. `src/pages/enroll/ExpertiseSelection.tsx`

**Current Issue:** No check for existing proof points when changing expertise.

**Changes:**
- Add hook to fetch proof points count for current provider
- Before saving expertise changes, check if proof points exist
- If proof points exist (count > 0): Show `CascadeWarningDialog` with option to confirm or cancel
- If NO proof points (count === 0): Allow save freely without warning
- On cascade confirm: Execute cascade reset, then save new expertise

**New Logic Flow:**
```typescript
const handleSaveExpertise = async () => {
  // Get proof points count
  const proofPointsCount = await getProofPointsCount(provider.id);
  
  if (proofPointsCount > 0) {
    // Show cascade warning dialog
    setShowCascadeWarning(true);
    setCascadeImpact({
      type: 'expertise_change',
      proofPointsToDelete: proofPointsCount,
      message: 'Changing expertise will delete all specialty proof points.'
    });
  } else {
    // No proof points - save freely
    await saveExpertise();
  }
};

const handleCascadeConfirm = async () => {
  // Execute cascade reset (delete proof points, clear specialties)
  await executeExpertiseLevelChangeReset(provider.id);
  // Then save new expertise
  await saveExpertise();
  setShowCascadeWarning(false);
};
```

---

### 3. `src/pages/enroll/ProofPoints.tsx`

**Current Issue:** May allow adding proof points without expertise selection.

**Changes:**
- Add check for selected expertise before allowing proof point creation
- If no expertise selected: Show info message with link to Expertise step
- If expertise selected: Allow normal proof point creation

**New Logic:**
```typescript
const hasExpertiseSelected = activeEnrollment?.expertise_level_id != null;

const handleAddProofPoint = () => {
  if (!hasExpertiseSelected) {
    toast.info('Please select your expertise level first before adding proof points.');
    return;
  }
  navigate('/enroll/add-proof-point');
};
```

---

### 4. `src/pages/enroll/ParticipationMode.tsx`

**Verify/Update:**
- Mode changes should always be allowed
- If mode change affects dependent data (e.g., organization details), apply cascade rules
- Show appropriate warnings but don't block the action

---

## Data Flow Diagram

```
User clicks step in wizard
        |
        v
  [Navigate freely]
        |
        v
  [Render page content]
        |
        v
  User attempts action (Save/Edit/Delete)
        |
        v
  [Check data dependencies]
        |
        +-- No dependencies --> [Allow action]
        |
        +-- Has dependencies --> [Show warning dialog]
                                        |
                                        +-- User confirms --> [Execute cascade + action]
                                        |
                                        +-- User cancels --> [No change]
```

---

## Test Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Navigate from Proof Points to Expertise (0 proof points) | Navigate freely |
| Navigate from Proof Points to Expertise (has proof points) | Navigate freely (warning shown only when SAVING expertise change) |
| Change expertise with 0 proof points | Save immediately, no warning |
| Change expertise with 5 proof points | Show cascade warning dialog |
| Confirm cascade warning | Delete proof points, save new expertise |
| Cancel cascade warning | No changes made |
| Add proof point without expertise | Show info toast, block action |
| Change participation mode | Always allowed with applicable cascade rules |

---

## Implementation Order

1. Update `WizardLayout.tsx` - Enable free navigation
2. Update `ExpertiseSelection.tsx` - Add proof point check and cascade warning
3. Update `ProofPoints.tsx` - Add expertise requirement check
4. Verify `ParticipationMode.tsx` - Ensure mode changes work correctly
5. Test all navigation and action scenarios

---

## Files Summary

| File | Change Type |
|------|-------------|
| `src/components/layout/WizardLayout.tsx` | Simplify navigation logic |
| `src/pages/enroll/ExpertiseSelection.tsx` | Add cascade warning for expertise changes |
| `src/pages/enroll/ProofPoints.tsx` | Add expertise requirement check |
| `src/pages/enroll/ParticipationMode.tsx` | Verify cascade rules for mode changes |
