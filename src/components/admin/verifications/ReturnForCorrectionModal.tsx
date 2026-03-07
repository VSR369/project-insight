import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ReturnForCorrectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes: string) => void;
  isPending: boolean;
}

/**
 * GAP-16: Return for Correction confirmation dialog with optional notes
 */
export function ReturnForCorrectionModal({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: ReturnForCorrectionModalProps) {
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(notes);
    setNotes('');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Return for Correction?</AlertDialogTitle>
          <AlertDialogDescription>
            This will return the verification to the registrant for corrections.
            They will be notified to update their submission.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-3">
          <Label htmlFor="return-notes" className="text-sm font-medium">
            Notes (optional)
          </Label>
          <Textarea
            id="return-notes"
            placeholder="Describe what needs to be corrected..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1.5"
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
          >
            {isPending ? 'Returning...' : 'Confirm Return'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
