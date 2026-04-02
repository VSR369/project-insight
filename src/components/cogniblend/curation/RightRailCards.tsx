/**
 * RightRailCards — Sub-components for the CurationRightRail.
 * Extracted from CurationRightRail.tsx.
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import type { GroupDef, AIQualitySummary } from "@/lib/cogniblend/curationTypes";
import type { SectionReview } from "@/components/cogniblend/curation/CurationAIReviewPanel";

/* ── AI Quality Card ── */

interface AIQualityCardProps {
  aiQuality: AIQualitySummary | null;
  aiQualityLoading: boolean;
  onAnalyze: () => void;
}

export function AIQualityCard({ aiQuality, aiQualityLoading, onAnalyze }: AIQualityCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Quality
          </CardTitle>
          <Button size="sm" variant={aiQuality ? "ghost" : "outline"} onClick={onAnalyze} disabled={aiQualityLoading} className="text-xs h-7 px-2">
            {aiQualityLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : aiQuality ? <RefreshCw className="h-3.5 w-3.5" /> : "Analyze"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {aiQuality ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={cn("text-2xl font-bold", aiQuality.overall_score >= 80 ? "text-primary" : aiQuality.overall_score >= 60 ? "text-amber-600" : "text-destructive")}>
                {aiQuality.overall_score}
              </div>
              <div className="text-xs text-muted-foreground">{aiQuality.gaps.length} gap{aiQuality.gaps.length !== 1 ? "s" : ""} found</div>
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

/* ── AI Review Summary Card ── */

interface AIReviewSummaryCardProps {
  aiReviews: SectionReview[];
  staleSections: { key: string; staleBecauseOf: string[]; staleAt: string | null }[];
  groups: GroupDef[];
  sectionMap: Map<string, { label: string }>;
  getSectionDisplayName: (key: string) => string;
  setShowOnlyStale: (v: boolean) => void;
  setActiveGroup: (id: string) => void;
}

export function AIReviewSummaryCard({
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
              <AlertTriangle className="h-3 w-3 mr-0.5" />{staleSections.length} Stale
            </Badge>
          )}
        </div>

        {staleSections.length > 0 && (
          <SectionList label="Stale (re-review needed)" items={staleSections.map(s => ({ key: s.key, name: getSectionDisplayName(s.key) }))}
            className="text-amber-700" groups={groups} setActiveGroup={setActiveGroup}
            onClick={(key) => { setShowOnlyStale(true); const g = groups.find(g => g.sectionKeys.includes(key)); if (g) setActiveGroup(g.id); }} />
        )}

        {revisionSections.length > 0 && (
          <SectionList label="Needs Revision" items={revisionSections.map(r => ({ key: r.section_key, name: sectionMap.get(r.section_key)?.label ?? r.section_key }))}
            className="text-destructive" groups={groups} setActiveGroup={setActiveGroup} />
        )}

        {warningSections.length > 0 && (
          <SectionList label="Warnings" items={warningSections.map(r => ({ key: r.section_key, name: sectionMap.get(r.section_key)?.label ?? r.section_key }))}
            className="text-amber-700" groups={groups} setActiveGroup={setActiveGroup} />
        )}
      </CardContent>
    </Card>
  );
}

/* ── Completion Banner ── */

interface CompletionBannerProps {
  phase2Status: string;
  triageTotalCount: number;
  aiReviews: SectionReview[];
}

export function CompletionBanner({ phase2Status, triageTotalCount, aiReviews }: CompletionBannerProps) {
  if (phase2Status !== 'completed' || triageTotalCount <= 0) return null;
  const counts = { pass: 0, warning: 0, needs_revision: 0 };
  aiReviews.forEach((r) => { counts[r.status as keyof typeof counts] = (counts[r.status as keyof typeof counts] || 0) + 1; });
  return (
    <Card className="border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30">
      <CardContent className="pt-3 pb-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">AI Review Complete</p>
        <Progress value={100} className="h-2" />
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> All {triageTotalCount} sections reviewed
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">{counts.pass} Pass</Badge>
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">{counts.warning} Warning</Badge>
          <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px]">{counts.needs_revision} Needs Revision</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Helper sub-component ── */

function SectionList({ label, items, className, groups, setActiveGroup, onClick }: {
  label: string;
  items: { key: string; name: string }[];
  className: string;
  groups: GroupDef[];
  setActiveGroup: (id: string) => void;
  onClick?: (key: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className={`text-[10px] font-medium uppercase tracking-wide ${className}`}>{label}</p>
      {items.map((item) => (
        <button key={item.key} className={`text-xs hover:underline block text-left w-full truncate ${className}`}
          onClick={() => {
            if (onClick) { onClick(item.key); return; }
            const group = groups.find(g => g.sectionKeys.includes(item.key));
            if (group) setActiveGroup(group.id);
          }}>
          • {item.name}
        </button>
      ))}
    </div>
  );
}
