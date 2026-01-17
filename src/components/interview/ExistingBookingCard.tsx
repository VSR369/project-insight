import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarCheck, Clock, RefreshCw, XCircle, CheckCircle, Loader2, Info } from "lucide-react";
import { InterviewBooking, QuorumRequirement } from "@/hooks/queries/useInterviewScheduling";
import { RescheduleEligibility, CancelEligibility } from "@/services/rescheduleService";
import { formatInTimezone } from "./TimeZoneSelector";

interface ExistingBookingCardProps {
  booking: InterviewBooking;
  quorumRequirement: QuorumRequirement | null;
  timezone: string;
  expertiseLevelName?: string;
  onReschedule: () => void;
  onCancel: (reason: string) => Promise<void>;
  maxReschedules?: number;
  isCancelling?: boolean;
  rescheduleEligibility: RescheduleEligibility & { isLoading?: boolean };
  cancelEligibility: CancelEligibility & { isLoading?: boolean };
}

export function ExistingBookingCard({
  booking,
  quorumRequirement,
  timezone,
  expertiseLevelName,
  onReschedule,
  onCancel,
  maxReschedules = 2,
  isCancelling,
  rescheduleEligibility,
  cancelEligibility,
}: ExistingBookingCardProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const duration = quorumRequirement?.interview_duration_minutes || 60;

  const dateStr = formatInTimezone(booking.scheduled_at, timezone, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeStr = formatInTimezone(booking.scheduled_at, timezone, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const handleCancel = async () => {
    await onCancel(cancelReason);
    setShowCancelDialog(false);
    setCancelReason("");
  };

  const getStatusBadge = () => {
    switch (booking.status) {
      case "scheduled":
        return <Badge variant="secondary">Scheduled</Badge>;
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      case "no_show":
        return <Badge variant="destructive">No Show</Badge>;
      default:
        return <Badge variant="outline">{booking.status}</Badge>;
    }
  };

  const canReschedule = rescheduleEligibility.allowed;
  const canCancel = cancelEligibility.allowed;
  const isLoadingEligibility = rescheduleEligibility.isLoading || cancelEligibility.isLoading;

  return (
    <>
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Interview Scheduled
              </CardTitle>
              <CardDescription>
                Your panel interview has been confirmed
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date & Time */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CalendarCheck className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">{dateStr}</p>
                <p className="text-sm text-muted-foreground">{timeStr}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span>{duration} Minutes</span>
            </div>

            {expertiseLevelName && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{expertiseLevelName} Interview</Badge>
              </div>
            )}
          </div>

          <Separator />

          {/* Reschedule info */}
          <div className="text-sm text-muted-foreground">
            <p>
              Reschedules used: {booking.reschedule_count} of {maxReschedules}
            </p>
          </div>

          {/* Eligibility warning alerts */}
          {!isLoadingEligibility && !canReschedule && rescheduleEligibility.reasons.length > 0 && (
            <Alert variant="default" className="bg-muted/50">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">Rescheduling is not available:</span>
                <ul className="mt-1 list-disc list-inside text-sm">
                  {rescheduleEligibility.reasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {!isLoadingEligibility && !canCancel && cancelEligibility.reasons.length > 0 && (
            <Alert variant="default" className="bg-muted/50">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">Cancellation is not available:</span>
                <ul className="mt-1 list-disc list-inside text-sm">
                  {cancelEligibility.reasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={onReschedule}
              disabled={!canReschedule || isLoadingEligibility}
            >
              {isLoadingEligibility ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Reschedule
            </Button>
            <Button
              variant="ghost"
              className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowCancelDialog(true)}
              disabled={!canCancel || isLoadingEligibility}
            >
              {isLoadingEligibility ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Cancel Booking
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Interview Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel your scheduled interview. You can reschedule a new time if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Label htmlFor="cancel-reason" className="text-sm font-medium">
              Reason for cancellation (optional)
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="Please provide a reason for cancelling..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-2"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Booking"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
