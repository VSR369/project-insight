/**
 * CurationRightRail — Right-side action rail for the Curation Review page.
 * Sub-components extracted to RightRailCards.tsx.
 */

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { SectionKey } from '@/types/sections';
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Bot, Loader2, Sparkles, BookOpen, FileText, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CurationActions from "@/components/cogniblend/curation/CurationActions";
import { LegalReviewPanel } from "@/components/cogniblend/curation/LegalReviewPanel";
import ModificationPointsTracker from "@/components/cogniblend/ModificationPointsTracker";
import { CreatorApprovalStatusBanner } from "@/components/cogniblend/curation/CreatorApprovalStatusBanner";
import { AIConfidenceSummary } from "@/components/cogniblend/curation/AIConfidenceSummary";
import { WaveProgressPanel } from "@/components/cogniblend/curation/WaveProgressPanel";
import { BudgetRevisionPanel } from "@/components/cogniblend/curation/BudgetRevisionPanel";
import { CompletenessChecklistCard } from "@/components/cogniblend/curation/CompletenessChecklistCard";
import { ContextLibraryCard } from "@/components/cogniblend/curation/ContextLibraryCard";
import { AIQualityCard, AIReviewSummaryCard, CompletionBanner } from "./RightRailCards";
import type { BudgetShortfallResult } from "@/lib/cogniblend/budgetShortfallDetection";
import type { GroupDef, AIQualitySummary } from "@/lib/cogniblend/curationTypes";
import type { SectionReview } from "@/components/cogniblend/curation/CurationAIReviewPanel";

export interface CurationRightRailProps {
  challengeId: string;
  challengeCurrencyCode: string | null;
  phaseStatus: string | null;
  operatingModel: string | null;
  isReadOnly: boolean;
  aiQuality: AIQualitySummary | null;
  aiQualityLoading: boolean;
  onAIQualityAnalysis: () => void;
  passType?: 'analyse' | 'generate';
  challengeCtx: any;
  allSectionKeys: string[];
  completenessResult: any;
  completenessCheckDefs: any;
  completenessRunning: boolean;
  onRunCompletenessCheck: () => void;
  onNavigateToSection: (key: string) => void;
  onOpenContextLibrary: () => void;
  aiReviewLoading: boolean;
  onAIReview: () => void;
  onAnalyse?: () => void;
  onGenerateSuggestions?: () => void;
  pass1Done?: boolean;
  waveProgress: any;
  onCancelReview: () => void;
  budgetShortfall: BudgetShortfallResult | null;
  curationStore: any;
  onDismissBudgetShortfall: () => void;
  onModifyRewardManually: () => void;
  onAcceptBudgetRevision: (shortfall: BudgetShortfallResult) => Promise<void>;
  phase2Status: string;
  triageTotalCount: number;
  aiReviews: SectionReview[];
  staleSections: { key: string; staleBecauseOf: string[]; staleAt: string | null }[];
  showOnlyStale: boolean;
  setShowOnlyStale: (v: boolean) => void;
  groups: GroupDef[];
  sectionMap: Map<string, { label: string }>;
  getSectionDisplayName: (key: string) => string;
  setActiveGroup: (id: string) => void;
  allComplete: boolean;
  checklistSummary: Array<{ id: number; label: string; passed: boolean; method: string }>;
  completedCount: number;
  legalEscrowBlocked: boolean;
  blockingReason: string;
  onReReviewStale: () => Promise<void>;
  setAiReviewLoading: (v: boolean) => void;
  userId?: string;
  lockStatus?: string;
  governanceMode?: string;
  currentPhase?: number | null;
  onFreezeForLegal?: () => void;
  contextLibraryReviewed?: boolean;
  creatorApprovalRequired?: boolean | null;
  communityCreationAllowed?: boolean;
  isAnonymous?: boolean;
}

