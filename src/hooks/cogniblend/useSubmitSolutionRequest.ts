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
import { serializeLineItems } from '@/lib/cogniblend/creatorCuratorFieldMap';
import { normalizeChallengeFields } from '@/lib/cogniblend/challengeFieldNormalizer';
import {
  fetchGovernanceFieldRules,
  stripHiddenFields,
  stripHiddenExtendedBriefFields,
  FORM_FIELD_TO_GOVERNANCE_KEY,
} from '@/lib/cogniblend/governanceFieldFilter';

interface SubmitPayload {
  orgId: string;
  creatorId: string;
  operatingModel: string;
  title?: string;
  businessProblem: string;
  draftChallengeId?: string;
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
  affectedStakeholders?: Array<{
    stakeholder_name: string;
    role: string;
    impact_description: string;
    adoption_challenge: string;
  }>;
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

interface DraftPayload {
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
  contextBackground?: string;
  rootCauses?: string[];
  affectedStakeholders?: Array<{
    stakeholder_name: string;
    role: string;
    impact_description: string;
    adoption_challenge: string;
  }>;
  scopeDefinition?: string;
  preferredApproach?: string[];
  approachesNotOfInterest?: string[];
  solutionExpectations?: string;
  currentDeficiencies?: string[];
  maturityLevel?: string;
  solutionMaturityId?: string;
  ipModel?: string;
  submissionGuidelines?: string[];
}

function normalizeConstrainedChallengeFields({
  maturityLevel,
  ipModel,
}: {
  maturityLevel?: string;
  ipModel?: string;
}): {
  maturity_level: string | null;
  ip_model: string | null;
} {
  const normalized = normalizeChallengeFields({
    maturity_level: maturityLevel || null,
    ip_model: ipModel || null,
  });

  return {
    maturity_level: (normalized.maturity_level as string | null | undefined) ?? null,
    ip_model: (normalized.ip_model as string | null | undefined) ?? null,
  };
}

export function useSubmitSolutionRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SubmitPayload): Promise<SubmitResult> => {
      let challengeId: string;

      if (payload.draftChallengeId) {
        challengeId = payload.draftChallengeId;
      } else {
        const title = payload.title?.trim() || payload.businessProblem.substring(0, 100).trim();
        const { data: newId, error: initError } = await supabase.rpc('initialize_challenge', {
          p_org_id: payload.orgId,
          p_creator_id: payload.creatorId,
          p_title: title,
          p_operating_model: payload.operatingModel,
        });

        if (initError) throw new Error(initError.message);
        if (!newId) throw new Error('Failed to create challenge');
        challengeId = newId;
      }

      // Fetch governance rules and strip hidden fields from payload
      const effectiveMode = payload.governanceModeOverride ?? 'STRUCTURED';
      const governanceRules = await fetchGovernanceFieldRules(effectiveMode);
      const filteredPayload = stripHiddenFields(payload as unknown as Record<string, unknown>, governanceRules) as unknown as SubmitPayload;

      const normalizedConstrainedFields = normalizeConstrainedChallengeFields(filteredPayload);

      const rewardStructure = {
        currency: filteredPayload.currency ?? payload.currency,
        budget_min: filteredPayload.budgetMin ?? 0,
        budget_max: filteredPayload.budgetMax ?? 0,
        source_role: 'CR',
        source_date: new Date().toISOString(),
        upstream_source: {
          role: 'CR',
          date: new Date().toISOString(),
          budget_min: filteredPayload.budgetMin ?? 0,
          budget_max: filteredPayload.budgetMax ?? 0,
          currency: filteredPayload.currency ?? payload.currency,
        },
      };

      const phaseSchedule = {
        expected_timeline: filteredPayload.expectedTimeline,
      };

      // Build extended_brief then strip hidden fields
      const rawExtendedBrief: Record<string, unknown> = {
        ...(filteredPayload.beneficiariesMapping ? { beneficiaries_mapping: filteredPayload.beneficiariesMapping } : {}),
        ...(filteredPayload.templateId ? { challenge_template_id: filteredPayload.templateId } : {}),
        ...(filteredPayload.contextBackground ? { context_background: filteredPayload.contextBackground } : {}),
        ...(filteredPayload.rootCauses?.filter(Boolean).length ? { root_causes: filteredPayload.rootCauses.filter(Boolean) } : {}),
        ...(filteredPayload.affectedStakeholders?.length
          ? { affected_stakeholders: filteredPayload.affectedStakeholders.filter((stakeholder) => stakeholder.stakeholder_name.trim()) }
          : {}),
        ...(filteredPayload.scopeDefinition ? { scope_definition: filteredPayload.scopeDefinition } : {}),
        ...(filteredPayload.preferredApproach?.filter(Boolean).length ? { preferred_approach: filteredPayload.preferredApproach.filter(Boolean) } : {}),
        ...(filteredPayload.approachesNotOfInterest?.filter(Boolean).length
          ? { approaches_not_of_interest: filteredPayload.approachesNotOfInterest.filter(Boolean) }
          : {}),
        ...(filteredPayload.solutionExpectations ? { solution_expectations: filteredPayload.solutionExpectations } : {}),
        ...(filteredPayload.currentDeficiencies?.filter(Boolean).length
          ? { current_deficiencies: filteredPayload.currentDeficiencies.filter(Boolean) }
          : {}),
        ...(filteredPayload.referenceUrls?.length ? { reference_urls: filteredPayload.referenceUrls } : {}),
      };
      const filteredExtendedBrief = stripHiddenExtendedBriefFields(rawExtendedBrief, governanceRules);

      const { error: updateError } = await supabase
        .from('challenges')
        .update({
          problem_statement: filteredPayload.businessProblem,
          scope: filteredPayload.constraints || null,
          expected_outcomes: serializeLineItems(filteredPayload.expectedOutcomes),
          submission_guidelines: filteredPayload.submissionGuidelines ? serializeLineItems(filteredPayload.submissionGuidelines) : null,
          reward_structure: rewardStructure,
          phase_schedule: phaseSchedule,
          governance_mode_override: payload.governanceModeOverride ?? null,
          eligibility: JSON.stringify({
            domain_tags: filteredPayload.domainTags,
            urgency: filteredPayload.urgency,
            constraints: filteredPayload.constraints || undefined,
            industry_segment_id: filteredPayload.industrySegmentId || undefined,
            sub_domain_ids: filteredPayload.subDomainIds?.length ? filteredPayload.subDomainIds : undefined,
            specialty_tags: filteredPayload.specialtyTags?.length ? filteredPayload.specialtyTags : undefined,
          }),
          maturity_level: normalizedConstrainedFields.maturity_level,
          solution_maturity_id: filteredPayload.solutionMaturityId || null,
          ip_model: normalizedConstrainedFields.ip_model,
          domain_tags: filteredPayload.domainTags || null,
          industry_segment_id: filteredPayload.industrySegmentId || null,
          title: payload.title?.trim() || payload.businessProblem.substring(0, 100).trim(),
          extended_brief: filteredExtendedBrief,
        } as any)
        .eq('id', challengeId);

      if (updateError) throw new Error(updateError.message);

      // Build creator snapshot with same governance filtering
      const rawSnapshotBrief: Record<string, unknown> = {
        ...(filteredPayload.contextBackground ? { context_background: filteredPayload.contextBackground } : {}),
        ...(filteredPayload.rootCauses ? { root_causes: filteredPayload.rootCauses } : {}),
        ...(filteredPayload.affectedStakeholders ? { affected_stakeholders: filteredPayload.affectedStakeholders } : {}),
        ...(filteredPayload.scopeDefinition ? { scope_definition: filteredPayload.scopeDefinition } : {}),
        ...(filteredPayload.preferredApproach ? { preferred_approach: filteredPayload.preferredApproach } : {}),
        ...(filteredPayload.approachesNotOfInterest ? { approaches_not_of_interest: filteredPayload.approachesNotOfInterest } : {}),
        ...(filteredPayload.solutionExpectations ? { solution_expectations: filteredPayload.solutionExpectations } : {}),
        ...(filteredPayload.currentDeficiencies ? { current_deficiencies: filteredPayload.currentDeficiencies } : {}),
        ...(filteredPayload.beneficiariesMapping ? { beneficiaries_mapping: filteredPayload.beneficiariesMapping } : {}),
        ...(filteredPayload.referenceUrls?.length ? { reference_urls: filteredPayload.referenceUrls } : {}),
      };
      const filteredSnapshotBrief = stripHiddenExtendedBriefFields(rawSnapshotBrief, governanceRules);

      // Resolve domain tag UUIDs to human-readable names for immutable snapshot
      let resolvedDomainTagNames: string[] = [];
      if (filteredPayload.domainTags?.length) {
        const { data: tagRows } = await supabase
          .from('industry_segments')
          .select('id, name')
          .in('id', filteredPayload.domainTags);
        resolvedDomainTagNames = (tagRows ?? []).map((t) => t.name);
      }

      const creatorSnapshot = {
        problem_statement: filteredPayload.businessProblem,
        scope: filteredPayload.constraints || null,
        expected_outcomes: filteredPayload.expectedOutcomes || null,
        reward_structure: rewardStructure,
        phase_schedule: phaseSchedule,
        extended_brief: filteredSnapshotBrief,
        title: payload.title?.trim() || payload.businessProblem.substring(0, 100).trim(),
        maturity_level: normalizedConstrainedFields.maturity_level,
        solution_maturity_id: filteredPayload.solutionMaturityId || null,
        ip_model: normalizedConstrainedFields.ip_model,
        domain_tags: resolvedDomainTagNames,
        domain_tag_ids: filteredPayload.domainTags,
        industry_segment_id: filteredPayload.industrySegmentId || null,
        budget_min: filteredPayload.budgetMin ?? 0,
        budget_max: filteredPayload.budgetMax ?? 0,
        currency: filteredPayload.currency ?? payload.currency,
        expected_timeline: filteredPayload.expectedTimeline,
      };

      await supabase.from('challenges').update({ creator_snapshot: creatorSnapshot } as any).eq('id', challengeId);

      const { error: phaseError } = await supabase.rpc('complete_phase', {
        p_challenge_id: challengeId,
        p_user_id: payload.creatorId,
      });

      if (phaseError) throw new Error(phaseError.message);

      const effectiveGovernance = payload.governanceModeOverride ?? 'STRUCTURED';
      if (effectiveGovernance.toUpperCase() === 'QUICK' || effectiveGovernance.toUpperCase() === 'LIGHTWEIGHT') {
        try {
          const { data: defaultTemplates } = await supabase
            .from('legal_document_templates' as any)
            .select('document_type, document_name, description')
            .eq('tier', 'TIER_1')
            .eq('is_active', true);

          if (defaultTemplates && defaultTemplates.length > 0) {
            const legalInserts = (defaultTemplates as any[]).map((template) => ({
              challenge_id: challengeId,
              document_type: template.document_type,
              document_name: template.document_name,
              content_summary: template.description || null,
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
      queryClient.invalidateQueries({ queryKey: ['cogni-my-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['tier_limit_check'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'submit_solution_request' });
    },
  });
}

export function useSaveDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DraftPayload): Promise<{ challengeId: string }> => {
      const title = payload.title?.trim() || payload.businessProblem.substring(0, 100).trim() || 'Untitled Draft';

      // Governance-aware filtering for drafts
      const effectiveMode = payload.governanceModeOverride ?? 'STRUCTURED';
      const governanceRules = await fetchGovernanceFieldRules(effectiveMode);
      const fp = stripHiddenFields(payload as unknown as Record<string, unknown>, governanceRules) as unknown as DraftPayload;
      const normalizedConstrainedFields = normalizeConstrainedChallengeFields(fp);

      const { data: challengeId, error: initError } = await supabase.rpc('initialize_challenge', {
        p_org_id: payload.orgId,
        p_creator_id: payload.creatorId,
        p_title: title,
        p_operating_model: payload.operatingModel,
      });

      if (initError) throw new Error(initError.message);
      if (!challengeId) throw new Error('Failed to create draft');

      const rawExtBrief: Record<string, unknown> = {
        ...(fp.beneficiariesMapping ? { beneficiaries_mapping: fp.beneficiariesMapping } : {}),
        ...(fp.templateId ? { challenge_template_id: fp.templateId } : {}),
        ...(fp.contextBackground ? { context_background: fp.contextBackground } : {}),
        ...(fp.rootCauses?.filter(Boolean).length ? { root_causes: fp.rootCauses.filter(Boolean) } : {}),
        ...(fp.affectedStakeholders?.length
          ? { affected_stakeholders: fp.affectedStakeholders.filter((s) => s.stakeholder_name.trim()) }
          : {}),
        ...(fp.scopeDefinition ? { scope_definition: fp.scopeDefinition } : {}),
        ...(fp.preferredApproach?.filter(Boolean).length ? { preferred_approach: fp.preferredApproach.filter(Boolean) } : {}),
        ...(fp.approachesNotOfInterest?.filter(Boolean).length
          ? { approaches_not_of_interest: fp.approachesNotOfInterest.filter(Boolean) }
          : {}),
        ...(fp.solutionExpectations ? { solution_expectations: fp.solutionExpectations } : {}),
        ...(fp.currentDeficiencies?.filter(Boolean).length
          ? { current_deficiencies: fp.currentDeficiencies.filter(Boolean) }
          : {}),
      };

      const { error: updateError } = await supabase
        .from('challenges')
        .update({
          title: payload.title?.trim() || payload.businessProblem.substring(0, 100).trim(),
          problem_statement: fp.businessProblem || null,
          scope: fp.constraints || null,
          expected_outcomes: serializeLineItems(fp.expectedOutcomes),
          submission_guidelines: fp.submissionGuidelines ? serializeLineItems(fp.submissionGuidelines) : null,
          governance_mode_override: payload.governanceModeOverride ?? null,
          reward_structure: {
            currency: fp.currency ?? payload.currency,
            budget_min: fp.budgetMin ?? 0,
            budget_max: fp.budgetMax ?? 0,
            source_role: 'CR',
            source_date: new Date().toISOString(),
            upstream_source: {
              role: 'CR',
              date: new Date().toISOString(),
              budget_min: fp.budgetMin ?? 0,
              budget_max: fp.budgetMax ?? 0,
              currency: fp.currency ?? payload.currency,
            },
          },
          phase_schedule: {
            expected_timeline: fp.expectedTimeline,
          },
          maturity_level: normalizedConstrainedFields.maturity_level,
          solution_maturity_id: fp.solutionMaturityId || null,
          ip_model: normalizedConstrainedFields.ip_model,
          domain_tags: fp.domainTags || null,
          industry_segment_id: fp.industrySegmentId || null,
          eligibility: JSON.stringify({
            domain_tags: fp.domainTags,
            urgency: fp.urgency,
            constraints: fp.constraints || undefined,
            industry_segment_id: fp.industrySegmentId || undefined,
            sub_domain_ids: fp.subDomainIds?.length ? fp.subDomainIds : undefined,
            specialty_tags: fp.specialtyTags?.length ? fp.specialtyTags : undefined,
          }),
          extended_brief: stripHiddenExtendedBriefFields(rawExtBrief, governanceRules),
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

export function useUpdateDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DraftPayload & { challengeId: string }): Promise<{ challengeId: string }> => {
      // Governance-aware filtering for draft updates
      const effectiveMode = payload.governanceModeOverride ?? 'STRUCTURED';
      const governanceRules = await fetchGovernanceFieldRules(effectiveMode);
      const fp = stripHiddenFields(payload as unknown as Record<string, unknown>, governanceRules) as unknown as (DraftPayload & { challengeId: string });
      const normalizedConstrainedFields = normalizeConstrainedChallengeFields(fp);

      const rawExtBrief: Record<string, unknown> = {
        ...(fp.beneficiariesMapping ? { beneficiaries_mapping: fp.beneficiariesMapping } : {}),
        ...(fp.templateId ? { challenge_template_id: fp.templateId } : {}),
        ...(fp.contextBackground ? { context_background: fp.contextBackground } : {}),
        ...(fp.rootCauses?.filter(Boolean).length ? { root_causes: fp.rootCauses.filter(Boolean) } : {}),
        ...(fp.affectedStakeholders?.length
          ? { affected_stakeholders: fp.affectedStakeholders.filter((s) => s.stakeholder_name.trim()) }
          : {}),
        ...(fp.scopeDefinition ? { scope_definition: fp.scopeDefinition } : {}),
        ...(fp.preferredApproach?.filter(Boolean).length ? { preferred_approach: fp.preferredApproach.filter(Boolean) } : {}),
        ...(fp.approachesNotOfInterest?.filter(Boolean).length
          ? { approaches_not_of_interest: fp.approachesNotOfInterest.filter(Boolean) }
          : {}),
        ...(fp.solutionExpectations ? { solution_expectations: fp.solutionExpectations } : {}),
        ...(fp.currentDeficiencies?.filter(Boolean).length
          ? { current_deficiencies: fp.currentDeficiencies.filter(Boolean) }
          : {}),
      };

      const { error: updateError } = await supabase
        .from('challenges')
        .update({
          title: payload.title?.trim() || payload.businessProblem.substring(0, 100).trim(),
          problem_statement: fp.businessProblem || null,
          scope: fp.constraints || null,
          expected_outcomes: serializeLineItems(fp.expectedOutcomes),
          submission_guidelines: fp.submissionGuidelines ? serializeLineItems(fp.submissionGuidelines) : null,
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
            expected_timeline: fp.expectedTimeline,
          },
          maturity_level: normalizedConstrainedFields.maturity_level,
          solution_maturity_id: fp.solutionMaturityId || null,
          ip_model: normalizedConstrainedFields.ip_model,
          domain_tags: payload.domainTags || null,
          industry_segment_id: payload.industrySegmentId || null,
          eligibility: JSON.stringify({
            domain_tags: payload.domainTags,
            urgency: payload.urgency,
            constraints: fp.constraints || undefined,
            industry_segment_id: payload.industrySegmentId || undefined,
          }),
          extended_brief: stripHiddenExtendedBriefFields(rawExtBrief, governanceRules),
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
