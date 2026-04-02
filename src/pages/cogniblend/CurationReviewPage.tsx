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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ComplexityAssessmentModule, type ComplexityModuleHandle } from "@/components/cogniblend/curation/ComplexityAssessmentModule";
import { SafeHtmlRenderer } from "@/components/ui/SafeHtmlRenderer";
import { AiContentRenderer } from "@/components/ui/AiContentRenderer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Pencil,
  Lock,
  Bot,
  Eye,
  Loader2,
  Sparkles,
  RefreshCw,
  Save,
  X,
  Tag,
  ChevronsDownUp,
  ChevronsUpDown,
  ArrowRight,
} from "lucide-react";
import CurationActions from "@/components/cogniblend/curation/CurationActions";
import { AIConfidenceSummary } from "@/components/cogniblend/curation/AIConfidenceSummary";
import { CHALLENGE_TEMPLATES } from "@/lib/challengeTemplates";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { useSolutionTypes, groupSolutionTypes, derivePrimaryGroup, getSelectedGroups, useSolutionTypeMap, SOLUTION_TYPE_TO_PROFICIENCY_AREA } from "@/hooks/queries/useSolutionTypeMap";
import { SolutionTypesEditor } from "@/components/cogniblend/curation/renderers/SolutionTypesEditor";

import RewardStructureDisplay, { type RewardStructureDisplayHandle } from "@/components/cogniblend/curation/RewardStructureDisplay";
import ModificationPointsTracker from "@/components/cogniblend/ModificationPointsTracker";
import { TextSectionEditor, DeliverablesEditor, EvalCriteriaEditor, DateFieldEditor, SelectFieldEditor, RadioFieldEditor } from "@/components/cogniblend/curation/CurationSectionEditor";
import {
  RichTextSectionRenderer,
  LineItemsSectionRenderer,
  TableSectionRenderer,
  ScheduleTableSectionRenderer,
  CheckboxSingleSectionRenderer,
  CheckboxMultiSectionRenderer,
  SelectSectionRenderer,
  RadioSectionRenderer,
  TagInputSectionRenderer,
  StructuredFieldsSectionRenderer,
  LegalDocsSectionRenderer,
  DeliverableCardRenderer,
  EvaluationCriteriaSection,
} from "@/components/cogniblend/curation/renderers";
import { parseDeliverables } from "@/utils/parseDeliverableItem";
import type { DeliverableItem } from "@/utils/parseDeliverableItem";
import ExtendedBriefDisplay, {
  parseExtendedBrief,
  ensureStringArray,
  ensureStakeholderArray,
  getSubsectionValue,
  StakeholderTableEditor,
  StakeholderTableView,
} from "@/components/cogniblend/curation/ExtendedBriefDisplay";
import { TableSectionEditor } from "@/components/cogniblend/curation/renderers/TableSectionEditor";
import { SendForModificationModal } from "@/components/cogniblend/curation/SendForModificationModal";
import SolverExpertiseSection from "@/components/cogniblend/curation/SolverExpertiseSection";
import { CurationAIReviewInline, type SectionReview } from "@/components/cogniblend/curation/CurationAIReviewPanel";
import { normalizeSectionReview, normalizeSectionReviews } from "@/lib/cogniblend/normalizeSectionReview";
import { useCurationStoreHydration } from "@/hooks/useCurationStoreHydration";
import { useCurationStoreSync } from "@/hooks/useCurationStoreSync";
import type { SectionKey, SectionStoreEntry } from "@/types/sections";
import { BulkActionBar } from "@/components/cogniblend/curation/BulkActionBar";
import { CuratorSectionPanel, type SectionStatus, loadExpandState, saveExpandState } from "@/components/cogniblend/curation/CuratorSectionPanel";
import { SECTION_FORMAT_CONFIG, LOCKED_SECTIONS as FORMAT_LOCKED_SECTIONS, AI_REVIEW_DISABLED_SECTIONS, EXTENDED_BRIEF_FIELD_MAP, EXTENDED_BRIEF_SUBSECTION_KEYS } from "@/lib/cogniblend/curationSectionFormats";
import { SectionReferencePanel } from "@/components/cogniblend/curation/SectionReferencePanel";
import { getCurationFormStore, selectStaleSections } from "@/store/curationFormStore";
import { getSectionDisplayName, getUpstreamDependencies } from "@/lib/cogniblend/sectionDependencies";
import type { Json } from "@/integrations/supabase/types";

import { unwrapArray, unwrapEvalCriteria, isJsonFilled, parseJson as jsonParse } from "@/lib/cogniblend/jsonbUnwrap";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { normalizeChallengeFields } from "@/lib/cogniblend/challengeFieldNormalizer";
import { useCompletenessCheckDefs, useRunCompletenessCheck } from "@/hooks/queries/useCompletenessChecks";
import { CompletenessChecklistCard } from "@/components/cogniblend/curation/CompletenessChecklistCard";
import { ContextLibraryCard } from "@/components/cogniblend/curation/ContextLibraryCard";
import { ContextLibraryDrawer } from "@/components/cogniblend/curation/ContextLibraryDrawer";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { OrgContextPanel, isOrgTabComplete } from "@/components/cogniblend/curation/OrgContextPanel";
import { CurationRightRail } from "@/components/cogniblend/curation/CurationRightRail";
import { CurationHeaderBar } from "@/components/cogniblend/curation/CurationHeaderBar";
import { CurationSectionList } from "@/components/cogniblend/curation/CurationSectionList";