export function CurationRightRail(props: CurationRightRailProps) {
  const {
    challengeId, challengeCurrencyCode, phaseStatus, operatingModel, isReadOnly,
    aiQuality, aiQualityLoading, onAIQualityAnalysis,
    challengeCtx, allSectionKeys,
    completenessResult, completenessCheckDefs, completenessRunning, onRunCompletenessCheck, onNavigateToSection,
    onOpenContextLibrary,
    aiReviewLoading, onAIReview,
    waveProgress, onCancelReview,
    budgetShortfall, onDismissBudgetShortfall, onModifyRewardManually, onAcceptBudgetRevision,
    phase2Status, triageTotalCount, aiReviews,
    staleSections, setShowOnlyStale,
    groups, sectionMap, getSectionDisplayName, setActiveGroup,
    allComplete, checklistSummary, completedCount,
    legalEscrowBlocked, blockingReason,
    onReReviewStale, setAiReviewLoading,
  } = props;

  const navigate = useNavigate();

  const commentCounts = useMemo(() => {
    if (!props.curationStore) return undefined;
    const store = props.curationStore;
    const counts: Partial<Record<SectionKey, number>> = {};
    const sections = store.getState?.()?.sections ?? store.sections ?? {};
    for (const [key, entry] of Object.entries(sections)) {
      const e = entry as { aiComments?: unknown[] | null } | undefined;
      if (e?.aiComments && Array.isArray(e.aiComments)) {
        counts[key as SectionKey] = e.aiComments.length;
      }
    }
    return counts;
  }, [props.curationStore]);

  const suggestionCounts = useMemo(() => {
    if (!props.curationStore) return undefined;
    const store = props.curationStore;
    const counts: Partial<Record<SectionKey, number>> = {};
    const sections = store.getState?.()?.sections ?? store.sections ?? {};
    for (const [key, entry] of Object.entries(sections)) {
      const e = entry as { aiSuggestion?: string | null } | undefined;
      if (e?.aiSuggestion) {
        counts[key as SectionKey] = 1;
      }
    }
    return counts;
  }, [props.curationStore]);

  return (
    <div className="space-y-4">
      {/* Preview Document + Diagnostics */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => navigate(`/cogni/curation/${challengeId}/preview`)}
        >
          <FileText className="h-4 w-4 mr-1.5" />
          Preview
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => window.open(`/cogni/curation/${challengeId}/diagnostics`, '_blank')}
        >
          <Activity className="h-4 w-4 mr-1.5" />
          Diagnostics
        </Button>
      </div>
      {/* PRIMARY ACTION: Two-step AI workflow — Analyse → Context Library → Generate */}
      {props.onAnalyse && props.onGenerateSuggestions ? (
        <div className="space-y-2">
          <Button
            variant={props.pass1Done ? "outline" : "default"}
            size="sm"
            onClick={props.onAnalyse}
            disabled={aiReviewLoading}
            className="w-full"
          >
            {aiReviewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Bot className="h-4 w-4 mr-1.5" />}
            {props.pass1Done ? 'Re-analyse Challenge' : 'Analyse Challenge'}
          </Button>
          {props.pass1Done && (
            <>
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 text-xs text-blue-800 dark:text-blue-300 space-y-1.5">
                <p className="font-medium">Next step: Review discovered sources</p>
                <p>Open the Context Library to review and accept/reject sources before generating suggestions.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-1 text-xs"
                  onClick={onOpenContextLibrary}
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                  Open Context Library
                </Button>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="w-full block">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={props.onGenerateSuggestions}
                      disabled={aiReviewLoading || !props.contextLibraryReviewed}
                      className="w-full"
                    >
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      Generate Suggestions
                    </Button>
                  </span>
                </TooltipTrigger>
                {!props.contextLibraryReviewed && (
                  <TooltipContent>Review Context Library sources first</TooltipContent>
                )}
              </Tooltip>
            </>
          )}
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={onAIReview} disabled={aiReviewLoading} className="w-full">
          {aiReviewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Bot className="h-4 w-4 mr-1.5" />}
          Review Sections by AI
        </Button>
      )}

      <WaveProgressPanel progress={waveProgress} onCancel={onCancelReview} passType={props.passType} commentCounts={commentCounts} suggestionCounts={suggestionCounts} />

      <CompletenessChecklistCard result={completenessResult} checkDefs={completenessCheckDefs} isRunning={completenessRunning} onRun={onRunCompletenessCheck} onNavigateToSection={onNavigateToSection} />

      {challengeId && <ContextLibraryCard challengeId={challengeId} onOpenLibrary={onOpenContextLibrary} />}

      <AIReviewSummaryCard aiReviews={aiReviews} staleSections={staleSections} groups={groups} sectionMap={sectionMap}
        getSectionDisplayName={getSectionDisplayName} setShowOnlyStale={setShowOnlyStale} setActiveGroup={setActiveGroup} />

      {budgetShortfall && (
        <BudgetRevisionPanel shortfall={budgetShortfall} currencyCode={challengeCurrencyCode ?? 'USD'}
          onAcceptAndSendToCreator={() => onAcceptBudgetRevision(budgetShortfall)} onModifyManually={onModifyRewardManually} onReject={onDismissBudgetShortfall} />
      )}

      <CompletionBanner phase2Status={phase2Status} triageTotalCount={triageTotalCount} aiReviews={aiReviews} />

      <CreatorApprovalStatusBanner
        operatingModel={operatingModel}
        creatorApprovalRequired={props.creatorApprovalRequired ?? null}
        communityCreationAllowed={props.communityCreationAllowed}
        isAnonymous={props.isAnonymous}
      />

      <CurationActions challengeId={challengeId} phaseStatus={phaseStatus} allComplete={allComplete}
        checklistSummary={checklistSummary} completedCount={completedCount} totalCount={checklistSummary.length}
        operatingModel={operatingModel} readOnly={isReadOnly} legalEscrowBlocked={legalEscrowBlocked} blockingReason={blockingReason}
        lockStatus={props.lockStatus} governanceMode={props.governanceMode} onFreezeForLegal={props.onFreezeForLegal}
        staleSections={staleSections.map(s => ({ key: s.key, name: getSectionDisplayName(s.key), causes: s.staleBecauseOf.map(c => getSectionDisplayName(c)), staleAt: s.staleAt ?? new Date().toISOString() }))}
        unreviewedSections={aiReviews.filter(r => r.status === 'needs_revision').map(r => ({ key: r.section_key, name: sectionMap.get(r.section_key)?.label ?? r.section_key }))}
        onNavigateToStale={() => {
          if (staleSections.length > 0) {
            setShowOnlyStale(true);
            const firstKey = staleSections[0].key;
            const group = groups.find(g => g.sectionKeys.includes(firstKey));
            if (group) setActiveGroup(group.id);
          }
        }}
        onReReviewStale={async () => { setAiReviewLoading(true); try { await onReReviewStale(); } finally { setAiReviewLoading(false); } }}
      />

      {props.userId && (
        <LegalReviewPanel
          challengeId={challengeId}
          userId={props.userId}
          lockStatus={props.lockStatus ?? 'OPEN'}
          governanceMode={props.governanceMode ?? 'QUICK'}
          currentPhase={props.currentPhase ?? null}
        />
      )}

      <AIQualityCard aiQuality={aiQuality} aiQualityLoading={aiQualityLoading} onAnalyze={onAIQualityAnalysis} />

      {challengeCtx && <AIConfidenceSummary sectionKeys={allSectionKeys} context={challengeCtx} />}

      <ModificationPointsTracker challengeId={challengeId} mode={isReadOnly ? "readonly" : "curator"} />
    </div>
  );
}
