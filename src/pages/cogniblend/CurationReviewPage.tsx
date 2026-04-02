/**
 * Curation Review Page — /cogni/curation/:id
 *
 * Grouped focus-area layout with:
 *  - TOP: Progress strip (4 groups)
 *  - LEFT (75%): Single-accordion sections per active group
 *  - RIGHT (25%): Action rail + AI summary
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
// shallow equality removed — using JSON stabilization instead
// Phase 5 imports
import { preFlightCheck, type PreFlightResult } from "@/lib/cogniblend/preFlightCheck";
import { PreFlightGateDialog } from "@/components/cogniblend/curation/PreFlightGateDialog";
import { WaveProgressPanel } from "@/components/cogniblend/curation/WaveProgressPanel";
import { BudgetRevisionPanel } from "@/components/cogniblend/curation/BudgetRevisionPanel";
import { useWaveExecutor } from "@/hooks/useWaveExecutor";
import { detectBudgetShortfall, type BudgetShortfallResult } from "@/lib/cogniblend/budgetShortfallDetection";
import { buildChallengeContext, type BuildChallengeContextOptions } from "@/lib/cogniblend/challengeContextAssembler";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HoldResumeActions } from "@/components/cogniblend/HoldResumeActions";
import { useUserChallengeRoles } from "@/hooks/cogniblend/useUserChallengeRoles";
import { useSectionApprovals } from "@/hooks/cogniblend/useSectionApprovals";
import { useUpdateCurationProgress } from "@/hooks/cogniblend/useCurationProgress";
import { useComplexityParams, ComplexityParam as MasterComplexityParam } from "@/hooks/queries/useComplexityParams";
import { getMaturityLabel } from "@/lib/maturityLabels";
import { useCurationPageData } from "@/hooks/cogniblend/useCurationPageData";
import { contentRequiresHumanInput } from "@/lib/cogniblend/creatorDataTransformer";
import { findCorruptedFields } from "@/utils/migrateCorruptedContent";
import { Badge } from "@/components/ui/badge";
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { resolveGovernanceMode, isControlledMode } from '@/lib/governanceMode';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ComplexityAssessmentModule, type ComplexityModuleHandle } from "@/components/cogniblend/curation/ComplexityAssessmentModule";
import type { SectionReview } from "@/components/cogniblend/curation/CurationAIReviewPanel";
import { normalizeSectionReview, normalizeSectionReviews } from "@/lib/cogniblend/normalizeSectionReview";
import { useCurationStoreHydration } from "@/hooks/useCurationStoreHydration";
import { useCurationStoreSync } from "@/hooks/useCurationStoreSync";
import type { SectionKey, SectionStoreEntry } from "@/types/sections";
import { loadExpandState, saveExpandState } from "@/components/cogniblend/curation/CuratorSectionPanel";
import { EXTENDED_BRIEF_FIELD_MAP } from "@/lib/cogniblend/curationSectionFormats";
import { getCurationFormStore, selectStaleSections } from "@/store/curationFormStore";
import { getSectionDisplayName, getUpstreamDependencies } from "@/lib/cogniblend/sectionDependencies";
import type { Json } from "@/integrations/supabase/types";
import RewardStructureDisplay, { type RewardStructureDisplayHandle } from "@/components/cogniblend/curation/RewardStructureDisplay";

import {
  AlertTriangle,
  ChevronsDownUp,
  ChevronsUpDown,
  ArrowRight,
} from "lucide-react";
import { useSolutionTypes, groupSolutionTypes, derivePrimaryGroup, getSelectedGroups, useSolutionTypeMap } from "@/hooks/queries/useSolutionTypeMap";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { SendForModificationModal } from "@/components/cogniblend/curation/SendForModificationModal";
import { useCompletenessCheckDefs, useRunCompletenessCheck } from "@/hooks/queries/useCompletenessChecks";
import { ContextLibraryDrawer } from "@/components/cogniblend/curation/ContextLibraryDrawer";
import { CurationRightRail } from "@/components/cogniblend/curation/CurationRightRail";
import { CurationHeaderBar } from "@/components/cogniblend/curation/CurationHeaderBar";
import { CurationSectionList } from "@/components/cogniblend/curation/CurationSectionList";

// ---------------------------------------------------------------------------
// Extracted modules
// ---------------------------------------------------------------------------
import type { ChallengeData, LegalDocSummary, LegalDocDetail, EscrowRecord, ComplexityParam, AIQualitySummary, SectionDef } from '@/lib/cogniblend/curationTypes';
import { SECTIONS, GROUPS, SECTION_MAP, LOCKED_SECTIONS, TEXT_SECTIONS } from '@/lib/cogniblend/curationSectionDefs';
import { parseJson, getFieldValue, getDeliverableItems, getDeliverableObjects, getExpectedOutcomeObjects, getSubmissionGuidelineObjects, getEvalCriteria, getSectionContent, computeAutoChecks, resolveIndustrySegmentId, GAP_FIELD_TO_SECTION, CHECKLIST_LABELS } from '@/lib/cogniblend/curationHelpers';
import { parseJson as jsonParse } from "@/lib/cogniblend/jsonbUnwrap";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Phase D4.1 / D4.2 / D6.2 — Extracted hooks
import { useCurationSectionActions } from "@/hooks/cogniblend/useCurationSectionActions";
import { useCurationAIActions } from "@/hooks/cogniblend/useCurationAIActions";
import { useCurationComputedValues } from "@/hooks/cogniblend/useCurationComputedValues";

// Complexity scoring imported from shared utility — single source of truth
import {
  computeWeightedComplexityScore,
  deriveComplexityLevel as deriveComplexityLevelFn,
  formatLevelLabel as deriveComplexityLevel,
} from "@/lib/cogniblend/complexityScoring";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CurationReviewPage() {
  // ══════════════════════════════════════
  // SECTION 1: Hooks & state
  // ══════════════════════════════════════
  const { id: challengeId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: userRoleCodes = [] } = useUserChallengeRoles(user?.id, challengeId);
  const { data: complexityParams = [] } = useComplexityParams();
  const { data: industrySegments } = useIndustrySegments();
  const { data: solutionTypeMap = [] } = useSolutionTypeMap();
  const { data: solutionTypesData = [] } = useSolutionTypes();
  const solutionTypeGroups = useMemo(() => groupSolutionTypes(solutionTypesData), [solutionTypesData]);

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
  } = useCurationPageData(challengeId);

  // Expand / collapse all sections in the active group
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

  const getSectionActions = useCallback((sectionKey: string) => {
    return sectionActions.filter(a => a.section_key === sectionKey);
  }, [sectionActions]);

  // Section approval operations (extracted — Prompt 4.5)
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

  // ── Store sync layer (debounced DB persistence) ──
  useCurationStoreSync({ challengeId: challengeId!, enabled: !!challengeId });

  // ── Staleness tracking via Zustand store ──
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

  /** Wrapper: call markSectionSaved after any section save and toast if sections became stale */
  const notifyStaleness = useCallback((sectionKey: string) => {
    if (!curationStore) return;
    const affected = curationStore.getState().markSectionSaved(sectionKey as SectionKey);
    if (affected.length > 0) {
      toast.warning(`${affected.length} downstream section(s) marked stale after "${getSectionDisplayName(sectionKey as SectionKey)}" was changed.`);
    }
  }, [curationStore]);

  // ══════════════════════════════════════
  // SECTION 2: Mutations
  // ══════════════════════════════════════
  const saveSectionMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const { error } = await supabase
        .from("challenges")
        .update({ [field]: value, updated_by: user?.id ?? null } as any)
        .eq("id", challengeId!);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curation-review", challengeId] });
      toast.success("Section updated successfully");
      setEditingSection(null);
      setSavingSection(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
      setSavingSection(false);
    },
  });

  // Stable ref for saveSectionMutation — avoids unstable deps in effects
  const saveSectionMutationRef = useRef(saveSectionMutation);
  saveSectionMutationRef.current = saveSectionMutation;

  const rewardStructureRef = useRef<RewardStructureDisplayHandle>(null);
  const complexityModuleRef = useRef<ComplexityModuleHandle>(null);

  // ══════════════════════════════════════
  // SECTION 3: AI review effects & load
  // ══════════════════════════════════════
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
          saveSectionMutation.mutate({ field: "ai_section_reviews", value: stored });
        }
      }

      if (stored.length > 0) {
        setAiReviews(stored);
      }
      setAiReviewsLoaded(true);
    }
  }, [challenge?.ai_section_reviews, aiReviewsLoaded]);

  // ── One-time migration: repair corrupted section content ──
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

  // ══════════════════════════════════════
  // SECTION 4: Extracted callback hooks (D4.1 + D4.2)
  // ══════════════════════════════════════

  const sectionActions_hook = useCurationSectionActions({
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

  const {
    handleSaveText, handleSaveDeliverables, handleSaveStructuredDeliverables,
    handleSaveEvalCriteria, handleSaveMaturityLevel, handleSaveSolutionTypes,
    handleSaveExtendedBrief, handleSaveOrgPolicyField, handleSaveComplexity,
    handleLockComplexity, handleUnlockComplexity, handleAddDomainTag,
    handleRemoveDomainTag, handleIndustrySegmentChange, handleAcceptAllLegalDefaults,
    handleAcceptRefinement, handleAcceptExtendedBriefRefinement,
    handleMarkAddressed, toggleSectionApproval,
  } = sectionActions_hook;

  // ── Phase 5: Wave Executor ──
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
    saveSectionMutationRef.current.mutate({ field: "ai_section_reviews", value: merged });
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

  const {
    executeWavesWithBudgetCheck,
    handleAIReview,
    handleAIQualityAnalysis,
    handleSingleSectionReview,
    handleComplexityReReview,
    handleReviewWarnings,
  } = aiActionsHook;

  // Wrap handleAcceptAllPassing to pass handleMarkAddressed
  const handleAcceptAllPassing = useCallback(() => {
    aiActionsHook.handleAcceptAllPassing(handleMarkAddressed);
  }, [aiActionsHook, handleMarkAddressed]);

  // ── Phase 7: Completeness check ──
  const { data: completenessCheckDefs = [] } = useCompletenessCheckDefs();
  const { result: completenessResult, run: runCompletenessCheck, isRunning: completenessRunning } = useRunCompletenessCheck({
    challengeId: challengeId!,
    challengeData: challenge as Record<string, any> | null,
  });

  // Auto-run completeness check after wave execution completes
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

  const handleNavigateToSection = useCallback((sectionKey: string) => {
    const group = GROUPS.find((g) => g.sectionKeys.includes(sectionKey));
    if (group) {
      setActiveGroup(group.id);
    }
  }, []);

  const handleGroupClick = useCallback((groupId: string) => {
    setActiveGroup(groupId);
  }, []);

  // ══════════════════════════════════════
  // SECTION 5: Computed values
  // ══════════════════════════════════════

  const {
    aiReviewCounts, checklistItems, completedCount, allComplete,
    checklistSummary, staleCountByGroup, groupProgress,
    groupReadiness, sectionReadiness, sectionAIFlags, challengeCtx,
  } = useCurationComputedValues({
    challenge: challenge as ChallengeData | null,
    legalDocs,
    legalDetails,
    escrowRecord,
    aiQuality,
    aiReviews,
    staleKeySet,
    manualOverrides,
  });

  const activeGroupDef = GROUPS.find((g) => g.id === activeGroup) ?? GROUPS[0];

  // ══════════════════════════════════════
  // SECTION 6: Conditional returns
  // ══════════════════════════════════════
  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-7 w-64" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
          <div><Skeleton className="h-60 w-full" /></div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return <div className="p-6 text-center text-muted-foreground">Challenge not found.</div>;
  }

  const isReadOnly = false;

  const isLegalAccepted = sectionActions.some(
    a => a.section_key === 'legal_docs' && a.action_type === 'approval' && a.status === 'approved'
  );
  const isEscrowAccepted = sectionActions.some(
    a => a.section_key === 'escrow_funding' && a.action_type === 'approval' && a.status === 'approved'
  );
  const governanceMode = resolveGovernanceMode(challenge.governance_profile);
  const needsLegalAcceptance = !!(challenge as any).lc_review_required || legalDetails.length > 0;
  const needsEscrowAcceptance = isControlledMode(governanceMode);
  const legalEscrowBlocked =
    (needsLegalAcceptance && !isLegalAccepted) ||
    (needsEscrowAcceptance && !isEscrowAccepted);

  const blockingReasons: string[] = [];
  if (needsLegalAcceptance && !isLegalAccepted) blockingReasons.push('Legal Documents');
  if (needsEscrowAcceptance && !isEscrowAccepted) blockingReasons.push('Escrow & Funding');
  const blockingReason = blockingReasons.length > 0
    ? `${blockingReasons.join(' and ')} must be accepted before submitting`
    : undefined;

  const phaseDescription = challenge.current_phase === 1
    ? 'Spec Creation (Phase 1)'
    : challenge.current_phase === 2
      ? 'Legal & Finance Review (Phase 2)'
      : '';

  // ══════════════════════════════════════
  // SECTION 7: Render
  // ══════════════════════════════════════
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      <CurationHeaderBar
        challengeId={challengeId!}
        challengeTitle={challenge.title}
        governanceProfile={challenge.governance_profile}
        operatingModel={challenge.operating_model}
        currentPhase={challenge.current_phase}
        phaseStatus={challenge.phase_status}
        problemStatement={challenge.problem_statement}
        extendedBrief={challenge.extended_brief}
        rewardStructure={challenge.reward_structure}
        phaseSchedule={challenge.phase_schedule}
        challenge={challenge as any}
        isReadOnly={isReadOnly}
        orgTypeName={orgTypeName}
        onNavigateBack={() => navigate("/cogni/curation")}
        guidedMode={guidedMode}
        onGuidedModeChange={setGuidedMode}
        userId={user?.id}
        userRoleCodes={userRoleCodes}
        aiReviewCounts={aiReviewCounts}
        onAcceptAllPassing={handleAcceptAllPassing}
        onReviewWarnings={handleReviewWarnings}
        phaseDescription={phaseDescription}
        legalEscrowBlocked={legalEscrowBlocked}
        blockingReason={blockingReason}
        groups={GROUPS}
        groupProgress={groupProgress}
        groupReadiness={groupReadiness}
        activeGroup={activeGroup}
        onGroupClick={handleGroupClick}
        staleCountByGroup={staleCountByGroup}
        optimisticIndustrySegId={optimisticIndustrySegId}
        industrySegments={industrySegments}
      />

      {/* ═══ MAIN LAYOUT: Content + Right Rail ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT — Main Content (3/4) */}
        <div className="lg:col-span-3">
          <Card className={cn("border-2", activeGroupDef.colorBorder)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{activeGroupDef.label}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => handleExpandCollapseAll(true)}
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5 mr-1" />
                    Expand All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => handleExpandCollapseAll(false)}
                  >
                    <ChevronsDownUp className="h-3.5 w-3.5 mr-1" />
                    Collapse All
                  </Button>
                  {staleSections.length > 0 && (
                    <Button
                      variant={showOnlyStale ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-7 px-2.5 text-xs",
                        showOnlyStale
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : "text-amber-700 border-amber-300 hover:bg-amber-50"
                      )}
                      onClick={() => setShowOnlyStale(!showOnlyStale)}
                    >
                      <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                      {showOnlyStale ? "Show All Sections" : `Show Only Stale (${staleSections.length})`}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CurationSectionList
                challenge={challenge}
                challengeId={challengeId!}
                activeGroupDef={activeGroupDef}
                activeGroup={activeGroup}
                showOnlyStale={showOnlyStale}
                staleKeySet={staleKeySet}
                staleCountByGroup={staleCountByGroup}
                setShowOnlyStale={setShowOnlyStale}
                setActiveGroup={setActiveGroup}
                editingSection={editingSection}
                setEditingSection={setEditingSection}
                savingSection={savingSection}
                setSavingSection={setSavingSection}
                isReadOnly={isReadOnly}
                aiReviews={aiReviews}
                approvedSections={approvedSections}
                toggleSectionApproval={toggleSectionApproval}
                sectionAIFlags={sectionAIFlags}
                highlightWarnings={highlightWarnings}
                aiSuggestedComplexity={aiSuggestedComplexity}
                groupReadiness={groupReadiness}
                sectionReadiness={sectionReadiness}
                dismissedPrereqBanner={dismissedPrereqBanner}
                setDismissedPrereqBanner={setDismissedPrereqBanner}
                masterData={masterData}
                complexityParams={complexityParams}
                industrySegments={industrySegments}
                solutionTypeGroups={solutionTypeGroups}
                solutionTypesData={solutionTypesData}
                solutionTypeMap={solutionTypeMap}
                handleSaveText={handleSaveText}
                handleSaveDeliverables={handleSaveDeliverables}
                handleSaveStructuredDeliverables={handleSaveStructuredDeliverables}
                handleSaveEvalCriteria={handleSaveEvalCriteria}
                handleSaveOrgPolicyField={handleSaveOrgPolicyField}
                handleSaveMaturityLevel={handleSaveMaturityLevel}
                handleSaveSolutionTypes={handleSaveSolutionTypes}
                handleSaveExtendedBrief={handleSaveExtendedBrief}
                handleSaveComplexity={handleSaveComplexity}
                handleLockComplexity={handleLockComplexity}
                handleUnlockComplexity={handleUnlockComplexity}
                handleAcceptRefinement={handleAcceptRefinement}
                handleAcceptExtendedBriefRefinement={handleAcceptExtendedBriefRefinement}
                handleSingleSectionReview={handleSingleSectionReview}
                handleMarkAddressed={handleMarkAddressed}
                handleComplexityReReview={handleComplexityReReview}
                handleApproveLockedSection={handleApproveLockedSection}
                handleUndoApproval={handleUndoApproval}
                handleAddDomainTag={handleAddDomainTag}
                handleRemoveDomainTag={handleRemoveDomainTag}
                handleIndustrySegmentChange={handleIndustrySegmentChange}
                handleAcceptAllLegalDefaults={handleAcceptAllLegalDefaults}
                saveSectionMutation={saveSectionMutation}
                challengeCtx={challengeCtx}
                optimisticIndustrySegId={optimisticIndustrySegId}
                escrowEnabled={escrowEnabled}
                setEscrowEnabled={setEscrowEnabled}
                isAcceptingAllLegal={isAcceptingAllLegal}
                legalDocs={legalDocs}
                legalDetails={legalDetails}
                escrowRecord={escrowRecord}
                rewardStructureRef={rewardStructureRef}
                complexityModuleRef={complexityModuleRef}
                curationStore={curationStore}
                staleSections={staleSections}
                getSectionActions={getSectionActions}
                setLockedSendState={setLockedSendState}
                setContextLibraryOpen={setContextLibraryOpen}
                expandVersion={expandVersion}
              />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT RAIL (1/4) */}
        <CurationRightRail
          challengeId={challengeId!}
          challengeCurrencyCode={challenge?.currency_code ?? 'USD'}
          phaseStatus={challenge.phase_status ?? null}
          operatingModel={challenge.operating_model}
          isReadOnly={isReadOnly}
          aiQuality={aiQuality}
          aiQualityLoading={aiQualityLoading}
          onAIQualityAnalysis={handleAIQualityAnalysis}
          challengeCtx={challengeCtx}
          allSectionKeys={GROUPS.flatMap(g => g.sectionKeys).filter(Boolean)}
          completenessResult={completenessResult}
          completenessCheckDefs={completenessCheckDefs}
          completenessRunning={completenessRunning}
          onRunCompletenessCheck={runCompletenessCheck}
          onNavigateToSection={handleNavigateToSection}
          onOpenContextLibrary={() => setContextLibraryOpen(true)}
          aiReviewLoading={aiReviewLoading}
          onAIReview={handleAIReview}
          waveProgress={waveProgress}
          onCancelReview={cancelReview}
          budgetShortfall={budgetShortfall}
          curationStore={curationStore}
          onDismissBudgetShortfall={() => setBudgetShortfall(null)}
          onModifyRewardManually={() => {
            const group = GROUPS.find(g => g.sectionKeys.includes('reward_structure'));
            if (group) setActiveGroup(group.id);
            setBudgetShortfall(null);
          }}
          onAcceptBudgetRevision={async (shortfall) => {
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
            } catch (err) {
              toast.error('Failed to send notification to Account Manager.');
            }
            setBudgetShortfall(null);
          }}
          phase2Status={phase2Status}
          triageTotalCount={triageTotalCount}
          aiReviews={aiReviews}
          staleSections={staleSections}
          showOnlyStale={showOnlyStale}
          setShowOnlyStale={setShowOnlyStale}
          groups={GROUPS}
          sectionMap={SECTION_MAP}
          getSectionDisplayName={getSectionDisplayName}
          setActiveGroup={setActiveGroup}
          allComplete={allComplete}
          checklistSummary={checklistSummary}
          completedCount={completedCount}
          legalEscrowBlocked={legalEscrowBlocked}
          blockingReason={blockingReason}
          onReReviewStale={reReviewStale}
          setAiReviewLoading={setAiReviewLoading}
        />
      </div>

      {/* Send to LC/FC Modal for locked sections */}
      <SendForModificationModal
        open={lockedSendState.open}
        onOpenChange={(open) => setLockedSendState(prev => ({ ...prev, open }))}
        challengeId={challengeId!}
        sectionKey={lockedSendState.sectionKey}
        sectionLabel={lockedSendState.sectionLabel}
        initialComment={lockedSendState.initialComment}
        aiOriginalComments={lockedSendState.aiOriginalComments}
      />

      {/* Phase 5: Pre-Flight Gate Dialog */}
      <PreFlightGateDialog
        result={preFlightResult}
        open={preFlightDialogOpen}
        onOpenChange={setPreFlightDialogOpen}
        onGoToSection={(sectionKey) => {
          const group = GROUPS.find(g => g.sectionKeys.includes(sectionKey));
          if (group) setActiveGroup(group.id);
          setTimeout(() => {
            const el = document.getElementById(`section-${sectionKey}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }}
        onProceed={executeWavesWithBudgetCheck}
      />

      {/* Guided mode floating Next button */}
      {guidedMode && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            size="lg"
            className="shadow-lg gap-2 rounded-full px-6"
            onClick={() => {
              const currentIdx = GROUPS.findIndex(g => g.id === activeGroup);
              for (let i = currentIdx + 1; i < GROUPS.length; i++) {
                const gp = groupProgress[GROUPS[i].id];
                if (gp && gp.done < gp.total) {
                  setActiveGroup(GROUPS[i].id);
                  return;
                }
              }
              toast.success('All tabs reviewed!');
            }}
          >
            Next: {(() => {
              const currentIdx = GROUPS.findIndex(g => g.id === activeGroup);
              for (let i = currentIdx + 1; i < GROUPS.length; i++) {
                const gp = groupProgress[GROUPS[i].id];
                if (gp && gp.done < gp.total) return GROUPS[i].label;
              }
              return 'All Complete';
            })()}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Context Library Drawer (Phase 7) */}
      {challengeId && (
        <ContextLibraryDrawer
          challengeId={challengeId}
          challengeTitle={challenge?.title}
          open={contextLibraryOpen}
          onOpenChange={setContextLibraryOpen}
        />
      )}
    </div>
  );
}
