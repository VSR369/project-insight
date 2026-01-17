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
import { AlertTriangle, Send, Trash2, X } from "lucide-react";
import { PanelReviewer } from "@/hooks/queries/usePanelReviewers";

interface DeleteReviewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewer: PanelReviewer | null;
  onConfirm: (reason?: string) => Promise<void>;
  isLoading?: boolean;
}

export function DeleteReviewerDialog({
  open,
  onOpenChange,
  reviewer,
  onConfirm,
  isLoading,
}: DeleteReviewerDialogProps) {
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
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {isAccepted ? "Delete Active Panel Reviewer" : "Delete Panel Reviewer?"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {isAccepted ? (
                <>
                  <p>
                    <strong>{reviewer.name}</strong> is an active panel member who has
                    accepted their invitation. Deleting will:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                    <li>Permanently remove their account and access</li>
                    <li>Revoke all panel reviewer privileges</li>
                    <li>Send them a notification email explaining the removal</li>
                  </ul>
                  <div className="pt-2">
                    <Label htmlFor="delete-reason" className="text-foreground">
                      Reason for removal <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="delete-reason"
                      placeholder="Please provide a reason for this removal (minimum 10 characters)..."
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
                  Are you sure you want to permanently delete{" "}
                  <strong>{reviewer.name}</strong>?
                  <br /><br />
                  This reviewer has not accepted their invitation. This action will:
                </p>
              )}
              {!isAccepted && (
                <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                  <li>Remove the reviewer record permanently</li>
                  <li>Revoke any pending invitation link</li>
                </ul>
              )}
              <p className="text-sm font-medium text-destructive pt-2">
                ⚠️ This action cannot be undone.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !canSubmit}
          >
            {isAccepted ? (
              <>
                <Send className="mr-2 h-4 w-4" />
                {isLoading ? "Deleting..." : "Delete & Notify"}
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                {isLoading ? "Deleting..." : "Delete Permanently"}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
