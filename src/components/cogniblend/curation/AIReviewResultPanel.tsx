/**
 * AIReviewResultPanel — Format-native display of AI review results.
 *
 * Renders:
 *  - Summary badge + status
 *  - Comments with severity badges (STRENGTH / WARNING / REQUIRED) and blockquote applies_to
 *  - AI Suggested Version — always editable inline (no toggle needed)
 *  - Accept / Reject actions
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Check, X, ChevronDown, ChevronUp, AlertTriangle, ShieldAlert, ThumbsUp, Plus, Trash2, Sparkles, Square, CheckSquare } from "lucide-react";
import { AiContentRenderer } from "@/components/ui/AiContentRenderer";
import { ExpandableAIComment } from "@/components/curator/ExpandableAIComment";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { LineItemsSectionRenderer } from "@/components/cogniblend/curation/renderers/LineItemsSectionRenderer";
import { TableSectionRenderer } from "@/components/cogniblend/curation/renderers/TableSectionRenderer";
import { ScheduleTableSectionRenderer } from "@/components/cogniblend/curation/renderers/ScheduleTableSectionRenderer";
import { SECTION_FORMAT_CONFIG } from "@/lib/cogniblend/curationSectionFormats";
import { convertAITextToHTML } from "@/utils/convertAITextToHTML";
import { cn } from "@/lib/utils";

/* ── Types ──────────────────────────────────────────────── */

export interface ReviewComment {
  text: string;
  severity?: "strength" | "warning" | "required";
  applies_to?: string;
}

export interface AIReviewResult {
  status: "pass" | "warning" | "needs_revision";
  comments: string[];
  summary?: string;
  suggested_version?: string;
}

interface MasterDataOption {
  value: string;
  label: string;
  description?: string;
}

interface AIReviewResultPanelProps {
  sectionKey: string;
  result: AIReviewResult;
  /** Whether AI refinement is currently in progress */
  isRefining?: boolean;
  /** Parsed structured items from AI suggestion (for line_items / table sections) */
  structuredItems: string[] | null;
  /** Selected items for structured accept */
  selectedItems: Set<number>;
  onToggleItem: (index: number) => void;
  onSelectAllItems: () => void;
  onClearItems: () => void;
  onAccept: () => void;
  onDiscard: () => void;
  /** Whether the section uses structured rendering (deliverables, eval_criteria) */
  isStructured: boolean;
  /** Whether this is a master-data selection section */
  isMasterData?: boolean;
  /** AI-suggested code values for master-data sections */
  suggestedCodes?: string[] | null;
  /** Master data options for resolving labels */
  masterDataOptions?: MasterDataOption[];
  /** Callback when suggested version content is edited by user */
  onSuggestedVersionChange?: (editedContent: any) => void;
}

/* ── Severity helpers ──────────────────────────────────── */

const SEVERITY_CONFIG = {
  strength: {
    label: "Strength",
    icon: ThumbsUp,
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
  },
  required: {
    label: "Required",
    icon: ShieldAlert,
    badgeClass: "bg-red-100 text-red-800 border-red-300",
  },
};

const STATUS_BADGE = {
  pass: { label: "Pass", icon: ThumbsUp, className: "bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full px-3 py-1 text-xs font-medium" },
  warning: { label: "Warning", icon: AlertTriangle, className: "bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-3 py-1 text-xs font-medium" },
  needs_revision: { label: "Needs Revision", icon: ShieldAlert, className: "bg-red-100 text-red-700 border border-red-300 rounded-full px-3 py-1 text-xs font-medium" },
};

function inferSeverity(comment: string): ReviewComment["severity"] {
  const lower = comment.toLowerCase();
  if (
    lower.startsWith("strength:") ||
    lower.includes("well defined") ||
    lower.includes("well structured") ||
    lower.includes("clear and") ||
    lower.includes("good ")
  ) {
    return "strength";
  }
  if (
    lower.startsWith("required:") ||
    lower.startsWith("must ") ||
    lower.includes("missing") ||
    lower.includes("add ") ||
    lower.includes("include ")
  ) {
    return "required";
  }
  return "warning";
}

