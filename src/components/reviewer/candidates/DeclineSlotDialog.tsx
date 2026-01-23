/**
 * Decline Slot Dialog
 * 
 * Dialog for declining an interview slot with reason selection.
 */

import { useState } from "react";
import { XCircle, AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DeclineReason } from "@/hooks/queries/useReviewerSlotActions";

interface DeclineSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: DeclineReason, notes?: string) => void;
  isLoading: boolean;
  providerName: string;
}

const DECLINE_REASONS = [
  { value: 'poor_credentials', label: 'Poor Credentials' },
  { value: 'reviewer_unavailable', label: 'Reviewer Unavailable' },
] as const;

export function DeclineSlotDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  providerName,
}: DeclineSlotDialogProps) {
  const [reason, setReason] = useState<DeclineReason | ''>('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const handleConfirm = () => {
    if (reason) {
      onConfirm(reason, additionalNotes || undefined);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form on close
      setReason('');
      setAdditionalNotes('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Decline Interview Slot
          </DialogTitle>
          <DialogDescription>
            You are about to decline the interview with <strong>{providerName}</strong>.
            Please select a reason.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor="decline-reason">
              Reason for Declining <span className="text-destructive">*</span>
            </Label>
            <Select
              value={reason}
              onValueChange={(value) => setReason(value as DeclineReason)}
            >
              <SelectTrigger id="decline-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {DECLINE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warning based on reason */}
          {reason === 'poor_credentials' && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The provider will be notified that their application was declined due to 
                credentials not aligning with the selected role. They will need to wait 
                3 months before reapplying.
              </AlertDescription>
            </Alert>
          )}

          {reason === 'reviewer_unavailable' && (
            <Alert className="bg-amber-50 border-amber-200 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                The provider will be asked to select another available time slot from 
                your calendar. No negative impact on their application.
              </AlertDescription>
            </Alert>
          )}

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="additional-notes">
              Additional Notes (Optional)
            </Label>
            <Textarea
              id="additional-notes"
              placeholder="Add any additional context or notes..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Declining...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Decline Interview
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
