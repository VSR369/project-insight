/**
 * SCR-15: Deactivation Check Confirmation — intermediate modal before orphan wizard
 * Shows admin name and impact summary before proceeding
 */

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeactivationCheckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminName: string;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function DeactivationCheckModal({
  open,
  onOpenChange,
  adminName,
  onConfirm,
  isSubmitting,
}: DeactivationCheckModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirm Deactivation
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to deactivate <strong>{adminName}</strong>?
            </p>
            <p className="text-xs">
              Any role assignments or domain responsibilities held by this admin may become orphaned
              and will need to be reassigned to another admin.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Deactivate Admin
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
