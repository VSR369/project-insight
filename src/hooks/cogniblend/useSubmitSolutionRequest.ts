/**
 * useSubmitSolutionRequest — Orchestrates challenge creation.
 * Role Architecture v2: CR creates challenge → moves to curation-ready (phase 2).
 *
 * useSaveDraft — Saves challenge in Phase 1 without advancing.
 * useUpdateDraft — Updates an existing draft.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError, logWarning } from '@/lib/errorHandler';
import { serializeLineItems } from '@/lib/cogniblend/creatorCuratorFieldMap';
import { autoAssignChallengeRole } from '@/hooks/cogniblend/useAutoAssignChallengeRoles';
import {
  fetchGovernanceFieldRules,
  stripHiddenFields,
  stripHiddenExtendedBriefFields,
  FORM_FIELD_TO_GOVERNANCE_KEY,
} from '@/lib/cogniblend/governanceFieldFilter';
import {
  type SubmitPayload,
  type DraftPayload,
  type SubmitResult,
  normalizeConstrainedChallengeFields,
  buildChallengeUpdatePayload,
} from '@/lib/cogniblend/solutionRequestPayloads';

export type { SubmitPayload, DraftPayload, SubmitResult };

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
          p_governance_mode_override: payload.governanceModeOverride ?? null,
        });
        if (initError) throw new Error(initError.message);
        if (!newId) throw new Error('Failed to create challenge');
        challengeId = newId;
      }

      const effectiveMode = payload.governanceModeOverride ?? 'STRUCTURED';
      const governanceRules = await fetchGovernanceFieldRules(effectiveMode);
      const filteredPayload = stripHiddenFields(payload as unknown as Record<string, unknown>, governanceRules) as unknown as SubmitPayload;
      const normalizedConstrainedFields = normalizeConstrainedChallengeFields(filteredPayload);

      const rewardStructure = {
        currency: filteredPayload.currency ?? payload.currency,
        budget_min: filteredPayload.budgetMin ?? 0,
        budget_max: filteredPayload.budgetMax ?? 0,
        platinum_award: filteredPayload.budgetMax ?? 0,
        source_role: 'CR',
        source_date: new Date().toISOString(),
        upstream_source: {
          role: 'CR', date: new Date().toISOString(),
          budget_min: filteredPayload.budgetMin ?? 0, budget_max: filteredPayload.budgetMax ?? 0,
          currency: filteredPayload.currency ?? payload.currency,
        },
      };

      const rawExtendedBrief: Record<string, unknown> = {
        ...(filteredPayload.beneficiariesMapping ? { beneficiaries_mapping: filteredPayload.beneficiariesMapping } : {}),
        ...(filteredPayload.templateId ? { challenge_template_id: filteredPayload.templateId } : {}),
        ...(filteredPayload.contextBackground ? { context_background: filteredPayload.contextBackground } : {}),
        ...(filteredPayload.rootCauses?.filter(Boolean).length ? { root_causes: filteredPayload.rootCauses.filter(Boolean) } : {}),
        ...(filteredPayload.affectedStakeholders?.length ? { affected_stakeholders: filteredPayload.affectedStakeholders.filter((s) => s.stakeholder_name.trim()) } : {}),
        ...(filteredPayload.scopeDefinition ? { scope_definition: filteredPayload.scopeDefinition } : {}),
        ...(filteredPayload.preferredApproach?.filter(Boolean).length ? { preferred_approach: filteredPayload.preferredApproach.filter(Boolean) } : {}),
        ...(filteredPayload.approachesNotOfInterest?.filter(Boolean).length ? { approaches_not_of_interest: filteredPayload.approachesNotOfInterest.filter(Boolean) } : {}),
        ...(filteredPayload.solutionExpectations ? { solution_expectations: filteredPayload.solutionExpectations } : {}),
        ...(filteredPayload.currentDeficiencies?.filter(Boolean).length ? { current_deficiencies: filteredPayload.currentDeficiencies.filter(Boolean) } : {}),
        ...(filteredPayload.referenceUrls?.length ? { reference_urls: filteredPayload.referenceUrls } : {}),
      };
      const filteredExtendedBrief = stripHiddenExtendedBriefFields(rawExtendedBrief, governanceRules);

      const { error: updateError } = await supabase
        .from('challenges')
        .update({
          problem_statement: filteredPayload.businessProblem,
          hook: filteredPayload.hook || null,
          scope: filteredPayload.constraints || null,
          expected_outcomes: serializeLineItems(filteredPayload.expectedOutcomes),
          deliverables: filteredPayload.deliverablesList?.filter(Boolean).length
            ? serializeLineItems(filteredPayload.deliverablesList)
            : null,
          submission_guidelines: filteredPayload.submissionGuidelines ? serializeLineItems(filteredPayload.submissionGuidelines) : null,
          reward_structure: rewardStructure,
          currency_code: filteredPayload.currency ?? payload.currency,
          evaluation_criteria: filteredPayload.weightedCriteria?.length
            ? { weighted_criteria: filteredPayload.weightedCriteria }
            : null,
          phase_schedule: { expected_timeline: filteredPayload.expectedTimeline },
          governance_mode_override: payload.governanceModeOverride ?? null,
          eligibility: JSON.stringify({
            domain_tags: filteredPayload.domainTags, urgency: filteredPayload.urgency,
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

      // Build creator snapshot
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

      let resolvedDomainTagNames: string[] = [];
      if (filteredPayload.domainTags?.length) {
        const { data: tagRows } = await supabase.from('industry_segments').select('id, name').in('id', filteredPayload.domainTags);
        resolvedDomainTagNames = (tagRows ?? []).map((t) => t.name);
      }

      const rawSnapshot: Record<string, unknown> = {
        problem_statement: filteredPayload.businessProblem, scope: filteredPayload.constraints || null,
        expected_outcomes: serializeLineItems(filteredPayload.expectedOutcomes),
        reward_structure: rewardStructure, phase_schedule: { expected_timeline: filteredPayload.expectedTimeline },
        extended_brief: filteredSnapshotBrief,
        title: payload.title?.trim() || payload.businessProblem.substring(0, 100).trim(),
        maturity_level: normalizedConstrainedFields.maturity_level,
        solution_maturity_id: filteredPayload.solutionMaturityId || null,
        ip_model: normalizedConstrainedFields.ip_model,
        domain_tags: resolvedDomainTagNames, domain_tag_ids: filteredPayload.domainTags,
        industry_segment_id: filteredPayload.industrySegmentId || null,
        budgetMin: filteredPayload.budgetMin ?? 0, budgetMax: filteredPayload.budgetMax ?? 0,
        currency: filteredPayload.currency ?? payload.currency,
        currency_code: filteredPayload.currency ?? payload.currency,
        expected_timeline: filteredPayload.expectedTimeline,
        evaluation_criteria: filteredPayload.weightedCriteria?.length
          ? { weighted_criteria: filteredPayload.weightedCriteria }
          : null,
      };
      const creatorSnapshot = stripHiddenFields(rawSnapshot, governanceRules, FORM_FIELD_TO_GOVERNANCE_KEY);
      await supabase.from('challenges').update({ creator_snapshot: creatorSnapshot } as any).eq('id', challengeId);

      const { data: phaseResult, error: phaseError } = await supabase.rpc('complete_phase', {
        p_challenge_id: challengeId, p_user_id: payload.creatorId,
      });
      if (phaseError) throw new Error(phaseError.message);

      // Parse phase result to check current phase
      const phaseData = phaseResult as unknown as { current_phase?: number } | null;
      const currentPhase = phaseData?.current_phase ?? 0;

      // Auto-assign CU when Phase 2 (Curation) is reached — skip for QUICK (solo user has all roles)
      const normalizedGov = (payload.governanceModeOverride ?? 'STRUCTURED').toUpperCase();
      if (currentPhase >= 2 && normalizedGov !== 'QUICK') {
        try {
          await autoAssignChallengeRole({
            challengeId,
            roleCode: 'CU',
            engagementModel: payload.operatingModel === 'AGG' ? 'aggregator' : 'marketplace',
            industrySegmentId: payload.industrySegmentId || undefined,
            assignedBy: payload.creatorId,
          });
        } catch (err) {
          logWarning('Auto-assign CU after submit failed', {
            operation: 'auto_assign_challenge_role',
            additionalData: { challengeId, error: String(err) },
          });
        }
      }

      // QUICK: auto-notify registered solvers (non-blocking)
      if (normalizedGov === 'QUICK' && currentPhase >= 5) {
        try {
          const { data: solvers } = await supabase
            .from('solver_profiles' as never)
            .select('user_id') as { data: Array<{ user_id: string }> | null; error: unknown };

          if (solvers && solvers.length > 0) {
            const rs = rewardStructure;
            const notifRows = solvers.map((s) => ({
              user_id: s.user_id,
              notification_type: 'CHALLENGE_PUBLISHED',
              title: `New Challenge: ${payload.title ?? 'Untitled'}`,
              message: `A new ${rs.currency ?? 'USD'} ${Number(rs.platinum_award ?? 0).toLocaleString()} challenge is open for submissions.`,
              challenge_id: challengeId,
              is_read: false,
            }));
            const BATCH = 50;
            for (let i = 0; i < notifRows.length; i += BATCH) {
              await supabase.from('cogni_notifications').insert(notifRows.slice(i, i + BATCH));
            }
          }
        } catch (err) {
          logWarning('Solver notification failed (non-blocking)', {
            operation: 'notify_solvers_quick',
            additionalData: { challengeId, error: String(err) },
          });
        }
      }

      return { challengeId, governanceMode: normalizedGov };
    },
    onSuccess: (result) => {
      const isQuick = result.governanceMode === 'QUICK';
      toast.success(isQuick
        ? 'Challenge published! Solvers can now discover and apply.'
        : 'Challenge submitted — sent to Curator for review');
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
      const { error: updateError } = await supabase.from('challenges').update(updatePayload as any).eq('id', challengeId);
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
      const effectiveMode = payload.governanceModeOverride ?? 'STRUCTURED';
      const governanceRules = await fetchGovernanceFieldRules(effectiveMode);
      const fp = stripHiddenFields(payload as unknown as Record<string, unknown>, governanceRules) as unknown as (DraftPayload & { challengeId: string });
      const normalizedConstrainedFields = normalizeConstrainedChallengeFields(fp);

      const updatePayload = buildChallengeUpdatePayload(fp, payload, normalizedConstrainedFields, governanceRules);
      const { error: updateError } = await supabase.from('challenges').update(updatePayload as any).eq('id', payload.challengeId);
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
