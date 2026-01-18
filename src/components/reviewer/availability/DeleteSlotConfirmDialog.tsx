/**
 * Delete Slot Confirmation Dialog
 * 
 * Shows confirmation before deleting an existing availability slot.
 */

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

interface DeleteSlotConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
  slotStartAt?: string;
  slotEndAt?: string;
}

export function DeleteSlotConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  slotStartAt,
  slotEndAt,
}: DeleteSlotConfirmDialogProps) {
  const startDate = slotStartAt ? new Date(slotStartAt) : null;
  const endDate = slotEndAt ? new Date(slotEndAt) : null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this availability slot?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {startDate && endDate ? (
              <>
                <p>
                  This slot on <strong>{formatSlotDate(startDate)}</strong> from{" "}
                  <strong>{formatSlotTimeRange(startDate, endDate)}</strong> will be
                  permanently removed.
                </p>
                <p className="text-muted-foreground">
                  Providers will no longer be able to book this time slot.
                </p>
              </>
            ) : (
              <p>This slot will be permanently removed.</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete Slot"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
