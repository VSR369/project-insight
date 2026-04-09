/**
 * CurationHeaderBar — Header, banners, original brief, and progress strip
 * for the Curation Review page.
 *
 * Extracted from CurationReviewPage.tsx (Phase D3.3).
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { GovernanceModeSwitcher } from "@/components/cogniblend/curation/GovernanceModeSwitcher";
import { HoldResumeActions } from "@/components/cogniblend/HoldResumeActions";
import { BulkActionBar } from "@/components/cogniblend/curation/BulkActionBar";
import { OriginalBriefAccordion } from "@/components/cogniblend/curation/OriginalBriefAccordion";
import { cn } from "@/lib/utils";
import type { GroupDef } from "@/lib/cogniblend/curationTypes";

export interface CurationHeaderBarProps {
  challengeId: string;
  challengeTitle: string;
  governanceProfile: string | null;
  governanceModeOverride?: string | null;
  operatingModel: string | null;
  currentPhase: number | null;
  phaseStatus: string | null;
  problemStatement: string | null;
  extendedBrief: unknown;
  rewardStructure: unknown;
  phaseSchedule: unknown;
  challenge: Record<string, unknown>;

  isReadOnly: boolean;
  orgTypeName?: string;
  onNavigateBack: () => void;

  guidedMode: boolean;
  onGuidedModeChange: (v: boolean) => void;

  userId?: string;
  userRoleCodes: string[];

  aiReviewCounts: {
    pass: number;
    warning: number;
    inferred: number;
    needsRevision: number;
    hasReviews: boolean;
  };
  onAcceptAllPassing: () => void;
  onReviewWarnings: () => void;

  phaseDescription: string;
  legalEscrowBlocked: boolean;
  blockingReason?: string;

  groups: GroupDef[];
  groupProgress: Record<string, { done: number; total: number; hasAIFlag: boolean }>;
  groupReadiness: Record<string, { ready: boolean; missingPrereqs: string[]; completionPct: number }>;
  activeGroup: string;
  onGroupClick: (id: string) => void;
  staleCountByGroup: Record<string, number>;

  optimisticIndustrySegId: string | null;
  industrySegments: Array<{ id: string; name: string }> | undefined;
}

export function CurationHeaderBar({
  challengeId,
  challengeTitle,
  governanceProfile,
  governanceModeOverride,
  currentPhase,
  problemStatement,
  extendedBrief,
  rewardStructure,
  phaseSchedule,
  challenge,
  isReadOnly,
  orgTypeName,
  onNavigateBack,
  guidedMode,
  onGuidedModeChange,
  userId,
  userRoleCodes,
  aiReviewCounts,
  onAcceptAllPassing,
  onReviewWarnings,
  phaseDescription,
  legalEscrowBlocked,
  blockingReason,
  groups,
  groupProgress,
  groupReadiness,
  activeGroup,
  onGroupClick,
  staleCountByGroup,
  optimisticIndustrySegId,
  industrySegments,
}: CurationHeaderBarProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onNavigateBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-foreground truncate">
            {isReadOnly ? "Curation Preview" : "Curation Review"}
          </h1>
          <p className="text-sm text-muted-foreground truncate">{challengeTitle}</p>
        </div>
        {isReadOnly && (
          <Badge variant="outline" className="text-xs shrink-0 gap-1">
            <Eye className="h-3 w-3" />View Only
          </Badge>
        )}
        <GovernanceProfileBadge profile={governanceProfile} compact />
        {orgTypeName && (
          <Badge variant="secondary" className="text-xs shrink-0">{orgTypeName}</Badge>
        )}
        <div className="flex items-center gap-2 shrink-0">
          <Switch checked={guidedMode} onCheckedChange={onGuidedModeChange} />
          <span className="text-xs text-muted-foreground">
            {guidedMode ? "Guided" : "Free browse"}
          </span>
        </div>
        {userId && !isReadOnly && (
          <HoldResumeActions
            challengeId={challengeId}
            challengeTitle={challengeTitle}
            currentPhase={currentPhase ?? 3}
            phaseStatus={null}
            userId={userId}
            userRoleCodes={userRoleCodes}
          />
        )}
      </div>

      {/* Bulk action bar */}
      {aiReviewCounts.hasReviews && (
        <BulkActionBar
          warningCount={aiReviewCounts.warning}
          passCount={aiReviewCounts.pass}
          inferredCount={aiReviewCounts.inferred}
          totalCount={aiReviewCounts.pass + aiReviewCounts.warning + aiReviewCounts.inferred}
          onAcceptAllPassing={onAcceptAllPassing}
          onReviewWarnings={onReviewWarnings}
        />
      )}

      {/* Read-only banner */}
      {isReadOnly && phaseDescription && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-400/40 bg-blue-50/60 dark:bg-blue-900/20 dark:border-blue-700/40 p-4">
          <Eye className="h-5 w-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              This challenge is in {phaseDescription} — view only.
            </p>
            <p className="text-xs text-muted-foreground">
              Editing will be enabled once Legal & Finance review is complete and the challenge advances to Phase 3 (Curation).
            </p>
          </div>
        </div>
      )}

      {/* Governance-aware blocking banner */}
      {legalEscrowBlocked && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-50/60 dark:bg-amber-900/20 dark:border-amber-700/40 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {blockingReason || "Legal Documents and Escrow & Funding must be accepted before submitting."}
            </p>
            <p className="text-xs text-muted-foreground">
              You can continue editing and reviewing all sections. Submission to the next phase is blocked until the above is resolved.
            </p>
          </div>
        </div>
      )}

      {/* Original Brief Accordion */}
      {problemStatement && (
        <OriginalBriefAccordion
          operatingModel={operatingModel}
          extendedBrief={extendedBrief}
          rewardStructure={rewardStructure}
          phaseSchedule={phaseSchedule}
          problemStatement={problemStatement}
          challenge={challenge}
          optimisticIndustrySegId={optimisticIndustrySegId}
          industrySegments={industrySegments}
        />
      )}

      {/* Progress Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
        {groups.map((group) => {
          const progress = groupProgress[group.id];
          const done = progress?.done ?? 0;
          const total = progress?.total ?? 0;
          const isActive = activeGroup === group.id;
          const allDone = done === total && total > 0;
          const hasFlag = progress?.hasAIFlag ?? false;
          const readiness = groupReadiness[group.id];

          let statusColor = "bg-muted/50 text-muted-foreground border-border";
          if (allDone) statusColor = group.colorDone;
          else if (done > 0) statusColor = "bg-blue-50 text-blue-800 border-blue-300";
          if (hasFlag && !allDone) statusColor = "bg-amber-50 text-amber-800 border-amber-300";

          return (
            <button
              key={group.id}
              onClick={() => onGroupClick(group.id)}
              className={cn(
                "rounded-lg border-2 p-3 text-left transition-all",
                statusColor,
                isActive && "ring-2 ring-primary ring-offset-2",
                readiness && !readiness.ready && !isActive && "opacity-60",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-muted-foreground">{group.icon}</span>
                  <span className="text-sm font-semibold">{group.label}</span>
                  {readiness && !readiness.ready && (
                    <span className="inline-flex items-center justify-center h-4 px-1.5 rounded-full bg-orange-100 text-orange-600 text-[9px] font-semibold border border-orange-200" title={`Complete ${readiness.missingPrereqs.join(", ")} first`}>
                      ⏳ {readiness.missingPrereqs[0]}
                    </span>
                  )}
                  {staleCountByGroup[group.id] > 0 && (
                    <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none">
                      {staleCountByGroup[group.id]}
                    </span>
                  )}
                </div>
                {readiness?.ready && allDone && <CheckCircle2 className="h-4 w-4" />}
                {hasFlag && !allDone && <AlertTriangle className="h-4 w-4" />}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <Progress value={total > 0 ? (done / total) * 100 : 0} className="h-1.5 flex-1" />
                <span className="text-xs font-medium">{done}/{total}</span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
