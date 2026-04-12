/**
 * useSaveDraft / useUpdateDraft — Draft save and update hooks.
 * Extracted from useChallengeSubmit.ts for R1 compliance.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import {
  fetchGovernanceFieldRules,
  stripHiddenFields,
} from '@/lib/cogniblend/governanceFieldFilter';
import {
  type DraftPayload,
  normalizeConstrainedChallengeFields,
  buildChallengeUpdatePayload,
} from '@/lib/cogniblend/challengePayloads';

export type { DraftPayload };

export function useSaveDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DraftPayload): Promise<{ challengeId: string }> => {
      const title = payload.title?.trim() || payload.businessProblem.substring(0, 100).trim() || 'Untitled Draft';
      const effectiveMode = payload.governanceModeOverride ?? 'STRUCTURED';
      const governanceRules = await fetchGovernanceFieldRules(effectiveMode);
      const fp = stripHiddenFields(payload as unknown as Record<string, unknown>, governanceRules) as unknown as DraftPayload;
      const normalizedConstrainedFields = normalizeConstrainedChallengeFields(fp);

      const { data: challengeId, error: initError } = await supabase.rpc('initialize_challenge', {
        p_org_id: payload.orgId, p_creator_id: payload.creatorId, p_title: title, p_operating_model: payload.operatingModel,
        p_governance_mode_override: payload.governanceModeOverride ?? null,
      });
      if (initError) throw new Error(initError.message);
      if (!challengeId) throw new Error('Failed to create draft');

      const updatePayload = buildChallengeUpdatePayload(fp, payload, normalizedConstrainedFields, governanceRules);
      const { error: updateError } = await supabase.from('challenges').update(updatePayload as Record<string, unknown>).eq('id', challengeId);
      if (updateError) throw new Error(updateError.message);

      return { challengeId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cogni-my-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tier_limit_check'] });
      queryClient.invalidateQueries({ queryKey: ['org-solution-requests'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'save_solution_request_draft' });
    },
  });
}

export function useUpdateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DraftPayload & { challengeId: string }): Promise<{ challengeId: string }> => {
      const effectiveMode = payload.governanceModeOverride ?? 'STRUCTURED';
      const governanceRules = await fetchGovernanceFieldRules(effectiveMode);
      const fp = stripHiddenFields(payload as unknown as Record<string, unknown>, governanceRules) as unknown as (DraftPayload & { challengeId: string });
      const normalizedConstrainedFields = normalizeConstrainedChallengeFields(fp);

      const updatePayload = buildChallengeUpdatePayload(fp, payload, normalizedConstrainedFields, governanceRules);
      const { error: updateError } = await supabase.from('challenges').update(updatePayload as Record<string, unknown>).eq('id', payload.challengeId);
      if (updateError) throw new Error(updateError.message);

      return { challengeId: payload.challengeId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cogni-my-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['public-challenge', result.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['challenge-detail', result.challengeId] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_draft' });
    },
  });
}
