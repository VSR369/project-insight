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
import { useWaveExecutor } from '@/hooks/useWaveExecutor';
import { useCompletenessCheckDefs, useRunCompletenessCheck } from '@/hooks/queries/useCompletenessChecks';
import { useSolutionTypes, groupSolutionTypes, useSolutionTypeMap } from '@/hooks/queries/useSolutionTypeMap';
import { useIndustrySegments } from '@/hooks/queries/useIndustrySegments';
import { normalizeSectionReview, normalizeSectionReviews } from '@/lib/cogniblend/normalizeSectionReview';
import { loadExpandState, saveExpandState } from '@/components/cogniblend/curation/CuratorSectionPanel';
import { getCurationFormStore, selectStaleSections } from '@/store/curationFormStore';
import { getSectionDisplayName } from '@/lib/cogniblend/sectionDependencies';
import { buildChallengeContext, type BuildChallengeContextOptions } from '@/lib/cogniblend/challengeContextAssembler';
import { findCorruptedFields } from '@/utils/migrateCorruptedContent';
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

  // ── AI review hydration effect ──
  useEffect(() => {
    if (challenge?.ai_section_reviews && !aiReviewsLoaded) {
      let stored: SectionReview[] = [];
      if (Array.isArray(challenge.ai_section_reviews)) {
        stored = normalizeSectionReviews(challenge.ai_section_reviews as unknown as SectionReview[]);
      } else if (challenge.ai_section_reviews && typeof challenge.ai_section_reviews === 'object') {
        const objMap = challenge.ai_section_reviews as Record<string, any>;
        const converted: SectionReview[] = [];
        for (const [key, val] of Object.entries(objMap)) {
          if (val && typeof val === 'object' && 'section_key' in val) {
            converted.push({
              section_key: val.section_key ?? key,
              status: val.status ?? 'pass',
              comments: Array.isArray(val.comments) ? val.comments : [],
              reviewed_at: val.reviewed_at,
              addressed: val.addressed ?? false,
            });
          }
        }
        if (converted.length > 0) {
          stored = normalizeSectionReviews(converted);
          saveSectionMutation.mutate({ field: 'ai_section_reviews', value: stored });
        }
      }
      if (stored.length > 0) setAiReviews(stored);
      setAiReviewsLoaded(true);
    }
  }, [challenge?.ai_section_reviews, aiReviewsLoaded]);

  // ── Content migration effect ──
  const contentMigrationRanRef = useRef(false);
  useEffect(() => {
    if (!challenge || contentMigrationRanRef.current) return;
    contentMigrationRanRef.current = true;
    const targets = [
      { dbField: 'problem_statement', content: challenge.problem_statement as string | null },
      { dbField: 'scope', content: challenge.scope as string | null },
      { dbField: 'hook', content: challenge.hook as string | null },
      { dbField: 'description', content: challenge.description as string | null },
    ];
    const corrupted = findCorruptedFields(targets);
    corrupted.forEach(({ dbField, fixed }) => {
      saveSectionMutationRef.current.mutate({ field: dbField, value: fixed });
    });
  }, [challenge]);

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

  // ── Navigation helpers ──
  const handleNavigateToSection = useCallback((sectionKey: string) => {
    const group = GROUPS.find((g) => g.sectionKeys.includes(sectionKey));
    if (group) setActiveGroup(group.id);
  }, []);

  const handleGroupClick = useCallback((groupId: string) => {
    setActiveGroup(groupId);
  }, []);

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

  // ── Derived state (post-conditional) ──
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

  // ── Budget revision handler ──
  const handleAcceptBudgetRevision = useCallback(async (shortfall: any) => {
    try {
      if (curationStore && shortfall) {
        const existingReward = curationStore.getState().getSectionEntry('reward_structure' as SectionKey);
        const updatedData = {
          ...(typeof existingReward.data === 'object' && existingReward.data ? existingReward.data : {}),
          _budgetRevised: true,
          _revisedReward: shortfall.originalBudget,
          _revisionStrategy: shortfall.strategy,
        };
        curationStore.getState().setSectionData('reward_structure' as SectionKey, updatedData as Record<string, unknown>);
      }
      const { data: crRoles } = await supabase
        .from('user_challenge_roles')
        .select('user_id')
        .eq('challenge_id', challengeId!)
        .eq('role_code', 'CR')
        .limit(1);
      const crUserId = crRoles?.[0]?.user_id;
      if (crUserId) {
        await supabase.from('cogni_notifications').insert({
          user_id: crUserId,
          challenge_id: challengeId!,
          notification_type: 'budget_revision',
          title: 'Budget Revision Requires Approval',
          message: `Budget shortfall detected (${shortfall.gapPercentage}% gap). Strategy: ${shortfall.strategy}. Original: ${shortfall.originalBudget}, Minimum: ${shortfall.minimumViableReward}.`,
        });
      }
      toast.success('Revision accepted. Notification sent to Account Manager.');
    } catch {
      toast.error('Failed to send notification to Account Manager.');
    }
    setBudgetShortfall(null);
  }, [curationStore, challengeId, setBudgetShortfall]);

  // ── Guided mode next handler ──
  const handleGuidedNext = useCallback(() => {
    const currentIdx = GROUPS.findIndex(g => g.id === activeGroup);
    for (let i = currentIdx + 1; i < GROUPS.length; i++) {
      const gp = computedValues.groupProgress[GROUPS[i].id];
      if (gp && gp.done < gp.total) {
        setActiveGroup(GROUPS[i].id);
        return;
      }
    }
    toast.success('All tabs reviewed!');
  }, [activeGroup, computedValues.groupProgress]);

  const guidedNextLabel = useMemo(() => {
    const currentIdx = GROUPS.findIndex(g => g.id === activeGroup);
    for (let i = currentIdx + 1; i < GROUPS.length; i++) {
      const gp = computedValues.groupProgress[GROUPS[i].id];
      if (gp && gp.done < gp.total) return GROUPS[i].label;
    }
    return 'All Complete';
  }, [activeGroup, computedValues.groupProgress]);

  const handlePreFlightGoToSection = useCallback((sectionKey: string) => {
    const group = GROUPS.find(g => g.sectionKeys.includes(sectionKey));
    if (group) setActiveGroup(group.id);
    setTimeout(() => {
      const el = document.getElementById(`section-${sectionKey}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }, []);

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
    handleGroupClick,
    handleNavigateToSection,
    handleExpandCollapseAll,
    handleApproveLockedSection,
    handleUndoApproval,
    getSectionActions: getSectionActionsForKey,
    phase2Status,
    triageTotalCount,
    handleAcceptBudgetRevision,
    handleGuidedNext,
    guidedNextLabel,
    handlePreFlightGoToSection,
    setAiReviewLoading: pageData.setAiReviewLoading,
    setActiveGroup: pageData.setActiveGroup,
  };
}
