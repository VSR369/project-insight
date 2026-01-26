

# Correction: Interview Slot Button States & Cancel Logic

## Summary of Changes Required

| State | Current Behavior | Corrected Behavior |
|-------|-----------------|-------------------|
| Pending | Accept + Decline buttons | Accept + Decline buttons (no change) |
| Accepted | Status card + Cancel button | Show "ACCEPTED" button state + Cancel option |
| Declined | Status card + Cancel button | Show "DECLINED" button state + **NO Cancel option** |

## Key Corrections

1. **Button text changes after action:**
   - "Accept Interview Slot" → Shows as "ACCEPTED" (disabled, green badge style)
   - "Decline" → Shows as "DECLINED" (disabled, red badge style)

2. **Cancel option ONLY for ACCEPTED state:**
   - Remove the Cancel button from the Declined state section (lines 257-264)
   - Keep Cancel button only in the Accepted state section

---

## Implementation Details

### File: `src/components/reviewer/candidates/SlotsTabContent.tsx`

#### Change 1: Accepted State UI (lines 212-238)
Keep the existing accepted state card with Cancel button - this is correct.

#### Change 2: Declined State UI (lines 240-272)
**Remove the Cancel button** from this section. The declined state should only show:
- Declined status badge
- Reason for decline (if available)
- NO Cancel button

**Current code (lines 240-272):**
```typescript
{isDeclined && !isBookingCancelled && (
  <Card className="border-red-200 bg-red-50/50">
    <CardContent className="pt-6">
      <div className="flex items-center gap-2 mb-4">
        <XCircle className="h-5 w-5 text-red-600" />
        <span className="font-medium text-red-800">
          You have declined this interview
        </span>
        <Badge variant="destructive">Declined</Badge>
      </div>
      
      {slotContext.reviewerAssignment?.declinedReason && (
        <p className="text-sm text-muted-foreground mb-4">
          Reason: {slotContext.reviewerAssignment.declinedReason.replace(/_/g, ' ')}
        </p>
      )}
      
      <Button ...>Cancel Interview</Button>  // REMOVE THIS
      
      <p className="text-xs text-muted-foreground mt-3">
        Click Cancel to formally close this booking...  // REMOVE THIS
      </p>
    </CardContent>
  </Card>
)}
```

**Corrected code:**
```typescript
{isDeclined && !isBookingCancelled && (
  <Card className="border-red-200 bg-red-50/50">
    <CardContent className="pt-6">
      <div className="flex items-center gap-2 mb-4">
        <XCircle className="h-5 w-5 text-red-600" />
        <span className="font-medium text-red-800">
          You have declined this interview
        </span>
        <Badge variant="destructive">DECLINED</Badge>
      </div>
      
      {slotContext.reviewerAssignment?.declinedReason && (
        <p className="text-sm text-muted-foreground">
          Reason: {slotContext.reviewerAssignment.declinedReason.replace(/_/g, ' ')}
        </p>
      )}
      
      <p className="text-xs text-muted-foreground mt-3">
        The provider will be notified to select another available time slot.
      </p>
    </CardContent>
  </Card>
)}
```

---

## Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `src/components/reviewer/candidates/SlotsTabContent.tsx` | MODIFY | Remove Cancel button from declined state section (lines 257-269) |

---

## Expected UI After Fix

### When ACCEPTED:
```
┌─────────────────────────────────────────────────┐
│ ✓ You have accepted this interview  [ACCEPTED]  │
│                                                 │
│ [Cancel Interview]                              │
│                                                 │
│ If you can no longer attend, you must cancel.   │
│ The provider will be notified to select a new   │
│ time slot.                                      │
└─────────────────────────────────────────────────┘
```

### When DECLINED:
```
┌─────────────────────────────────────────────────┐
│ ✗ You have declined this interview  [DECLINED]  │
│ Reason: reviewer unavailable                    │
│                                                 │
│ The provider will be notified to select another │
│ available time slot.                            │
└─────────────────────────────────────────────────┘
```
*(No Cancel button for declined state)*

---

## Logic Clarification

When a reviewer **declines**, the system should automatically:
- Update booking status
- Notify the provider to rebook

There's no need for a separate "Cancel" action since declining already triggers the rebooking flow. The Cancel option is only relevant when a reviewer has **accepted** but later cannot attend.

