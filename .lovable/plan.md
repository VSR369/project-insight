

# Fix: Interview Slot Actions - Show Cancel After Accept

## Problem Summary

**Current Behavior:**
- When acceptance_status = 'pending' → Shows Accept + Decline buttons
- When acceptance_status = 'accepted' → Shows only a green "Accepted" alert
- When acceptance_status = 'declined' → Shows only a red "Declined" alert

**Expected Behavior:**
- When acceptance_status = 'pending' → Shows Accept + Decline buttons (correct)
- When acceptance_status = 'accepted' → Shows **Cancel Interview** button (missing)
- When acceptance_status = 'declined' → Shows status alert (correct)

The reviewer should be able to **cancel** an accepted interview with a mandatory reason, which will:
1. Update the booking status to 'cancelled'
2. Revert the enrollment lifecycle to allow rebooking
3. Send an email notification to the provider to reschedule
4. Create an in-app notification for the provider

---

## Technical Analysis

### Current Code Flow (SlotsTabContent.tsx)

```typescript
const canTakeAction = slotContext.reviewerAssignment?.acceptanceStatus === 'pending';
const isAccepted = slotContext.reviewerAssignment?.acceptanceStatus === 'accepted';

// Action buttons only show when pending
{canTakeAction && !isBookingCancelled && (
  // Accept + Decline buttons
)}

// After acceptance, only shows status alert
{isAccepted && (
  <Alert>You have accepted this interview slot.</Alert>
)}
```

### Missing Components

| Component | Status | Purpose |
|-----------|--------|---------|
| `ReviewerCancelBookingDialog.tsx` | **MISSING** | Dialog with mandatory reason field |
| `useCancelAcceptedBooking` mutation | **MISSING** | Hook to cancel accepted booking |
| Cancel button in `SlotsTabContent.tsx` | **MISSING** | Trigger for cancel dialog |
| Provider notification | **EXISTS** | Edge function `notify-booking-cancelled` already exists |

### Existing Pattern Reference

The admin panel has a similar flow in:
- `src/pages/admin/reviewer-availability/CancelBookingDialog.tsx`
- `useAdminCancelBookedSlot` in `src/hooks/queries/useAdminReviewerSlots.ts`

We'll adapt this pattern for reviewer-initiated cancellation.

---

## Solution: Implementation Plan

### Phase 1: Create Reviewer Cancel Mutation Hook

**File:** `src/hooks/queries/useReviewerSlotActions.ts`

Add new mutation `useCancelAcceptedBooking`:

```typescript
export function useCancelAcceptedBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      reviewerId,
      providerId,
      enrollmentId,
      providerEmail,
      providerName,
      scheduledAt,
      industryName,
      expertiseName,
      cancelReason,
    }: {
      bookingId: string;
      reviewerId: string;
      providerId: string;
      enrollmentId: string;
      providerEmail: string;
      providerName: string;
      scheduledAt: string;
      industryName: string | null;
      expertiseName: string | null;
      cancelReason: string;
    }) => {
      // 1. Update booking_reviewers acceptance status
      await supabase
        .from('booking_reviewers')
        .update({
          acceptance_status: 'declined',
          declined_reason: 'reviewer_cancelled',
          declined_at: new Date().toISOString(),
        })
        .eq('booking_id', bookingId)
        .eq('reviewer_id', reviewerId);

      // 2. Update booking status to cancelled
      await supabase
        .from('interview_bookings')
        .update({
          status: 'cancelled',
          cancelled_reason: cancelReason,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      // 3. Revert lifecycle to allow rebooking
      await supabase
        .from('provider_industry_enrollments')
        .update({
          lifecycle_status: 'assessment_passed',
          lifecycle_rank: 110,
          updated_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId);

      // 4. Create in-app notification
      await supabase
        .from('provider_notifications')
        .insert({
          provider_id: providerId,
          enrollment_id: enrollmentId,
          notification_type: 'interview_cancelled_by_reviewer',
          title: 'Interview Cancelled - Action Required',
          message: `Your scheduled interview has been cancelled. Reason: ${cancelReason}. Please log in and select a new available time slot.`,
          is_system_generated: true,
        });

      // 5. Send email notification via edge function
      await supabase.functions.invoke('notify-booking-cancelled', {
        body: {
          provider_email: providerEmail,
          provider_name: providerName,
          scheduled_at: scheduledAt,
          industry_name: industryName,
          expertise_name: expertiseName,
          booking_id: bookingId,
        },
      });

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Interview cancelled. Provider has been notified to reschedule.');
      queryClient.invalidateQueries({ queryKey: ['slot-context'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-detail'] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-dashboard'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'cancel_accepted_booking' });
    },
  });
}
```

### Phase 2: Create Reviewer Cancel Dialog Component

**File:** `src/components/reviewer/candidates/CancelAcceptedSlotDialog.tsx`

```typescript
// Pattern: Follows DeclineSlotDialog.tsx structure
// Required fields:
// - Reason for cancellation (mandatory, min 10 chars)
// - Shows scheduled date/time for context
// - Warning about provider notification
```

Key Features:
- Mandatory reason field (textarea with min 10 characters)
- Display scheduled time for confirmation
- Clear warning that provider will be notified
- Loading state during mutation

### Phase 3: Update SlotsTabContent Component

**File:** `src/components/reviewer/candidates/SlotsTabContent.tsx`

Changes needed:

1. **Import new components:**
```typescript
import { CancelAcceptedSlotDialog } from "./CancelAcceptedSlotDialog";
import { useCancelAcceptedBooking } from "@/hooks/queries/useReviewerSlotActions";
```

