/**
 * useCurationPageOrchestrator — Master orchestrator hook for CurationReviewPage.
 * Delegates sub-concerns to focused hooks.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserChallengeRoles } from '@/hooks/cogniblend/useUserChallengeRoles';
import { useSectionApprovals } from '@/hooks/cogniblend/useSectionApprovals';
import { useComplexityParams } from '@/hooks/queries/useComplexityParams';
import { useCurationPageData } from '@/hooks/cogniblend/useCurationPageData';
import { useCurationStoreHydration } from '@/hooks/useCurationStoreHydration';
import { useCurationStoreSync } from '@/hooks/useCurationStoreSync';
import { useCurationSectionActions } from '@/hooks/cogniblend/useCurationSectionActions';
import { useCurationAIActions } from '@/hooks/cogniblend/useCurationAIActions';
import { useCurationComputedValues } from '@/hooks/cogniblend/useCurationComputedValues';
import { useCurationEffects } from '@/hooks/cogniblend/useCurationEffects';
import { useCurationCallbacks } from '@/hooks/cogniblend/useCurationCallbacks';
import { useCurationWaveSetup } from '@/hooks/cogniblend/useCurationWaveSetup';
import { useSolutionTypes, groupSolutionTypes, useSolutionTypeMap } from '@/hooks/queries/useSolutionTypeMap';
import { useIndustrySegments } from '@/hooks/queries/useIndustrySegments';
import { loadExpandState, saveExpandState } from '@/components/cogniblend/curation/CuratorSectionPanel';
import { getCurationFormStore, selectStaleSections } from '@/store/curationFormStore';
import { getSectionDisplayName } from '@/lib/cogniblend/sectionDependencies';
import { GROUPS } from '@/lib/cogniblend/curationSectionDefs';
import { resolveGovernanceMode, isControlledMode } from '@/lib/governanceMode';
import { countPendingSuggestions, partitionSuggestionsForBulkAccept } from '@/lib/cogniblend/bulkAcceptHelpers';
import { toast } from 'sonner';
import type { SectionKey } from '@/types/sections';
import type { ChallengeData } from '@/lib/cogniblend/curationTypes';
import type { RewardStructureDisplayHandle } from '@/components/cogniblend/curation/RewardStructureDisplay';
import type { ComplexityModuleHandle } from '@/components/cogniblend/curation/ComplexityAssessmentModule';

export function useCurationPageOrchestrator() {
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

  // ── Page data ──
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
    pass1DoneSession, setPass1DoneSession,
    aiQuality, setAiQuality, aiQualityLoading, setAiQualityLoading,
    lockedSendState, setLockedSendState,
    challenge, isLoading, orgTypeName,
    legalDocs, legalDetails, escrowRecord, masterData, sectionActions,
  } = pageData;

  // ── Expand/collapse ──
  const handleExpandCollapseAll = useCallback((expand: boolean) => {
    const groupDef = GROUPS.find((g) => g.id === activeGroup);
    if (!groupDef || !challengeId) return;
    const state = loadExpandState(challengeId);
    for (const key of groupDef.sectionKeys) state[key] = expand;
    saveExpandState(challengeId, state);
    setExpandVersion((v) => v + 1);
  }, [activeGroup, challengeId, setExpandVersion]);

  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const getSectionActionsForKey = useCallback((sectionKey: string) => sectionActions.filter(a => a.section_key === sectionKey), [sectionActions]);

  // ── Section approvals ──
  const { handleApproveLockedSection, handleUndoApproval } = useSectionApprovals({
    challengeId, userId: user?.id, aiReviews: aiReviews as any[], sectionActions: sectionActions as any[],
  });

  // ── Store hydration & sync ──
  const { syncSectionToStore } = useCurationStoreHydration({ challengeId: challengeId!, challenge: challenge ?? null, aiReviews });
  useCurationStoreSync({ challengeId: challengeId!, enabled: !!challengeId });

  // ── Staleness ──
  const curationStore = challengeId ? getCurationFormStore(challengeId) : null;
  const staleFingerprint = curationStore
    ? curationStore((s) => Object.entries(s.sections).filter(([, v]) => v?.isStale).map(([k]) => k).sort().join(','))
    : '';
  const staleSections = useMemo(() => {
    if (!staleFingerprint || !curationStore) return [];
    return selectStaleSections(curationStore.getState());
  }, [staleFingerprint, curationStore]);

  const notifyStaleness = useCallback((sectionKey: string) => {
    if (!curationStore) return;
    const affected = curationStore.getState().markSectionSaved(sectionKey as SectionKey);
    if (affected.length > 0) toast.warning(`${affected.length} downstream section(s) marked stale after "${getSectionDisplayName(sectionKey as SectionKey)}" was changed.`);
  }, [curationStore]);

  // ── Save mutation ──
  const saveSectionMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const { error } = await supabase.from('challenges').update({ [field]: value, updated_by: user?.id ?? null } as any).eq('id', challengeId!);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] }); setSavingSection(false); },
    onError: (error: Error) => { toast.error(`Failed to save: ${error.message}`); setSavingSection(false); },
  });

  const saveSectionMutationRef = useRef(saveSectionMutation);
  saveSectionMutationRef.current = saveSectionMutation;
  const rewardStructureRef = useRef<RewardStructureDisplayHandle>(null);
  const complexityModuleRef = useRef<ComplexityModuleHandle>(null);

  // ── Effects ──
  useCurationEffects({ challenge: challenge as unknown as Record<string, unknown> | null, aiReviewsLoaded, setAiReviews, setAiReviewsLoaded, setPass1DoneSession, saveSectionMutation });

  // ── Section actions ──
  const sectionActionsHook = useCurationSectionActions({
    challengeId: challengeId!, challenge: challenge as Record<string, any> | null, userId: user?.id,
    saveSectionMutation, syncSectionToStore, notifyStaleness, setSavingSection, setEditingSection,
    setApprovedSections, setIsAcceptingAllLegal, setOptimisticIndustrySegId, setAiReviews, aiReviews,
    masterData, complexityParams, solutionTypesData: solutionTypesData as any[], solutionTypeMap,
    rewardStructureRef, complexityModuleRef, aiSuggestedComplexity,
  });

  // ── Wave executor + completeness ──
  const waveSetup = useCurationWaveSetup({
    challengeId, challenge: challenge as Record<string, any> | null,
    aiReviews, setAiReviews, setAiSuggestedComplexity, saveSectionMutationRef,
  });

  // ── AI actions ──
  const aiActionsHook = useCurationAIActions({
    challengeId, challenge: challenge as Record<string, any> | null, curationStore,
    optimisticIndustrySegId, isWaveRunning: waveSetup.isWaveRunning, aiReviews,
    buildContextOptions: waveSetup.buildContextOptions, executeWaves: waveSetup.executeWaves,
    executeWavesPass1: waveSetup.executeWavesPass1, executeWavesFull: waveSetup.executeWavesFull,
    executeWavesPass2: waveSetup.executeWavesPass2, pass1SetWaveProgress: waveSetup.pass1SetWaveProgress,
    saveSectionMutationRef, setPreFlightResult, setPreFlightDialogOpen, setAiReviewLoading,
    setTriageTotalCount, setBudgetShortfall, setAiQuality, setAiQualityLoading,
    setAiReviews, setAiSuggestedComplexity, setHighlightWarnings, setContextLibraryOpen,
    setPass1DoneSession,
  });

  const handleAcceptAllPassing = useCallback(() => aiActionsHook.handleAcceptAllPassing(sectionActionsHook.handleMarkAddressed), [aiActionsHook, sectionActionsHook.handleMarkAddressed]);

  // ── Bulk accept all AI suggestions ──
  const [isBulkAccepting, setIsBulkAccepting] = useState(false);

  // Use a reactive selector from the store for suggestionsCount
  const suggestionsFingerprint = curationStore
    ? curationStore((s) => Object.entries(s.sections)
        .filter(([, v]) => v?.aiSuggestion && !v.addressed)
        .map(([k]) => k).sort().join(','))
    : '';
  const suggestionsCount = useMemo(() => {
    if (!curationStore) return 0;
    const { countPendingSuggestions } = require('@/lib/cogniblend/bulkAcceptHelpers') as typeof import('@/lib/cogniblend/bulkAcceptHelpers');
    return countPendingSuggestions(curationStore.getState().sections);
  }, [curationStore, suggestionsFingerprint]);

  const handleAcceptAllSuggestions = useCallback(async () => {
    if (!curationStore || !challenge) return;
    const { partitionSuggestionsForBulkAccept } = await import('@/lib/cogniblend/bulkAcceptHelpers');

    const partition = partitionSuggestionsForBulkAccept(curationStore.getState().sections);
    const totalCount = partition.regular.length + partition.extendedBrief.length;
    if (totalCount === 0) { toast.info('No pending AI suggestions to accept.'); return; }

    setIsBulkAccepting(true);
    try {
      // 1. Regular sections — staggered 100ms
      for (const item of partition.regular) {
        await sectionActionsHook.handleAcceptRefinement(item.key, item.suggestion);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 2. Extended brief subsections — batched single write
      if (partition.extendedBrief.length > 0) {
        for (const item of partition.extendedBrief) {
          await sectionActionsHook.handleAcceptExtendedBriefRefinement(item.key, item.suggestion);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // 3. Mark all as addressed in store
      const allKeys = [
        ...partition.regular.map(i => i.key),
        ...partition.extendedBrief.map(i => i.key),
      ];
      for (const key of allKeys) {
        curationStore.getState().setAddressedOnly(key);
      }

      toast.success(`Accepted AI suggestions for ${totalCount} section${totalCount !== 1 ? 's' : ''}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Bulk accept failed: ${message}`);
    } finally {
      setIsBulkAccepting(false);
    }
  }, [curationStore, challenge, sectionActionsHook]);

  // ── Computed values ──
  const computedValues = useCurationComputedValues({
    challenge: challenge as ChallengeData | null, legalDocs, legalDetails, escrowRecord, aiQuality, aiReviews, staleSections, manualOverrides,
  });

  const activeGroupDef = GROUPS.find((g) => g.id === activeGroup) ?? GROUPS[0];

  // ── Callbacks ──
  const callbacks = useCurationCallbacks({
    challengeId, activeGroup, setActiveGroup, curationStore, setBudgetShortfall, groupProgress: computedValues.groupProgress,
  });

  // ── Derived state ──
  const isLegalAccepted = sectionActions.some(a => a.section_key === 'legal_docs' && a.action_type === 'approval' && a.status === 'approved');
  const isEscrowAccepted = sectionActions.some(a => a.section_key === 'escrow_funding' && a.action_type === 'approval' && a.status === 'approved');
  const governanceMode = challenge ? resolveGovernanceMode((challenge as any).governance_mode_override ?? challenge.governance_profile) : null;
  // CONTROLLED: Curator does content only — LC/FC handle legal+escrow independently in Phase 3
  // STRUCTURED: Curator handles legal+escrow (auto-approved in complete_phase)
  const isControlled = governanceMode ? isControlledMode(governanceMode) : false;
  const needsLegalAcceptance = isControlled ? false : (!!(challenge as unknown as Record<string, unknown>)?.lc_review_required || legalDetails.length > 0);
  const needsEscrowAcceptance = false; // Escrow is never a Curator blocker — handled by FC in Phase 3
  const legalEscrowBlocked = (needsLegalAcceptance && !isLegalAccepted);
  const blockingReasons: string[] = [];
  if (needsLegalAcceptance && !isLegalAccepted) blockingReasons.push('Legal Documents');
  const blockingReason = blockingReasons.length > 0 ? `${blockingReasons.join(' and ')} must be accepted before submitting` : undefined;
  const phaseDescription = challenge?.current_phase === 1 ? 'Spec Creation (Phase 1)' : challenge?.current_phase === 2 ? 'Legal & Finance Review (Phase 2)' : '';

  // ── Context Library reviewed gate ──
  const [contextLibraryReviewed, setContextLibraryReviewed] = useState(() => {
    if (challengeId) {
      return sessionStorage.getItem(`ctx_reviewed_${challengeId}`) === 'true';
    }
    return false;
  });

  // When Context Library drawer closes after being opened post-analysis, mark as reviewed
  const prevContextLibraryOpenRef = useRef(false);
  useEffect(() => {
    if (prevContextLibraryOpenRef.current && !contextLibraryOpen && pass1DoneSession) {
      setContextLibraryReviewed(true);
      if (challengeId) {
        sessionStorage.setItem(`ctx_reviewed_${challengeId}`, 'true');
      }
    }
    prevContextLibraryOpenRef.current = contextLibraryOpen;
  }, [contextLibraryOpen, pass1DoneSession, challengeId]);

  // If pass1 was done in a prior session (hydrated from DB), auto-unlock
  useEffect(() => {
    if (pass1DoneSession && !contextLibraryReviewed) {
      setContextLibraryReviewed(true);
      if (challengeId) {
        sessionStorage.setItem(`ctx_reviewed_${challengeId}`, 'true');
      }
    }
  }, [pass1DoneSession]);

  return {
    challengeId, navigate, user,
    challenge, isLoading, orgTypeName, legalDocs, legalDetails, escrowRecord, masterData,
    userRoleCodes, complexityParams, industrySegments, solutionTypeGroups, solutionTypesData, solutionTypeMap,
    activeGroup, activeGroupDef, editingSection, setEditingSection, savingSection, setSavingSection,
    approvedSections, aiReviews, aiReviewLoading, aiSuggestedComplexity, highlightWarnings,
    showOnlyStale, setShowOnlyStale, guidedMode, setGuidedMode,
    dismissedPrereqBanner, setDismissedPrereqBanner, optimisticIndustrySegId,
    escrowEnabled, setEscrowEnabled, isAcceptingAllLegal, preFlightResult,
    preFlightDialogOpen, setPreFlightDialogOpen, budgetShortfall, setBudgetShortfall,
    contextLibraryOpen, setContextLibraryOpen, pass1DoneSession,
    contextLibraryReviewed,
    aiQuality, aiQualityLoading,
    lockedSendState, setLockedSendState, expandVersion, staleSections, curationStore, sectionActions,
    ...computedValues,
    legalEscrowBlocked, blockingReason, phaseDescription,
    saveSectionMutation, rewardStructureRef, complexityModuleRef,
    ...sectionActionsHook, ...aiActionsHook, handleAcceptAllPassing,
    handleAcceptAllSuggestions, suggestionsCount, isBulkAccepting,
    ...waveSetup, executeWavesWithBudgetCheck: aiActionsHook.executeWavesWithBudgetCheck,
    ...callbacks, handleExpandCollapseAll, handleApproveLockedSection, handleUndoApproval,
    getSectionActions: getSectionActionsForKey,
    phase2Status, triageTotalCount,
    setAiReviewLoading: pageData.setAiReviewLoading,
    setActiveGroup: pageData.setActiveGroup,
  };
}
