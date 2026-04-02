/**
 * useCurationPageOrchestrator — Master orchestrator hook for CurationReviewPage.
 *
 * Consolidates all hook wiring, state, mutations, effects, and callbacks
 * so the page component is a thin render shell.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserChallengeRoles } from '@/hooks/cogniblend/useUserChallengeRoles';
import { useSectionApprovals } from '@/hooks/cogniblend/useSectionApprovals';
import { useUpdateCurationProgress } from '@/hooks/cogniblend/useCurationProgress';
import { useComplexityParams } from '@/hooks/queries/useComplexityParams';
import { useCurationPageData } from '@/hooks/cogniblend/useCurationPageData';
import { useCurationStoreHydration } from '@/hooks/useCurationStoreHydration';
import { useCurationStoreSync } from '@/hooks/useCurationStoreSync';
import { useCurationSectionActions } from '@/hooks/cogniblend/useCurationSectionActions';
import { useCurationAIActions } from '@/hooks/cogniblend/useCurationAIActions';
import { useCurationComputedValues } from '@/hooks/cogniblend/useCurationComputedValues';
import { useCurationEffects } from '@/hooks/cogniblend/useCurationEffects';
import { useCurationCallbacks } from '@/hooks/cogniblend/useCurationCallbacks';
import { useWaveExecutor } from '@/hooks/useWaveExecutor';
import { useCompletenessCheckDefs, useRunCompletenessCheck } from '@/hooks/queries/useCompletenessChecks';
import { useSolutionTypes, groupSolutionTypes, useSolutionTypeMap } from '@/hooks/queries/useSolutionTypeMap';
import { useIndustrySegments } from '@/hooks/queries/useIndustrySegments';
import { normalizeSectionReview } from '@/lib/cogniblend/normalizeSectionReview';
import { loadExpandState, saveExpandState } from '@/components/cogniblend/curation/CuratorSectionPanel';
import { getCurationFormStore, selectStaleSections } from '@/store/curationFormStore';
import { getSectionDisplayName } from '@/lib/cogniblend/sectionDependencies';
import { buildChallengeContext, type BuildChallengeContextOptions } from '@/lib/cogniblend/challengeContextAssembler';
import { GROUPS } from '@/lib/cogniblend/curationSectionDefs';
import { resolveGovernanceMode, isControlledMode } from '@/lib/governanceMode';
import { toast } from 'sonner';
import type { SectionKey } from '@/types/sections';
import type { SectionReview } from '@/components/cogniblend/curation/CurationAIReviewPanel';
import type { ChallengeData } from '@/lib/cogniblend/curationTypes';
import type { RewardStructureDisplayHandle } from '@/components/cogniblend/curation/RewardStructureDisplay';
import type { ComplexityModuleHandle } from '@/components/cogniblend/curation/ComplexityAssessmentModule';

export function useCurationPageOrchestrator() {
  // ── Routing & Auth ──
  const { id: challengeId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── External queries ──
  const { data: userRoleCodes = [] } = useUserChallengeRoles(user?.id, challengeId);
  const { data: complexityParams = [] } = useComplexityParams();
  const { data: industrySegments } = useIndustrySegments();
  const { data: solutionTypeMap = [] } = useSolutionTypeMap();
  const { data: solutionTypesData = [] } = useSolutionTypes();
  const solutionTypeGroups = useMemo(() => groupSolutionTypes(solutionTypesData), [solutionTypesData]);

  // ── Page data (consolidated hook) ──
  const pageData = useCurationPageData(challengeId);
  const {
    activeGroup, setActiveGroup, editingSection, setEditingSection,
    savingSection, setSavingSection, approvedSections, setApprovedSections,
    aiReviews, setAiReviews, aiReviewsLoaded, setAiReviewsLoaded,
    aiReviewLoading, setAiReviewLoading, phase2Progress, setPhase2Progress,
    phase2Status, setPhase2Status, aiSuggestedComplexity, setAiSuggestedComplexity,
    triageTotalCount, setTriageTotalCount, manualOverrides, setManualOverrides,
    expandVersion, setExpandVersion, highlightWarnings, setHighlightWarnings,
    showOnlyStale, setShowOnlyStale, guidedMode, setGuidedMode,
    dismissedPrereqBanner, setDismissedPrereqBanner,
    optimisticIndustrySegId, setOptimisticIndustrySegId,
    escrowEnabled, setEscrowEnabled, isAcceptingAllLegal, setIsAcceptingAllLegal,
    preFlightResult, setPreFlightResult, preFlightDialogOpen, setPreFlightDialogOpen,
    budgetShortfall, setBudgetShortfall, contextLibraryOpen, setContextLibraryOpen,
    aiQuality, setAiQuality, aiQualityLoading, setAiQualityLoading,
    lockedSendState, setLockedSendState,
    challenge, isLoading, orgTypeName,
    legalDocs, legalDetails, escrowRecord, masterData, sectionActions,
  } = pageData;

  // ── Expand/collapse all ──
  const handleExpandCollapseAll = useCallback((expand: boolean) => {
    const groupDef = GROUPS.find((g) => g.id === activeGroup);
    if (!groupDef || !challengeId) return;
    const state = loadExpandState(challengeId);
    for (const key of groupDef.sectionKeys) {
      state[key] = expand;
    }
    saveExpandState(challengeId, state);
    setExpandVersion((v) => v + 1);
  }, [activeGroup, challengeId, setExpandVersion]);

  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const getSectionActionsForKey = useCallback((sectionKey: string) => {
    return sectionActions.filter(a => a.section_key === sectionKey);
  }, [sectionActions]);

  // ── Section approvals ──
  const { handleApproveLockedSection, handleUndoApproval } = useSectionApprovals({
    challengeId,
    userId: user?.id,
    aiReviews: aiReviews as any[],
    sectionActions: sectionActions as any[],
  });

  // ── Zustand store hydration & sync ──
  const { syncSectionToStore } = useCurationStoreHydration({
    challengeId: challengeId!,
    challenge: challenge ?? null,
    aiReviews,
  });
  useCurationStoreSync({ challengeId: challengeId!, enabled: !!challengeId });

  // ── Staleness tracking ──
  const curationStore = challengeId ? getCurationFormStore(challengeId) : null;
  const staleFingerprint = curationStore
    ? curationStore((state) => {
        const keys = Object.entries(state.sections)
          .filter(([, s]) => s?.isStale)
          .map(([k]) => k)
          .sort()
          .join(',');
        return keys;
      })
    : '';
  const staleSections = useMemo(() => {
    if (!staleFingerprint || !curationStore) return [];
    return selectStaleSections(curationStore.getState());
  }, [staleFingerprint, curationStore]);

  const notifyStaleness = useCallback((sectionKey: string) => {
    if (!curationStore) return;
    const affected = curationStore.getState().markSectionSaved(sectionKey as SectionKey);
    if (affected.length > 0) {
      toast.warning(`${affected.length} downstream section(s) marked stale after "${getSectionDisplayName(sectionKey as SectionKey)}" was changed.`);
    }
  }, [curationStore]);

  // ── Save mutation ──
  const saveSectionMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const { error } = await supabase
        .from('challenges')
        .update({ [field]: value, updated_by: user?.id ?? null } as any)
        .eq('id', challengeId!);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });
      toast.success('Section updated successfully');
      setEditingSection(null);
      setSavingSection(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
      setSavingSection(false);
    },
  });

  const saveSectionMutationRef = useRef(saveSectionMutation);
  saveSectionMutationRef.current = saveSectionMutation;

  const rewardStructureRef = useRef<RewardStructureDisplayHandle>(null);
  const complexityModuleRef = useRef<ComplexityModuleHandle>(null);

  // ── Extracted effects (AI review hydration + content migration) ──
  useCurationEffects({
    challenge: challenge as Record<string, any> | null,
    aiReviewsLoaded,
    setAiReviews,
    setAiReviewsLoaded,
    saveSectionMutation,
  });

  // ── Section action callbacks (D4.1) ──
  const sectionActionsHook = useCurationSectionActions({
    challengeId: challengeId!,
    challenge: challenge as Record<string, any> | null,
    userId: user?.id,
    saveSectionMutation,
    syncSectionToStore,
    notifyStaleness,
    setSavingSection,
    setEditingSection,
    setApprovedSections,
    setIsAcceptingAllLegal,
    setOptimisticIndustrySegId,
    setAiReviews,
    aiReviews,
    masterData,
    complexityParams,
    solutionTypesData: solutionTypesData as any[],
    solutionTypeMap,
    rewardStructureRef,
    complexityModuleRef,
    aiSuggestedComplexity,
  });

  // ── Wave executor (Phase 5) ──
  const buildContextOptions = useCallback((): BuildChallengeContextOptions => {
    const store = challengeId ? getCurationFormStore(challengeId) : null;
    const storeSections: BuildChallengeContextOptions['storeSections'] = {};
    if (store) {
      const state = store.getState();
      for (const [key, entry] of Object.entries(state.sections)) {
        if (entry) storeSections[key as SectionKey] = { data: entry.data };
      }
    }
    return {
      challengeId: challengeId!,
      challengeTitle: challenge?.title ?? '',
      solutionType: (challenge?.solution_type as any) ?? null,
      solutionTypes: Array.isArray(challenge?.solution_types) ? (challenge.solution_types as string[]) : [],
      seekerSegment: null,
      organizationTypeId: null,
      maturityLevelFromChallenge: challenge?.maturity_level ?? null,
      storeSections,
    };
  }, [challengeId, challenge?.title, challenge?.maturity_level]);

  const handleWaveSectionReviewed = useCallback((sectionKey: string, review: SectionReview) => {
    const normalized = normalizeSectionReview(review);
    setAiReviews((prev) => {
      const filtered = prev.filter((r) => r.section_key !== sectionKey);
      return [...filtered, { ...normalized, addressed: false }];
    });
    const currentReviews = aiReviews.filter((r) => r.section_key !== sectionKey);
    const merged = [...currentReviews, { ...normalized, addressed: false }];
    saveSectionMutationRef.current.mutate({ field: 'ai_section_reviews', value: merged });
  }, [aiReviews]);

  const updateProgress = useUpdateCurationProgress();
  const { executeWaves, reReviewStale, cancelReview, waveProgress, isRunning: isWaveRunning } = useWaveExecutor({
    challengeId: challengeId!,
    buildContextOptions,
    onSectionReviewed: handleWaveSectionReviewed,
    onComplexitySuggestion: (suggestion) => setAiSuggestedComplexity(suggestion),
    onProgress: {
      onWaveStart: (waveNum) => updateProgress.mutate({
        challengeId: challengeId!, status: 'ai_review', current_wave: waveNum,
        ...(waveNum === 1 ? { ai_review_started_at: new Date().toISOString() } : {}),
      }),
      onWaveComplete: (_waveNum, _count, total) => updateProgress.mutate({
        challengeId: challengeId!, sections_reviewed: total,
      }),
      onAllComplete: () => updateProgress.mutate({
        challengeId: challengeId!, status: 'curator_editing',
        ai_review_completed_at: new Date().toISOString(), sections_reviewed: 27,
      }),
    },
  });

  // ── AI actions (D4.2) ──
  const aiActionsHook = useCurationAIActions({
    challengeId,
    challenge: challenge as Record<string, any> | null,
    curationStore,
    optimisticIndustrySegId,
    isWaveRunning,
    aiReviews,
    buildContextOptions,
    executeWaves,
    saveSectionMutationRef,
    setPreFlightResult,
    setPreFlightDialogOpen,
    setAiReviewLoading,
    setTriageTotalCount,
    setBudgetShortfall,
    setAiQuality,
    setAiQualityLoading,
    setAiReviews,
    setAiSuggestedComplexity,
    setHighlightWarnings,
  });

  const handleAcceptAllPassing = useCallback(() => {
    aiActionsHook.handleAcceptAllPassing(sectionActionsHook.handleMarkAddressed);
  }, [aiActionsHook, sectionActionsHook.handleMarkAddressed]);

  // ── Completeness checks ──
  const { data: completenessCheckDefs = [] } = useCompletenessCheckDefs();
  const { result: completenessResult, run: runCompletenessCheck, isRunning: completenessRunning } = useRunCompletenessCheck({
    challengeId: challengeId!,
    challengeData: challenge as Record<string, any> | null,
  });

  const prevWaveStatusRef = useRef<string | undefined>();
  const runCompletenessCheckRef = useRef(runCompletenessCheck);
  runCompletenessCheckRef.current = runCompletenessCheck;
  useEffect(() => {
    const currentStatus = waveProgress?.overallStatus;
    if (prevWaveStatusRef.current === 'running' && currentStatus === 'completed') {
      runCompletenessCheckRef.current();
    }
    prevWaveStatusRef.current = currentStatus;
  }, [waveProgress?.overallStatus]);

  // ── Computed values ──
  const computedValues = useCurationComputedValues({
    challenge: challenge as ChallengeData | null,
    legalDocs,
    legalDetails,
    escrowRecord,
    aiQuality,
    aiReviews,
    staleSections,
    manualOverrides,
  });

  const activeGroupDef = GROUPS.find((g) => g.id === activeGroup) ?? GROUPS[0];

  // ── Extracted callbacks (navigation, budget, guided mode) ──
  const callbacks = useCurationCallbacks({
    challengeId,
    activeGroup,
    setActiveGroup,
    curationStore,
    setBudgetShortfall,
    groupProgress: computedValues.groupProgress,
  });

  // ── Derived state ──
  const isLegalAccepted = sectionActions.some(
    a => a.section_key === 'legal_docs' && a.action_type === 'approval' && a.status === 'approved'
  );
  const isEscrowAccepted = sectionActions.some(
    a => a.section_key === 'escrow_funding' && a.action_type === 'approval' && a.status === 'approved'
  );
  const governanceMode = challenge ? resolveGovernanceMode(challenge.governance_profile) : null;
  const needsLegalAcceptance = !!(challenge as any)?.lc_review_required || legalDetails.length > 0;
  const needsEscrowAcceptance = governanceMode ? isControlledMode(governanceMode) : false;
  const legalEscrowBlocked =
    (needsLegalAcceptance && !isLegalAccepted) ||
    (needsEscrowAcceptance && !isEscrowAccepted);

  const blockingReasons: string[] = [];
  if (needsLegalAcceptance && !isLegalAccepted) blockingReasons.push('Legal Documents');
  if (needsEscrowAcceptance && !isEscrowAccepted) blockingReasons.push('Escrow & Funding');
  const blockingReason = blockingReasons.length > 0
    ? `${blockingReasons.join(' and ')} must be accepted before submitting`
    : undefined;

  const phaseDescription = challenge?.current_phase === 1
    ? 'Spec Creation (Phase 1)'
    : challenge?.current_phase === 2
      ? 'Legal & Finance Review (Phase 2)'
      : '';

  return {
    // IDs & navigation
    challengeId,
    navigate,
    user,

    // Data
    challenge,
    isLoading,
    orgTypeName,
    legalDocs,
    legalDetails,
    escrowRecord,
    masterData,
    userRoleCodes,
    complexityParams,
    industrySegments,
    solutionTypeGroups,
    solutionTypesData,
    solutionTypeMap,

    // State
    activeGroup,
    activeGroupDef,
    editingSection,
    setEditingSection,
    savingSection,
    setSavingSection,
    approvedSections,
    aiReviews,
    aiReviewLoading,
    aiSuggestedComplexity,
    highlightWarnings,
    showOnlyStale,
    setShowOnlyStale,
    guidedMode,
    setGuidedMode,
    dismissedPrereqBanner,
    setDismissedPrereqBanner,
    optimisticIndustrySegId,
    escrowEnabled,
    setEscrowEnabled,
    isAcceptingAllLegal,
    preFlightResult,
    preFlightDialogOpen,
    setPreFlightDialogOpen,
    budgetShortfall,
    setBudgetShortfall,
    contextLibraryOpen,
    setContextLibraryOpen,
    aiQuality,
    aiQualityLoading,
    lockedSendState,
    setLockedSendState,
    expandVersion,
    staleSections,
    curationStore,
    sectionActions,

    // Computed values
    ...computedValues,

    // Derived flags
    legalEscrowBlocked,
    blockingReason,
    phaseDescription,

    // Mutations & refs
    saveSectionMutation,
    rewardStructureRef,
    complexityModuleRef,

    // Section action callbacks
    ...sectionActionsHook,

    // AI action callbacks
    ...aiActionsHook,
    handleAcceptAllPassing,

    // Wave & completeness
    waveProgress,
    isWaveRunning,
    cancelReview,
    reReviewStale,
    completenessResult,
    completenessCheckDefs,
    completenessRunning,
    runCompletenessCheck,
    executeWavesWithBudgetCheck: aiActionsHook.executeWavesWithBudgetCheck,

    // Navigation & UI handlers
    ...callbacks,
    handleExpandCollapseAll,
    handleApproveLockedSection,
    handleUndoApproval,
    getSectionActions: getSectionActionsForKey,
    phase2Status,
    triageTotalCount,
    setAiReviewLoading: pageData.setAiReviewLoading,
    setActiveGroup: pageData.setActiveGroup,
  };
}
