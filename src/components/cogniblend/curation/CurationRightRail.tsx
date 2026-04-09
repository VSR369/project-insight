/**
 * CurationRightRail — Right-side action rail for the Curation Review page.
 * Sub-components extracted to RightRailCards.tsx.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Bot, Loader2 } from "lucide-react";
import CurationActions from "@/components/cogniblend/curation/CurationActions";
import { LegalReviewPanel } from "@/components/cogniblend/curation/LegalReviewPanel";
import ModificationPointsTracker from "@/components/cogniblend/ModificationPointsTracker";
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

  return (
    <div className="space-y-4">
      <AIQualityCard aiQuality={aiQuality} aiQualityLoading={aiQualityLoading} onAnalyze={onAIQualityAnalysis} />

      {challengeCtx && <AIConfidenceSummary sectionKeys={allSectionKeys} context={challengeCtx} />}

      <CompletenessChecklistCard result={completenessResult} checkDefs={completenessCheckDefs} isRunning={completenessRunning} onRun={onRunCompletenessCheck} onNavigateToSection={onNavigateToSection} />

      {challengeId && <ContextLibraryCard challengeId={challengeId} onOpenLibrary={onOpenContextLibrary} />}

      <Button variant="outline" size="sm" onClick={onAIReview} disabled={aiReviewLoading} className="w-full">
        {aiReviewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Bot className="h-4 w-4 mr-1.5" />}
        Review Sections by AI
      </Button>

      <WaveProgressPanel progress={waveProgress} onCancel={onCancelReview} />

      {budgetShortfall && (
        <BudgetRevisionPanel shortfall={budgetShortfall} currencyCode={challengeCurrencyCode ?? 'USD'}
          onAcceptAndSendToCreator={() => onAcceptBudgetRevision(budgetShortfall)} onModifyManually={onModifyRewardManually} onReject={onDismissBudgetShortfall} />
      )}

      <CompletionBanner phase2Status={phase2Status} triageTotalCount={triageTotalCount} aiReviews={aiReviews} />

      <AIReviewSummaryCard aiReviews={aiReviews} staleSections={staleSections} groups={groups} sectionMap={sectionMap}
        getSectionDisplayName={getSectionDisplayName} setShowOnlyStale={setShowOnlyStale} setActiveGroup={setActiveGroup} />

      <CurationActions challengeId={challengeId} phaseStatus={phaseStatus} allComplete={allComplete}
        checklistSummary={checklistSummary} completedCount={completedCount} totalCount={checklistSummary.length}
        operatingModel={operatingModel} readOnly={isReadOnly} legalEscrowBlocked={legalEscrowBlocked} blockingReason={blockingReason}
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

      <ModificationPointsTracker challengeId={challengeId} mode={isReadOnly ? "readonly" : "curator"} />
    </div>
  );
}
