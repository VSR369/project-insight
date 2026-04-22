/**
 * FcReturnToCurator — Dialog for FC to return a challenge to the Curator
 * with a structured reason. Logs an audit_trail row and notifies active
 * Curator(s).
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RotateCcw, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { getActiveRoleUsers } from '@/lib/cogniblend/challengeRoleLookup';

interface FcReturnToCuratorProps {
  challengeId: string;
  userId: string;
  disabled?: boolean;
}

export function FcReturnToCurator({ challengeId, userId, disabled }: FcReturnToCuratorProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const returnMut = useMutation({
    mutationFn: async (vars: { reason: string }) => {
      // 1. Audit trail row.
      const { error: auditErr } = await supabase.from('audit_trail').insert({
        user_id: userId,
        challenge_id: challengeId,
        action: 'FC_RETURNED_TO_CURATOR',
        method: 'FC_MANUAL',
        details: { reason: vars.reason },
      } as never);
      if (auditErr) throw new Error(auditErr.message);

      // 2. Notify active Curator(s) — fire and forget per recipient.
      const curatorIds = await getActiveRoleUsers(challengeId, ['CU']);
      if (curatorIds.length > 0) {
        const notifications = curatorIds.map((uid) => ({
          user_id: uid,
          notification_type: 'FC_RETURNED_TO_CURATOR',
          title: 'Challenge returned by Finance Coordinator',
          message: vars.reason,
          challenge_id: challengeId,
        }));
        await supabase.from('cogni_notifications').insert(notifications);
      }
    },
    onSuccess: () => {
      toast.success('Challenge returned to Curator');
      queryClient.invalidateQueries({ queryKey: ['fc-challenge-queue'] });
      queryClient.invalidateQueries({ queryKey: ['fc-escrow-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
      setOpen(false);
      setReason('');
    },
    onError: (err: Error) => {
      handleMutationError(err, { operation: 'fc_return_to_curator' });
    },
  });

  const handleReturn = () => {
    if (reason.trim().length < 10) return;
    returnMut.mutate({ reason: reason.trim() });
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
              placeholder="Explain what needs to be revised before escrow can be confirmed..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReturn}
              disabled={reason.trim().length < 10 || returnMut.isPending}
            >
              {returnMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FcReturnToCurator;
