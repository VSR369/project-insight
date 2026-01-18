import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PanelReviewer, useRejectReviewer } from "@/hooks/queries/usePanelReviewers";

interface RejectReviewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewer: PanelReviewer | null;
}

export function RejectReviewerDialog({
  open,
  onOpenChange,
  reviewer,
}: RejectReviewerDialogProps) {
  const [reason, setReason] = useState("");
  const rejectMutation = useRejectReviewer();

  const handleReject = async () => {
    if (!reviewer || reason.trim().length < 10) return;

    await rejectMutation.mutateAsync({
      reviewerId: reviewer.id,
      reason: reason.trim(),
    });

    setReason("");
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
    }
    onOpenChange(newOpen);
  };

  const isValid = reason.trim().length >= 10;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Application</AlertDialogTitle>
          <AlertDialogDescription>
            Reject the reviewer application from{" "}
            <span className="font-medium text-foreground">{reviewer?.name}</span>.
            Please provide a reason for rejection.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="rejection-reason">
            Rejection Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="rejection-reason"
            placeholder="Please explain why this application is being rejected..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[100px]"
          />
          <p className="text-xs text-muted-foreground">
            Minimum 10 characters required ({reason.length}/10)
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={rejectMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={!isValid || rejectMutation.isPending}
          >
            {rejectMutation.isPending ? "Rejecting..." : "Reject Application"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
