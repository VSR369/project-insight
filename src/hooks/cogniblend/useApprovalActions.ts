/**
 * useApprovalActions — Mutations for Approval Review actions:
 *   - Return for Modification (creates amendment_record, notifies Curator/Creator)
 *   - Reject Challenge (sets phase_status='TERMINAL', notifies all role holders)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import type { Json } from '@/integrations/supabase/types';

// ---------------------------------------------------------------------------
// Return for Modification
// ---------------------------------------------------------------------------

interface ReturnParams {
  challengeId: string;
  userId: string;
  reason: string;
  governanceProfile: string | null;
}

export function useReturnForModification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ReturnParams) => {
      // 1. Count existing amendments for numbering
      const { count } = await supabase
        .from('amendment_records')
        .select('*', { count: 'exact', head: true })
        .eq('challenge_id', params.challengeId);

      // 2. Insert amendment record
      const { error: amendError } = await supabase
        .from('amendment_records')
        .insert({
          challenge_id: params.challengeId,
          amendment_number: (count ?? 0) + 1,
          reason: params.reason,
          initiated_by: 'ID',
          status: 'INITIATED',
          scope_of_change: 'RETURNED_FOR_MODIFICATION',
          created_by: params.userId,
        });
      if (amendError) throw new Error(amendError.message);

      // 3. Identify target role (Curator for Enterprise, Creator for Lightweight)
      const targetRole =
        params.governanceProfile?.toUpperCase() === 'ENTERPRISE' ? 'R5' : 'R4';

      const { data: assignments } = await supabase
        .from('challenge_role_assignments')
        .select('pool_member_id')
        .eq('challenge_id', params.challengeId)
        .eq('role_code', targetRole)
        .eq('status', 'ACTIVE');

      if (assignments?.length) {
        const { data: poolData } = await supabase
          .from('platform_provider_pool')
          .select('id, created_by')
          .in(
            'id',
            assignments.map((a) => a.pool_member_id),
          );

        if (poolData?.length) {
          const userIds = poolData
            .map((p) => p.created_by)
            .filter((uid): uid is string => !!uid);
          if (userIds.length) {
            await supabase.from('cogni_notifications').insert(
              userIds.map((uid) => ({
                user_id: uid,
                challenge_id: params.challengeId,
                notification_type: 'RETURNED_FOR_MODIFICATION',
                title: 'Challenge Returned for Modification',
                message: params.reason,
              })),
            );
          }
        }
      }

      // 4. Audit trail
      await supabase.rpc('log_audit', {
        p_user_id: params.userId,
        p_challenge_id: params.challengeId,
        p_solution_id: '',
        p_action: 'RETURNED_FOR_MODIFICATION',
        p_method: 'UI',
        p_details: {
          reason: params.reason,
          target_role: targetRole,
        } as unknown as Json,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-review'] });
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
      queryClient.invalidateQueries({ queryKey: ['approval-amendments'] });
      toast.success('Challenge returned for modification');
    },
    onError: (error: Error) =>
      handleMutationError(error, { operation: 'return_for_modification' }),
  });
}

// ---------------------------------------------------------------------------
// Reject Challenge
// ---------------------------------------------------------------------------

interface RejectParams {
  challengeId: string;
  userId: string;
  reason: string;
}

export function useRejectChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RejectParams) => {
      // 1. Set phase_status = 'TERMINAL' (M-08 trigger handles master_status → CANCELLED)
      const { error: updateError } = await supabase
        .from('challenges')
        .update({
          phase_status: 'TERMINAL',
          updated_by: params.userId,
        })
        .eq('id', params.challengeId);
      if (updateError) throw new Error(updateError.message);

      // 2. Notify all active role holders
      const { data: assignments } = await supabase
        .from('challenge_role_assignments')
        .select('pool_member_id')
        .eq('challenge_id', params.challengeId)
        .eq('status', 'ACTIVE');

      if (assignments?.length) {
        const { data: poolData } = await supabase
          .from('platform_provider_pool')
          .select('id, created_by')
          .in(
            'id',
            assignments.map((a) => a.pool_member_id),
          );

        if (poolData?.length) {
          const uniqueUsers = [
            ...new Set(
              poolData
                .map((p) => p.created_by)
                .filter((uid): uid is string => !!uid),
            ),
          ];
          if (uniqueUsers.length) {
            await supabase.from('cogni_notifications').insert(
              uniqueUsers.map((uid) => ({
                user_id: uid,
                challenge_id: params.challengeId,
                notification_type: 'CHALLENGE_REJECTED',
                title: 'Challenge Rejected',
                message: params.reason,
              })),
            );
          }
        }
      }

      // 3. Audit trail
      await supabase.rpc('log_audit', {
        p_user_id: params.userId,
        p_challenge_id: params.challengeId,
        p_solution_id: '',
        p_action: 'CHALLENGE_REJECTED',
        p_method: 'UI',
        p_details: { reason: params.reason } as unknown as Json,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-review'] });
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
      toast.success('Challenge rejected');
    },
    onError: (error: Error) =>
      handleMutationError(error, { operation: 'reject_challenge' }),
  });
}
