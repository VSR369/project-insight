/**
 * Cancel Accepted Slot Dialog
 * 
 * Dialog for reviewers to cancel an already-accepted interview slot.
 * Requires a mandatory cancellation reason which will be sent to the provider.
 */

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

export function CancelAcceptedSlotDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  scheduledAt,
  durationMinutes,
  reviewerTimezone,
  providerName,
}: CancelAcceptedSlotDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Format the scheduled time for display
  const formattedDate = scheduledAt
    ? formatInTimeZone(parseISO(scheduledAt), reviewerTimezone, "EEEE, MMMM d, yyyy")
    : "";
  const formattedTime = scheduledAt
    ? formatInTimeZone(parseISO(scheduledAt), reviewerTimezone, "h:mm a zzz")
    : "";

  const handleSubmit = () => {
    // Validate reason
    if (!reason.trim()) {
      setError("Please provide a reason for cancellation.");
      return;
    }
    if (reason.trim().length < 10) {
      setError("Please provide a more detailed reason (minimum 10 characters).");
      return;
    }

    setError(null);
    onConfirm(reason.trim());
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason("");
      setError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancel Interview
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this confirmed interview?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Interview Details */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Provider:</span>{" "}
              <span className="font-medium">{providerName}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Date:</span>{" "}
              <span className="font-medium">{formattedDate}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Time:</span>{" "}
              <span className="font-medium">{formattedTime}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Duration:</span>{" "}
              <span className="font-medium">{durationMinutes} minutes</span>
            </p>
          </div>

          {/* Warning */}
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              The provider will be notified and asked to select a new time slot.
              Only cancel if you cannot attend.
            </AlertDescription>
          </Alert>

          {/* Reason Field */}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason" className="text-sm font-medium">
              Reason for Cancellation <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="Please explain why you need to cancel this interview..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              className="min-h-[100px] resize-none"
              disabled={isLoading}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <p className="text-xs text-muted-foreground">
              This reason will be shared with the provider in the notification.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Keep Interview
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isLoading || !reason.trim()}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Cancel Interview"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
