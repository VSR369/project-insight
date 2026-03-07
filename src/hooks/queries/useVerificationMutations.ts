/**
 * Mutation hooks for MOD-03 Verification actions.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

/** Claim a queue entry */
export function useClaimFromQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (queueEntryId: string) => {
      const { data, error } = await supabase.rpc('claim_from_queue', {
        p_queue_entry_id: queueEntryId,
      });
      if (error) throw new Error(error.message);
      const result = data as { success: boolean; error?: string; verification_id?: string; claimed_by_name?: string };
      if (!result.success) throw new Error(result.error ?? 'Claim failed');
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verifications'] });
      toast.success('Verification claimed successfully');
    },
    onError: (err: Error) => {
      const knownErrors: Record<string, string> = {
        ALREADY_CLAIMED: 'This verification was already claimed by another admin.',
        LOCK_CONFLICT: 'Another admin is claiming this right now. Try again.',
        AT_CAPACITY: 'You are at maximum workload capacity.',
      };
      const msg = knownErrors[err.message];
      if (msg) {
        toast.error(msg);
      } else {
        handleMutationError(err, { operation: 'claim_from_queue' });
      }
    },
  });
}

/** Release a verification back to queue */
export function useReleaseToQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ verificationId, reason }: { verificationId: string; reason: string }) => {
      const { data, error } = await supabase.rpc('release_to_queue', {
        p_verification_id: verificationId,
        p_reason: reason,
      });
      if (error) throw new Error(error.message);
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error ?? 'Release failed');
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verifications'] });
      toast.success('Verification released to queue');
    },
    onError: (err: Error) => {
      if (err.message === 'RELEASE_WINDOW_EXPIRED') {
        toast.error('Release window has expired. You can request reassignment instead.');
      } else {
        handleMutationError(err, { operation: 'release_to_queue' });
      }
    },
  });
}

/** Update a single V1-V6 check result (auto-save) */
export function useUpdateCheckResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      checkId,
      result,
      notes,
    }: {
      checkId: string;
      result: 'Pass' | 'Fail' | 'Pending';
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('verification_check_results')
        .update({
          result,
          notes: notes ?? null,
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', checkId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verifications', 'detail'] });
    },
    onError: (err: Error) => {
      handleMutationError(err, { operation: 'update_check_result' });
    },
  });
}

/** Approve/Reject/Return verification (atomic RPC) */
export function useVerificationAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      verificationId,
      action,
      notes,
    }: {
      verificationId: string;
      action: 'Approved' | 'Rejected' | 'Returned_for_Correction';
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('complete_verification_action', {
        p_verification_id: verificationId,
        p_action: action,
        p_notes: notes ?? null,
      });
      if (error) throw new Error(error.message);
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error ?? 'Action failed');
      return result;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['verifications'] });
      const labels: Record<string, string> = {
        Approved: 'Verification approved successfully',
        Rejected: 'Verification rejected',
        Returned_for_Correction: 'Returned for correction',
      };
      toast.success(labels[variables.action]);
    },
    onError: (err: Error) => {
      handleMutationError(err, { operation: 'verification_action' });
    },
  });
}

/** Supervisor pin/unpin queue entry */
export function usePinQueueEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId, isPinned }: { entryId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('open_queue_entries')
        .update({ is_pinned: isPinned })
        .eq('id', entryId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['verifications', 'open-queue'] });
      toast.success(variables.isPinned ? 'Entry pinned' : 'Entry unpinned');
    },
    onError: (err: Error) => {
      handleMutationError(err, { operation: 'pin_queue_entry' });
    },
  });
}

/** Request reassignment (server-side RPC) */
export function useRequestReassignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      verificationId,
      reason,
      targetAdminId,
    }: {
      verificationId: string;
      reason: string;
      targetAdminId?: string;
    }) => {
      const { data, error } = await supabase.rpc('request_reassignment', {
        p_verification_id: verificationId,
        p_reason: reason,
        p_target_admin_id: targetAdminId ?? null,
      });
      if (error) throw new Error(error.message);
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error ?? 'Request failed');
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verifications'] });
      toast.success('Reassignment request submitted');
    },
    onError: (err: Error) => {
      handleMutationError(err, { operation: 'request_reassignment' });
    },
  });
}
