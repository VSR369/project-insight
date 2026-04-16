/**
 * useCurationPageOrchestrator — Master orchestrator hook for CurationReviewPage.
 * Delegates sub-concerns to focused hooks.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useCuratorEditTracking } from '@/hooks/cogniblend/useCuratorEditTracking';
import { persistCuratorCorrections } from '@/services/cogniblend/persistCuratorCorrections';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserChallengeRoles } from '@/hooks/cogniblend/useUserChallengeRoles';
import { useSectionApprovals } from '@/hooks/cogniblend/useSectionApprovals';
import { useComplexityParams } from '@/hooks/queries/useComplexityParams';
import { useCurationPageData } from '@/hooks/cogniblend/useCurationPageData';
import { useCurationStoreHydration } from '@/hooks/useCurationStoreHydration';
import { useCurationStoreSync, pauseSync, resumeSync } from '@/hooks/useCurationStoreSync';
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
import { EXTENDED_BRIEF_FIELD_MAP } from '@/lib/cogniblend/curationSectionFormats';
import { parseJson } from '@/lib/cogniblend/curationHelpers';
import { toast } from 'sonner';
import type { SectionKey } from '@/types/sections';
import type { AcceptanceSectionResult } from '@/services/cogniblend/waveExecutionHistory';
import { saveAcceptanceRecord } from '@/services/cogniblend/waveExecutionHistory';
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
    generateDoneSession,
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
  // Ref tracks whether a wave is running so onSuccess can skip invalidation
  const waveRunningRef = useRef(false);

  const saveSectionMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const { error } = await supabase.from('challenges').update({ [field]: value, updated_by: user?.id ?? null } as any).eq('id', challengeId!);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      // During wave execution, skip invalidation to prevent page unmount.
      // A single invalidation fires in the wave onAllComplete callback.
      if (!waveRunningRef.current) {
        queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });
      }
      setSavingSection(false);
    },
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

  // ── Context Library reviewed gate (declared early so AI actions can reset it) ──
  const [contextLibraryReviewed, setContextLibraryReviewed] = useState(() => {
    if (challengeId) {
      return sessionStorage.getItem(`ctx_reviewed_${challengeId}`) === 'true';
    }
    return false;
  });

  // ── Wave executor + completeness ──
  const waveSetup = useCurationWaveSetup({
    challengeId, challenge: challenge as Record<string, any> | null,
    aiReviews, setAiReviews, setAiSuggestedComplexity, saveSectionMutationRef,
    waveRunningRef,
  });

  // Keep waveRunningRef in sync so saveSectionMutation.onSuccess can check it
  useEffect(() => {
    waveRunningRef.current = waveSetup.isWaveRunning;
    if (!waveSetup.isWaveRunning && waveSetup.waveProgress?.overallStatus === 'completed') {
      // Single refresh after all waves finish
      queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });
    }
  }, [waveSetup.isWaveRunning, waveSetup.waveProgress?.overallStatus, queryClient, challengeId]);

  // ── AI actions ──
  const aiActionsHook = useCurationAIActions({
    challengeId, challenge: challenge as Record<string, any> | null, curationStore,
    optimisticIndustrySegId, isWaveRunning: waveSetup.isWaveRunning, aiReviews,
    buildContextOptions: waveSetup.buildContextOptions,
    pass1SetWaveProgress: waveSetup.pass1SetWaveProgress,
    executeWavesPass1: waveSetup.executeWavesPass1,
    executeWavesPass2: waveSetup.executeWavesPass2,
    saveSectionMutationRef, setPreFlightResult, setPreFlightDialogOpen, setAiReviewLoading,
    setTriageTotalCount, setBudgetShortfall, setAiQuality, setAiQualityLoading,
    setAiReviews, setAiSuggestedComplexity, setHighlightWarnings, setContextLibraryOpen,
    setPass1DoneSession,
    setGenerateDoneSession: pageData.setGenerateDoneSession,
    setContextLibraryReviewed,
  });

  // ── Bulk accept all AI suggestions ──
  const [isBulkAccepting, setIsBulkAccepting] = useState(false);

  // ── Curator edit tracking ──
  const editTracking = useCuratorEditTracking();

  // Use a reactive selector from the store for suggestionsCount
  const suggestionsFingerprint = curationStore
    ? curationStore((s) => Object.entries(s.sections)
        .filter(([, v]) => v?.aiSuggestion && !v.addressed)
        .map(([k]) => k).sort().join(','))
    : '';
  const suggestionsCount = useMemo(() => {
    if (!curationStore) return 0;
    return countPendingSuggestions(curationStore.getState().sections);
  }, [curationStore, suggestionsFingerprint]);

  const handleAcceptAllSuggestions = useCallback(async () => {
    if (!curationStore || !challenge || !challengeId) return;

    const partition = partitionSuggestionsForBulkAccept(curationStore.getState().sections);
    const totalCount = partition.regular.length + partition.extendedBrief.length;
    if (totalCount === 0) { toast.info('No pending AI suggestions to accept.'); return; }

    setIsBulkAccepting(true);
    pauseSync();

    const results: AcceptanceSectionResult[] = [];

    try {
      // 1. Regular sections — sequential awaited writes with per-section tracking
      for (const item of partition.regular) {
        try {
          await sectionActionsHook.handleAcceptRefinement(item.key, item.suggestion);
          results.push({ sectionId: item.key, status: 'updated' });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          results.push({ sectionId: item.key, status: 'failed', errorMessage: msg });
        }
      }

      // 2. Extended brief subsections — ONE atomic batched write
      if (partition.extendedBrief.length > 0) {
        try {
          const { data: currentRow } = await supabase
            .from('challenges')
            .select('extended_brief')
            .eq('id', challengeId)
            .single();

          const currentBrief = parseJson<Record<string, unknown>>(currentRow?.extended_brief ?? null) ?? {};

          for (const item of partition.extendedBrief) {
            const jsonbField = EXTENDED_BRIEF_FIELD_MAP[item.key];
            if (!jsonbField) continue;
            let valueToSave: unknown = item.suggestion;
            try { valueToSave = JSON.parse(item.suggestion); } catch { /* keep string */ }
            currentBrief[jsonbField] = valueToSave;
          }

          const { error } = await supabase
            .from('challenges')
            .update({
              extended_brief: currentBrief as Record<string, unknown>,
              updated_at: new Date().toISOString(),
            } as Record<string, unknown>)
            .eq('id', challengeId);

          if (error) throw new Error(`Extended brief save failed: ${error.message}`);

          for (const item of partition.extendedBrief) {
            syncSectionToStore(item.key, currentBrief[EXTENDED_BRIEF_FIELD_MAP[item.key]] as Record<string, unknown>);
            results.push({ sectionId: item.key, status: 'updated' });
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          for (const item of partition.extendedBrief) {
            results.push({ sectionId: item.key, status: 'failed', errorMessage: msg });
          }
        }
      }

      // 3. Mark all successful as addressed in store
      const successKeys = results.filter(r => r.status === 'updated').map(r => r.sectionId);
      for (const key of successKeys) {
        curationStore.getState().setAddressedOnly(key);
      }

      // 4. Update aiReviews React state so panels collapse
      setAiReviews((prev) =>
        prev.map((r) =>
          successKeys.includes(r.section_key as SectionKey)
            ? { ...r, addressed: true }
            : r
        )
      );

      // 5. Record curator edits for learning corpus
      const aiContentMap = new Map<string, string | null>();
      const curatorContentMap = new Map<string, string | null>();
      for (const item of [...partition.regular, ...partition.extendedBrief]) {
        const wasAccepted = results.find(r => r.sectionId === item.key && r.status === 'updated');
        if (!wasAccepted) continue;
        // AI suggestion is the raw string; curator content is what's now in store
        aiContentMap.set(item.key, item.suggestion ?? null);
        const storeEntry = curationStore?.getState().getSectionEntry(item.key as SectionKey);
        const curatorVal = storeEntry?.data;
        curatorContentMap.set(item.key, typeof curatorVal === 'string' ? curatorVal : JSON.stringify(curatorVal ?? null));
        editTracking.recordEdit(item.key, item.suggestion, typeof curatorVal === 'string' ? curatorVal : JSON.stringify(curatorVal ?? null));
      }

      // 5b. Persist acceptance record
      const totalUpdated = results.filter(r => r.status === 'updated').length;
      const totalFailed = results.filter(r => r.status === 'failed').length;
      saveAcceptanceRecord({
        challengeId,
        overallStatus: totalFailed === 0 ? 'completed' : totalUpdated === 0 ? 'failed' : 'partial',
        sections: results,
        acceptedAt: new Date().toISOString(),
        totalUpdated,
        totalFailed,
      });

      // 5c. Flush edit records to DB (non-blocking)
      const editRecords = editTracking.flush();
      persistCuratorCorrections({ challengeId, records: editRecords, aiContentMap, curatorContentMap });

      // 6. Invalidate queries to ensure fresh data (including preview)
      await queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });
      await queryClient.invalidateQueries({ queryKey: ['challenge-preview', challengeId] });

      if (totalFailed > 0) {
        toast.warning(`Accepted ${totalUpdated} section(s), ${totalFailed} failed. Check diagnostics for details.`);
      } else {
        toast.success(`Accepted AI suggestions for ${totalUpdated} section${totalUpdated !== 1 ? 's' : ''}`);
      }
      navigate(`/cogni/curation/${challengeId}/preview`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Bulk accept failed: ${message}`);
    } finally {
      resumeSync();
      setIsBulkAccepting(false);
    }
  }, [curationStore, challenge, challengeId, sectionActionsHook, setAiReviews, queryClient, syncSectionToStore]);

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

  // (contextLibraryReviewed state is declared earlier, before useCurationAIActions)

  // Context Library confirmed gate — ONLY set via explicit "Confirm & Close" action
  // Do NOT auto-unlock on drawer close or pass1 hydration
  const handleContextLibraryConfirm = useCallback(() => {
    setContextLibraryReviewed(true);
    if (challengeId) {
      sessionStorage.setItem(`ctx_reviewed_${challengeId}`, 'true');
    }
  }, [challengeId, setContextLibraryReviewed]);

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
    generateDoneSession, setGenerateDoneSession: pageData.setGenerateDoneSession,
    contextLibraryReviewed, handleContextLibraryConfirm,
    aiQuality, aiQualityLoading,
    lockedSendState, setLockedSendState, expandVersion, staleSections, curationStore, sectionActions,
    ...computedValues,
    legalEscrowBlocked, blockingReason, phaseDescription,
    saveSectionMutation, rewardStructureRef, complexityModuleRef,
    ...sectionActionsHook, ...aiActionsHook,
    handleAcceptAllSuggestions, suggestionsCount, isBulkAccepting,
    ...waveSetup, runAnalyseFlow: aiActionsHook.runAnalyseFlow,
    ...callbacks, handleExpandCollapseAll, handleApproveLockedSection, handleUndoApproval,
    getSectionActions: getSectionActionsForKey,
    phase2Status, triageTotalCount,
    setAiReviewLoading: pageData.setAiReviewLoading,
    setActiveGroup: pageData.setActiveGroup,
  };
}