// ---------------------------------------------------------------------------
// Extracted modules (Phase D1.1)
// ---------------------------------------------------------------------------
import type { ChallengeData, LegalDocSummary, LegalDocDetail, EscrowRecord, ComplexityParam, AIQualitySummary, SectionDef } from '@/lib/cogniblend/curationTypes';
import { SECTIONS, GROUPS, SECTION_MAP, LOCKED_SECTIONS, TEXT_SECTIONS } from '@/lib/cogniblend/curationSectionDefs';
import { parseJson, getFieldValue, getDeliverableItems, getDeliverableObjects, getExpectedOutcomeObjects, getSubmissionGuidelineObjects, getEvalCriteria, getSectionContent, computeAutoChecks, resolveIndustrySegmentId, GAP_FIELD_TO_SECTION, CHECKLIST_LABELS } from '@/lib/cogniblend/curationHelpers';

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

  // Domain tags editing state (now managed inside TagInputSectionRenderer)

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
  // Use a stable selector: extract only stale keys as a serializable fingerprint,
  // then derive the full objects via useMemo to prevent re-render cascades.
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

  // ── Phase 3: Bulk-accept all ai_suggested legal docs for STRUCTURED mode ──
  const handleAcceptAllLegalDefaults = useCallback(async () => {
    if (!challengeId) return;
    setIsAcceptingAllLegal(true);
    try {
      const { error } = await supabase
        .from('challenge_legal_docs')
        .update({ status: 'ATTACHED' } as any)
        .eq('challenge_id', challengeId)
        .in('status', ['ai_suggested', 'default_applied']);
      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ['curation-legal-summary', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['curation-legal-details', challengeId] });
      toast.success('All legal defaults accepted');
    } catch (err: any) {
      toast.error(`Failed to accept legal defaults: ${err.message}`);
    } finally {
      setIsAcceptingAllLegal(false);
    }
  }, [challengeId, queryClient]);

  useEffect(() => {
    if (challenge?.ai_section_reviews && !aiReviewsLoaded) {
      let stored: SectionReview[] = [];

      if (Array.isArray(challenge.ai_section_reviews)) {
        // Standard array format
        stored = normalizeSectionReviews(challenge.ai_section_reviews as unknown as SectionReview[]);
      } else if (challenge.ai_section_reviews && typeof challenge.ai_section_reviews === 'object') {
        // Legacy object-map format { section_key: { comments, status, ... } }
        // Normalize into array format for recovery
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
          // Persist normalized array back to fix the legacy format
          saveSectionMutation.mutate({ field: "ai_section_reviews", value: stored });
        }
      }

      if (stored.length > 0) {
        setAiReviews(stored);
      }
      setAiReviewsLoaded(true);
    }
  }, [challenge?.ai_section_reviews, aiReviewsLoaded]);

  // ══════════════════════════════════════
  // SECTION 3: Mutations
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
    // Persist outside setState to avoid mutation-during-render cascades
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
    // Find which group contains this section
    const group = GROUPS.find((g) => g.sectionKeys.includes(sectionKey));
    if (group) {
      setActiveGroup(group.id);
    }
  }, []);

  const rewardStructureRef = useRef<RewardStructureDisplayHandle>(null);
  const complexityModuleRef = useRef<ComplexityModuleHandle>(null);

  // Stable ref for saveSectionMutation — avoids unstable deps in effects
  const saveSectionMutationRef = useRef(saveSectionMutation);
  saveSectionMutationRef.current = saveSectionMutation;

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
  // SECTION 4: Handlers
  // ══════════════════════════════════════
  const handleSaveText = useCallback((sectionKey: string, dbField: string, value: string) => {
    setSavingSection(true);
    syncSectionToStore(sectionKey as SectionKey, value);
    saveSectionMutation.mutate({ field: dbField, value });
    notifyStaleness(sectionKey);
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness]);

  const handleSaveDeliverables = useCallback((items: string[]) => {
    setSavingSection(true);
    const data = { items };
    syncSectionToStore('deliverables' as SectionKey, data);
    saveSectionMutation.mutate({ field: "deliverables", value: data });
    notifyStaleness('deliverables');
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness]);

  const handleSaveStructuredDeliverables = useCallback((items: DeliverableItem[]) => {
    setSavingSection(true);
    const data = { items: items.map(({ name, description, acceptance_criteria }) => ({ name, description, acceptance_criteria })) };
    syncSectionToStore('deliverables' as SectionKey, data);
    saveSectionMutation.mutate({ field: "deliverables", value: data });
    notifyStaleness('deliverables');
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness]);

  const handleSaveEvalCriteria = useCallback((criteria: { name: string; weight: number }[]) => {
    setSavingSection(true);
    const normalized = criteria.map((c) => ({
      criterion_name: c.name,
      weight_percentage: c.weight,
    }));
    const data = { criteria: normalized };
    syncSectionToStore('evaluation_criteria' as SectionKey, data);
    saveSectionMutation.mutate({ field: "evaluation_criteria", value: data });
    notifyStaleness('evaluation_criteria');
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness]);

  const handleSaveMaturityLevel = useCallback((value: string) => {
    setSavingSection(true);
    const upper = value.toUpperCase();
    syncSectionToStore('maturity_level' as SectionKey, upper);
    saveSectionMutation.mutate({ field: "maturity_level", value: upper });
    notifyStaleness('maturity_level');
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness]);

  /** Save solution types (multi-select) and auto-populate solver expertise */
  const handleSaveSolutionTypes = useCallback(async (selectedCodes: string[]) => {
    setSavingSection(true);
    syncSectionToStore('solution_type' as SectionKey, selectedCodes);
    saveSectionMutation.mutate({ field: "solution_types", value: selectedCodes });

    // Derive primary proficiency group for backward compat with complexity dimensions
    const allSolTypes = solutionTypesData ?? [];
    const primaryGroup = derivePrimaryGroup(selectedCodes, allSolTypes);
    if (primaryGroup && primaryGroup !== challenge?.solution_type) {
      saveSectionMutation.mutate({ field: "solution_type", value: primaryGroup });
    }

    notifyStaleness('solution_type');

    // Auto-populate solver expertise with matching proficiency areas
    if (challengeId && selectedCodes.length > 0) {
      try {
        const groups = getSelectedGroups(selectedCodes, allSolTypes);
        const groupLabels = groups.map(g => {
          const t = allSolTypes.find(st => st.proficiency_group === g);
          return t?.proficiency_group_label;
        }).filter(Boolean) as string[];

        if (groupLabels.length > 0) {
          const { data: paRows } = await supabase
            .from('proficiency_areas')
            .select('id, name')
            .eq('is_active', true)
            .in('name', groupLabels);

          if (paRows && paRows.length > 0) {
            const paIds = paRows.map((r: any) => r.id);
            const existing = challenge?.solver_expertise_requirements
              ? (typeof challenge.solver_expertise_requirements === 'string'
                ? JSON.parse(challenge.solver_expertise_requirements)
                : challenge.solver_expertise_requirements) as Record<string, any>
              : {};
            const updated = {
              ...existing,
              proficiency_areas: paIds,
            };
            syncSectionToStore('solver_expertise' as SectionKey, updated);
            saveSectionMutation.mutate({ field: "solver_expertise_requirements", value: updated });
            toast.success(`Solver Expertise auto-updated for ${groupLabels.length} proficiency area(s)`);
          }
        }
      } catch (err) {
        console.error('[SolutionTypes] Failed to auto-populate solver expertise:', err);
      }
    }
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness, challengeId, challenge?.solver_expertise_requirements, challenge?.solution_type, solutionTypesData]);

  const handleSaveExtendedBrief = useCallback((updatedBrief: Record<string, unknown>) => {
    setSavingSection(true);
    syncSectionToStore('extended_brief' as SectionKey, updatedBrief);
    saveSectionMutation.mutate({ field: "extended_brief", value: updatedBrief });
    // Extended brief subsection staleness is handled per-subsection in handleSaveOrgPolicyField
  }, [saveSectionMutation, syncSectionToStore]);

  const handleSaveOrgPolicyField = useCallback((dbField: string, value: unknown) => {
    setSavingSection(true);
    const fieldToSection: Record<string, string> = {
      ip_model: 'ip_model',
      solver_eligibility_types: 'eligibility', solver_visibility_types: 'visibility',
      solver_expertise_requirements: 'solver_expertise',
    };
    const sectionKey = fieldToSection[dbField];
    if (sectionKey) {
      syncSectionToStore(sectionKey as SectionKey, value as SectionStoreEntry['data']);
      notifyStaleness(sectionKey);
    }
    saveSectionMutation.mutate({ field: dbField, value });
  }, [saveSectionMutation, syncSectionToStore, notifyStaleness]);

  const handleSaveComplexity = useCallback((
    paramValues: Record<string, number>,
    score: number,
    level: string,
    assessmentMode?: string,
    resolvedParams?: { param_key: string; name: string; value: number; weight: number }[],
  ) => {
    setSavingSection(true);
    // Use resolvedParams from module (correct solution-type dimensions) if provided,
    // otherwise fall back to generic complexityParams
    const params: any[] = resolvedParams
      ? resolvedParams.map((p) => ({
          param_key: p.param_key,
          name: p.name,
          value: p.value,
          weight: p.weight,
        }))
      : complexityParams.map((p) => ({
          param_key: p.param_key,
          name: p.name,
          value: paramValues[p.param_key] ?? 5,
          weight: p.weight,
        }));
    // Persist assessment mode as metadata entry
    if (assessmentMode) {
      params.push({ _meta: { mode: assessmentMode } });
    }
    const updates = {
      complexity_parameters: params,
      complexity_score: score,
      complexity_level: level,
      updated_by: user?.id ?? null,
    };
    supabase
      .from("challenges")
      .update(updates as any)
      .eq("id", challengeId!)
      .then(({ error }) => {
        if (error) {
          toast.error(`Failed to save: ${error.message}`);
        } else {
          queryClient.invalidateQueries({ queryKey: ["curation-review", challengeId] });
          toast.success("Complexity assessment updated");
          notifyStaleness('complexity' as SectionKey);
        }
        setSavingSection(false);
      });
  }, [complexityParams, challengeId, user?.id, queryClient]);

  /** Lock the complexity assessment as final */
  const handleLockComplexity = useCallback(async () => {
    if (!challengeId || !user?.id) return;
    setSavingSection(true);
    const { error } = await supabase
      .from("challenges")
      .update({
        complexity_locked: true,
        complexity_locked_at: new Date().toISOString(),
        complexity_locked_by: user.id,
        updated_by: user.id,
      } as any)
      .eq("id", challengeId);
    if (error) {
      toast.error(`Failed to lock: ${error.message}`);
    } else {
      queryClient.invalidateQueries({ queryKey: ["curation-review", challengeId] });
      toast.success("Complexity assessment locked");
    }
    setSavingSection(false);
  }, [challengeId, user?.id, queryClient]);

  /** Unlock the complexity assessment for corrections */
  const handleUnlockComplexity = useCallback(async () => {
    if (!challengeId || !user?.id) return;
    setSavingSection(true);
    const { error } = await supabase
      .from("challenges")
      .update({
        complexity_locked: false,
        complexity_locked_at: null,
        complexity_locked_by: null,
        updated_by: user.id,
      } as any)
      .eq("id", challengeId);
    if (error) {
      toast.error(`Failed to unlock: ${error.message}`);
    } else {
      queryClient.invalidateQueries({ queryKey: ["curation-review", challengeId] });
      toast.success("Complexity assessment unlocked");
    }
    setSavingSection(false);
  }, [challengeId, user?.id, queryClient]);

  /** Section approval operations — extracted to useSectionApprovals hook */
  // (handleApproveLockedSection and handleUndoApproval are provided by the hook below)

  /** Domain tags — auto-save on each add/remove (YouTube-style) */
  const handleAddDomainTag = useCallback((tag: string) => {
    if (!challenge) return;
    const trimmed = tag.trim();
    const existing = parseJson<string[]>(challenge.domain_tags);
    const current = Array.isArray(existing) ? existing : [];
    if (trimmed && !current.includes(trimmed)) {
      const updated = [...current, trimmed];
      saveSectionMutation.mutate({ field: "domain_tags", value: updated });
    }
  }, [challenge, saveSectionMutation]);

  const handleRemoveDomainTag = useCallback((tag: string) => {
    if (!challenge) return;
    const existing = parseJson<string[]>(challenge.domain_tags);
    const current = Array.isArray(existing) ? existing : [];
    const updated = current.filter((t) => t !== tag);
    saveSectionMutation.mutate({ field: "domain_tags", value: updated });
  }, [challenge, saveSectionMutation]);

  // ── Industry Segment change handler (persists to targeting_filters JSONB) ──
  const handleIndustrySegmentChange = useCallback(async (segmentId: string) => {
    if (!challengeId || !challenge) return;
    // Set optimistic value immediately so UI + pre-flight see it
    setOptimisticIndustrySegId(segmentId);
    // Build updated targeting_filters with both keys for compatibility
    const currentTf = parseJson<any>(challenge.targeting_filters) ?? {};
    currentTf.industry_segment_id = segmentId;
    currentTf.industries = [segmentId];
    const { error } = await supabase.from("challenges").update({ targeting_filters: currentTf }).eq("id", challengeId);
    if (error) {
      toast.error("Failed to save industry segment");
      setOptimisticIndustrySegId(null);
      return;
    }
    toast.success("Industry segment updated");
    await queryClient.invalidateQueries({ queryKey: ["curation-review", challengeId] });
    // Clear optimistic state after refetch
    setOptimisticIndustrySegId(null);
  }, [challengeId, challenge, queryClient]);

  /**
   * Phase 5: Wave-based AI Review with Pre-Flight Gate.
   * Replaces the old 2-phase triage+deep pipeline.
   */
  const handleAIReview = useCallback(async () => {
    if (!challengeId || !challenge) return;
    if (isWaveRunning) return;

    // Step 1: Pre-flight check
    const store = curationStore;
    const sectionContents: Record<string, string | null> = {};
    if (store) {
      const state = store.getState();
      for (const [key, entry] of Object.entries(state.sections)) {
        if (entry?.data != null) {
          sectionContents[key] = typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data);
        } else {
          // Fallback to challenge data
          sectionContents[key] = (challenge as any)?.[key] ?? null;
        }
      }
    }
    // Populate extended_brief subsections that aren't top-level challenge fields
    const ebForPreFlight = jsonParse<Record<string, unknown>>(challenge.extended_brief as Json);
    if (ebForPreFlight) {
      for (const [subKey, jsonbField] of Object.entries(EXTENDED_BRIEF_FIELD_MAP)) {
        if (!sectionContents[subKey]) {
          const val = ebForPreFlight[jsonbField];
          if (val != null) {
            sectionContents[subKey] = typeof val === 'string' ? val : JSON.stringify(val);
          }
        }
      }
    }

    // Also check direct challenge fields for mandatory sections
    if (!sectionContents['problem_statement']) sectionContents['problem_statement'] = challenge.problem_statement;
    if (!sectionContents['scope']) sectionContents['scope'] = challenge.scope;

    // Also check industry segment is set (use optimistic value if available)
    const industrySegId = optimisticIndustrySegId ?? resolveIndustrySegmentId(challenge);
    if (!industrySegId) {
      sectionContents['industry_segment'] = null;
    }

    const pfResult = preFlightCheck(sectionContents, challenge.operating_model);

    // Add industry segment as mandatory blocker if missing
    if (!industrySegId) {
      pfResult.missingMandatory.push({
        sectionId: 'context_and_background' as any,
        sectionName: 'Industry Segment',
        reason: 'Industry segment must be set in Context & Background before AI review. It drives taxonomy cascades across all sections.',
      });
      pfResult.canProceed = false;
    }

    setPreFlightResult(pfResult);

    if (!pfResult.canProceed) {
      setPreFlightDialogOpen(true);
      return;
    }

    if (pfResult.warnings.length > 0) {
      // Show warning dialog — user can proceed or fill first
      setPreFlightDialogOpen(true);
      return;
    }

    // No issues — execute waves directly
    await executeWavesWithBudgetCheck();
  }, [challengeId, challenge, isWaveRunning, curationStore]);

  /** Execute waves and check budget shortfall after Wave 5 */
  const executeWavesWithBudgetCheck = useCallback(async () => {
    setAiReviewLoading(true);
    setTriageTotalCount(0);
    try {
      await executeWaves();

      // After completion, check for budget shortfall
      const ctx = buildChallengeContext(buildContextOptions());
      const shortfall = detectBudgetShortfall(ctx);
      setBudgetShortfall(shortfall);

      // Update triage total count for the completion banner
      setTriageTotalCount(24);
    } catch (e: any) {
      toast.error(`AI review failed: ${e.message ?? "Unknown error"}`);
    } finally {
      setAiReviewLoading(false);
    }
  }, [executeWaves, buildContextOptions]);

  const handleAIQualityAnalysis = useCallback(async () => {
    if (!challengeId) return;
    setAiQualityLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-challenge-quality", {
        body: { challenge_id: challengeId },
      });
      if (error) {
        let msg = error.message;
        try { const body = await (error as any).context?.json?.(); msg = body?.error?.message ?? msg; } catch {}
        throw new Error(msg);
      }
      if (data?.success && data?.data) {
        const score = data.data.overall_score ?? 0;
        const gaps = data.data.gaps ?? [];
        setAiQuality({ overall_score: score, gaps });
        toast.success(`AI analysis complete — Score: ${score}/100, ${gaps.length} gap${gaps.length !== 1 ? "s" : ""} found`);
      } else {
        throw new Error(data?.error?.message ?? "Unexpected response from AI analysis");
      }
    } catch (e: any) {
      toast.error(`AI analysis failed: ${e.message ?? "Unknown error"}`);
    } finally {
      setAiQualityLoading(false);
    }
  }, [challengeId]);

  const handleAcceptRefinement = useCallback(async (sectionKey: string, newContent: string) => {
    const section = SECTION_MAP.get(sectionKey);
    const dbField = section?.dbField;

    // ── Complexity: apply AI-suggested ratings via dedicated handler ──
    // Use AI rating keys with equal weights (matching effectiveParams in ComplexityAssessmentModule)
    if (sectionKey === "complexity") {
      // Delegate to the module's own save logic which uses correct effectiveParams weights
      complexityModuleRef.current?.saveAiDraft();
      return;
    }

    // ── Solver expertise: parse JSON and save directly ──
    if (sectionKey === "solver_expertise") {
      try {
        const cleaned = newContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        let parsed: any;

        // Try direct parse first
        try { parsed = JSON.parse(cleaned); } catch {
          const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[1]);
        }

        if (!parsed) throw new Error('No valid JSON found');

        // Normalize: if array, wrap in expected shape
        if (Array.isArray(parsed)) {
          parsed = {
            expertise_areas: parsed.map((item: any) =>
              typeof item === 'string' ? { area: item, level: 'required' } : item
            )
          };
        }

        setSavingSection(true);
        syncSectionToStore(sectionKey as SectionKey, parsed);
        saveSectionMutation.mutate({ field: "solver_expertise_requirements", value: parsed });
        return;
      } catch (e) {
        toast.error("AI returned invalid expertise data. Please try re-reviewing.");
        console.error("Solver expertise parse error:", e);
        return;
      }
    }

    // ── Master-data multi-select sections: save to solver_*_types as {code, label}[] ──
    if (sectionKey === "eligibility") {
      try {
        const codes = JSON.parse(newContent);
        if (Array.isArray(codes)) {
          const typed = codes.map((c: string) => ({
            code: c,
            label: masterData.eligibilityOptions.find(o => o.value === c)?.label ?? c,
          }));
          setSavingSection(true);
          syncSectionToStore(sectionKey as SectionKey, typed as unknown as SectionStoreEntry['data']);
          saveSectionMutation.mutate({ field: "solver_eligibility_types", value: typed });
          return;
        }
      } catch { /* not JSON array, fall through */ }
    }
    if (sectionKey === "visibility") {
      try {
        const codes = JSON.parse(newContent);
        if (Array.isArray(codes)) {
          const typed = codes.map((c: string) => ({
            code: c,
            label: masterData.visibilityOptions.find(o => o.value === c)?.label ?? c,
          }));
          setSavingSection(true);
          syncSectionToStore(sectionKey as SectionKey, typed as unknown as SectionStoreEntry['data']);
          saveSectionMutation.mutate({ field: "solver_visibility_types", value: typed });
          return;
        }
      } catch { /* not JSON array, fall through */ }
    }

    // ── Submission guidelines: always save as structured JSON ──
    if (sectionKey === "submission_guidelines") {
      let items: any[];
      try {
        const cleaned = newContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        const parsed = JSON.parse(cleaned);
        items = Array.isArray(parsed) ? parsed : (parsed?.items ?? [parsed]);
      } catch {
        // Not JSON — split by newlines
        items = newContent.split('\n')
          .map(l => l.replace(/^[\d.)\-*•]\s*/, '').trim())
          .filter(l => l.length > 0);
      }
      const structured = items.map((item: any) => {
        if (typeof item === 'string') return { name: item, description: '' };
        return { name: item.name ?? item.title ?? String(item), description: item.description ?? '' };
      });
      setSavingSection(true);
      const value = { items: structured };
      syncSectionToStore(sectionKey as SectionKey, value);
      saveSectionMutation.mutate({ field: "submission_guidelines", value });
      return;
    }

    // ── Solution type multi-select: parse AI suggestion as array of codes ──
    if (sectionKey === 'solution_type') {
      let codes: string[] = [];
      try {
        const parsed = JSON.parse(newContent);
        codes = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
      } catch {
        codes = newContent.split(',').map(s => s.trim()).filter(Boolean);
      }
      const validCodes = new Set(solutionTypesData.map(t => t.code));
      const matched = codes.filter(c => validCodes.has(c));
      if (matched.length === 0) {
        toast.error(`No valid solution type codes found. Valid: ${Array.from(validCodes).join(", ")}`);
        return;
      }
      handleSaveSolutionTypes(matched);
      return;
    }

    // ── Single-code master-data sections: validate and save directly ──
    const solutionTypeOptions = solutionTypeMap.map(m => ({ value: m.solution_type_code, label: m.proficiency_area_name }));
    const SINGLE_CODE_MAP: Record<string, { field: string; options: typeof masterData.ipModelOptions }> = {
      ip_model: { field: "ip_model", options: masterData.ipModelOptions },
      maturity_level: { field: "maturity_level", options: masterData.maturityOptions },
      complexity: { field: "complexity_level", options: masterData.complexityOptions },
    };
    const singleCodeCfg = SINGLE_CODE_MAP[sectionKey];
    if (singleCodeCfg) {
      let code = newContent.trim().replace(/^["']|["']$/g, '');
      // Handle JSON object format from LLM: { selected_id: "CODE", rationale: "..." }
      try {
        const parsed = JSON.parse(code);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          code = String(parsed.selected_id ?? parsed.code ?? parsed.value ?? code);
        }
      } catch { /* not JSON — use raw code */ }
      const validCodes = new Set(singleCodeCfg.options.map(o => o.value));
      // Try case-insensitive match
      const matched = singleCodeCfg.options.find(o => o.value.toLowerCase() === code.toLowerCase());
      if (matched) {
        setSavingSection(true);
        syncSectionToStore(sectionKey as SectionKey, matched.value);
        saveSectionMutation.mutate({ field: singleCodeCfg.field, value: matched.value });
        return;
      }
      if (!validCodes.has(code)) {
        toast.error(`Invalid ${sectionKey}: "${code}" is not a valid option. Valid: ${Array.from(validCodes).join(", ")}`);
        return;
      }
      setSavingSection(true);
      syncSectionToStore(sectionKey as SectionKey, code);
      saveSectionMutation.mutate({ field: singleCodeCfg.field, value: code });
      return;
    }

    if (!dbField) {
      toast.error("Cannot save refinement for this section type.");
      return;
    }

    let valueToSave: any = newContent;

    // ── Structured JSON fields: parse AI output into proper JSON ──
    const JSON_FIELDS = ['deliverables', 'expected_outcomes', 'evaluation_criteria', 'phase_schedule', 'reward_structure', 'submission_guidelines', 'domain_tags', 'success_metrics_kpis', 'data_resources_provided'];
    if (JSON_FIELDS.includes(dbField)) {
      let cleaned = newContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

      // Pre-processing: strip leading prose before first JSON delimiter
      const jsonStartIndex = cleaned.search(/[\[{]/);
      if (jsonStartIndex > 0) {
        cleaned = cleaned.substring(jsonStartIndex);
      }
      // Strip trailing prose after last JSON delimiter
      const jsonEndBracket = cleaned.lastIndexOf(']');
      const jsonEndBrace = cleaned.lastIndexOf('}');
      const jsonEnd = Math.max(jsonEndBracket, jsonEndBrace);
      if (jsonEnd > 0 && jsonEnd < cleaned.length - 1) {
        cleaned = cleaned.substring(0, jsonEnd + 1);
      }

      try {
        valueToSave = JSON.parse(cleaned);
      } catch {
        // Attempt repair: fix trailing commas
        const repaired = cleaned.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
        try {
          valueToSave = JSON.parse(repaired);
        } catch {
          toast.error(`AI returned invalid structured data for ${dbField}. Please re-review this section.`);
          console.error(`JSON parse failed for ${dbField}:`, cleaned.substring(0, 200));
          return;
        }
      }
    }

    // ── Reward structure: apply AI result to the reward component state ──
    // The AI returns a structured object like { type, monetary: { tiers: { platinum: N } }, nonMonetary: { items: ["..."] } }.
    // We apply it to the component state (which converts it to proper internal format),
    // then let the component's auto-save (pendingSave) persist the properly serialized version.
    // We do NOT save the raw AI object directly — migrateRawReward expects arrays, not maps.
    if (dbField === 'reward_structure' && valueToSave && typeof valueToSave === 'object') {
      // Backward compat: if AI returned old flat array format, wrap it
      if (Array.isArray(valueToSave)) {
        const tiers: Record<string, number> = {};
        const tierNames = ['platinum', 'gold', 'silver', 'honorable_mention'];
        (valueToSave as any[]).forEach((row: any, i: number) => {
          // Use the tier name from the row if available, otherwise use position
          const key = (row.tier || row.prize_tier || row.tier_name || tierNames[i] || `tier_${i}`)
            .toLowerCase().replace(/\s+/g, '_');
          // Handle string amounts like "$75,000"
          const rawAmount = row.amount ?? row.prize ?? row.value ?? 0;
          tiers[key] = typeof rawAmount === 'string'
            ? Number(rawAmount.replace(/[$,]/g, ''))
            : Number(rawAmount) || 0;
        });
        const currency = (valueToSave as any[])[0]?.currency || 'USD';
        valueToSave = { type: 'monetary', monetary: { tiers, currency } };
      }
      // Defensive: if monetary.tiers is an array (LLM may return [{tier_name, amount}] despite instructions),
      // convert to Record<string, number> expected by applyAIReviewResult
      if (valueToSave?.monetary?.tiers && Array.isArray(valueToSave.monetary.tiers)) {
        const tierRecord: Record<string, number> = {};
        const defaultNames = ['platinum', 'gold', 'silver', 'honorable_mention'];
        (valueToSave.monetary.tiers as any[]).forEach((t: any, i: number) => {
          const name = (t.tier_name || t.name || t.tier || defaultNames[i] || `tier_${i}`)
            .toLowerCase().replace(/\s+/g, '_');
          const amount = typeof t.amount === 'string'
            ? Number(t.amount.replace(/[$,\s]/g, '')) || 0
            : Number(t.amount ?? t.prize ?? t.value ?? 0) || 0;
          tierRecord[name] = amount;
        });
        valueToSave = {
          ...valueToSave,
          monetary: { ...valueToSave.monetary, tiers: tierRecord },
        };
      }
      // Apply to component state — this triggers pendingSave inside RewardStructureDisplay
      rewardStructureRef.current?.applyAIReviewResult(valueToSave);
      // Do NOT save raw AI object to DB here; the component's auto-save
      // will persist the properly serialized version via getSerializedData()
      return;
    }

    // ── Evaluation criteria: normalize AI field names to canonical format ──
    if (dbField === 'evaluation_criteria' && valueToSave && typeof valueToSave === 'object') {
      const rawArr = Array.isArray(valueToSave)
        ? valueToSave
        : Array.isArray(valueToSave?.criteria)
          ? valueToSave.criteria : null;
      if (rawArr) {
        valueToSave = {
          criteria: rawArr.map((c: any) => ({
            criterion_name: c.criterion_name ?? c.name ?? c.criterion ?? c.parameter ?? c.title ?? "",
            weight_percentage: Number(c.weight_percentage ?? c.weight ?? c.percentage ?? c.weight_percent ?? 0),
            description: c.description ?? c.details ?? c.scoring_type ?? "",
            scoring_method: c.scoring_method ?? c.scoring_type ?? "",
            evaluator_role: c.evaluator_role ?? c.evaluator ?? "",
          }))
        };
      }
    }

    // ── Success Metrics & KPIs: normalize AI field names to canonical columns ──
    if (dbField === 'success_metrics_kpis' && valueToSave && typeof valueToSave === 'object') {
      const rawArr = Array.isArray(valueToSave) ? valueToSave : (valueToSave?.items ?? null);
      if (rawArr && Array.isArray(rawArr)) {
        valueToSave = rawArr.map((row: any) => ({
          kpi: row.kpi ?? row.metric ?? row.name ?? row.KPI ?? "",
          baseline: row.baseline ?? row.Baseline ?? "",
          target: row.target ?? row.Target ?? "",
          measurement_method: row.measurement_method ?? row.method ?? row.Method ?? "",
          timeframe: row.timeframe ?? row.Timeframe ?? row.timeline ?? "",
        }));
      }
    }

    // ── Data Resources Provided: normalize AI field aliases to canonical columns ──
    if (dbField === 'data_resources_provided' && valueToSave && typeof valueToSave === 'object') {
      const rawArr = Array.isArray(valueToSave) ? valueToSave : (valueToSave?.items ?? null);
      if (rawArr && Array.isArray(rawArr)) {
        valueToSave = rawArr.map((row: any) => ({
          resource: row.resource ?? row.name ?? row.resource_name ?? "",
          type: row.type ?? row.data_type ?? row.resource_type ?? "",
          format: row.format ?? "",
          size: row.size ?? "",
          access_method: row.access_method ?? row.access ?? "",
          restrictions: row.restrictions ?? row.restriction ?? "",
        }));
      }
    }

    // ── Domain tags: validate as string array ──
    if (dbField === 'domain_tags' && Array.isArray(valueToSave)) {
      valueToSave = valueToSave.filter((t: any) => typeof t === 'string' && t.trim().length > 0);
      if (valueToSave.length === 0) {
        toast.error("AI suggested no valid domain tags. Please add tags manually.");
        return;
      }
    }

    // ── Text fields: normalize markdown → sanitized HTML ──
    // Derive dynamically from SECTION_FORMAT_CONFIG to avoid hardcoding
    const HTML_TEXT_FIELDS = Object.entries(SECTION_FORMAT_CONFIG)
      .filter(([, cfg]) => cfg.format === 'rich_text')
      .map(([key]) => key);
    if (HTML_TEXT_FIELDS.includes(dbField) && typeof valueToSave === 'string') {
      const { normalizeAiContentForEditor } = await import('@/lib/aiContentFormatter');
      valueToSave = normalizeAiContentForEditor(valueToSave);
    }

    setSavingSection(true);
    syncSectionToStore(sectionKey as SectionKey, valueToSave);
    saveSectionMutation.mutate({ field: dbField, value: valueToSave });
  }, [saveSectionMutation, masterData, aiSuggestedComplexity, complexityParams, handleSaveComplexity, syncSectionToStore]);

  /** Handle a single-section re-review result from the inline panel */
  const handleSingleSectionReview = useCallback((sectionKey: string, freshReview: SectionReview) => {
    const normalized = normalizeSectionReview(freshReview);
    setAiReviews((prev) => {
      const filtered = prev.filter((r) => r.section_key !== sectionKey);
      return [...filtered, { ...normalized, addressed: false }];
    });
    // Persist outside setState to avoid mutation-during-render cascades
    const currentReviews = aiReviews.filter((r) => r.section_key !== sectionKey);
    const updated = [...currentReviews, { ...normalized, addressed: false }];
    saveSectionMutationRef.current.mutate({ field: "ai_section_reviews", value: updated });

    // If complexity re-review, extract suggested_complexity from the review data
    // The standard re-review path calls review-challenge-sections which returns suggested_complexity
    // We need a custom handler for complexity to extract the ratings after re-review
  }, [aiReviews]);

  /** Custom re-review handler for complexity — calls review-challenge-sections and extracts suggested_complexity */
  const handleComplexityReReview = useCallback(async (_sectionKey: string) => {
    if (!challengeId) return;
    const { data, error } = await supabase.functions.invoke("review-challenge-sections", {
      body: { challenge_id: challengeId, section_key: 'complexity', role_context: 'curation' },
    });

    if (error) {
      let msg = error.message;
      try { const body = await (error as any).context?.json?.(); msg = body?.error?.message ?? msg; } catch {}
      throw new Error(msg);
    }
    if (!data?.success) {
      throw new Error(data?.error?.message ?? "Complexity review failed");
    }

    const sections = data.data?.sections as any[];
    const complexitySection = sections?.[0];
    if (!complexitySection) throw new Error("No complexity review returned");

    // Extract structured ratings
    if (complexitySection.suggested_complexity) {
      setAiSuggestedComplexity({ ...complexitySection.suggested_complexity });
    }

    // Update AI reviews
    const complexityReview: SectionReview = {
      section_key: 'complexity',
      status: complexitySection.status ?? 'warning',
      comments: complexitySection.comments ?? [],
      addressed: false,
      reviewed_at: complexitySection.reviewed_at ?? new Date().toISOString(),
    };
    const normalized = normalizeSectionReview(complexityReview);
    setAiReviews((prev) => {
      const filtered = prev.filter((r) => r.section_key !== 'complexity');
      return [...filtered, normalized];
    });
    // Persist outside setState to avoid mutation-during-render cascades
    const currentReviews = aiReviews.filter((r) => r.section_key !== 'complexity');
    saveSectionMutationRef.current.mutate({ field: "ai_section_reviews", value: [...currentReviews, normalized] });
    const hasIssues = (complexitySection.comments ?? []).length > 0;
    toast.success(hasIssues ? "Re-review complete — see updated complexity assessment." : "Complexity looks good — no issues found.");
  }, [challengeId, aiReviews]);

  /** Accept refinement for extended brief subsections — merge into extended_brief JSONB */
  const handleAcceptExtendedBriefRefinement = useCallback(async (subsectionKey: string, newContent: string) => {
    const jsonbField = EXTENDED_BRIEF_FIELD_MAP[subsectionKey];
    if (!jsonbField) {
      // Not an extended brief subsection — delegate to main handler
      handleAcceptRefinement(subsectionKey, newContent);
      return;
    }

    const currentBrief = parseJson<Record<string, unknown>>(challenge?.extended_brief ?? null) ?? {};
    let valueToSave: unknown = newContent;

    // Parse JSON for structured fields (line_items, table)
    const config = SECTION_FORMAT_CONFIG[subsectionKey];
    if (config && (config.format === 'line_items' || config.format === 'table')) {
      const cleaned = newContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      // Try direct JSON.parse first to avoid double-serialization issues
      try {
        valueToSave = JSON.parse(cleaned);
      } catch {
        // Fallback: regex extraction
        const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
        if (jsonMatch) {
          try {
            valueToSave = JSON.parse(jsonMatch[1]);
          } catch {
            toast.error(`AI returned invalid JSON for ${subsectionKey}. Please try again.`);
            return;
          }
        }
      }
      // Unwrap { items: [...] } wrapper — extended_brief subsections expect flat arrays
      if (valueToSave && typeof valueToSave === 'object' && !Array.isArray(valueToSave)) {
        if (Array.isArray((valueToSave as any).items)) {
          valueToSave = (valueToSave as any).items;
        } else if (Array.isArray((valueToSave as any).rows)) {
          valueToSave = (valueToSave as any).rows;
        }
      }
      // ── Affected stakeholders: normalize AI field names to canonical columns ──
      if (subsectionKey === 'affected_stakeholders' && Array.isArray(valueToSave)) {
        valueToSave = (valueToSave as any[]).map((row: any) => ({
          stakeholder_name: row.stakeholder_name ?? row.stakeholder ?? row.name ?? row.Stakeholder ?? "",
          role: row.role ?? row.Role ?? "",
          impact_description: row.impact_description ?? row.impact ?? row.Impact ?? "",
          adoption_challenge: row.adoption_challenge ?? row.challenge ?? row.Challenge ?? "",
        }));
      }
      // Fallback for line_items: if still a plain string, split into array items
      if (config.format === 'line_items' && typeof valueToSave === 'string') {
        const lines = valueToSave.split('\n')
          .map((l: string) => l.replace(/^(?:\d+[\.\)]\s*|[-*•]\s*)/, '').trim())
          .filter((l: string) => l.length > 0);
        valueToSave = lines.length > 1 ? lines : [valueToSave.trim()].filter(Boolean);
      }
    } else if (config?.format === 'rich_text' && typeof newContent === 'string') {
      const { normalizeAiContentForEditor } = await import('@/lib/aiContentFormatter');
      valueToSave = normalizeAiContentForEditor(newContent);
    }

    const updated = { ...currentBrief, [jsonbField]: valueToSave };
    // Sync to Zustand store so UI reflects accepted content immediately
    syncSectionToStore('extended_brief' as SectionKey, updated);
    setSavingSection(true);
    saveSectionMutation.mutate({ field: "extended_brief", value: updated });
  }, [challenge?.extended_brief, saveSectionMutation, handleAcceptRefinement, syncSectionToStore]);

  /** Persist "addressed" flag when a refinement is accepted */
  const handleMarkAddressed = useCallback((sectionKey: string) => {
    setAiReviews((prev) => {
      return prev.map((r) =>
        r.section_key === sectionKey ? { ...r, addressed: true, comments: [] } : r
      );
    });
    // Persist outside setState to avoid mutation-during-render cascades
    const updated = aiReviews.map((r) =>
      r.section_key === sectionKey ? { ...r, addressed: true, comments: [] } : r
    );
    saveSectionMutationRef.current.mutate({ field: "ai_section_reviews", value: updated });
  }, [aiReviews]);


  const toggleSectionApproval = useCallback((key: string) => {
    setApprovedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleGroupClick = useCallback((groupId: string) => {
    setActiveGroup(groupId);
  }, []);

  // Bulk action bar computed values
  const aiReviewCounts = useMemo(() => {
    if (!aiReviews.length) return { pass: 0, warning: 0, inferred: 0, needsRevision: 0, hasReviews: false };
    let pass = 0, warning = 0, needsRevision = 0, inferred = 0;
    aiReviews.forEach((r) => {
      const triageStatus = (r as any).triage_status;
      if (triageStatus === "inferred") inferred++;
      else if (r.status === "pass") pass++;
      else if (r.status === "warning") warning++;
      else if (r.status === "needs_revision") needsRevision++;
    });
    return { pass, warning: warning + needsRevision, inferred, needsRevision, hasReviews: true };
  }, [aiReviews]);

  const handleAcceptAllPassing = useCallback(() => {
    const passingSections = aiReviews.filter((r) => r.status === "pass" && !r.addressed);
    if (passingSections.length === 0) return;

    passingSections.forEach((r) => {
      handleMarkAddressed(r.section_key);
    });
    toast.success(`${passingSections.length} section${passingSections.length !== 1 ? "s" : ""} updated automatically`);
  }, [aiReviews, handleMarkAddressed]);

  const handleReviewWarnings = useCallback(() => {
    setHighlightWarnings(true);
    // Find first warning/needs_revision section
    const firstWarning = aiReviews.find(
      (r) => (r.status === "warning" || r.status === "needs_revision") && !r.addressed
    );
    if (firstWarning) {
      const el = document.querySelector(`[data-section-key="${firstWarning.section_key}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    // Auto-clear highlight after 10 seconds
    setTimeout(() => setHighlightWarnings(false), 10000);
  }, [aiReviews]);

  // ══════════════════════════════════════
  // SECTION 5: Computed
  // ══════════════════════════════════════
  const autoChecks = useMemo(() => {
    if (!challenge) return Array(15).fill(false);
    return computeAutoChecks(challenge, legalDocs, escrowRecord);
  }, [challenge, legalDocs, escrowRecord]);

  const checklistItems = useMemo(() =>
    CHECKLIST_LABELS.map((label, i) => ({
      id: i + 1,
      label,
      autoChecked: autoChecks[i],
      manualOverride: manualOverrides[i + 1] ?? false,
      passed: autoChecks[i] || (manualOverrides[i + 1] ?? false),
    })), [autoChecks, manualOverrides]);

  const completedCount = checklistItems.filter((i) => i.passed).length;
  const allComplete = completedCount === 15;

  const checklistSummary = useMemo(() =>
    checklistItems.map((item) => ({
      id: item.id,
      label: item.label,
      passed: item.passed,
      method: item.autoChecked ? "auto" : "manual",
    })), [checklistItems]);

  // Group progress computation — stale sections count as NOT done
  const staleKeySet = useMemo(() => new Set(staleSections.map(s => s.key)), [staleSections]);

  // Stale count per group for badge display
  const staleCountByGroup = useMemo(() => {
    const counts: Record<string, number> = {};
    GROUPS.forEach((g) => {
      counts[g.id] = g.sectionKeys.filter((k) => staleKeySet.has(k)).length;
    });
    return counts;
  }, [staleKeySet]);

  // Auto-disable stale filter when no stale sections remain
  useEffect(() => {
    if (staleSections.length === 0 && showOnlyStale) {
      setShowOnlyStale(false);
    }
  }, [staleSections.length, showOnlyStale]);

  const groupProgress = useMemo(() => {
    if (!challenge) return {};
    const result: Record<string, { done: number; total: number; hasAIFlag: boolean }> = {};
    GROUPS.forEach((g) => {
      if (g.id === 'organization') {
        // Organization tab: 1 item, done if org has name + one enrichment
        result[g.id] = { done: 0, total: 1, hasAIFlag: false };
        return;
      }
      const secs = g.sectionKeys.map((k) => SECTION_MAP.get(k)).filter(Boolean) as SectionDef[];
      const done = secs.filter((s) => s.isFilled(challenge, legalDocs, legalDetails, escrowRecord) && !staleKeySet.has(s.key)).length;
      const hasAIFlag = aiQuality?.gaps?.some((gap) => {
        const mapped = GAP_FIELD_TO_SECTION[gap.field] ?? gap.field;
        return g.sectionKeys.includes(mapped);
      }) ?? false;
      result[g.id] = { done, total: secs.length, hasAIFlag };
    });
    return result;
  }, [challenge, legalDocs, legalDetails, escrowRecord, aiQuality, staleKeySet]);

  // ── Group readiness: prerequisite completion tracking ──
  const OPTIONAL_SECTIONS = new Set(['preferred_approach', 'approaches_not_of_interest', 'legal_docs', 'escrow_funding']);

  const groupReadiness = useMemo(() => {
    if (!challenge) return {} as Record<string, { ready: boolean; missingPrereqs: string[]; missingPrereqSections: string[]; completionPct: number }>;
    const result: Record<string, { ready: boolean; missingPrereqs: string[]; missingPrereqSections: string[]; completionPct: number }> = {};

    GROUPS.forEach((group) => {
      const missingPrereqs: string[] = [];
      const missingPrereqSections: string[] = [];

      for (const prereqGroupId of group.prerequisiteGroups) {
        const prereqGroup = GROUPS.find(g => g.id === prereqGroupId);
        if (!prereqGroup) continue;

        const criticalSections = prereqGroup.sectionKeys.filter(key => {
          const sec = SECTION_MAP.get(key);
          return sec && !OPTIONAL_SECTIONS.has(key);
        });

        const filledCount = criticalSections.filter(key => {
          const sec = SECTION_MAP.get(key);
          return sec?.isFilled(challenge, legalDocs, legalDetails, escrowRecord);
        }).length;

        const completion = criticalSections.length > 0 ? filledCount / criticalSections.length : 1;

        if (completion < 0.5) {
          missingPrereqs.push(prereqGroup.label);
          const unfilled = criticalSections.filter(key => {
            const sec = SECTION_MAP.get(key);
            return !sec?.isFilled(challenge, legalDocs, legalDetails, escrowRecord);
          });
          missingPrereqSections.push(...unfilled);
        }
      }

      const ownSections = group.sectionKeys.map(k => SECTION_MAP.get(k)).filter(Boolean) as SectionDef[];
      const ownFilled = ownSections.filter(s => s.isFilled(challenge, legalDocs, legalDetails, escrowRecord)).length;

      result[group.id] = {
        ready: missingPrereqs.length === 0,
        missingPrereqs,
        missingPrereqSections,
        completionPct: ownSections.length > 0 ? (ownFilled / ownSections.length) * 100 : 0,
      };
    });

    return result;
  }, [challenge, legalDocs, legalDetails, escrowRecord]);

  // ── Per-section upstream readiness ──
  const sectionReadiness = useMemo(() => {
    if (!challenge) return {} as Record<string, { ready: boolean; missing: string[] }>;
    const result: Record<string, { ready: boolean; missing: string[] }> = {};

    for (const group of GROUPS) {
      for (const key of group.sectionKeys) {
        const upstreamKeys = getUpstreamDependencies(key);
        const missing: string[] = [];
        for (const depKey of upstreamKeys) {
          const depSec = SECTION_MAP.get(depKey);
          if (depSec && !depSec.isFilled(challenge, legalDocs, legalDetails, escrowRecord)) {
            missing.push(depSec.label);
          }
        }
        result[key] = { ready: missing.length === 0, missing };
      }
    }

    return result;
  }, [challenge, legalDocs, legalDetails, escrowRecord]);

  // Inline AI flags per section from quality gaps
  const sectionAIFlags = useMemo(() => {
    if (!aiQuality?.gaps) return {};
    const map: Record<string, string[]> = {};
    aiQuality.gaps.forEach((gap) => {
      const sectionKey = GAP_FIELD_TO_SECTION[gap.field] ?? gap.field;
      if (!map[sectionKey]) map[sectionKey] = [];
      map[sectionKey].push(gap.message);
    });
    return map;
  }, [aiQuality]);

  const activeGroupDef = GROUPS.find((g) => g.id === activeGroup) ?? GROUPS[0];

  // Challenge context for AI refinement — enriched for reward pricing
  const challengeCtx = useMemo(() => {
    const domainTags = (() => {
      if (!challenge?.domain_tags) return [];
      const parsed = parseJson<string[]>(challenge.domain_tags);
      return Array.isArray(parsed) ? parsed : [];
    })();

    // Parse deliverable names for context
    const deliverableNames: string[] = (() => {
      if (!challenge?.deliverables) return [];
      try {
        const raw = typeof challenge.deliverables === 'string'
          ? JSON.parse(challenge.deliverables)
          : challenge.deliverables;
        if (Array.isArray(raw)) return raw.map((d: any) => typeof d === 'string' ? d : d?.name ?? d?.title ?? '').filter(Boolean);
        if (raw?.items) return raw.items.map((d: any) => d?.name ?? d?.title ?? '').filter(Boolean);
      } catch {}
      return [];
    })();

    // Parse evaluation criteria names
    const evalCriteriaNames: string[] = (() => {
      if (!challenge?.evaluation_criteria) return [];
      try {
        const raw = typeof challenge.evaluation_criteria === 'string'
          ? JSON.parse(challenge.evaluation_criteria)
          : challenge.evaluation_criteria;
        if (Array.isArray(raw)) return raw.map((c: any) => typeof c === 'string' ? c : c?.name ?? '').filter(Boolean);
      } catch {}
      return [];
    })();

    // Extract reward pool from existing reward_structure
    const rewardPool = (() => {
      if (!challenge?.reward_structure) return undefined;
      try {
        const raw = typeof challenge.reward_structure === 'string'
          ? JSON.parse(challenge.reward_structure)
          : challenge.reward_structure;
        if (raw?.total_pool) return Number(raw.total_pool);
        // Sum tier amounts if available
        const tiers = raw?.tiers;
        if (Array.isArray(tiers)) {
          const sum = tiers.reduce((s: number, t: any) => s + (Number(t.amount) || 0) * (Number(t.count) || 1), 0);
          if (sum > 0) return sum;
        }
      } catch {}
      return undefined;
    })();

    return {
      title: challenge?.title,
      maturity_level: challenge?.maturity_level,
      domain_tags: domainTags,
      complexity: challenge?.complexity_level ?? undefined,
      complexity_level: challenge?.complexity_level ?? undefined,
      solution_type: challenge?.solution_type ?? undefined,
      operating_model: challenge?.operating_model ?? undefined,
      scope: challenge?.scope ? (typeof challenge.scope === 'string' ? challenge.scope.slice(0, 500) : undefined) : undefined,
      deliverables: deliverableNames.length > 0 ? deliverableNames : undefined,
      evaluation_criteria: evalCriteriaNames.length > 0 ? evalCriteriaNames : undefined,
      
      industry: domainTags.length > 0 ? domainTags[0] : undefined,
      reward_pool: rewardPool,
      currency: challenge?.currency_code ?? 'USD',
      problem_statement: challenge?.problem_statement ? challenge.problem_statement.slice(0, 500) : undefined,
    };
  }, [
    challenge?.title, challenge?.maturity_level, challenge?.domain_tags,
    challenge?.complexity_level, challenge?.scope, challenge?.deliverables,
    challenge?.evaluation_criteria, challenge?.currency_code,
    challenge?.problem_statement, challenge?.reward_structure,
    challenge?.solution_type, challenge?.operating_model,
  ]);

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

  // Curator workspace is always editable — section-level locking via LOCKED_SECTIONS handles legal/escrow
  // Phase-based read-only is NOT applied; submission gating is the only governance control
  const isReadOnly = false;

  // Derive whether legal/escrow sections are accepted (for submission gating only)
  const isLegalAccepted = sectionActions.some(
    a => a.section_key === 'legal_docs' && a.action_type === 'approval' && a.status === 'approved'
  );
  const isEscrowAccepted = sectionActions.some(
    a => a.section_key === 'escrow_funding' && a.action_type === 'approval' && a.status === 'approved'
  );
  // Governance-aware submission gating
  const governanceMode = resolveGovernanceMode(challenge.governance_profile);
  const needsLegalAcceptance = !!(challenge as any).lc_review_required || legalDetails.length > 0;
  const needsEscrowAcceptance = isControlledMode(governanceMode);
  const legalEscrowBlocked =
    (needsLegalAcceptance && !isLegalAccepted) ||
    (needsEscrowAcceptance && !isEscrowAccepted);

  // Build specific blocking reason for UI
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
          // Auto-scroll to the section after a short delay for tab switch
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
