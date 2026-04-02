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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Eye,
} from "lucide-react";
import { GovernanceProfileBadge } from "@/components/cogniblend/GovernanceProfileBadge";
import { HoldResumeActions } from "@/components/cogniblend/HoldResumeActions";
import { BulkActionBar } from "@/components/cogniblend/curation/BulkActionBar";
import { CHALLENGE_TEMPLATES } from "@/lib/challengeTemplates";
import { cn } from "@/lib/utils";
import { parseJson } from "@/lib/cogniblend/curationHelpers";
import { resolveIndustrySegmentId } from "@/lib/cogniblend/curationHelpers";
import type { GroupDef } from "@/lib/cogniblend/curationTypes";

export interface CurationHeaderBarProps {
  challengeId: string;
  challengeTitle: string;
  governanceProfile: string | null;
  operatingModel: string | null;
  currentPhase: number | null;
  phaseStatus: string | null;
  problemStatement: string | null;
  extendedBrief: unknown;
  rewardStructure: unknown;
  phaseSchedule: unknown;
  challenge: Record<string, unknown>; // for resolveIndustrySegmentId

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
  operatingModel,
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

/* ── Original Brief sub-component ── */

interface OriginalBriefAccordionProps {
  operatingModel: string | null;
  extendedBrief: unknown;
  rewardStructure: unknown;
  phaseSchedule: unknown;
  problemStatement: string;
  challenge: Record<string, unknown>;
  optimisticIndustrySegId: string | null;
  industrySegments: Array<{ id: string; name: string }> | undefined;
}

function OriginalBriefAccordion({
  operatingModel,
  extendedBrief,
  rewardStructure,
  phaseSchedule,
  problemStatement,
  challenge,
  optimisticIndustrySegId,
  industrySegments,
}: OriginalBriefAccordionProps) {
  const extBrief = parseJson<any>(extendedBrief as any);
  const templateId = extBrief?.challenge_template_id;
  const template = templateId ? CHALLENGE_TEMPLATES.find((t) => t.id === templateId) : null;

  const segmentId = optimisticIndustrySegId ?? resolveIndustrySegmentId(challenge as any);
  const segmentName = industrySegments?.find((s) => s.id === segmentId)?.name;

  const reward = parseJson<any>(rewardStructure as any);
  const sched = parseJson<any>(phaseSchedule as any);

  const solExpectations = extBrief?.solution_expectations;
  const beneficiaries = extBrief?.beneficiaries_mapping;
  const amApproval = extBrief?.am_approval_required;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="original-brief" className="border border-border rounded-lg">
        <AccordionTrigger className="px-4 py-2 text-sm font-semibold hover:no-underline gap-2">
          <div className="flex items-center gap-2 flex-1 text-left">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>Original Brief from {operatingModel === "MP" ? "Account Manager" : "Challenge Requestor"}</span>
            <Badge variant="outline" className="text-[10px] ml-auto">Read Only</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Challenge Template</p>
            {template ? (
              <Badge variant="secondary" className="mt-1 text-xs">
                <span className="mr-1">{template.emoji}</span>{template.name}
              </Badge>
            ) : (
              <p className="text-sm text-muted-foreground italic mt-0.5">No template selected</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground">Industry Segment</p>
            {segmentName ? (
              <Badge variant="outline" className="mt-1 text-xs">{segmentName}</Badge>
            ) : (
              <p className="text-sm text-destructive/80 italic mt-0.5">Not set — required in Context &amp; Background</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground">Problem Statement</p>
            <p className="text-sm text-foreground mt-0.5">{problemStatement || "—"}</p>
          </div>

          {reward && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Budget Range</p>
              <p className="text-sm text-foreground mt-0.5">
                {reward.currency ?? "USD"} {(reward.budget_min ?? 0).toLocaleString()} – {(reward.budget_max ?? 0).toLocaleString()}
              </p>
            </div>
          )}

          {sched?.expected_timeline && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Timeline Urgency</p>
              <p className="text-sm text-foreground mt-0.5">{sched.expected_timeline} months</p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground">Solution Expectations</p>
            {solExpectations && String(solExpectations).trim() ? (
              <p className="text-sm text-foreground mt-0.5">{String(solExpectations)}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic mt-0.5">No content added</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground">Beneficiaries Mapping</p>
            {beneficiaries && String(beneficiaries).trim() ? (
              <p className="text-sm text-foreground mt-0.5">{String(beneficiaries)}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic mt-0.5">No content added</p>
            )}
          </div>

          {operatingModel === "MP" && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">AM Approval Required</p>
              {amApproval ? (
                <Badge className="mt-1 text-[10px] bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">
                  <AlertTriangle className="h-3 w-3 mr-1" />AM Gate Active
                </Badge>
              ) : (
                <p className="text-sm text-muted-foreground italic mt-0.5">No — direct to curation</p>
              )}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