2. **Add state for cancel dialog:**
```typescript
const [showCancelDialog, setShowCancelDialog] = useState(false);
const cancelMutation = useCancelAcceptedBooking();
```

3. **Replace accepted status alert with action card:**
```typescript
{isAccepted && !isBookingCancelled && (
  <Card className="border-green-200 bg-green-50/50">
    <CardContent className="pt-6">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <span className="font-medium text-green-800">
          You have accepted this interview
        </span>
        <Badge variant="default" className="bg-green-600">Confirmed</Badge>
      </div>
      
      <Button
        variant="outline"
        onClick={() => setShowCancelDialog(true)}
        className="border-red-200 text-red-600 hover:bg-red-50"
      >
        <XCircle className="mr-2 h-4 w-4" />
        Cancel Interview
      </Button>
      
      <p className="text-xs text-muted-foreground mt-3">
        If you can no longer attend, you must cancel. The provider will be 
        notified to select a new time slot.
      </p>
    </CardContent>
  </Card>
)}
```

4. **Add cancel dialog component:**
```typescript
<CancelAcceptedSlotDialog
  open={showCancelDialog}
  onOpenChange={setShowCancelDialog}
  onConfirm={handleCancel}
  isLoading={cancelMutation.isPending}
  scheduledAt={slotContext.scheduledAt}
  durationMinutes={slotContext.durationMinutes}
  reviewerTimezone={slotContext.reviewerTimezone}
  providerName={slotContext.providerName}
/>
```

5. **Add cancel handler:**
```typescript
const handleCancel = (reason: string) => {
  if (!slotContext?.reviewerAssignment) return;
  
  cancelMutation.mutate(
    {
      bookingId: slotContext.bookingId,
      reviewerId: slotContext.reviewerAssignment.reviewerId,
      providerId: slotContext.providerId,
      enrollmentId: slotContext.enrollmentId,
      providerEmail: slotContext.providerEmail, // Need to add to context
      providerName: slotContext.providerName,
      scheduledAt: slotContext.scheduledAt,
      industryName: slotContext.industryName,
      expertiseName: slotContext.expertiseLevelName,
      cancelReason: reason,
    },
    {
      onSuccess: () => setShowCancelDialog(false),
    }
  );
};
```

### Phase 4: Update SlotContextData Interface

**File:** `src/hooks/queries/useReviewerSlotActions.ts`

Add provider email to the context:
```typescript
export interface SlotContextData {
  // ... existing fields ...
  providerEmail: string | null; // NEW - needed for email notification
}
```

Update query to fetch provider email:
```typescript
// In useSlotContext queryFn, add profile fetch:
const { data: providerProfile } = await supabase
  .from('profiles')
  .select('email')
  .eq('user_id', providerResult.data.user_id)
  .single();

// Add to return object:
providerEmail: providerProfile?.email || null,
```

### Phase 5: Update Component Index

**File:** `src/components/reviewer/candidates/index.ts`

Add export:
```typescript
export { CancelAcceptedSlotDialog } from './CancelAcceptedSlotDialog';
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/reviewer/candidates/CancelAcceptedSlotDialog.tsx` | CREATE | New dialog component for cancel with reason |
| `src/hooks/queries/useReviewerSlotActions.ts` | MODIFY | Add `useCancelAcceptedBooking` mutation + providerEmail to context |
| `src/components/reviewer/candidates/SlotsTabContent.tsx` | MODIFY | Show Cancel button when accepted, add dialog |
| `src/components/reviewer/candidates/index.ts` | MODIFY | Export new dialog component |

---

## Expected User Flow

### Before (Current - Broken)
```
1. Reviewer accepts slot → Shows "You have accepted" alert
2. No way to cancel → Reviewer stuck if they can't attend
```

### After (Fixed)
```
1. Reviewer accepts slot → Shows "Confirmed" status + Cancel button
2. Reviewer clicks Cancel → Dialog opens with reason field
3. Reviewer provides reason (required) → Submits
4. System:
   - Updates booking status to 'cancelled'
   - Reverts enrollment lifecycle to 'assessment_passed' (rank 110)
   - Creates in-app notification for provider
   - Sends email via notify-booking-cancelled edge function
5. Provider receives:
   - Email notification with cancellation details
   - In-app notification
   - Ability to rebook from Interview Scheduling page
```

---

## Validation Rules

| Rule | Implementation |
|------|----------------|
| Reason required | Zod: `z.string().min(10, "Please provide a reason (min 10 characters)")` |
| Only accepted slots can be cancelled | Check `acceptanceStatus === 'accepted'` before showing button |
| Cannot cancel after interview time | Check `scheduledAt > now` before allowing cancel |

---

## Technical Notes

### Lifecycle State After Cancellation
- Status: `assessment_passed`
- Rank: 110
- This allows the provider to rebook without repeating assessment

### Email Notification
Uses existing `notify-booking-cancelled` edge function which:
- Sends formatted email with cancellation details
- Includes "Schedule New Interview" CTA button
- Shows cancelled date/time for reference

### RLS Considerations
- `booking_reviewers` UPDATE: Reviewer can update their own assignment (existing policy)
- `interview_bookings` UPDATE: Provider can update own bookings (existing policy - may need reviewer policy)
- `provider_industry_enrollments` UPDATE: Reviewer can update for assigned enrollments (added in previous migration)
- `provider_notifications` INSERT: May need policy for reviewer to insert

### Database Policy Check
We may need to add an RLS policy to allow reviewers to update `interview_bookings` for their assigned bookings. Current policies only allow providers and admins.

