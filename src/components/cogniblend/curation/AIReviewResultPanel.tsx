/**
 * AIReviewResultPanel — Format-native display of AI review results.
 *
 * Renders:
 *  - Summary badge + status
 *  - Comments with severity badges and blockquote applies_to
 *  - AI Suggested Version — always editable inline
 *  - Accept / Reject actions
 *
 * Sub-components extracted to ai-review/ directory:
 *  - ReviewConfigs.ts (types, constants, parse helpers)
 *  - SuggestionEditors.tsx (editable sub-components)
 *  - ReviewCommentList.tsx (comment checklist)
 *  - SuggestionVersionDisplay.tsx (format-aware suggestion rendering)
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";
import { ExpandableAIComment } from "@/components/curator/ExpandableAIComment";
import { SECTION_FORMAT_CONFIG } from "@/lib/cogniblend/curationSectionFormats";
import { cn } from "@/lib/utils";

// Extracted modules
import type { AIReviewResultPanelProps } from "./ai-review/ReviewConfigs";
import {
  COMMENT_TYPE_CONFIG,
  SEVERITY_TO_TYPE,
  STATUS_BADGE,
  parseComment,
  parseTableRows,
  isScheduleFormat,
  parseDateFromSuggestion,
} from "./ai-review/ReviewConfigs";
import { ComplexityParameterTable } from "./ai-review/SuggestionEditors";
import { ReviewCommentList } from "./ai-review/ReviewCommentList";
import { SuggestionVersionDisplay } from "./ai-review/SuggestionVersionDisplay";

// Re-export types for backward compatibility
export type { ReviewComment, CrossSectionIssue, AIReviewResult, AIReviewResultPanelProps } from "./ai-review/ReviewConfigs";

/* ── Component ─────────────────────────────────────────── */

