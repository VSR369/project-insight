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
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Check, X, ChevronDown, ChevronUp, AlertTriangle, ShieldAlert, ThumbsUp, Sparkles, Square, CheckSquare, CheckCircle2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { AiContentRenderer } from "@/components/ui/AiContentRenderer";
import { ExpandableAIComment } from "@/components/curator/ExpandableAIComment";
import { SECTION_FORMAT_CONFIG } from "@/lib/cogniblend/curationSectionFormats";
import { cn } from "@/lib/utils";
import { detectAndParseLineItems } from "@/utils/detectAndParseLineItems";
import { TableLineItemRenderer } from "@/components/cogniblend/curation/renderers/TableLineItemRenderer";
import { DeliverableCardRenderer } from "@/components/cogniblend/curation/renderers/DeliverableCardRenderer";

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
import {
  EditableRichText,
  EditableLineItems,
  EditableTableRows,
  EditableScheduleRows,
  ComplexityParameterTable,
} from "./ai-review/SuggestionEditors";

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
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as {
          expertise_levels?: { id: string; name: string }[];
          proficiency_areas?: { id: string; name: string }[];
          sub_domains?: { id: string; name: string }[];
          specialities?: { id: string; name: string }[];
        };
      }
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

  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const toggleCommentExpand = useCallback((index: number) => {
    setExpandedComments(prev => { const next = new Set(prev); next.has(index) ? next.delete(index) : next.add(index); return next; });
  }, []);

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
        {parsedComments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Comments ({parsedComments.length})</p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center bg-muted text-muted-foreground text-xs rounded-full px-2 py-0.5">
                  {selectedComments.size}/{parsedComments.length} selected
                </span>
                <button type="button" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={toggleAllComments}>
                  {allCommentsSelected ? (<><Square className="h-3.5 w-3.5" />Clear all</>) : (<><CheckSquare className="h-3.5 w-3.5" />Select all</>)}
                </button>
              </div>
            </div>
            {parsedComments.map((comment, i) => {
              const commentType = comment.type || SEVERITY_TO_TYPE[comment.severity || 'warning'] || 'warning';
              const typeConfig = COMMENT_TYPE_CONFIG[commentType] || COMMENT_TYPE_CONFIG.warning;
              const TypeIcon = typeConfig.icon;
              const isSelected = selectedComments.has(i);
              const isExpanded = expandedComments.has(i);
              const isLong = comment.text.length > 160;
              return (
                <label key={i} className={cn(
                  "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors shadow-xs",
                  isSelected ? "bg-primary/5 border-primary/40" : "bg-card border-border hover:border-primary/30"
                )}>
                  <button type="button" className={cn(
                    "mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors",
                    isSelected ? "bg-primary border-primary" : "border-muted-foreground/30 bg-background"
                  )} onClick={(e) => { e.preventDefault(); toggleComment(i); }}>
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </button>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge className={cn("text-[11px] px-2 py-0.5 shrink-0", typeConfig.badgeClass)}>
                        <TypeIcon className="h-2.5 w-2.5 mr-0.5" />{typeConfig.label}
                      </Badge>
                      {comment.field && (
                        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{comment.field}</span>
                      )}
                    </div>
                    <span className={cn("text-sm text-foreground leading-relaxed block", !isExpanded && isLong && "line-clamp-2")}>{comment.text}</span>
                    {comment.reasoning && <p className="text-xs text-muted-foreground italic mt-1">{comment.reasoning}</p>}
                    {isLong && (
                      <button type="button" className="inline-flex items-center gap-0.5 text-xs text-primary hover:text-primary/80 font-medium" onClick={(e) => { e.preventDefault(); toggleCommentExpand(i); }}>
                        {isExpanded ? (<>Read less <ChevronUp className="h-3 w-3" /></>) : (<>Read more <ChevronDown className="h-3 w-3" /></>)}
                      </button>
                    )}
                    {comment.applies_to && (
                      <blockquote className="border-l-2 border-primary/40 pl-2.5 text-[11px] text-muted-foreground italic">{comment.applies_to}</blockquote>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}

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
        <div className="space-y-3 border-l-4 border-l-indigo-400 rounded-r-lg">
          <div className="flex items-center gap-2 px-4 pt-3">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-foreground">AI Suggested {isMasterData ? "Selection" : "Version"}</span>
            <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 text-[11px] px-2 py-0.5">Editable</Badge>
          </div>

          {isMasterData && resolvedCodes && resolvedCodes.length > 0 ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-muted-foreground">{selectedItems.size}/{resolvedCodes.length} selected</span>
                <div className="flex gap-1.5">
                  <button type="button" className="text-[11px] underline text-muted-foreground hover:text-foreground" onClick={onSelectAllItems}>Select all</button>
                  <button type="button" className="text-[11px] underline text-muted-foreground hover:text-foreground" onClick={onClearItems}>Clear</button>
                </div>
              </div>
              {resolvedCodes.map((item, i) => (
                <label key={item.code} className={cn(
                  "flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer transition-colors",
                  selectedItems.has(i) ? "bg-indigo-100/50 border-indigo-300" : "bg-card border-border opacity-60",
                  !item.isValid && "border-destructive/40 bg-destructive/5"
                )}>
                  <Checkbox checked={selectedItems.has(i)} onCheckedChange={() => onToggleItem(i)} className="mt-0.5 h-3.5 w-3.5" />
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground font-mono">{item.code}</Badge>
                      {!item.isValid && <Badge variant="destructive" className="text-[10px] px-1 py-0">Invalid</Badge>}
                    </div>
                    {item.description && <p className="text-[11px] text-muted-foreground leading-relaxed">{item.description}</p>}
                  </div>
                </label>
              ))}
            </div>
          ) : rewardData ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 mx-4 mb-3 p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-300 text-xs px-2 py-0.5">
                  {rewardData.type === 'both' ? 'Monetary + Non-Monetary' : rewardData.type === 'non_monetary' ? 'Non-Monetary' : 'Monetary'}
                </Badge>
              </div>
              {rewardData.monetary?.tiers && Object.keys(rewardData.monetary.tiers).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prize Tiers</p>
                  {Object.entries(rewardData.monetary.tiers).map(([tier, amount]) => (
                    <div key={tier} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                      <span className="text-sm font-medium text-foreground capitalize">{tier}</span>
                      <span className="text-sm font-semibold text-foreground tabular-nums">{rewardData.monetary?.currency ?? 'USD'} {Number(amount).toLocaleString()}</span>
                    </div>
                  ))}
                  {rewardData.monetary.justification && <p className="text-xs text-muted-foreground italic">{rewardData.monetary.justification}</p>}
                </div>
              )}
              {rewardData.nonMonetary?.items && rewardData.nonMonetary.items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Non-Monetary Rewards</p>
                  <ul className="space-y-1.5">
                    {rewardData.nonMonetary.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : solverExpertiseData ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 mx-4 mb-3 p-4 shadow-sm space-y-3">
              {(['expertise_levels', 'proficiency_areas', 'sub_domains', 'specialities'] as const).map(field => (
                <div key={field}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    {field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {solverExpertiseData[field] && solverExpertiseData[field]!.length > 0
                      ? solverExpertiseData[field]!.map((el) => <Badge key={el.id} variant="outline" className="text-xs">{el.name}</Badge>)
                      : <Badge variant="secondary" className="text-xs">All {field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          ) : hasDeliverableCards ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 mx-4 mb-3 p-4 shadow-sm max-h-[500px] overflow-y-auto">
              <DeliverableCardRenderer items={deliverableItems!} badgePrefix={badgePrefix} hideAcceptanceCriteria={badgePrefix === "O" || badgePrefix === "S"} />
            </div>
          ) : scheduleRows ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm overflow-y-auto">
              <EditableScheduleRows rows={editedScheduleRows ?? scheduleRows.map(r => ({ ...r }))} onChange={handleScheduleRowsChange} />
            </div>
          ) : isStructured && structuredItems && structuredItems.length > 0 ? (
            (() => {
              const detection = detectAndParseLineItems(editedLineItems ?? [...structuredItems]);
              if (detection.type === 'table') {
                return (
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm max-h-96 overflow-y-auto">
                    <TableLineItemRenderer rows={detection.rows} schema={detection.schema} onChange={(updatedRows) => {
                      const serialized = updatedRows.map((r) => JSON.stringify(r));
                      handleLineItemsChange(serialized);
                    }} />
                  </div>
                );
              }
              return (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm max-h-72 overflow-y-auto space-y-1">
                  <EditableLineItems items={editedLineItems ?? [...structuredItems]} onChange={handleLineItemsChange} />
                </div>
              );
            })()
          ) : tableRows ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm max-h-72 overflow-y-auto">
              <EditableTableRows sectionKey={sectionKey} rows={editedTableRows ?? tableRows.map(r => ({ ...r }))} onChange={handleTableRowsChange} />
            </div>
          ) : parsedDate ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <CalendarIcon className="h-5 w-5 text-indigo-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Suggested Deadline</p>
                  <p className="text-lg font-semibold text-foreground">{format(new Date(editedDate ?? parsedDate), "MMMM d, yyyy")}</p>
                </div>
                <Input type="date" value={editedDate ?? parsedDate} onChange={(e) => handleDateChange(e.target.value)} className="w-[180px] h-9 text-sm" />
              </div>
            </div>
          ) : suggestedFormat === "table_fallback" && result.suggested_version ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/40 mx-4 mb-3 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                  AI returned unstructured text instead of table data. Click "Re-review" to regenerate in the correct format.
                </p>
              </div>
              <div className="text-xs text-muted-foreground max-h-32 overflow-y-auto rounded border border-border/50 bg-background/50 p-2">
                <AiContentRenderer content={result.suggested_version} compact />
              </div>
            </div>
          ) : result.suggested_version ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm text-sm leading-relaxed min-h-[160px]">
              <EditableRichText value={editedRichText ?? result.suggested_version} onChange={handleRichTextChange} />
            </div>
          ) : null}
        </div>
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
              ? `Accept ${selectedItems.size} selection${selectedItems.size !== 1 ? "s" : ""}`
              : isStructured && structuredItems
                ? `Accept ${selectedItems.size} item${selectedItems.size !== 1 ? "s" : ""}`
                : "Accept suggestion"}
          </Button>
        </div>
      )}
    </div>
  );
}
