/**
 * useChallengeForm — Data hooks for the Challenge Creation / Edit wizard.
 * 
 * - useChallengeDetail: Fetch existing challenge for edit mode
 * - useMandatoryFields: Call get_mandatory_fields RPC
 * - useSaveChallengeStep: Persist step data without advancing phase
 * - useSubmitChallenge: Final submission (complete_phase)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withUpdatedBy } from '@/lib/auditFields';
import { normalizeChallengeFields } from '@/lib/cogniblend/challengeFieldNormalizer';
import { CACHE_STABLE, CACHE_STANDARD } from '@/config/queryCache';

/* ─── Types ──────────────────────────────────────────────── */

export interface ChallengeDetail {
  id: string;
  title: string;
  description: string | null;
  problem_statement: string | null;
  scope: string | null;
  deliverables: unknown;
  evaluation_criteria: unknown;
  reward_structure: Record<string, unknown> | null;
  maturity_level: string | null;
  phase_schedule: Record<string, unknown> | null;
  complexity_parameters: Record<string, unknown> | null;
  ip_model: string | null;
  visibility: string | null;
  eligibility: string | null;
  submission_deadline: string | null;
  governance_profile: string | null;
  governance_mode_override: string | null;
  operating_model: string | null;
  current_phase: number | null;
  master_status: string | null;
  max_solutions: number | null;
  currency_code: string | null;
  solver_eligibility_types: unknown;
  solver_visibility_types: unknown;
  solver_eligibility_id: string | null;
  challenge_visibility: string | null;
  hook: string | null;
  effort_level: string | null;
  extended_brief: Record<string, unknown> | null;
  eligibility_model: string | null;
  domain_tags: unknown;
  targeting_filters: Record<string, unknown> | null;
  ai_section_reviews: unknown;
}

/* ─── useChallengeDetail ─────────────────────────────────── */

export function useChallengeDetail(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['challenge-detail', challengeId],
    queryFn: async (): Promise<ChallengeDetail | null> => {
      if (!challengeId) return null;

      const { data, error } = await supabase
        .from('challenges')
        .select(`
          id, title, description, problem_statement, scope,
          deliverables, evaluation_criteria, reward_structure,
          maturity_level, phase_schedule, complexity_parameters,
          ip_model, visibility, eligibility, submission_deadline,
          governance_profile, operating_model, current_phase,
          master_status, max_solutions, currency_code,
          solver_eligibility_types, solver_visibility_types,
          solver_eligibility_id,
          challenge_visibility, hook, effort_level,
          extended_brief, eligibility_model, domain_tags,
          targeting_filters, ai_section_reviews
        `)
        .eq('id', challengeId)
        .eq('is_deleted', false)
        .single();

      if (error) throw new Error(error.message);
      return data as ChallengeDetail;
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });
}

/* ─── useMandatoryFields ─────────────────────────────────── */

export function useMandatoryFields(governanceProfile: string | null) {
  return useQuery({
    queryKey: ['mandatory-fields', governanceProfile],
    queryFn: async (): Promise<string[]> => {
      const profile = governanceProfile || 'ENTERPRISE';
      const { data, error } = await supabase.rpc('get_mandatory_fields', {
        p_governance_profile: profile,
      });
      if (error) throw new Error(error.message);
      return (data as string[]) ?? [];
    },
    enabled: !!governanceProfile,
    ...CACHE_STABLE,
  });
}

/* ─── useSaveChallengeStep ───────────────────────────────── */

export function useSaveChallengeStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      challengeId,
      fields,
    }: {
      challengeId: string;
      fields: Record<string, unknown>;
    }) => {
      // Strip immutable fields that DB triggers reject after phase 1
      const IMMUTABLE_AFTER_CREATION = ['governance_profile', 'operating_model', 'organization_id', 'tenant_id'];
      const safeFields = { ...fields };
      for (const key of IMMUTABLE_AFTER_CREATION) {
        delete safeFields[key];
      }
      const normalized = normalizeChallengeFields(safeFields);
      const withAudit = await withUpdatedBy(normalized);
      const { error } = await supabase
        .from('challenges')
        .update(withAudit as any)
        .eq('id', challengeId);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['challenge-detail', variables.challengeId],
      });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'save_challenge_step' });
    },
  });
}

/* ─── useSubmitChallengeForReview ─────────────────────────── */

export function useSubmitChallengeForReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      challengeId,
      userId,
    }: {
      challengeId: string;
      userId: string;
    }) => {
      const { data, error } = await supabase.rpc('complete_phase', {
        p_challenge_id: challengeId,
        p_user_id: userId,
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success('Challenge submitted for review');
      queryClient.invalidateQueries({ queryKey: ['challenge-detail'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-waiting-for'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'submit_challenge_for_review' });
    },
  });
}
