/**
 * SupervisorDeactivationConfirmModal — BR-PP-002 confirmation flow
 * When Senior Admin deactivates a pool member created by a Supervisor,
 * require explicit acknowledgment before proceeding.
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";

interface SupervisorDeactivationConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  onConfirm: () => void;
  isPending: boolean;
}

const CONFIRMATION_TEXT = "CONFIRM";

export function SupervisorDeactivationConfirmModal({
  open,
  onOpenChange,
  memberName,
  onConfirm,
  isPending,
}: SupervisorDeactivationConfirmModalProps) {
  const [confirmInput, setConfirmInput] = useState("");
  const isValid = confirmInput.trim().toUpperCase() === CONFIRMATION_TEXT;

  const handleConfirm = () => {
    if (isValid) {
      onConfirm();
      setConfirmInput("");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) setConfirmInput(""); onOpenChange(v); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Supervisor-Created Member
          </AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{memberName}</strong> was created by a Supervisor-tier admin.
            Deactivating this member requires explicit confirmation per governance rules.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/30">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
            This action will be logged and the creating Supervisor will be notified.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="confirm-deactivation" className="text-sm">
            Type <strong>{CONFIRMATION_TEXT}</strong> to proceed
          </Label>
          <Input
            id="confirm-deactivation"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={CONFIRMATION_TEXT}
            className="text-base"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isValid || isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Deactivating..." : "Deactivate Member"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
