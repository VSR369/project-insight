/**
 * LcReturnToCurator — Dialog for LC to return challenge to curation with reason.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RotateCcw, Loader2 } from 'lucide-react';
import { useUnfreezeForRecuration } from '@/hooks/cogniblend/useFreezeActions';

interface LcReturnToCuratorProps {
  challengeId: string;
  userId: string;
  disabled?: boolean;
}

export function LcReturnToCurator({ challengeId, userId, disabled }: LcReturnToCuratorProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const unfreezeMut = useUnfreezeForRecuration(challengeId);

  const handleReturn = () => {
    if (reason.trim().length < 10) return;
    unfreezeMut.mutate(
      { userId, reason: reason.trim() },
      { onSuccess: () => { setOpen(false); setReason(''); } },
    );
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <RotateCcw className="h-4 w-4 mr-1.5" />
        Return to Curator
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return to Curator</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Reason for returning (minimum 10 characters)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain what needs to be revised..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleReturn}
              disabled={reason.trim().length < 10 || unfreezeMut.isPending}
            >
              {unfreezeMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : null}
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
