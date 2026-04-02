/**
 * useCurationActionData — Data fetching & mutations for CurationActions.
 * Extracted from CurationActions.tsx (Batch B).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompletePhase } from '@/hooks/cogniblend/useCompletePhase';
import { computeQualityScore } from '@/lib/cogniblend/computeQualityScore';
import { handleMutationError } from '@/lib/errorHandler';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface UseCurationActionDataOptions {
  challengeId: string;
  checklistSummary: Array<{ id: number; label: string; passed: boolean; method: string }>;
  completedCount: number;
  totalCount: number;
  operatingModel?: string | null;
}

export function useCurationActionData({
  challengeId,
  checklistSummary,
  completedCount,
  totalCount,
  operatingModel,
}: UseCurationActionDataOptions) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const completePhase = useCompletePhase();
  const isMP = operatingModel === 'MP';

  // ── Modification points ──
  const { data: modPoints = [] } = useQuery({
    queryKey: ['modification-points', 'challenge', challengeId],
    queryFn: async () => {
      const { data: amendments } = await supabase
        .from('amendment_records')
        .select('id')
        .eq('challenge_id', challengeId);
      if (!amendments?.length) return [];
      const { data } = await supabase
        .from('modification_points')
        .select('severity, status')
        .in('amendment_id', amendments.map((a) => a.id));
      return data ?? [];
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });
  const hasOutstandingRequired = modPoints.some(
    (p: any) => p.severity === 'REQUIRED' && p.status === 'OUTSTANDING',
  );

  // ── Amendment count ──
  const { data: amendmentCount = 0 } = useQuery({
    queryKey: ['curation-amendments', challengeId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('amendment_records')
        .select('id', { count: 'exact', head: true })
        .eq('challenge_id', challengeId);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!challengeId,
    staleTime: 60_000,
  });

  // ── Creator user ID ──
  const { data: creatorUserId } = useQuery({
    queryKey: ['curation-creator', challengeId],
    queryFn: async () => {
      const query = supabase
        .from('user_challenge_roles' as any)
        .select('user_id')
        .eq('challenge_id', challengeId)
        .in('role_code', ['CR'])
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      const { data, error } = await query;
      if (error || !data) return null;
      return (data as any).user_id as string;
    },
    enabled: !!challengeId,
    staleTime: 5 * 60_000,
  });

  // ── Return mutation ──
  const returnMutation = useMutation({
    mutationFn: async (reason: string) => {
      const newAmendmentNumber = amendmentCount + 1;
      const { error: amendError } = await supabase.from('amendment_records').insert({
        challenge_id: challengeId,
        amendment_number: newAmendmentNumber,
        reason,
        initiated_by: 'curator',
        status: 'INITIATED',
        created_by: user?.id ?? null,
      } as any);
      if (amendError) throw new Error(amendError.message);

      await supabase.rpc('log_audit', {
        p_user_id: user?.id ?? '',
        p_challenge_id: challengeId,
        p_solution_id: '',
        p_action: 'CURATION_RETURNED',
        p_method: 'UI',
        p_details: {
          reason,
          amendment_number: newAmendmentNumber,
          cycle: `${newAmendmentNumber} of 3`,
        } as unknown as Json,
      });

      if (creatorUserId) {
        await supabase.from('cogni_notifications').insert({
          user_id: creatorUserId,
          challenge_id: challengeId,
          notification_type: 'curation_returned',
          title: 'Challenge returned for modification',
          message: `Challenge returned for modification. Reason: ${reason}. Cycle ${newAmendmentNumber} of 3.`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curation-amendments', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['curation-queue'] });
      toast.success('Challenge returned to creator for revision');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'curation_return_challenge' });
    },
  });

  // ── AM decline reason ──
  const isAmDeclined = false; // set by caller from phaseStatus
  const { data: amDeclineReason } = useQuery({
    queryKey: ['am-decline-reason', challengeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('amendment_records')
        .select('reason, created_at, amendment_number')
        .eq('challenge_id', challengeId)
        .eq('scope_of_change', 'AM_DECLINED')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });

  // ── Extended brief (CR approval check) ──
  const { data: extendedBrief } = useQuery({
    queryKey: ['challenge-extended-brief', challengeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('challenges')
        .select('extended_brief')
        .eq('id', challengeId)
        .single();
      return (data?.extended_brief as any) ?? {};
    },
    enabled: !!challengeId,
    staleTime: 5 * 60_000,
  });
  const crApprovalRequired = isMP && (extendedBrief?.creator_approval_required !== false);

  // ── CR Approval mutation ──
  const crApprovalMutation = useMutation({
    mutationFn: async () => {
      const { error: updateError } = await supabase
        .from('challenges')
        .update({ phase_status: 'CR_APPROVAL_PENDING' } as any)
        .eq('id', challengeId);
      if (updateError) throw new Error(updateError.message);

      try {
        await supabase
          .from('curation_progress' as any)
          .update({ status: 'sent_for_approval', updated_at: new Date().toISOString() } as any)
          .eq('challenge_id', challengeId);
      } catch { /* non-blocking */ }

      const { data: crRole } = await supabase
        .from('user_challenge_roles')
        .select('user_id')
        .eq('challenge_id', challengeId)
        .eq('role_code', 'CR')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const crUserId = (crRole as any)?.user_id;
      if (crUserId) {
        await supabase.from('cogni_notifications').insert({
          user_id: crUserId,
          challenge_id: challengeId,
          notification_type: 'cr_approval_requested',
          title: 'Challenge ready for your approval',
          message: 'The Curator has completed the challenge review. Please review and approve before publication.',
        });
      }

      await supabase.rpc('log_audit', {
        p_user_id: user?.id ?? '',
        p_challenge_id: challengeId,
        p_solution_id: '',
        p_action: 'CURATION_SENT_TO_CR',
        p_method: 'UI',
        p_phase_from: 3,
        p_phase_to: 3,
        p_details: {
          checklist: checklistSummary,
          completed_count: completedCount,
          total_count: totalCount,
          amendment_cycle: amendmentCount,
          target: 'CR_APPROVAL',
        } as unknown as Json,
      });
    },
    onSuccess: () => {
      toast.success('Challenge sent to Challenge Creator for approval.');
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['curation-queue'] });
        navigate('/cogni/curation');
      }, 1500);
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'curation_send_to_cr' });
    },
  });

  return {
    user,
    navigate,
    queryClient,
    completePhase,
    hasOutstandingRequired,
    amendmentCount,
    returnMutation,
    amDeclineReason,
    crApprovalRequired,
    crApprovalMutation,
    checklistSummary,
    completedCount,
    totalCount,
  };
}
