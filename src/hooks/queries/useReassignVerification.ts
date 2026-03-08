/**
 * Mutation hook for MOD-06: Supervisor reassign verification
 * Calls reassign_verification RPC + marks reassignment_requests as APPROVED
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { toast } from 'sonner';

interface ReassignParams {
  verificationId: string;
  toAdminId: string | null; // null = open queue
  reason: string;
  initiator?: 'SUPERVISOR' | 'SYSTEM';
  trigger?: 'MANUAL' | 'ADMIN_REQUEST';
  /** If actioning from inbox, the reassignment_request ID to mark APPROVED */
  requestId?: string;
}

export function useReassignVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      verificationId,
      toAdminId,
      reason,
      initiator = 'SUPERVISOR',
      trigger = 'MANUAL',
      requestId,
    }: ReassignParams) => {
      const { data, error } = await supabase.rpc('reassign_verification', {
        p_verification_id: verificationId,
        p_to_admin_id: toAdminId,
        p_reason: reason,
        p_initiator: initiator,
        p_trigger: trigger,
      });
      if (error) throw new Error(error.message);
      const result = data as { success: boolean; error?: string; from_admin_id?: string; to_admin_id?: string };
      if (!result.success) throw new Error(result.error ?? 'Reassignment failed');

      // Mark request as APPROVED if from inbox
      if (requestId) {
        const { data: profile } = await supabase
          .from('platform_admin_profiles')
          .select('id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
          .single();

        await supabase
          .from('reassignment_requests')
          .update({
            status: 'APPROVED',
            actioned_by_id: profile?.id,
            actioned_at: new Date().toISOString(),
          })
          .eq('id', requestId);
      }

      // BR-MPA-042: Notify via edge function
      try {
        await supabase.functions.invoke('notify-admin-assignment', {
          body: {
            verification_id: verificationId,
            admin_id: toAdminId,
            assignment_method: 'REASSIGNED_SUPERVISOR',
            notification_type: 'REASSIGNMENT',
          },
        });
      } catch {
        // Non-blocking notification
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reassignment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['verifications'] });
      toast.success('Verification reassigned successfully');
    },
    onError: (err: Error) => {
      const knownErrors: Record<string, string> = {
        VERIFICATION_NOT_FOUND: 'Verification not found.',
        TARGET_AT_CAPACITY: 'Target admin is at maximum capacity.',
        TARGET_ADMIN_NOT_FOUND: 'Target admin not found or inactive.',
        REASSIGNMENT_LIMIT_REACHED: 'Reassignment limit reached for this verification.',
      };
      const msg = knownErrors[err.message];
      if (msg) {
        toast.error(msg);
      } else {
        handleMutationError(err, { operation: 'reassign_verification' });
      }
    },
  });
}
