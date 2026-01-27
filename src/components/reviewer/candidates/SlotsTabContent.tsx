/**
 * Slots Tab Content
 * 
 * Main container for the Slots tab in Candidate Detail Page.
 * Shows booked interview slot with dual timezone display and accept/decline actions.
 */

import { useState } from "react";
import { Clock, CheckCircle, XCircle, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { TimezoneInfoPanel } from "./TimezoneInfoPanel";
import { SlotDetailsCard } from "./SlotDetailsCard";
import { AcceptSlotConfirmDialog } from "./AcceptSlotConfirmDialog";
import { DeclineSlotDialog } from "./DeclineSlotDialog";
import {
  useSlotContext,
  useAcceptInterviewSlot,
  useDeclineInterviewSlot,
  useCancelAcceptedBooking,
  type DeclineReason,
} from "@/hooks/queries/useReviewerSlotActions";
import { CancelAcceptedSlotDialog } from "./CancelAcceptedSlotDialog";

interface SlotsTabContentProps {
  enrollmentId: string;
}

export function SlotsTabContent({ enrollmentId }: SlotsTabContentProps) {
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: slotContext, isLoading, error } = useSlotContext(enrollmentId);
  const acceptMutation = useAcceptInterviewSlot();
  const declineMutation = useDeclineInterviewSlot();
  const cancelMutation = useCancelAcceptedBooking();

  // Handle accept
  const handleAccept = () => {
    if (!slotContext?.reviewerAssignment) return;
    
    acceptMutation.mutate(
      {
        bookingId: slotContext.bookingId,
        reviewerId: slotContext.reviewerAssignment.reviewerId,
      },
      {
        onSuccess: () => setShowAcceptDialog(false),
      }
    );
  };

  // Handle decline
  const handleDecline = (reason: DeclineReason, notes?: string) => {
    if (!slotContext?.reviewerAssignment) return;

    declineMutation.mutate(
      {
        bookingId: slotContext.bookingId,
        reviewerId: slotContext.reviewerAssignment.reviewerId,
        providerId: slotContext.providerId,
        enrollmentId: slotContext.enrollmentId,
        declineReason: reason,
        additionalNotes: notes,
      },
      {
        onSuccess: () => setShowDeclineDialog(false),
      }
    );
  };

  // Handle cancel (for accepted bookings)
  const handleCancel = (reason: string) => {
    if (!slotContext?.reviewerAssignment) return;

    cancelMutation.mutate(
      {
        bookingId: slotContext.bookingId,
        reviewerId: slotContext.reviewerAssignment.reviewerId,
        providerId: slotContext.providerId,
        enrollmentId: slotContext.enrollmentId,
        providerEmail: slotContext.providerEmail,
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load slot details: {error instanceof Error ? error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  // No booking yet
  if (!slotContext) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">
            No Interview Scheduled
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            The provider has not yet booked an interview slot.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determine action availability
  const canTakeAction = slotContext.reviewerAssignment?.acceptanceStatus === 'pending';
  const isAccepted = slotContext.reviewerAssignment?.acceptanceStatus === 'accepted';
  const isDeclined = slotContext.reviewerAssignment?.acceptanceStatus === 'declined';
  const isBookingCancelled = slotContext.status === 'cancelled' || 
                             slotContext.status === 'declined_poor_credentials';
  const isInterviewSubmitted = !!slotContext.interviewSubmittedAt;

  return (
    <div className="space-y-6">
      {/* Timezone Information */}
      <TimezoneInfoPanel
        reviewerTimezone={slotContext.reviewerTimezone}
        providerTimezone={slotContext.providerTimezone}
        providerName={slotContext.providerName}
      />

      {/* Meeting Preferences */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Meeting Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Duration:</span>
              <span className="ml-2 font-medium">{slotContext.durationMinutes} minutes</span>
            </div>
            <div>
              <span className="text-muted-foreground">Meeting Mode:</span>
              <span className="ml-2 font-medium">Video (Default)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slot Details */}
      <SlotDetailsCard
        scheduledAt={slotContext.scheduledAt}
        durationMinutes={slotContext.durationMinutes}
        status={slotContext.status}
        reviewerTimezone={slotContext.reviewerTimezone}
        providerTimezone={slotContext.providerTimezone}
      />

      {/* Action Buttons */}
      {canTakeAction && !isBookingCancelled && (
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setShowAcceptDialog(true)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Accept Interview Slot
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowDeclineDialog(true)}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Decline
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Note: Once you accept, a calendar invitation will be sent to both you and the provider.
              If you decline, the provider will be asked to select another available time from your calendar.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Status Messages - Accepted (with Cancel option if not submitted) */}
      {isAccepted && !isBookingCancelled && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">
                {isInterviewSubmitted 
                  ? 'Interview completed and submitted'
                  : 'You have accepted this interview'
                }
              </span>
              <Badge variant="default" className="bg-green-600">
                {isInterviewSubmitted ? 'Submitted' : 'Confirmed'}
              </Badge>
            </div>
            
            {!isInterviewSubmitted && (
              <>
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
              </>
            )}
          </CardContent>
        </Card>
      )}

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

      {isBookingCancelled && !isDeclined && (
        <Alert variant="destructive" className="bg-destructive/10">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            This booking has been cancelled.
          </AlertDescription>
        </Alert>
      )}

      {/* Accept Confirmation Dialog */}
      <AcceptSlotConfirmDialog
        open={showAcceptDialog}
        onOpenChange={setShowAcceptDialog}
        onConfirm={handleAccept}
        isLoading={acceptMutation.isPending}
        scheduledAt={slotContext.scheduledAt}
        durationMinutes={slotContext.durationMinutes}
        reviewerTimezone={slotContext.reviewerTimezone}
        providerName={slotContext.providerName}
      />

      {/* Decline Dialog */}
      <DeclineSlotDialog
        open={showDeclineDialog}
        onOpenChange={setShowDeclineDialog}
        onConfirm={handleDecline}
        isLoading={declineMutation.isPending}
        providerName={slotContext.providerName}
      />

      {/* Cancel Accepted Slot Dialog */}
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
    </div>
  );
}