export function AIReviewResultPanel({
  sectionKey,
  result,
  isRefining = false,
  structuredItems,
  selectedItems,
  onToggleItem,
  onSelectAllItems,
  onClearItems,
  onAccept,
  onDiscard,
  isStructured,
  isMasterData = false,
  suggestedCodes,
  masterDataOptions,
  onSuggestedVersionChange,
  deliverableItems,
  onDeliverableItemsChange,
  badgePrefix = "D",
  confidence,
  onConfirmPass,
  onFlagForReview,
  complexityRatings,
}: AIReviewResultPanelProps) {

  // Local edit state for each format type
  const [editedRichText, setEditedRichText] = useState<string | null>(null);
  const [editedLineItems, setEditedLineItems] = useState<string[] | null>(null);
  const [editedTableRows, setEditedTableRows] = useState<Record<string, unknown>[] | null>(null);
  const [editedScheduleRows, setEditedScheduleRows] = useState<Record<string, unknown>[] | null>(null);
  const [editedDate, setEditedDate] = useState<string | null>(null);

  const parsedDate = useMemo(() => parseDateFromSuggestion(sectionKey, result.suggested_version), [sectionKey, result.suggested_version]);

  const statusBadge = STATUS_BADGE[result.status] ?? STATUS_BADGE.warning;
  const parsedComments = useMemo(() => result.comments.map(parseComment), [result.comments]);

  // For reward_structure, parse structured object
  const rewardData = useMemo(() => {
    if (sectionKey !== "reward_structure" || !result.suggested_version) return null;
    const cleaned = result.suggested_version.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && (parsed.type || parsed.monetary || parsed.nonMonetary)) {
        return parsed as { type?: string; monetary?: { tiers?: Record<string, number>; currency?: string; justification?: string }; nonMonetary?: { items?: string[] } };
      }
    } catch {}
    return null;
  }, [sectionKey, result.suggested_version]);

  // For solver_expertise, parse structured tree data
  const solverExpertiseData = useMemo(() => {
    if (sectionKey !== "solver_expertise" || !result.suggested_version) return null;
    const cleaned = result.suggested_version.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {}
    return null;
  }, [sectionKey, result.suggested_version]);

  const tableRows = useMemo(() => {
    const fmt = SECTION_FORMAT_CONFIG[sectionKey]?.format;
    if (fmt === 'table' && result.suggested_version) return parseTableRows(result.suggested_version);
    return null;
  }, [sectionKey, result.suggested_version]);

  const scheduleRows = useMemo(() => {
    if (isScheduleFormat(sectionKey) && result.suggested_version) return parseTableRows(result.suggested_version);
    return null;
  }, [sectionKey, result.suggested_version]);

  const resolvedCodes = useMemo(() => {
    if (!isMasterData || !suggestedCodes) return null;
    const optMap = new Map((masterDataOptions ?? []).map(o => [o.value, o]));
    return suggestedCodes.map(code => ({
      code,
      label: optMap.get(code)?.label ?? code.replace(/_/g, " "),
      description: optMap.get(code)?.description,
      isValid: optMap.size === 0 || optMap.has(code),
    }));
  }, [isMasterData, suggestedCodes, masterDataOptions]);

  const hasDeliverableCards = deliverableItems && deliverableItems.length > 0;

  const hasSuggestedVersion = !!(
    result.suggested_version || hasDeliverableCards ||
    (isStructured && structuredItems && structuredItems.length > 0) ||
    (isMasterData && resolvedCodes && resolvedCodes.length > 0) ||
    tableRows || scheduleRows || rewardData || solverExpertiseData || parsedDate
  );

  const suggestedFormat = useMemo(() => {
    if (isMasterData) return "master_data";
    if (rewardData) return "reward_custom";
    if (solverExpertiseData) return "solver_expertise";
    if (scheduleRows) return "schedule_table";
    if (tableRows) return "table";
    const sectionFmt = SECTION_FORMAT_CONFIG[sectionKey]?.format;
    if ((sectionFmt === 'table' || sectionFmt === 'schedule_table') && result.suggested_version) return "table_fallback";
    if (isStructured && structuredItems && structuredItems.length > 0) {
      const fmt = SECTION_FORMAT_CONFIG[sectionKey]?.format;
      if (fmt === "line_items") return "line_items";
    }
    if (parsedDate) return "date";
    if (result.suggested_version) return "rich_text";
    return null;
  }, [isMasterData, rewardData, solverExpertiseData, isStructured, structuredItems, scheduleRows, tableRows, result.suggested_version, sectionKey]);

  // Auto-seed edit state
  useEffect(() => {
    if (suggestedFormat === "rich_text" && result.suggested_version) {
      setEditedRichText(result.suggested_version);
      onSuggestedVersionChange?.(result.suggested_version);
    }
  }, [suggestedFormat, result.suggested_version]);

  useEffect(() => {
    if (suggestedFormat === "line_items" && structuredItems && structuredItems.length > 0) {
      setEditedLineItems([...structuredItems]);
      onSuggestedVersionChange?.([...structuredItems]);
    }
  }, [suggestedFormat, structuredItems]);

  useEffect(() => {
    if (suggestedFormat === "table" && tableRows) {
      setEditedTableRows(tableRows.map(r => ({ ...r })));
      onSuggestedVersionChange?.(tableRows);
    }
  }, [suggestedFormat, tableRows]);

  useEffect(() => {
    if (suggestedFormat === "schedule_table" && scheduleRows) {
      setEditedScheduleRows(scheduleRows.map(r => ({ ...r })));
      onSuggestedVersionChange?.(scheduleRows);
    }
  }, [suggestedFormat, scheduleRows]);

  useEffect(() => {
    if (suggestedFormat === "reward_custom" && rewardData) onSuggestedVersionChange?.(rewardData);
  }, [suggestedFormat, rewardData]);

  useEffect(() => {
    if (suggestedFormat === "solver_expertise" && solverExpertiseData) onSuggestedVersionChange?.(JSON.stringify(solverExpertiseData));
  }, [suggestedFormat, solverExpertiseData]);

  useEffect(() => {
    if (suggestedFormat === "date" && parsedDate) {
      setEditedDate(parsedDate);
      onSuggestedVersionChange?.(parsedDate);
    }
  }, [suggestedFormat, parsedDate]);

  const handleRichTextChange = useCallback((val: string) => { setEditedRichText(val); onSuggestedVersionChange?.(val); }, [onSuggestedVersionChange]);
  const handleLineItemsChange = useCallback((items: string[]) => { setEditedLineItems(items); onSuggestedVersionChange?.(items.filter(i => i.trim())); }, [onSuggestedVersionChange]);
  const handleTableRowsChange = useCallback((rows: Record<string, unknown>[]) => { setEditedTableRows(rows); onSuggestedVersionChange?.(rows); }, [onSuggestedVersionChange]);
  const handleScheduleRowsChange = useCallback((rows: Record<string, unknown>[]) => { setEditedScheduleRows(rows); onSuggestedVersionChange?.(rows); }, [onSuggestedVersionChange]);
  const handleDateChange = useCallback((val: string) => { setEditedDate(val); onSuggestedVersionChange?.(val); }, [onSuggestedVersionChange]);

  const [selectedComments, setSelectedComments] = useState<Set<number>>(() => new Set(parsedComments.map((_, i) => i)));
  const toggleComment = useCallback((index: number) => {
    setSelectedComments(prev => { const next = new Set(prev); next.has(index) ? next.delete(index) : next.add(index); return next; });
  }, []);
  const allCommentsSelected = selectedComments.size === parsedComments.length;
  const toggleAllComments = useCallback(() => {
    if (allCommentsSelected) setSelectedComments(new Set());
    else setSelectedComments(new Set(parsedComments.map((_, i) => i)));
  }, [allCommentsSelected, parsedComments]);

  const StatusIcon = statusBadge.icon;

  // ── Pass confirmation shortcut ──
  if (result.status === "pass" && onConfirmPass && onFlagForReview) {
    return (
      <div className="rounded-lg border-l-4 border-l-emerald-400 border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800/40 p-5">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800">Section Verified</span>
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[11px] px-2 py-0.5">
            <StatusIcon className="h-3 w-3 mr-1" />{statusBadge.label}
          </Badge>
          {typeof confidence === "number" && (
            <span className="text-[11px] text-emerald-600 ml-1 font-medium">{Math.round(confidence * 100)}% confidence</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-3">AI found no issues with this section.</p>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onConfirmPass}>
            <Check className="h-4 w-4 mr-1.5" />Looks good, confirm
          </Button>
          <Button variant="outline" size="sm" className="h-10 border-amber-400 text-amber-700 hover:bg-amber-50" onClick={onFlagForReview}>
            <AlertTriangle className="h-4 w-4 mr-1.5" />Flag for review
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      {/* ── AI Review block ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Review</span>
          <span className={cn("inline-flex items-center gap-1", statusBadge.className)}>
            <StatusIcon className="h-3 w-3" />{statusBadge.label}
          </span>
          {typeof confidence === "number" && (
            <span className="text-[11px] text-muted-foreground ml-1 font-medium">{Math.round(confidence * 100)}% confidence</span>
          )}
        </div>

        {result.summary && <ExpandableAIComment content={result.summary} />}

        {/* ── Comments as styled checklist ── */}
        <ReviewCommentList
          parsedComments={parsedComments}
          selectedComments={selectedComments}
          onToggleComment={toggleComment}
          onToggleAll={toggleAllComments}
          allSelected={allCommentsSelected}
        />

        {/* ── Domain Guidelines ── */}
        {result.guidelines && result.guidelines.length > 0 && (
          <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800/40">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1.5">Domain Guidelines</p>
            {result.guidelines.map((g: string, gi: number) => (
              <p key={gi} className="text-sm text-indigo-600 dark:text-indigo-400 mt-1 leading-relaxed">• {g}</p>
            ))}
          </div>
        )}

        {/* ── Cross-Section Issues ── */}
        {result.cross_section_issues && result.cross_section_issues.length > 0 && (
          <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800/40">
            <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-1.5">Cross-Section Issues</p>
            {result.cross_section_issues.map((issue, ci) => (
              <div key={ci} className="text-sm text-orange-600 dark:text-orange-400 mt-1 leading-relaxed">
                <span className="font-medium">↔ {issue.related_section.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: </span>
                {issue.issue}
                {issue.suggested_resolution && (
                  <span className="text-orange-500 dark:text-orange-300 ml-1">→ {issue.suggested_resolution}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Complexity Parameter Table ── */}
      {complexityRatings && Object.keys(complexityRatings).length > 0 && (
        <ComplexityParameterTable ratings={complexityRatings} />
      )}

      {/* ── AI Suggested Version ── */}
      {hasSuggestedVersion && !complexityRatings && (
        <SuggestionVersionDisplay
          suggestedFormat={suggestedFormat}
          suggestedVersion={result.suggested_version}
          isMasterData={isMasterData}
          isStructured={isStructured ?? false}
          resolvedCodes={resolvedCodes}
          selectedItems={selectedItems ?? new Set()}
          onToggleItem={onToggleItem ?? (() => {})}
          onSelectAllItems={onSelectAllItems ?? (() => {})}
          onClearItems={onClearItems ?? (() => {})}
          rewardData={rewardData}
          solverExpertiseData={solverExpertiseData}
          hasDeliverableCards={!!hasDeliverableCards}
          deliverableItems={deliverableItems}
          badgePrefix={badgePrefix}
          scheduleRows={scheduleRows}
          editedScheduleRows={editedScheduleRows}
          onScheduleRowsChange={handleScheduleRowsChange}
          structuredItems={structuredItems ?? null}
          editedLineItems={editedLineItems}
          onLineItemsChange={handleLineItemsChange}
          tableRows={tableRows}
          editedTableRows={editedTableRows}
          onTableRowsChange={handleTableRowsChange}
          sectionKey={sectionKey}
          parsedDate={parsedDate}
          editedDate={editedDate}
          onDateChange={handleDateChange}
          editedRichText={editedRichText}
          onRichTextChange={handleRichTextChange}
        />
      )}

      {/* ── Skeleton loader ── */}
      {isRefining && !hasSuggestedVersion && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-foreground">AI Suggested Version</span>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" /><span>Generating AI suggestion…</span>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-muted animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-muted animate-pulse" />
              <div className="h-3 w-3/5 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* ── Accept / Keep original actions ── */}
      {(hasSuggestedVersion || isRefining || (complexityRatings && Object.keys(complexityRatings).length > 0)) && (
        <div className="sticky bottom-0 bg-card flex gap-3 justify-end pt-3 pb-1 border-t border-border -mx-4 px-4">
          <Button variant="outline" size="sm" className="h-10 text-sm border-border text-foreground hover:bg-muted rounded-lg px-5" onClick={onDiscard} disabled={isRefining}>
            Keep original
          </Button>
          <Button size="sm" className="h-10 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5" onClick={onAccept} disabled={isRefining || suggestedFormat === "table_fallback"}>
            <Check className="h-4 w-4 mr-1.5" />
            {complexityRatings && Object.keys(complexityRatings).length > 0
              ? "Accept complexity ratings"
              : isMasterData && resolvedCodes
              ? `Accept ${(selectedItems?.size ?? 0)} selection${(selectedItems?.size ?? 0) !== 1 ? "s" : ""}`
              : isStructured && structuredItems
                ? `Accept ${(selectedItems?.size ?? 0)} item${(selectedItems?.size ?? 0) !== 1 ? "s" : ""}`
                : "Accept suggestion"}
          </Button>
        </div>
      )}
    </div>
  );
}
