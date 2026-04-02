/**
 * CurationRightRail — Right-side action rail for the Curation Review page.
 * Extracted from CurationReviewPage.tsx (Phase D3.1).
 *
 * Contains: AI Quality card, AI Confidence summary, Completeness checklist,
 * Context Library card, AI review trigger, Wave progress, Budget revision,
 * Completion banner, AI review summary, Curation actions, Modification tracker.
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import CurationActions from "@/components/cogniblend/curation/CurationActions";
import ModificationPointsTracker from "@/components/cogniblend/ModificationPointsTracker";
import { AIConfidenceSummary } from "@/components/cogniblend/curation/AIConfidenceSummary";
import { WaveProgressPanel } from "@/components/cogniblend/curation/WaveProgressPanel";
import { BudgetRevisionPanel } from "@/components/cogniblend/curation/BudgetRevisionPanel";
import { CompletenessChecklistCard } from "@/components/cogniblend/curation/CompletenessChecklistCard";
import { ContextLibraryCard } from "@/components/cogniblend/curation/ContextLibraryCard";
import type { BudgetShortfallResult } from "@/lib/cogniblend/budgetShortfallDetection";
import type { SectionKey } from "@/types/sections";
import type { GroupDef, AIQualitySummary } from "@/lib/cogniblend/curationTypes";
import type { SectionReview } from "@/components/cogniblend/curation/CurationAIReviewPanel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ── Sub-component: AI Quality Card ── */

interface AIQualityCardProps {
  aiQuality: AIQualitySummary | null;
  aiQualityLoading: boolean;
  onAnalyze: () => void;
}

