/**
 * useCreatorDraftSave — Extracts draft save/update logic from ChallengeCreatorForm.
 */

import { useCallback, useState } from 'react';
import { type UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { useSaveDraft, useUpdateDraft } from '@/hooks/cogniblend/useChallengeSubmit';
import type { CreatorFormValues } from '@/components/cogniblend/creator/creatorFormSchema';
import type { GovernanceMode } from '@/lib/governanceMode';

interface DraftSaveConfig {
  form: UseFormReturn<CreatorFormValues>;
  orgId: string | undefined;
  userId: string | undefined;
  engagementModel: string;
  governanceMode: GovernanceMode;
  industrySegmentId: string;
  referenceUrls?: string[];
  onDraftIdChange?: (id: string) => void;
}

function cleanArray(items: string[] | undefined): string[] {
  return (items || []).filter((i) => i.trim().length > 0);
}

export function useCreatorDraftSave(config: Omit<DraftSaveConfig, 'form'> & { form: DraftSaveConfig['form'] | null }) {
  const { form, orgId, userId, engagementModel, governanceMode, industrySegmentId, referenceUrls, onDraftIdChange } = config;
  const draftMutation = useSaveDraft();
  const updateDraftMutation = useUpdateDraft();
  const [draftChallengeId, setDraftChallengeId] = useState<string | null>(null);

  const isSaving = draftMutation.isPending || updateDraftMutation.isPending;

  const initFromUrl = useCallback((urlDraft: string | null) => {
    if (urlDraft) {
      setDraftChallengeId(urlDraft);
      onDraftIdChange?.(urlDraft);
    }
  }, [onDraftIdChange]);

  const handleSaveDraft = useCallback(async () => {
    if (isSaving) return;
    if (!form) {
      toast.error('Form is not ready yet. Please wait a moment and try again.');
      return;
    }
    const data = form.getValues();
    if (!orgId || !userId) {
      toast.error('Organization or user context not loaded. Please wait and try again.');
      return;
    }
    const loadingId = toast.loading('Saving draft…');
    try {
      const base = {
        orgId, creatorId: userId, operatingModel: engagementModel,
        title: data.title || '', businessProblem: data.problem_statement || '',
        expectedOutcomes: cleanArray(data.expected_outcomes), constraints: data.scope || '',
        currency: data.currency_code, budgetMin: 0, budgetMax: data.platinum_award,
        expectedTimeline: data.expected_timeline || '8w', domainTags: data.domain_tags?.length ? data.domain_tags : [], urgency: 'standard',
        industrySegmentId: industrySegmentId || data.industry_segment_id || undefined,
        governanceModeOverride: governanceMode,
        contextBackground: data.context_background || undefined, rootCauses: cleanArray(data.root_causes),
        affectedStakeholders: data.affected_stakeholders.length > 0 ? data.affected_stakeholders : undefined,
        preferredApproach: cleanArray(data.preferred_approach),
        approachesNotOfInterest: cleanArray(data.approaches_not_of_interest),
        currentDeficiencies: cleanArray(data.current_deficiencies),
        maturityLevel: data.maturity_level || undefined, solutionMaturityId: data.solution_maturity_id || undefined,
        ipModel: data.ip_model || undefined, hook: data.hook || undefined,
        weightedCriteria: data.weighted_criteria?.length ? data.weighted_criteria : undefined,
        deliverablesList: cleanArray(data.deliverables_list),
        referenceUrls: referenceUrls?.length ? referenceUrls : undefined,
        solverAudience: engagementModel === 'AGG' ? (data.solver_audience ?? 'ALL') : 'ALL',
        evaluationMethod: data.evaluation_method ?? 'SINGLE',
        evaluatorCount: data.evaluator_count ?? 1,
        creatorLegalInstructions: data.creator_legal_instructions || undefined,
        phaseDurations: data.phase_durations?.length ? data.phase_durations : undefined,
        creatorApprovalRequired: data.creator_approval_required ?? true,
        communityCreationAllowed: data.community_creation_allowed ?? false,
        isAnonymous: data.is_anonymous ?? false,
      };
      if (draftChallengeId) {
        await updateDraftMutation.mutateAsync({ ...base, challengeId: draftChallengeId });
        toast.dismiss(loadingId);
        toast.success('Draft updated successfully');
      } else {
        const result = await draftMutation.mutateAsync(base);
        setDraftChallengeId(result.challengeId);
        onDraftIdChange?.(result.challengeId);
        toast.dismiss(loadingId);
        toast.success('Draft saved successfully');
      }
    } catch {
      toast.dismiss(loadingId);
      /* handled by mutation onError */
    }
  }, [isSaving, form, orgId, userId, engagementModel, governanceMode, industrySegmentId, referenceUrls, draftChallengeId, updateDraftMutation, draftMutation, onDraftIdChange]);

  return { handleSaveDraft, isSaving, draftChallengeId, initFromUrl };
}