function parseComment(raw: string): ReviewComment {
  let text = raw;
  let applies_to: string | undefined;
  const appliesMatch = raw.match(/\[applies[_ ]to:\s*(.+?)\]\s*$/i);
  if (appliesMatch) {
    applies_to = appliesMatch[1];
    text = raw.slice(0, appliesMatch.index).trim();
  }
  const severity = inferSeverity(text);
  return { text, severity, applies_to };
}

function parseTableRows(content: string): Record<string, unknown>[] | null {
  const cleaned = content.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
      return parsed;
    }
    if (parsed?.criteria && Array.isArray(parsed.criteria)) return parsed.criteria;
    if (parsed?.rows && Array.isArray(parsed.rows)) return parsed.rows;
    if (parsed?.items && Array.isArray(parsed.items)) return parsed.items;
  } catch {
    // not JSON
  }
  return null;
}

/** Determine if a section is a schedule_table format */
function isScheduleFormat(sectionKey: string): boolean {
  return SECTION_FORMAT_CONFIG[sectionKey]?.format === 'schedule_table';
}

/* ── Inline edit sub-components ────────────────────────── */

/** Editable rich text using Tiptap RichTextEditor */
function EditableRichText({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const htmlValue = useMemo(() => convertAITextToHTML(value), [value]);

  return (
    <RichTextEditor
      value={htmlValue}
      onChange={onChange}
      placeholder="Edit the AI suggestion..."
      className="min-h-[120px]"
    />
  );
}

/** Editable line items */
function EditableLineItems({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const handleItemChange = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };
  const handleAdd = () => onChange([...items, ""]);
  const handleRemove = (index: number) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <span className="text-xs text-muted-foreground w-5 text-right shrink-0 pt-2">{i + 1}.</span>
          <Textarea
            value={item}
            onChange={(e) => handleItemChange(i, e.target.value)}
            className="text-sm min-h-[2rem] flex-1 resize-none whitespace-pre-wrap py-1.5"
            placeholder="Item text..."
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = target.scrollHeight + "px";
            }}
          />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive mt-0.5" onClick={() => handleRemove(i)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleAdd}>
        <Plus className="h-3 w-3 mr-1" />Add Item
      </Button>
    </div>
  );
}