function AIQualityCard({ aiQuality, aiQualityLoading, onAnalyze }: AIQualityCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Quality
          </CardTitle>
          <Button
            size="sm"
            variant={aiQuality ? "ghost" : "outline"}
            onClick={onAnalyze}
            disabled={aiQualityLoading}
            className="text-xs h-7 px-2"
          >
            {aiQualityLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : aiQuality ? (
              <RefreshCw className="h-3.5 w-3.5" />
            ) : (
              "Analyze"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {aiQuality ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={cn(
                "text-2xl font-bold",
                aiQuality.overall_score >= 80 ? "text-primary" :
                aiQuality.overall_score >= 60 ? "text-amber-600" :
                "text-destructive"
              )}>
                {aiQuality.overall_score}
              </div>
              <div className="text-xs text-muted-foreground">
                {aiQuality.gaps.length} gap{aiQuality.gaps.length !== 1 ? "s" : ""} found
              </div>
            </div>
            <Progress value={aiQuality.overall_score} className="h-1.5" />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Run analysis to get quality scores and identify gaps.</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Sub-component: AI Review Summary Card ── */

interface AIReviewSummaryCardProps {
  aiReviews: SectionReview[];
  staleSections: { key: string; staleBecauseOf: string[]; staleAt: string | null }[];
  groups: GroupDef[];
  sectionMap: Map<string, { label: string }>;
  getSectionDisplayName: (key: string) => string;
  setShowOnlyStale: (v: boolean) => void;
  setActiveGroup: (id: string) => void;
}

function AIReviewSummaryCard({
  aiReviews, staleSections, groups, sectionMap,
  getSectionDisplayName, setShowOnlyStale, setActiveGroup,
}: AIReviewSummaryCardProps) {
  if (aiReviews.length === 0) return null;

  const counts = { pass: 0, warning: 0, needs_revision: 0 };
  aiReviews.forEach((r) => { counts[r.status as keyof typeof counts] = (counts[r.status as keyof typeof counts] || 0) + 1; });
  const revisionSections = aiReviews.filter((r) => r.status === "needs_revision");
  const warningSections = aiReviews.filter((r) => r.status === "warning");

  return (
    <Card className="border-border">
      <CardContent className="pt-3 pb-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">{counts.pass} Pass</Badge>
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">{counts.warning} Warning</Badge>
          <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px]">{counts.needs_revision} Needs Revision</Badge>
          {staleSections.length > 0 && (
            <Badge className="bg-amber-50 text-amber-700 border-amber-400 text-[10px]">
              <AlertTriangle className="h-3 w-3 mr-0.5" />
              {staleSections.length} Stale
            </Badge>
          )}
        </div>
        {staleSections.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-amber-700 uppercase tracking-wide">Stale (re-review needed)</p>
            {staleSections.map((s) => (
              <button
                key={s.key}
                className="text-xs text-amber-700 hover:underline block text-left w-full truncate"
                onClick={() => {
                  setShowOnlyStale(true);
                  const group = groups.find((g) => g.sectionKeys.includes(s.key));
                  if (group) setActiveGroup(group.id);
                }}
              >
                • {getSectionDisplayName(s.key)}
              </button>
            ))}
          </div>
        )}
        {revisionSections.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-destructive uppercase tracking-wide">Needs Revision</p>
            {revisionSections.map((r) => {
              const section = sectionMap.get(r.section_key);
              return (
                <button
                  key={r.section_key}
                  className="text-xs text-destructive hover:underline block text-left w-full truncate"
                  onClick={() => {
                    const group = groups.find((g) => g.sectionKeys.includes(r.section_key));
                    if (group) setActiveGroup(group.id);
                  }}
                >
                  • {section?.label ?? r.section_key}
                </button>
              );
            })}
          </div>
        )}
        {warningSections.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-amber-700 uppercase tracking-wide">Warnings</p>
            {warningSections.map((r) => {
              const section = sectionMap.get(r.section_key);
              return (
                <button
                  key={r.section_key}
                  className="text-xs text-amber-700 hover:underline block text-left w-full truncate"
                  onClick={() => {
                    const group = groups.find((g) => g.sectionKeys.includes(r.section_key));
                    if (group) setActiveGroup(group.id);
                  }}
                >
                  • {section?.label ?? r.section_key}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Main Props ── */

export interface CurationRightRailProps {
  challengeId: string;
  challengeCurrencyCode: string | null;
  phaseStatus: string | null;
  operatingModel: string | null;
  isReadOnly: boolean;

  // AI Quality
  aiQuality: AIQualitySummary | null;
  aiQualityLoading: boolean;
  onAIQualityAnalysis: () => void;

  // AI Confidence
  challengeCtx: any;
  allSectionKeys: string[];

  // Completeness
  completenessResult: any;
  completenessCheckDefs: any;
  completenessRunning: boolean;
  onRunCompletenessCheck: () => void;
  onNavigateToSection: (key: string) => void;

  // Context Library
  onOpenContextLibrary: () => void;

  // AI Review
  aiReviewLoading: boolean;
  onAIReview: () => void;

  // Wave progress
  waveProgress: any;
  onCancelReview: () => void;

  // Budget revision
  budgetShortfall: BudgetShortfallResult | null;
  curationStore: any;
  onDismissBudgetShortfall: () => void;
  onModifyRewardManually: () => void;
  onAcceptBudgetRevision: (shortfall: BudgetShortfallResult) => Promise<void>;

  // Completion banner
  phase2Status: string;
  triageTotalCount: number;

  // AI reviews
  aiReviews: SectionReview[];

  // Stale sections
  staleSections: { key: string; staleBecauseOf: string[]; staleAt: string | null }[];
  showOnlyStale: boolean;
  setShowOnlyStale: (v: boolean) => void;

  // Section metadata
  groups: GroupDef[];
  sectionMap: Map<string, { label: string }>;
  getSectionDisplayName: (key: string) => string;
  setActiveGroup: (id: string) => void;

  // Submission gating
  allComplete: boolean;
  checklistSummary: string;
  completedCount: number;
  legalEscrowBlocked: boolean;
  blockingReason: string;

  // Re-review
  onReReviewStale: () => Promise<void>;
  setAiReviewLoading: (v: boolean) => void;
}

/* ── Component ── */

export function CurationRightRail(props: CurationRightRailProps) {
  const {
    challengeId, challengeCurrencyCode, phaseStatus, operatingModel, isReadOnly,
    aiQuality, aiQualityLoading, onAIQualityAnalysis,
    challengeCtx, allSectionKeys,
    completenessResult, completenessCheckDefs, completenessRunning, onRunCompletenessCheck, onNavigateToSection,
    onOpenContextLibrary,
    aiReviewLoading, onAIReview,
    waveProgress, onCancelReview,
    budgetShortfall, curationStore, onDismissBudgetShortfall, onModifyRewardManually, onAcceptBudgetRevision,
    phase2Status, triageTotalCount,
    aiReviews,
    staleSections, showOnlyStale, setShowOnlyStale,
    groups, sectionMap, getSectionDisplayName, setActiveGroup,
    allComplete, checklistSummary, completedCount,
    legalEscrowBlocked, blockingReason,
    onReReviewStale, setAiReviewLoading,
  } = props;

  return (
    <div className="space-y-4">
      {/* AI Quality Summary */}
      <AIQualityCard
        aiQuality={aiQuality}
        aiQualityLoading={aiQualityLoading}
        onAnalyze={onAIQualityAnalysis}
      />

      {/* AI Confidence Summary */}
      {challengeCtx && (
        <AIConfidenceSummary
          sectionKeys={allSectionKeys}
          context={challengeCtx}
        />
      )}

      {/* Challenge Completeness Checklist */}
      <CompletenessChecklistCard
        result={completenessResult}
        checkDefs={completenessCheckDefs}
        isRunning={completenessRunning}
        onRun={onRunCompletenessCheck}
        onNavigateToSection={onNavigateToSection}
      />

      {/* Context Library Card */}
      {challengeId && (
        <ContextLibraryCard
          challengeId={challengeId}
          onOpenLibrary={onOpenContextLibrary}
        />
      )}

      {/* Per-section AI Review button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onAIReview}
        disabled={aiReviewLoading}
        className="w-full"
      >
        {aiReviewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Bot className="h-4 w-4 mr-1.5" />}
        Review Sections by AI
      </Button>

      {/* Wave Progress Panel */}
      <WaveProgressPanel progress={waveProgress} onCancel={onCancelReview} />

      {/* Budget Revision Panel */}
      {budgetShortfall && (
        <BudgetRevisionPanel
          shortfall={budgetShortfall}
          currencyCode={challengeCurrencyCode ?? 'USD'}
          onAcceptAndSendToAM={() => onAcceptBudgetRevision(budgetShortfall)}
          onModifyManually={onModifyRewardManually}
          onReject={onDismissBudgetShortfall}
        />
      )}

      {/* Completion Banner — shows after AI review finishes */}
      {phase2Status === 'completed' && triageTotalCount > 0 && (() => {
        const counts = { pass: 0, warning: 0, needs_revision: 0 };
        aiReviews.forEach((r) => { counts[r.status as keyof typeof counts] = (counts[r.status as keyof typeof counts] || 0) + 1; });
        return (
          <Card className="border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30">
            <CardContent className="pt-3 pb-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">AI Review Complete</p>
              <Progress value={100} className="h-2" />
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                All {triageTotalCount} sections reviewed
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">{counts.pass} Pass</Badge>
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">{counts.warning} Warning</Badge>
                <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px]">{counts.needs_revision} Needs Revision</Badge>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* AI Review Summary */}
      <AIReviewSummaryCard
        aiReviews={aiReviews}
        staleSections={staleSections}
        groups={groups}
        sectionMap={sectionMap}
        getSectionDisplayName={getSectionDisplayName}
        setShowOnlyStale={setShowOnlyStale}
        setActiveGroup={setActiveGroup}
      />

      {/* Action buttons + return modal + modification cycle */}
      <CurationActions
        challengeId={challengeId}
        phaseStatus={phaseStatus}
        allComplete={allComplete}
        checklistSummary={checklistSummary}
        completedCount={completedCount}
        totalCount={15}
        operatingModel={operatingModel}
        readOnly={isReadOnly}
        legalEscrowBlocked={legalEscrowBlocked}
        blockingReason={blockingReason}
        staleSections={staleSections.map(s => ({
          key: s.key,
          name: getSectionDisplayName(s.key),
          causes: s.staleBecauseOf.map(c => getSectionDisplayName(c)),
          staleAt: s.staleAt ?? new Date().toISOString(),
        }))}
        unreviewedSections={aiReviews
          .filter(r => r.status === 'needs_revision')
          .map(r => ({ key: r.section_key, name: sectionMap.get(r.section_key)?.label ?? r.section_key }))}
        onNavigateToStale={() => {
          if (staleSections.length > 0) {
            setShowOnlyStale(true);
            const firstKey = staleSections[0].key;
            const group = groups.find(g => g.sectionKeys.includes(firstKey));
            if (group) setActiveGroup(group.id);
          }
        }}
        onReReviewStale={async () => {
          setAiReviewLoading(true);
          try { await onReReviewStale(); } finally { setAiReviewLoading(false); }
        }}
      />

      {/* Modification Points Tracker */}
      <ModificationPointsTracker challengeId={challengeId} mode={isReadOnly ? "readonly" : "curator"} />
    </div>
  );
}
