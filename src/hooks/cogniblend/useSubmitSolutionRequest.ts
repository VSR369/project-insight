/**
 * useSubmitSolutionRequest — Orchestrates challenge creation from
 * the Solution Request form: initialize_challenge → update fields →
 * assign CR role (MP) → complete_phase.
 *
 * useSaveDraft — Saves challenge in Phase 1 without advancing.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy } from '@/lib/auditFields';

interface SubmitPayload {
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
}

interface SubmitResult {
  challengeId: string;
}

export function useSubmitSolutionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SubmitPayload): Promise<SubmitResult> => {
      // 1. Initialize challenge via RPC
      const title = payload.businessProblem.substring(0, 100).trim();

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

      // 2. Update challenge with form fields
      const rewardStructure = {
        currency: payload.currency,
        budget_min: payload.budgetMin,
        budget_max: payload.budgetMax,
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
          eligibility: JSON.stringify({
            domain_tags: payload.domainTags,
            urgency: payload.urgency,
            constraints: payload.constraints || undefined,
            industry_segment_id: payload.industrySegmentId || undefined,
            sub_domain_ids: payload.subDomainIds?.length ? payload.subDomainIds : undefined,
            specialty_tags: payload.specialtyTags?.length ? payload.specialtyTags : undefined,
          }),
          ...(payload.beneficiariesMapping ? {
            extended_brief: {
              beneficiaries_mapping: payload.beneficiariesMapping,
            },
          } : {}),
        } as any)
        .eq('id', challengeId);

      if (updateError) throw new Error(updateError.message);

      // 3. If MP model, assign Challenge Architect (CR role)
      if (payload.operatingModel === 'MP' && payload.architectId) {
        const crAssignment = await withCreatedBy({
          challenge_id: challengeId,
          user_id: payload.architectId,
          role_code: 'CR',
          assigned_at: new Date().toISOString(),
          is_active: true,
        });

        const { error: roleError } = await supabase
          .from('user_challenge_roles')
          .insert(crAssignment as any);

        if (roleError) throw new Error(roleError.message);

        // Audit: ROLE_ASSIGNED for CR
        await supabase.from('audit_trail').insert({
          user_id: payload.creatorId,
          challenge_id: challengeId,
          action: 'ROLE_ASSIGNED',
          method: 'HUMAN',
          details: {
            role_code: 'CR',
            assigned_to: payload.architectId,
            operating_model: 'MP',
          },
        });
      }

      // 4. Complete phase to advance from Phase 1 → Phase 2
      const { data: phaseResult, error: phaseError } = await supabase.rpc(
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
      toast.success('Solution Request submitted successfully');
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
  architectId?: string;
  industrySegmentId?: string;
  subDomainIds?: string[];
  specialtyTags?: string[];
  beneficiariesMapping?: string;
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
          ...(payload.beneficiariesMapping ? {
            extended_brief: {
              beneficiaries_mapping: payload.beneficiariesMapping,
            },
          } : {}),
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
