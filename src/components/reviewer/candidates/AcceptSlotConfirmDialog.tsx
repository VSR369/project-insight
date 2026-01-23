/**
 * Accept Slot Confirm Dialog
 * 
 * Confirmation dialog for accepting an interview slot.
 */

import { CheckCircle, Calendar, Clock, Video, Loader2 } from "lucide-react";
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
import { formatInTimezone } from "@/components/interview/TimeZoneSelector";
import { addMinutes } from "date-fns";

interface AcceptSlotConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
  scheduledAt: string;
  durationMinutes: number;
  reviewerTimezone: string;
  providerName: string;
}

export function AcceptSlotConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  scheduledAt,
  durationMinutes,
  reviewerTimezone,
  providerName,
}: AcceptSlotConfirmDialogProps) {
  const startDate = new Date(scheduledAt);
  const endDate = addMinutes(startDate, durationMinutes);
  
  // Format for display
  const dateStr = formatInTimezone(startDate, reviewerTimezone, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  
  const timeStr = `${formatInTimezone(startDate, reviewerTimezone, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })} - ${formatInTimezone(endDate, reviewerTimezone, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;
  
  const tzShort = formatInTimezone(startDate, reviewerTimezone, {
    timeZoneName: 'short',
  }).split(', ').pop() || reviewerTimezone;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Accept Interview Slot
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 pt-2">
              <p>
                You are about to accept the interview with <strong>{providerName}</strong>.
              </p>
              
              <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{dateStr}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{timeStr} {tzShort}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{durationMinutes} minutes</span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                A calendar invite and meeting link will be sent to both you and the provider.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Accept Interview
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
