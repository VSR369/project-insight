/**
 * LcApproveAction — Approve button for LC to mark legal compliance complete.
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

interface LcApproveActionProps {
  challengeId: string;
  userId: string;
  disabled?: boolean;
}

export function LcApproveAction({ challengeId, userId, disabled }: LcApproveActionProps) {
  const qc = useQueryClient();

  const approveMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('challenges')
        .update({
          lc_compliance_complete: true,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', challengeId);
      if (error) throw new Error(error.message);

      // Update all assembled CPA docs to APPROVED
      await supabase
        .from('challenge_legal_docs')
        .update({
          status: 'APPROVED',
          lc_status: 'approved',
          lc_reviewed_by: userId,
          lc_reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
          updated_by: userId,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('challenge_id', challengeId)
        .eq('is_assembled', true);

      // Audit trail
      await supabase.from('audit_trail').insert({
        action: 'LC_COMPLIANCE_APPROVED',
        method: 'UI',
        user_id: userId,
        challenge_id: challengeId,
        details: { approved_at: new Date().toISOString() },
      });
    },
    onSuccess: () => {
      toast.success('Legal compliance approved');
      qc.invalidateQueries({ queryKey: ['challenge-lc-detail', challengeId] });
      qc.invalidateQueries({ queryKey: ['assembled-cpa', challengeId] });
    },
    onError: (e) => handleMutationError(e as Error, { operation: 'lc_approve_compliance' }),
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" disabled={disabled || approveMut.isPending}>
          {approveMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
          )}
          Approve Legal Compliance
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve Legal Compliance</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the legal compliance as complete for this challenge.
            All assembled CPA documents will be set to APPROVED status.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => approveMut.mutate()}>
            Confirm Approval
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
