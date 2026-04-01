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
import { serializeLineItems, serializeStakeholders } from '@/lib/cogniblend/creatorCuratorFieldMap';

interface SubmitPayload {
  orgId: string;
  creatorId: string;
  operatingModel: string;
  title?: string;
  businessProblem: string;
  expectedOutcomes: string[];
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
  // Extended brief context fields from Creator
  contextBackground?: string;
  rootCauses?: string[];
  affectedStakeholders?: Array<{ stakeholder_name: string; role: string; impact_description: string; adoption_challenge: string }>;
  scopeDefinition?: string;
  preferredApproach?: string[];
  approachesNotOfInterest?: string[];
  solutionExpectations?: string;
  currentDeficiencies?: string[];
  referenceUrls?: string[];
  maturityLevel?: string;
  solutionMaturityId?: string;
  ipModel?: string;
  submissionGuidelines?: string[];
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
          scope: payload.constraints || null,
          expected_outcomes: payload.expectedOutcomes
            ? JSON.stringify({ items: [{ name: payload.expectedOutcomes }] })
            : null,
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
          maturity_level: payload.maturityLevel?.toUpperCase() || null,
          ip_model: payload.ipModel || null,
          domain_tags: payload.domainTags || null,
          industry_segment_id: payload.industrySegmentId || null,
          title: payload.title?.trim() || payload.businessProblem.substring(0, 100).trim(),
          extended_brief: {
            ...(payload.beneficiariesMapping ? { beneficiaries_mapping: payload.beneficiariesMapping } : {}),
            ...(payload.templateId ? { challenge_template_id: payload.templateId } : {}),
            ...(payload.contextBackground ? { context_background: payload.contextBackground } : {}),
            ...(payload.rootCauses ? { root_causes: payload.rootCauses } : {}),
            ...(payload.affectedStakeholders ? { affected_stakeholders: payload.affectedStakeholders } : {}),
            ...(payload.scopeDefinition ? { scope_definition: payload.scopeDefinition } : {}),
            ...(payload.preferredApproach ? { preferred_approach: payload.preferredApproach } : {}),
            ...(payload.approachesNotOfInterest ? { approaches_not_of_interest: payload.approachesNotOfInterest } : {}),
            ...(payload.solutionExpectations ? { solution_expectations: payload.solutionExpectations } : {}),
            ...(payload.currentDeficiencies ? { current_deficiencies: payload.currentDeficiencies } : {}),
            ...(payload.referenceUrls?.length ? { reference_urls: payload.referenceUrls } : {}),
          },
        } as any)
        .eq('id', challengeId);

      if (updateError) throw new Error(updateError.message);

      // 2b. Save creator_snapshot — immutable record of original submission
      const creatorSnapshot = {
        problem_statement: payload.businessProblem,
        scope: payload.constraints || null,
        expected_outcomes: payload.expectedOutcomes || null,
        reward_structure: rewardStructure,
        phase_schedule: phaseSchedule,
        extended_brief: {
          ...(payload.contextBackground ? { context_background: payload.contextBackground } : {}),
          ...(payload.rootCauses ? { root_causes: payload.rootCauses } : {}),
          ...(payload.affectedStakeholders ? { affected_stakeholders: payload.affectedStakeholders } : {}),
          ...(payload.scopeDefinition ? { scope_definition: payload.scopeDefinition } : {}),
          ...(payload.preferredApproach ? { preferred_approach: payload.preferredApproach } : {}),
          ...(payload.approachesNotOfInterest ? { approaches_not_of_interest: payload.approachesNotOfInterest } : {}),
          ...(payload.solutionExpectations ? { solution_expectations: payload.solutionExpectations } : {}),
          ...(payload.currentDeficiencies ? { current_deficiencies: payload.currentDeficiencies } : {}),
          ...(payload.beneficiariesMapping ? { beneficiaries_mapping: payload.beneficiariesMapping } : {}),
          ...(payload.referenceUrls?.length ? { reference_urls: payload.referenceUrls } : {}),
        },
        title: payload.title?.trim() || payload.businessProblem.substring(0, 100).trim(),
        maturity_level: payload.maturityLevel?.toUpperCase() || null,
        ip_model: payload.ipModel || null,
        domain_tags: payload.domainTags,
        industry_segment_id: payload.industrySegmentId || null,
        budget_min: payload.budgetMin,
        budget_max: payload.budgetMax,
        currency: payload.currency,
        expected_timeline: payload.expectedTimeline,
      };

      await supabase
        .from('challenges')
        .update({ creator_snapshot: creatorSnapshot } as any)
        .eq('id', challengeId);

      // 3. Complete phase to advance from Phase 1 → Phase 2 (curation-ready)
      const { error: phaseError } = await supabase.rpc(
        'complete_phase',
        {
          p_challenge_id: challengeId,
          p_user_id: payload.creatorId,
        },
      );

      if (phaseError) throw new Error(phaseError.message);

      // 4. QUICK mode: auto-attach Tier 1 legal defaults (BR-LGL-001)
      const effectiveGovernance = payload.governanceModeOverride ?? 'STRUCTURED';
      if (effectiveGovernance.toUpperCase() === 'QUICK' || effectiveGovernance.toUpperCase() === 'LIGHTWEIGHT') {
        try {
          const { data: defaultTemplates } = await supabase
            .from('legal_document_templates' as any)
            .select('document_type, document_name, description')
            .eq('tier', 'TIER_1')
            .eq('is_active', true);

          if (defaultTemplates && defaultTemplates.length > 0) {
            const legalInserts = (defaultTemplates as any[]).map((tpl) => ({
              challenge_id: challengeId,
              document_type: tpl.document_type,
              document_name: tpl.document_name,
              content_summary: tpl.description || null,
              tier: 'TIER_1',
              status: 'auto_accepted',
              lc_status: 'approved',
              attached_by: payload.creatorId,
              created_by: payload.creatorId,
            }));

            await supabase.from('challenge_legal_docs').insert(legalInserts as any);
          }
        } catch {
          // Non-blocking — legal auto-attach failure should not fail challenge creation
        }
      }

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
  contextBackground?: string;
  rootCauses?: string;
  affectedStakeholders?: string;
  scopeDefinition?: string;
  preferredApproach?: string;
  approachesNotOfInterest?: string;
  solutionExpectations?: string;
  currentDeficiencies?: string;
  maturityLevel?: string;
  ipModel?: string;
}

