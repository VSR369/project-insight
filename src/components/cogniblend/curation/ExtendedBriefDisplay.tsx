/**
 * ExtendedBriefDisplay — Nested panel architecture for Extended Brief subsections.
 * Stakeholder table and subsection content rendering extracted to separate files.
 */

import React, { useState, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, AlertCircle } from "lucide-react";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";
import { CuratorSectionPanel, type SectionStatus } from "@/components/cogniblend/curation/CuratorSectionPanel";
import { CurationAIReviewInline, type SectionReview } from "@/components/cogniblend/curation/CurationAIReviewPanel";
import {
  EXTENDED_BRIEF_SUBSECTION_KEYS,
  EXTENDED_BRIEF_FIELD_MAP,
  SECTION_FORMAT_CONFIG,
} from "@/lib/cogniblend/curationSectionFormats";
import type { Json } from "@/integrations/supabase/types";
import { BriefSubsectionContent } from "./BriefSubsectionContent";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExtendedBriefDisplayProps {
  data: Json | null;
  onSave: (updatedBrief: Record<string, unknown>) => void;
  saving?: boolean;
  readOnly?: boolean;
  challengeId: string;
  aiSectionReviews: SectionReview[];
  onAcceptRefinement: (sectionKey: string, newContent: string) => void;
  onSingleSectionReview: (sectionKey: string, freshReview: SectionReview) => void;
  onMarkAddressed: (sectionKey: string) => void;
  challengeContext?: { title?: string; maturity_level?: string | null; domain_tags?: string[] };
  expandVersion?: number;
  industrySegmentId?: string | null;
  industrySegmentFromIntake?: boolean;
  onIndustrySegmentChange?: (segmentId: string) => void;
}

// ---------------------------------------------------------------------------
// Subsection metadata
// ---------------------------------------------------------------------------

const SUBSECTION_META: Record<string, { label: string; attribution?: string }> = {
  context_and_background: { label: "Context & Background", attribution: "from Intake" },
  root_causes: { label: "Root Causes", attribution: "AI Inferred" },
  affected_stakeholders: { label: "Affected Stakeholders", attribution: "AI Inferred" },
  current_deficiencies: { label: "Current Deficiencies", attribution: "AI Inferred" },
  preferred_approach: { label: "Preferred Approach", attribution: "Human Input" },
  approaches_not_of_interest: { label: "Approaches NOT of Interest", attribution: "Human Input" },
};

// ---------------------------------------------------------------------------
// Helpers (kept here for backward compat exports)
// ---------------------------------------------------------------------------

export function parseExtendedBrief(val: Json | null): Record<string, unknown> {
  if (!val) return {};
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return {}; }
  }
  return val as unknown as Record<string, unknown>;
}

export function getSubsectionValue(brief: Record<string, unknown>, subsectionKey: string): unknown {
  const jsonbField = EXTENDED_BRIEF_FIELD_MAP[subsectionKey];
  return jsonbField ? brief[jsonbField] : undefined;
}

export function ensureStringArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((v) => (typeof v === "string" ? v : String(v)));
  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    if (Array.isArray(obj.items)) return obj.items.map((v) => (typeof v === "string" ? v : String(v)));
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map((v: unknown) => (typeof v === "string" ? v : String(v)));
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
        return parsed.items.map((v: unknown) => (typeof v === "string" ? v : String(v)));
      }
    } catch {}
    return val.trim() ? [val] : [];
  }
  return [];
}

