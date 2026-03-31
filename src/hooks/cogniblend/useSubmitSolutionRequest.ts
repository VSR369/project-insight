/**
 * useSubmitSolutionRequest — Orchestrates challenge creation.
 * Role Architecture v2: CR creates challenge → moves to curation-ready (phase 2).
 * No CA assignment. Source role always 'CR'.
 *
 * useSaveDraft — Saves challenge in Phase 1 without advancing.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

interface SubmitPayload {
  orgId: string;
  creatorId: string;
  operatingModel: string;
  title?: string;
  businessProblem: string;
  expectedOutcomes: string;
  constraints?: string;
  currency: string;
  budgetMin: number;
  budgetMax: number;
  expectedTimeline: string;
  domainTags: string[];
  urgency: string;
  industrySegmentId?: string;
  subDomainIds?: string[];
  specialtyTags?: string[];
  beneficiariesMapping?: string;
  templateId?: string;
  governanceModeOverride?: string;
}

interface SubmitResult {
  challengeId: string;
}

export function useSubmitSolutionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SubmitPayload): Promise<SubmitResult> => {
      // 1. Initialize challenge via RPC
      const title = payload.title?.trim() || payload.businessProblem.substring(0, 100).trim();

      const { data: challengeId, error: initError } = await supabase.rpc(
        'initialize_challenge',
        {
          p_org_id: payload.orgId,
          p_creator_id: payload.creatorId,
          p_title: title,
          p_operating_model: payload.operatingModel,
        },
      );

      if (initError) throw new Error(initError.message);
      if (!challengeId) throw new Error('Failed to create challenge');

      // 2. Update challenge with form fields — source role always 'CR'
      const rewardStructure = {
        currency: payload.currency,
        budget_min: payload.budgetMin,
        budget_max: payload.budgetMax,
        source_role: 'CR',
        source_date: new Date().toISOString(),
        upstream_source: {
          role: 'CR',
          date: new Date().toISOString(),
          budget_min: payload.budgetMin,
          budget_max: payload.budgetMax,
          currency: payload.currency,
        },
      };

      const phaseSchedule = {
        expected_timeline: payload.expectedTimeline,
      };

      const { error: updateError } = await supabase
        .from('challenges')
        .update({
          problem_statement: payload.businessProblem,
          scope: payload.expectedOutcomes,
          reward_structure: rewardStructure,
          phase_schedule: phaseSchedule,
          governance_mode_override: payload.governanceModeOverride ?? null,
          eligibility: JSON.stringify({
            domain_tags: payload.domainTags,
            urgency: payload.urgency,
            constraints: payload.constraints || undefined,
            industry_segment_id: payload.industrySegmentId || undefined,
            sub_domain_ids: payload.subDomainIds?.length ? payload.subDomainIds : undefined,
            specialty_tags: payload.specialtyTags?.length ? payload.specialtyTags : undefined,
          }),
          extended_brief: {
            ...(payload.beneficiariesMapping ? { beneficiaries_mapping: payload.beneficiariesMapping } : {}),
            ...(payload.templateId ? { challenge_template_id: payload.templateId } : {}),
          },
        } as any)
        .eq('id', challengeId);

      if (updateError) throw new Error(updateError.message);

      // 3. Complete phase to advance from Phase 1 → Phase 2 (curation-ready)
      const { error: phaseError } = await supabase.rpc(
        'complete_phase',
        {
          p_challenge_id: challengeId,
          p_user_id: payload.creatorId,
        },
      );

      if (phaseError) throw new Error(phaseError.message);

      return { challengeId };
    },
    onSuccess: () => {
      toast.success('Challenge submitted — sent to Curator for review');
      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-waiting-for'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-open-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['tier_limit_check'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'submit_solution_request' });
    },
  });
}

/* ── Save Draft ──────────────────────────────────────────── */

interface DraftPayload {
  orgId: string;
  creatorId: string;
  operatingModel: string;
  businessProblem: string;
  expectedOutcomes: string;
  constraints?: string;
  currency: string;
  budgetMin: number;
  budgetMax: number;
  expectedTimeline: string;
  domainTags: string[];
  urgency: string;
  industrySegmentId?: string;
  subDomainIds?: string[];
  specialtyTags?: string[];
  beneficiariesMapping?: string;
  templateId?: string;
}

export function useSaveDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DraftPayload): Promise<{ challengeId: string }> => {
      const title = payload.businessProblem.substring(0, 100).trim() || 'Untitled Draft';

      // Initialize challenge (stays in Phase 1)
      const { data: challengeId, error: initError } = await supabase.rpc(
        'initialize_challenge',
        {
          p_org_id: payload.orgId,
          p_creator_id: payload.creatorId,
          p_title: title,
          p_operating_model: payload.operatingModel,
        },
      );

      if (initError) throw new Error(initError.message);
      if (!challengeId) throw new Error('Failed to create draft');

      // Update with form fields — no complete_phase call
      const { error: updateError } = await supabase
        .from('challenges')
        .update({
          problem_statement: payload.businessProblem || null,
          scope: payload.expectedOutcomes || null,
          reward_structure: {
            currency: payload.currency,
            budget_min: payload.budgetMin,
            budget_max: payload.budgetMax,
            source_role: 'CR',
            source_date: new Date().toISOString(),
            upstream_source: {
              role: 'CR',
              date: new Date().toISOString(),
              budget_min: payload.budgetMin,
              budget_max: payload.budgetMax,
              currency: payload.currency,
            },
          },
          phase_schedule: {
            expected_timeline: payload.expectedTimeline,
          },
          eligibility: JSON.stringify({
            domain_tags: payload.domainTags,
            urgency: payload.urgency,
            constraints: payload.constraints || undefined,
            industry_segment_id: payload.industrySegmentId || undefined,
            sub_domain_ids: payload.subDomainIds?.length ? payload.subDomainIds : undefined,
            specialty_tags: payload.specialtyTags?.length ? payload.specialtyTags : undefined,
          }),
          extended_brief: {
            ...(payload.beneficiariesMapping ? { beneficiaries_mapping: payload.beneficiariesMapping } : {}),
            ...(payload.templateId ? { challenge_template_id: payload.templateId } : {}),
          },
        } as any)
        .eq('id', challengeId);

      if (updateError) throw new Error(updateError.message);

      return { challengeId };
    },
    onSuccess: () => {
      toast.success('Draft saved successfully');
      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['tier_limit_check'] });
      queryClient.invalidateQueries({ queryKey: ['org-solution-requests'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'save_solution_request_draft' });
    },
  });
}
