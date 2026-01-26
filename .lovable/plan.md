

# Fix: Interview Slot Cancel Button for Both Accepted and Declined States

## Problem Summary

| State | Current Behavior | Expected Behavior |
|-------|-----------------|-------------------|
| Pending | Accept + Decline buttons | Accept + Decline buttons ✓ |
| Accepted | "Accepted" status + Cancel button | "Accepted" status + Cancel button ✓ |
| Declined | Only "Declined" alert, NO Cancel | "Declined" status + **Cancel button** ✗ |

The Cancel button should be available for BOTH accepted and declined states, as the reviewer needs the ability to cancel the booking regardless of their initial response.

### Additionally: React forwardRef Warning

Console shows: `Warning: Function components cannot be given refs. Attempts to access this ref will fail.`

This is because `CancelAcceptedSlotDialog` is being used by Dialog which may need to pass refs for focus management.

---

## Solution

### File 1: `src/components/reviewer/candidates/SlotsTabContent.tsx`

**Changes:**
1. Rename the Cancel dialog state/handler to be generic (not just for "accepted" bookings)
2. Add Cancel button to the Declined state section (lines 240-253)
3. Combine the action logic so both accepted and declined can trigger cancel

**Current code (line 240-253) - Declined section:**
```typescript
{isDeclined && (
  <Alert variant="destructive" className="bg-destructive/10">
    <XCircle className="h-4 w-4" />
    <AlertDescription className="flex items-center gap-2">
      You have declined this interview slot.
      <Badge variant="destructive">Declined</Badge>
      {slotContext.reviewerAssignment?.declinedReason && (
        <span className="text-xs">
          (Reason: {slotContext.reviewerAssignment.declinedReason.replace('_', ' ')})
        </span>
      )}
    </AlertDescription>
  </Alert>
)}
```

**Updated code:**
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
      
      <Button
        variant="outline"
        onClick={() => setShowCancelDialog(true)}
        className="border-red-200 text-red-600 hover:bg-red-50"
      >
        <XCircle className="mr-2 h-4 w-4" />
        Cancel Interview
      </Button>
      
      <p className="text-xs text-muted-foreground mt-3">
        Click Cancel to formally close this booking. The provider will be 
        notified to select a new time slot.
      </p>
    </CardContent>
  </Card>
)}
```

### File 2: `src/components/reviewer/candidates/CancelAcceptedSlotDialog.tsx`

**Changes:**
1. Wrap component with `React.forwardRef` to fix the console warning

**Updated component structure:**
```typescript
import * as React from "react";
// ... other imports

interface CancelAcceptedSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
  scheduledAt: string;
  durationMinutes: number;
  reviewerTimezone: string;
  providerName: string;
}

export const CancelAcceptedSlotDialog = React.forwardRef<
  HTMLDivElement,
  CancelAcceptedSlotDialogProps
>(function CancelAcceptedSlotDialog({
  open,
  onOpenChange,
  // ... rest of props
}, ref) {
  // ... component body
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Dialog component forwards ref internally via DialogContent */}
      <DialogContent className="sm:max-w-md">
        {/* ... existing content */}
      </DialogContent>
    </Dialog>
  );
});

CancelAcceptedSlotDialog.displayName = "CancelAcceptedSlotDialog";
```

---

## Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `src/components/reviewer/candidates/SlotsTabContent.tsx` | MODIFY | Add Cancel button to declined state section |
| `src/components/reviewer/candidates/CancelAcceptedSlotDialog.tsx` | MODIFY | Wrap with forwardRef to fix warning |

---

## Expected Result After Fix

### Accepted State:
```
┌─────────────────────────────────────────────────┐
│ ✓ You have accepted this interview  [Confirmed] │
│                                                 │
│ [Cancel Interview]                              │
│                                                 │
│ If you can no longer attend, you must cancel.   │
│ The provider will be notified to select a new   │
│ time slot.                                      │
└─────────────────────────────────────────────────┘
```

### Declined State (NEW):
```
┌─────────────────────────────────────────────────┐
│ ✗ You have declined this interview  [Declined]  │
│ Reason: reviewer unavailable                    │
│                                                 │
│ [Cancel Interview]                              │
│                                                 │
│ Click Cancel to formally close this booking.    │
│ The provider will be notified to select a new   │
│ time slot.                                      │
└─────────────────────────────────────────────────┘
```

---

## Technical Notes

### Why Cancel Works for Both States

The `useCancelAcceptedBooking` mutation performs these actions:
1. Updates `booking_reviewers.acceptance_status` to 'declined'
2. Updates `interview_bookings.status` to 'cancelled'
3. Reverts `provider_industry_enrollments.lifecycle_status` to 'assessment_passed'
4. Creates in-app notification for provider
5. Sends email notification via edge function

These actions are appropriate regardless of whether the reviewer initially accepted or declined - the outcome is the same: the booking is cancelled and the provider can rebook.

### forwardRef Fix

The warning occurs because Radix Dialog needs to manage focus and may attempt to attach refs. While the Dialog component handles this internally, wrapping our component with forwardRef prevents the warning and follows React best practices for components that may be used with refs.