// Re-export stakeholder types for backward compat
export type { StakeholderRow } from "./ExtendedBriefStakeholderTable";
export { StakeholderTableEditor, StakeholderTableView, ensureStakeholderArray } from "./ExtendedBriefStakeholderTable";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ExtendedBriefDisplay({
  data, onSave, saving, readOnly = false, challengeId,
  aiSectionReviews, onAcceptRefinement, onSingleSectionReview,
  onMarkAddressed, challengeContext, expandVersion,
  industrySegmentId, industrySegmentFromIntake, onIndustrySegmentChange,
}: ExtendedBriefDisplayProps) {
  const brief = parseExtendedBrief(data);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const { data: industrySegments } = useIndustrySegments();
  const resolvedSegmentName = industrySegments?.find(s => s.id === industrySegmentId)?.name;

  const handleSubsectionSave = useCallback(
    (subsectionKey: string, value: unknown) => {
      const jsonbField = EXTENDED_BRIEF_FIELD_MAP[subsectionKey];
      if (!jsonbField) return;
      const updated = { ...brief, [jsonbField]: value };
      onSave(updated);
      setEditingKey(null);
    },
    [brief, onSave],
  );

  const hasAnyContent = EXTENDED_BRIEF_SUBSECTION_KEYS.some((key) => {
    const val = getSubsectionValue(brief, key);
    if (Array.isArray(val)) return val.length > 0;
    if (val && typeof val === "object" && Array.isArray((val as any).items)) return (val as any).items.length > 0;
    return typeof val === "string" && val.trim().length > 0;
  });

  if (!hasAnyContent && readOnly) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground italic py-2">
        <Sparkles className="h-4 w-4" />Extended brief not yet generated by AI.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Industry Segment Field */}
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Industry Segment</p>
          {industrySegmentFromIntake && industrySegmentId && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal text-muted-foreground">from Intake</Badge>
          )}
          {!industrySegmentId && !readOnly && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-normal">
              <AlertCircle className="h-2.5 w-2.5 mr-0.5" />Required
            </Badge>
          )}
        </div>

        {industrySegmentId && (industrySegmentFromIntake || readOnly) && (
          <Badge variant="secondary" className="text-xs">{resolvedSegmentName ?? "Loading…"}</Badge>
        )}

        {industrySegmentId && !industrySegmentFromIntake && !readOnly && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">{resolvedSegmentName ?? "Loading…"}</Badge>
            <Select value={industrySegmentId} onValueChange={(val) => onIndustrySegmentChange?.(val)}>
              <SelectTrigger className="w-auto max-w-[220px] h-7 text-xs border-dashed"><span className="text-muted-foreground">Change</span></SelectTrigger>
              <SelectContent>{(industrySegments ?? []).map(seg => <SelectItem key={seg.id} value={seg.id}>{seg.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}

        {!industrySegmentId && !readOnly && (
          <Select onValueChange={(val) => onIndustrySegmentChange?.(val)}>
            <SelectTrigger className="w-full max-w-sm h-8 text-sm border-destructive/50"><SelectValue placeholder="Select industry segment…" /></SelectTrigger>
            <SelectContent>{(industrySegments ?? []).map(seg => <SelectItem key={seg.id} value={seg.id}>{seg.name}</SelectItem>)}</SelectContent>
          </Select>
        )}

        {!industrySegmentId && readOnly && (
          <p className="text-sm text-destructive italic">No industry segment specified — required before review.</p>
        )}
      </div>

      {EXTENDED_BRIEF_SUBSECTION_KEYS.map((subsectionKey) => {
        const meta = SUBSECTION_META[subsectionKey];
        const rawVal = getSubsectionValue(brief, subsectionKey);
        const aiReview = aiSectionReviews.find((r) => r.section_key === subsectionKey);
        const isEditing = editingKey === subsectionKey;
        const cancelEdit = () => setEditingKey(null);

        const filled = Array.isArray(rawVal)
          ? rawVal.length > 0
          : rawVal && typeof rawVal === "object" && Array.isArray((rawVal as any).items)
            ? (rawVal as any).items.length > 0
            : typeof rawVal === "string" && rawVal.trim().length > 0;

        let panelStatus: SectionStatus = "not_reviewed";
        if (aiReview) {
          if (aiReview.addressed) panelStatus = "pass";
          else if (aiReview.status === "pass") panelStatus = "pass";
          else if (aiReview.status === "warning") panelStatus = "warning";
          else if (aiReview.status === "needs_revision") panelStatus = "needs_revision";
        }

        const currentContent = (() => {
          if (Array.isArray(rawVal)) return JSON.stringify(rawVal);
          if (typeof rawVal === "string") return rawVal;
          if (rawVal != null) return JSON.stringify(rawVal);
          return null;
        })();

        const aiReviewContent = (
          <CurationAIReviewInline
            sectionKey={subsectionKey}
            review={aiReview}
            currentContent={currentContent}
            challengeId={challengeId}
            challengeContext={challengeContext}
            onAcceptRefinement={onAcceptRefinement}
            onSingleSectionReview={onSingleSectionReview}
            onMarkAddressed={onMarkAddressed}
            defaultOpen={!aiReview?.addressed && (aiReview?.status === "warning" || aiReview?.status === "needs_revision")}
          />
        );

        return (
          <CuratorSectionPanel
            key={subsectionKey}
            sectionKey={subsectionKey}
            label={meta.label}
            attribution={meta.attribution}
            filled={!!filled}
            status={panelStatus}
            isLocked={false}
            isReadOnly={readOnly}
            isApproved={false}
            onToggleApproval={() => {}}
            challengeId={challengeId}
            defaultExpanded={!!(aiReview && !aiReview.addressed && (aiReview.status === "warning" || aiReview.status === "needs_revision"))}
            aiReviewSlot={aiReviewContent}
            expandVersion={expandVersion}
          >
            <BriefSubsectionContent
              subsectionKey={subsectionKey}
              rawVal={rawVal}
              readOnly={readOnly}
              isEditing={isEditing}
              saving={saving}
              onSave={handleSubsectionSave}
              onEdit={setEditingKey}
              onCancelEdit={cancelEdit}
            />
          </CuratorSectionPanel>
        );
      })}
    </div>
  );
}
