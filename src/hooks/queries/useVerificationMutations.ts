/**
 * Mutation hooks for MOD-03 Verification actions.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      const msg = err.message === 'ALREADY_CLAIMED'
        ? 'This verification was already claimed by another admin.'
        : err.message === 'LOCK_CONFLICT'
        ? 'Another admin is claiming this right now. Try again.'
        : err.message === 'AT_CAPACITY'
        ? 'You are at maximum workload capacity.'
        : `Failed to claim: ${err.message}`;
      toast.error(msg);
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
      const msg = err.message === 'RELEASE_WINDOW_EXPIRED'
        ? 'Release window has expired. You can request reassignment instead.'
        : `Failed to release: ${err.message}`;
      toast.error(msg);
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
  });
}

/** Approve/Reject/Return verification */
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
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('platform_admin_profiles')
        .select('id, full_name')
        .eq('user_id', user?.id ?? '')
        .single();

      const updatePayload: Record<string, unknown> = {
        status: action,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      };

      if (action === 'Approved' || action === 'Rejected') {
        updatePayload.completed_at = new Date().toISOString();
        updatePayload.completed_by_admin_id = profile?.id;
      }

      const { error } = await supabase
        .from('platform_admin_verifications')
        .update(updatePayload)
        .eq('id', verificationId);

      if (error) throw new Error(error.message);

      // Mark assignment as non-current on completion
      if (action === 'Approved' || action === 'Rejected') {
        await supabase
          .from('verification_assignments')
          .update({ is_current: false, released_at: new Date().toISOString(), release_reason: action.toLowerCase() })
          .eq('verification_id', verificationId)
          .eq('is_current', true);
      }

      // Audit log
      await supabase.from('verification_assignment_log').insert({
        verification_id: verificationId,
        event_type: action.toUpperCase(),
        from_admin_id: profile?.id,
        initiator: profile?.full_name ?? 'system',
        reason: notes ?? `Verification ${action.toLowerCase()}`,
      });
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
      toast.error(`Action failed: ${err.message}`);
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
    onError: (err: Error) => toast.error(`Pin failed: ${err.message}`),
  });
}

/** Request reassignment */
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
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('platform_admin_profiles')
        .select('id, full_name')
        .eq('user_id', user?.id ?? '')
        .single();

      // Log the request
      await supabase.from('verification_assignment_log').insert({
        verification_id: verificationId,
        event_type: 'REASSIGNMENT_REQUESTED',
        from_admin_id: profile?.id,
        to_admin_id: targetAdminId ?? null,
        initiator: profile?.full_name ?? 'system',
        reason,
      });

      // Notify supervisors
      const { data: supervisors } = await supabase
        .from('platform_admin_profiles')
        .select('id')
        .or('is_supervisor.eq.true,admin_tier.eq.supervisor');

      if (supervisors && supervisors.length > 0) {
        const notifications = supervisors.map(sup => ({
          admin_id: sup.id,
          type: 'REASSIGNMENT_REQUEST',
          title: 'Reassignment Requested',
          body: `${profile?.full_name ?? 'An admin'} has requested reassignment. Reason: ${reason}`,
          deep_link: `/admin/verifications/${verificationId}`,
        }));
        await supabase.from('admin_notifications').insert(notifications);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verifications'] });
      toast.success('Reassignment request submitted');
    },
    onError: (err: Error) => toast.error(`Request failed: ${err.message}`),
  });
}
