

# Update Certification Status Logic

## Objective

Modify the `useFinalResultData.ts` hook so that the **Certification Status** stage shows `'in_progress'` when the interview has been submitted, even if the `lifecycle_status` hasn't been updated to `'certified'`, `'verified'`, or `'not_verified'` yet.

---

## Current Logic

```typescript
// Line 258-264
let certificationStatus: StageStatus = 'not_started';
if (['verified', 'certified', 'not_verified'].includes(lifecycleStatus ?? '')) {
  certificationStatus = 'completed';
} else if (lifecycleRank >= LIFECYCLE_RANKS.panel_completed) {
  certificationStatus = 'in_progress';
}
```

**Issue**: When an interview is submitted (`interview_submitted_at` exists), the certification process is underway, but the status may still show `'not_started'` if `lifecycle_rank < 130`.

---

## Proposed Change

Update the `deriveStageStatuses` function to also check if the interview has been submitted:

```typescript
// 7. Certification Status
let certificationStatus: StageStatus = 'not_started';
if (['verified', 'certified', 'not_verified'].includes(lifecycleStatus ?? '')) {
  certificationStatus = 'completed';
} else if (
  lifecycleRank >= LIFECYCLE_RANKS.panel_completed || 
  interviewBooking?.interview_submitted_at  // NEW: Interview submitted = certification in progress
) {
  certificationStatus = 'in_progress';
}
```

Also update the description logic in `deriveStageDescriptions`:

```typescript
// Certification Status - Line 330-336
let certificationStatus = 'Pending evaluation';
if (lifecycleStatus === 'verified' || lifecycleStatus === 'certified') {
  certificationStatus = 'Certified';
} else if (lifecycleStatus === 'not_verified') {
  certificationStatus = 'Not Verified';
} else if (interviewBooking?.interview_submitted_at) {  // NEW
  certificationStatus = 'Awaiting final decision';
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/queries/useFinalResultData.ts` | Update `deriveStageStatuses` and `deriveStageDescriptions` functions |

---

## Logic Flow After Change

| Condition | Certification Status | Description |
|-----------|---------------------|-------------|
| `lifecycle_status` is `verified`, `certified`, or `not_verified` | **Completed** | "Certified" or "Not Verified" |
| `lifecycle_rank >= 130` (panel_completed) OR `interview_submitted_at` exists | **In Progress** | "Awaiting final decision" |
| Otherwise | **Not Started** | "Pending evaluation" |

---

## Expected Behavior

For the enrollment `58155298-1987-4f40-ba6c-2f8aa3257e7d`:
- If interview has been submitted (`interview_submitted_at` is populated)
- And `lifecycle_status` is NOT yet `verified`/`certified`/`not_verified`
- The Certification Status card will show **In Progress** (orange) with "Awaiting final decision"

