/**
 * Booked Slot Cancel Dialog Component
 * 
 * Warning dialog shown when reviewer attempts to cancel a slot that is
 * already booked by a provider. Explains impact and requests confirmation.
 */

import { AlertTriangle, Calendar, User, Mail, AlertCircle } from "lucide-react";
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
import { formatSlotDate, formatSlotTimeRange } from "@/services/availabilityService";

export interface BookingInfo {
  bookingId: string;
  providerName: string;
  providerEmail: string;
  scheduledAt: string;
  industryName?: string;
  expertiseName?: string;
}

interface BookedSlotCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isCancelling: boolean;
  booking: BookingInfo | null;
}

export function BookedSlotCancelDialog({
  open,
  onOpenChange,
  onConfirm,
  isCancelling,
  booking,
}: BookedSlotCancelDialogProps) {
  if (!booking) return null;

  const scheduledDate = new Date(booking.scheduledAt);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-lg">
              Cancel Booked Interview?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <p className="text-muted-foreground">
                This slot is part of an active interview booking. Cancelling will affect the provider.
              </p>

              {/* Booking Details */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{booking.providerName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{booking.providerEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatSlotDate(scheduledDate)} at{" "}
                    {formatSlotTimeRange(scheduledDate, new Date(scheduledDate.getTime() + 60 * 60 * 1000))}
                  </span>
                </div>
                {(booking.industryName || booking.expertiseName) && (
                  <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                    {[booking.industryName, booking.expertiseName].filter(Boolean).join(" • ")}
                  </div>
                )}
              </div>

              {/* Impact Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800 space-y-1">
                    <p className="font-medium">If you proceed:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                      <li>The entire interview booking will be cancelled</li>
                      <li>{booking.providerName} will receive an email notification</li>
                      <li>They will need to book a new time slot</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCancelling}>Keep Slot</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isCancelling}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isCancelling ? "Cancelling..." : "Cancel Interview"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
