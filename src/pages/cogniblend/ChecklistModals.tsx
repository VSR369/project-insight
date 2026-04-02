/**
 * ChecklistModals — Incomplete items + Return to Creator modals.
 * Extracted from CurationChecklistPanel.tsx.
 */

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { XCircle, Lock, AlertTriangle, Loader2 } from "lucide-react";

interface ChecklistItem {
  id: number;
  label: string;
  locked: boolean;
}

interface IncompleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uncheckedItems: ChecklistItem[];
}

export function IncompleteItemsModal({ open, onOpenChange, uncheckedItems }: IncompleteModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Cannot Submit — Incomplete Items</DialogTitle>
          <DialogDescription>All 15 checklist items must be complete before submitting.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-2">
          {uncheckedItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive shrink-0" />
              <span className="text-sm text-foreground">{item.id}. {item.label}</span>
              {item.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFinalCycle: boolean;
  returnReason: string;
  onReasonChange: (reason: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

export function ReturnToCreatorModal({
  open, onOpenChange, isFinalCycle, returnReason, onReasonChange, onSubmit, isPending,
}: ReturnModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Return to Creator</DialogTitle>
          <DialogDescription>Provide the reason for returning this challenge for revision.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-3">
          {isFinalCycle && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                This is the final modification cycle. The challenge will be rejected if not resolved after this return.
              </p>
            </div>
          )}
          <div>
            <Label htmlFor="return-reason">Reason for Return *</Label>
            <Textarea
              id="return-reason"
              value={returnReason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Describe what needs to be corrected (min 10 characters)..."
              className="mt-2"
              rows={5}
            />
            {returnReason.trim().length > 0 && returnReason.trim().length < 10 && (
              <p className="text-xs text-destructive mt-1">Reason must be at least 10 characters.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={onSubmit}
            disabled={returnReason.trim().length < 10 || isPending}
            className="border-amber-500 bg-amber-500 text-white hover:bg-amber-600"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