export function useSaveDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DraftPayload): Promise<{ challengeId: string }> => {
      const title = payload.title?.trim() || payload.businessProblem.substring(0, 100).trim() || 'Untitled Draft';

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
          title: payload.title?.trim() || payload.businessProblem.substring(0, 100).trim(),
          problem_statement: payload.businessProblem || null,
          scope: payload.constraints || null,
          expected_outcomes: payload.expectedOutcomes
            ? JSON.stringify({ items: [{ name: payload.expectedOutcomes }] })
            : null,
          governance_mode_override: payload.governanceModeOverride ?? null,
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
          maturity_level: payload.maturityLevel?.toUpperCase() || null,
          ip_model: payload.ipModel || null,
          domain_tags: payload.domainTags || null,
          industry_segment_id: payload.industrySegmentId || null,
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
            ...(payload.contextBackground ? { context_background: payload.contextBackground } : {}),
            ...(payload.rootCauses ? { root_causes: payload.rootCauses } : {}),
            ...(payload.affectedStakeholders ? { affected_stakeholders: payload.affectedStakeholders } : {}),
            ...(payload.scopeDefinition ? { scope_definition: payload.scopeDefinition } : {}),
            ...(payload.preferredApproach ? { preferred_approach: payload.preferredApproach } : {}),
            ...(payload.approachesNotOfInterest ? { approaches_not_of_interest: payload.approachesNotOfInterest } : {}),
            ...(payload.solutionExpectations ? { solution_expectations: payload.solutionExpectations } : {}),
            ...(payload.currentDeficiencies ? { current_deficiencies: payload.currentDeficiencies } : {}),
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

/* ── Update existing draft ──────────────────────────────── */

export function useUpdateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DraftPayload & { challengeId: string }): Promise<{ challengeId: string }> => {
      const { error: updateError } = await supabase
        .from('challenges')
        .update({
          title: payload.title?.trim() || payload.businessProblem.substring(0, 100).trim(),
          problem_statement: payload.businessProblem || null,
          scope: payload.constraints || null,
          expected_outcomes: payload.expectedOutcomes
            ? JSON.stringify({ items: [{ name: payload.expectedOutcomes }] })
            : null,
          governance_mode_override: payload.governanceModeOverride ?? null,
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
          maturity_level: payload.maturityLevel?.toUpperCase() || null,
          ip_model: payload.ipModel || null,
          domain_tags: payload.domainTags || null,
          industry_segment_id: payload.industrySegmentId || null,
          eligibility: JSON.stringify({
            domain_tags: payload.domainTags,
            urgency: payload.urgency,
            constraints: payload.constraints || undefined,
            industry_segment_id: payload.industrySegmentId || undefined,
          }),
          extended_brief: {
            ...(payload.beneficiariesMapping ? { beneficiaries_mapping: payload.beneficiariesMapping } : {}),
            ...(payload.templateId ? { challenge_template_id: payload.templateId } : {}),
            ...(payload.contextBackground ? { context_background: payload.contextBackground } : {}),
            ...(payload.rootCauses ? { root_causes: payload.rootCauses } : {}),
            ...(payload.affectedStakeholders ? { affected_stakeholders: payload.affectedStakeholders } : {}),
            ...(payload.scopeDefinition ? { scope_definition: payload.scopeDefinition } : {}),
            ...(payload.preferredApproach ? { preferred_approach: payload.preferredApproach } : {}),
            ...(payload.approachesNotOfInterest ? { approaches_not_of_interest: payload.approachesNotOfInterest } : {}),
            ...(payload.solutionExpectations ? { solution_expectations: payload.solutionExpectations } : {}),
            ...(payload.currentDeficiencies ? { current_deficiencies: payload.currentDeficiencies } : {}),
          },
        } as any)
        .eq('id', payload.challengeId);

      if (updateError) throw new Error(updateError.message);

      return { challengeId: payload.challengeId };
    },
    onSuccess: () => {
      toast.success('Draft updated successfully');
      queryClient.invalidateQueries({ queryKey: ['cogni-my-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_draft' });
    },
  });
}