/** Editable table rows (eval criteria) */
function EditableTableRows({
  rows,
  onChange,
}: {
  rows: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void;
}) {
  const handleChange = (index: number, field: string, value: string) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: field === "weight" ? Number(value) || 0 : value };
    onChange(updated);
  };
  const handleAdd = () => onChange([...rows, { name: "", weight: 0, description: "" }]);
  const handleRemove = (index: number) => onChange(rows.filter((_, i) => i !== index));

  return (
    <div className="space-y-1.5">
      {rows.map((row, i) => (
        <div key={i} className="flex items-start gap-1.5 rounded border border-border/50 p-2 bg-background/50">
          <div className="flex-1 space-y-1">
            <Input
              value={String(row.name ?? row.criterion_name ?? "")}
              onChange={(e) => handleChange(i, "name", e.target.value)}
              className="text-sm h-7"
              placeholder="Criterion name..."
            />
            <div className="flex gap-1.5">
              <Input
                type="number"
                value={String(row.weight ?? row.weight_percentage ?? 0)}
                onChange={(e) => handleChange(i, "weight", e.target.value)}
                className="text-sm h-7 w-20"
                placeholder="Weight %"
              />
              <Input
                value={String(row.description ?? "")}
                onChange={(e) => handleChange(i, "description", e.target.value)}
                className="text-sm h-7 flex-1"
                placeholder="Description..."
              />
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive mt-0.5" onClick={() => handleRemove(i)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleAdd}>
        <Plus className="h-3 w-3 mr-1" />Add Row
      </Button>
    </div>
  );
}

/** Editable schedule rows */
function EditableScheduleRows({
  rows,
  onChange,
}: {
  rows: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void;
}) {
  const handleChange = (index: number, field: string, value: string) => {
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      [field]: field === "duration_days" ? (value ? parseInt(value, 10) || null : null) : (value || null),
    };
    onChange(updated);
  };
  const handleAdd = () => onChange([...rows, { phase_name: "", duration_days: null, start_date: null, end_date: null }]);
  const handleRemove = (index: number) => onChange(rows.filter((_, i) => i !== index));

  return (
    <div className="space-y-1.5">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-1.5 rounded border border-border/50 p-2 bg-background/50">
          <Input
            value={String(row.phase_name ?? row.label ?? row.name ?? "")}
            onChange={(e) => handleChange(i, "phase_name", e.target.value)}
            className="text-sm h-7 flex-1"
            placeholder="Phase name..."
          />
          <Input
            type="number"
            value={String(row.duration_days ?? "")}
            onChange={(e) => handleChange(i, "duration_days", e.target.value)}
            className="text-sm h-7 w-20"
            placeholder="Days"
          />
          <Input
            type="date"
            value={String(row.start_date ?? "")}
            onChange={(e) => handleChange(i, "start_date", e.target.value)}
            className="text-sm h-7 w-32"
          />
          <Input
            type="date"
            value={String(row.end_date ?? "")}
            onChange={(e) => handleChange(i, "end_date", e.target.value)}
            className="text-sm h-7 w-32"
          />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => handleRemove(i)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleAdd}>
        <Plus className="h-3 w-3 mr-1" />Add Phase
      </Button>
    </div>
  );
}

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
}: AIReviewResultPanelProps) {

  // Local edit state for each format type — always active (no toggle needed)
  const [editedRichText, setEditedRichText] = useState<string | null>(null);
  const [editedLineItems, setEditedLineItems] = useState<string[] | null>(null);
  const [editedTableRows, setEditedTableRows] = useState<Record<string, unknown>[] | null>(null);
  const [editedScheduleRows, setEditedScheduleRows] = useState<Record<string, unknown>[] | null>(null);

  const statusBadge = STATUS_BADGE[result.status];
  const parsedComments = useMemo(() => result.comments.map(parseComment), [result.comments]);

  // For table sections (eval_criteria, reward_structure), try parsing as row objects
  const tableRows = useMemo(() => {
    if ((sectionKey === "evaluation_criteria" || sectionKey === "reward_structure") && result.suggested_version) {
      return parseTableRows(result.suggested_version);
    }
    return null;
  }, [sectionKey, result.suggested_version]);

  // For schedule_table sections, try parsing as schedule rows
  const scheduleRows = useMemo(() => {
    if (isScheduleFormat(sectionKey) && result.suggested_version) {
      return parseTableRows(result.suggested_version);
    }
    return null;
  }, [sectionKey, result.suggested_version]);

  // Resolve master data code labels
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

  const hasSuggestedVersion = !!(
    result.suggested_version ||
    (isStructured && structuredItems && structuredItems.length > 0) ||
    (isMasterData && resolvedCodes && resolvedCodes.length > 0) ||
    tableRows ||
    scheduleRows
  );

  // Determine which format this suggestion is in
  const suggestedFormat = useMemo(() => {
    if (isMasterData) return "master_data";
    if (isStructured && structuredItems && structuredItems.length > 0) {
      const fmt = SECTION_FORMAT_CONFIG[sectionKey]?.format;
      if (fmt === "line_items") return "line_items";
    }
    if (scheduleRows) return "schedule_table";
    if (tableRows) return "table";
    if (result.suggested_version) return "rich_text";
    return null;
  }, [isMasterData, isStructured, structuredItems, scheduleRows, tableRows, result.suggested_version, sectionKey]);

  // Auto-seed edit state when data arrives or changes
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

  // Change handlers that emit to parent
  const handleRichTextChange = useCallback((val: string) => {
    setEditedRichText(val);
    onSuggestedVersionChange?.(val);
  }, [onSuggestedVersionChange]);

  const handleLineItemsChange = useCallback((items: string[]) => {
    setEditedLineItems(items);
    onSuggestedVersionChange?.(items.filter(i => i.trim()));
  }, [onSuggestedVersionChange]);

  const handleTableRowsChange = useCallback((rows: Record<string, unknown>[]) => {
    setEditedTableRows(rows);
    onSuggestedVersionChange?.(rows);
  }, [onSuggestedVersionChange]);

  const handleScheduleRowsChange = useCallback((rows: Record<string, unknown>[]) => {
    setEditedScheduleRows(rows);
    onSuggestedVersionChange?.(rows);
  }, [onSuggestedVersionChange]);

  // Track which comments are expanded for "Read more"
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const toggleCommentExpand = useCallback((index: number) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }, []);

  // Comment selection state
  const [selectedComments, setSelectedComments] = useState<Set<number>>(() =>
    new Set(parsedComments.map((_, i) => i))
  );
  const toggleComment = useCallback((index: number) => {
    setSelectedComments(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }, []);
  const allCommentsSelected = selectedComments.size === parsedComments.length;
  const toggleAllComments = useCallback(() => {
    if (allCommentsSelected) {
      setSelectedComments(new Set());
    } else {
      setSelectedComments(new Set(parsedComments.map((_, i) => i)));
    }
  }, [allCommentsSelected, parsedComments]);

  const StatusIcon = statusBadge.icon;

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      {/* ── AI Review block — always visible ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            AI Review
          </span>
          <span className={cn("inline-flex items-center gap-1", statusBadge.className)}>
            <StatusIcon className="h-3 w-3" />
            {statusBadge.label}
          </span>
        </div>

        {/* ── Summary ── */}
        {result.summary && (
          <ExpandableAIComment content={result.summary} />
        )}

        {/* ── Comments as styled checklist ── */}
        {parsedComments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Comments ({parsedComments.length})
              </p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center bg-muted text-muted-foreground text-xs rounded-full px-2 py-0.5">
                  {selectedComments.size}/{parsedComments.length} selected
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={toggleAllComments}
                >
                  {allCommentsSelected ? (
                    <>
                      <Square className="h-3.5 w-3.5" />
                      Clear all
                    </>
                  ) : (
                    <>
                      <CheckSquare className="h-3.5 w-3.5" />
                      Select all
                    </>
                  )}
                </button>
              </div>
            </div>
            {parsedComments.map((comment, i) => {
              const sev = comment.severity ? SEVERITY_CONFIG[comment.severity] : SEVERITY_CONFIG.warning;
              const SevIcon = sev.icon;
              const isSelected = selectedComments.has(i);
              const isExpanded = expandedComments.has(i);
              const isLong = comment.text.length > 160;
              return (
                <label
                  key={i}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                    isSelected
                      ? "bg-primary/5 border-primary/40"
                      : "bg-card border-border hover:border-primary/30"
                  )}
                >
                  {/* Custom checkbox */}
                  <button
                    type="button"
                    className={cn(
                      "mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors",
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30 bg-background"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleComment(i);
                    }}
                  >
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </button>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge
                        className={cn("text-[9px] px-1.5 py-0 shrink-0", sev.badgeClass)}
                      >
                        <SevIcon className="h-2.5 w-2.5 mr-0.5" />
                        {sev.label}
                      </Badge>
                    </div>
                    <span className={cn(
                      "text-sm text-foreground leading-relaxed block",
                      !isExpanded && isLong && "line-clamp-2"
                    )}>
                      {comment.text}
                    </span>
                    {isLong && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-0.5 text-xs text-primary hover:text-primary/80 font-medium"
                        onClick={(e) => {
                          e.preventDefault();
                          toggleCommentExpand(i);
                        }}
                      >
                        {isExpanded ? (
                          <>Read less <ChevronUp className="h-3 w-3" /></>
                        ) : (
                          <>Read more <ChevronDown className="h-3 w-3" /></>
                        )}
                      </button>
                    )}
                    {comment.applies_to && (
                      <blockquote className="border-l-2 border-primary/40 pl-2.5 text-[11px] text-muted-foreground italic">
                        {comment.applies_to}
                      </blockquote>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* ── AI Suggested Version — always visible, no collapse ── */}
      {hasSuggestedVersion && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
            ✨ AI Suggested {isMasterData ? "Selection" : "Version"}
          </p>

          {/* ── Master-data codes as selectable chips ── */}
          {isMasterData && resolvedCodes && resolvedCodes.length > 0 ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">
                  {selectedItems.size}/{resolvedCodes.length} selected
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="text-[10px] underline text-muted-foreground hover:text-foreground"
                    onClick={onSelectAllItems}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="text-[10px] underline text-muted-foreground hover:text-foreground"
                    onClick={onClearItems}
                  >
                    Clear
                  </button>
                </div>
              </div>
              {resolvedCodes.map((item, i) => (
                <label
                  key={item.code}
                  className={cn(
                    "flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer transition-colors",
                    selectedItems.has(i)
                      ? "bg-primary/10 border-primary/40"
                      : "bg-background/50 border-border opacity-60",
                    !item.isValid && "border-destructive/40 bg-destructive/5"
                  )}
                >
                  <Checkbox
                    checked={selectedItems.has(i)}
                    onCheckedChange={() => onToggleItem(i)}
                    className="mt-0.5 h-3.5 w-3.5"
                  />
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground font-mono">
                        {item.code}
                      </Badge>
                      {!item.isValid && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0">Invalid</Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{item.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          ) : isStructured && structuredItems && structuredItems.length > 0 ? (
            /* Structured line items — always editable */
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 max-h-72 overflow-y-auto space-y-1">
              <EditableLineItems items={editedLineItems ?? [...structuredItems]} onChange={handleLineItemsChange} />
            </div>
          ) : scheduleRows ? (
            /* Schedule-format — always editable */
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 max-h-72 overflow-y-auto">
              <EditableScheduleRows rows={editedScheduleRows ?? scheduleRows.map(r => ({ ...r }))} onChange={handleScheduleRowsChange} />
            </div>
          ) : tableRows ? (
            /* Table-format — always editable */
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 max-h-72 overflow-y-auto">
              <EditableTableRows rows={editedTableRows ?? tableRows.map(r => ({ ...r }))} onChange={handleTableRowsChange} />
            </div>
          ) : result.suggested_version ? (
            /* Rich text — Tiptap editor */
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed">
              <EditableRichText
                value={editedRichText ?? result.suggested_version}
                onChange={handleRichTextChange}
              />
            </div>
          ) : null}
        </div>
      )}

      {/* ── Skeleton loader while refining ── */}
      {isRefining && !hasSuggestedVersion && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
            ✨ AI Suggested Version
          </p>
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Generating AI suggestion…</span>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-muted animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-muted animate-pulse" />
              <div className="h-3 w-3/5 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* ── Accept suggestion / Edit & Accept / Keep original actions ── */}
      {(hasSuggestedVersion || isRefining) && (
        <div className="flex gap-2 justify-end pt-1 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-gray-300 text-foreground hover:bg-muted rounded-lg"
            onClick={onDiscard}
            disabled={isRefining}
          >
            Keep original
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onAccept}
            disabled={isRefining}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            {isMasterData && resolvedCodes
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
