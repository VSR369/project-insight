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
import { AlertTriangle, Send, X } from "lucide-react";
import { PanelReviewer } from "@/hooks/queries/usePanelReviewers";

interface CancelInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewer: PanelReviewer | null;
  onConfirm: (reason?: string) => Promise<void>;
  isLoading?: boolean;
}

export function CancelInvitationDialog({
  open,
  onOpenChange,
  reviewer,
  onConfirm,
  isLoading,
}: CancelInvitationDialogProps) {
  const [reason, setReason] = useState("");

  if (!reviewer) return null;

  const isAccepted = reviewer.invitation_status === "ACCEPTED";
  const canSubmit = !isAccepted || reason.trim().length >= 10;

  const handleConfirm = async () => {
    await onConfirm(isAccepted ? reason : undefined);
    setReason("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {isAccepted ? "Cancel Accepted Invitation" : "Cancel Invitation?"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {isAccepted ? (
                <>
                  <p>
                    <strong>{reviewer.name}</strong> has already accepted this invitation.
                    Cancelling will:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    <li>Revoke their panel reviewer access</li>
                    <li>Send them a notification email with your reason</li>
                    <li>Mark them as inactive in the system</li>
                  </ul>
                  <div className="pt-2">
                    <Label htmlFor="reason" className="text-foreground">
                      Reason for cancellation <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="reason"
                      placeholder="Please provide a reason for this cancellation (minimum 10 characters)..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="mt-2 min-h-[100px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This reason will be included in the notification email sent to the reviewer.
                    </p>
                  </div>
                </>
              ) : (
                <p>
                  Are you sure you want to cancel the invitation for{" "}
                  <strong>{reviewer.name}</strong>?
                  <br /><br />
                  The reviewer has not yet accepted. They will no longer be able to use
                  the invitation link.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            <X className="mr-2 h-4 w-4" />
            Keep {isAccepted ? "Access" : "Invitation"}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !canSubmit}
          >
            {isAccepted && <Send className="mr-2 h-4 w-4" />}
            {isLoading
              ? "Cancelling..."
              : isAccepted
              ? "Send Regret & Cancel"
              : "Cancel Invitation"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
