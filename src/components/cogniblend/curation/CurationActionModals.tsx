/**
 * CurationActionModals — Return-to-Creator and Incomplete Items dialogs
 * extracted from CurationActions.
 */

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { XCircle, AlertTriangle, Loader2, Lock } from "lucide-react";

/* ─── Incomplete Items Modal ─── */

interface IncompleteItemsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uncheckedItems: Array<{ id: number; label: string; passed: boolean; method: string }>;
}

export function IncompleteItemsModal({ open, onOpenChange, uncheckedItems }: IncompleteItemsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Cannot Submit — Incomplete Items</DialogTitle>
          <DialogDescription>
            All 15 checklist items must be complete before submitting.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-2">
          {uncheckedItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive shrink-0" />
              <span className="text-sm text-foreground">
                {item.id}. {item.label}
              </span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Return to Creator Modal ─── */

interface ReturnToCreatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnReason: string;
  onReturnReasonChange: (reason: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  isFinalCycle: boolean;
}

export function ReturnToCreatorModal({
  open,
  onOpenChange,
  returnReason,
  onReturnReasonChange,
  onSubmit,
  isPending,
  isFinalCycle,
}: ReturnToCreatorModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Return to Creator</DialogTitle>
          <DialogDescription>
            Provide the reason for returning this challenge for revision.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-3">
          {isFinalCycle && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                This is the final modification cycle. The challenge will be rejected if not
                resolved after this return.
              </p>
            </div>
          )}
          <div>
            <Label htmlFor="return-reason">Reason for Return *</Label>
            <Textarea
              id="return-reason"
              value={returnReason}
              onChange={(e) => onReturnReasonChange(e.target.value)}
              placeholder="Describe what needs to be corrected (min 10 characters)..."
              className="mt-2"
              rows={5}
            />
            {returnReason.trim().length > 0 && returnReason.trim().length < 10 && (
              <p className="text-xs text-destructive mt-1">
                Reason must be at least 10 characters.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={returnReason.trim().length < 10 || isPending}
            className="border-amber-500 bg-amber-500 text-white hover:bg-amber-600"
          >
            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            )}
            Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
