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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, ChevronDown, ChevronUp, AlertTriangle, ShieldAlert, ThumbsUp, Plus, Trash2, Sparkles, Square, CheckSquare, CheckCircle2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { computeWeightedComplexityScore, deriveComplexityLevel, deriveComplexityLabel, LEVEL_COLORS } from "@/lib/cogniblend/complexityScoring";
import { AiContentRenderer } from "@/components/ui/AiContentRenderer";
import { ExpandableAIComment } from "@/components/curator/ExpandableAIComment";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { LineItemsSectionRenderer } from "@/components/cogniblend/curation/renderers/LineItemsSectionRenderer";
import { TableSectionRenderer } from "@/components/cogniblend/curation/renderers/TableSectionRenderer";
import { ScheduleTableSectionRenderer } from "@/components/cogniblend/curation/renderers/ScheduleTableSectionRenderer";
import { SECTION_FORMAT_CONFIG } from "@/lib/cogniblend/curationSectionFormats";
import { convertAITextToHTML } from "@/utils/convertAITextToHTML";
import { cn } from "@/lib/utils";
import { detectAndParseLineItems } from "@/utils/detectAndParseLineItems";
import { TableLineItemRenderer } from "@/components/cogniblend/curation/renderers/TableLineItemRenderer";
import { DeliverableCardRenderer } from "@/components/cogniblend/curation/renderers/DeliverableCardRenderer";
import { DeliverableCardEditor } from "@/components/cogniblend/curation/renderers/DeliverableCardEditor";
import type { DeliverableItem } from "@/utils/parseDeliverableItem";

/* ── Types ──────────────────────────────────────────────── */

export interface ReviewComment {
  text: string;
  severity?: "strength" | "warning" | "required";
  applies_to?: string;
}

export interface AIReviewResult {
  status: "pass" | "warning" | "needs_revision" | "inferred";
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
  /** Parsed deliverable objects for card rendering (deliverables/expected_outcomes) */
  deliverableItems?: DeliverableItem[];
  /** Callback when deliverable items are edited */
  onDeliverableItemsChange?: (items: DeliverableItem[]) => void;
  /** Badge prefix for deliverable cards ("D" or "O") */
  badgePrefix?: string;
  /** Confidence score from triage (0.0-1.0) */
  confidence?: number;
  /** Callback to confirm a pass section */
  onConfirmPass?: () => void;
  /** Callback to flag a pass section for deeper review */
  onFlagForReview?: () => void;
  /** Structured complexity ratings from AI — renders parameter table */
  complexityRatings?: Record<string, { rating: number; justification: string; evidence_sections?: string[] }>;
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
  inferred: { label: "AI Inferred", icon: Sparkles, className: "bg-violet-100 text-violet-700 border border-violet-300 rounded-full px-3 py-1 text-xs font-medium" },
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

/** Determine if a section is a date format */
function isDateFormat(sectionKey: string): boolean {
  return SECTION_FORMAT_CONFIG[sectionKey]?.format === 'date';
}

/** Extract ISO date string from AI suggested_version (strips markdown fences, quotes, whitespace) */
function parseDateFromSuggestion(sectionKey: string, suggestedVersion: string | undefined): string | null {
  if (!isDateFormat(sectionKey) || !suggestedVersion) return null;
  const cleaned = suggestedVersion.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim().replace(/^["']|["']$/g, "");
  // Match YYYY-MM-DD
  const match = cleaned.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
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
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = el.scrollHeight + "px";
              }
            }}
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

/** Editable schedule rows — structured table layout */
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
    <div className="space-y-2">
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10 text-xs">#</TableHead>
              <TableHead className="min-w-[180px] text-xs">Phase / Deliverable</TableHead>
              <TableHead className="w-[120px] text-xs text-center">Duration (days)</TableHead>
              <TableHead className="w-[140px] text-xs text-center">Start Date</TableHead>
              <TableHead className="w-[140px] text-xs text-center">End Date</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i} className={cn(
                "transition-colors hover:bg-accent/40",
                i % 2 !== 0 && "bg-muted/30"
              )}>
                <TableCell className="p-1.5 text-muted-foreground font-mono text-xs text-center">
                  {i + 1}
                </TableCell>
                <TableCell className="p-1.5">
                  <Input
                    value={String(row.phase_name ?? row.label ?? row.name ?? "")}
                    onChange={(e) => handleChange(i, "phase_name", e.target.value)}
                    className="text-sm h-8"
                    placeholder="Phase name..."
                  />
                </TableCell>
                <TableCell className="p-1.5">
                  <Input
                    type="number"
                    value={String(row.duration_days ?? "")}
                    onChange={(e) => handleChange(i, "duration_days", e.target.value)}
                    className="text-sm h-8 text-center"
                    placeholder="0"
                  />
                </TableCell>
                <TableCell className="p-1.5">
                  <Input
                    type="date"
                    value={String(row.start_date ?? "")}
                    onChange={(e) => handleChange(i, "start_date", e.target.value)}
                    className="text-sm h-8"
                  />
                </TableCell>
                <TableCell className="p-1.5">
                  <Input
                    type="date"
                    value={String(row.end_date ?? "")}
                    onChange={(e) => handleChange(i, "end_date", e.target.value)}
                    className="text-sm h-8"
                  />
                </TableCell>
                <TableCell className="p-1.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => handleRemove(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleAdd}>
        <Plus className="h-3 w-3 mr-1" />Add Phase
      </Button>
    </div>
  );
}

/** Complexity parameter table — renders AI-suggested per-parameter ratings */
function ComplexityParameterTable({
  ratings,
}: {
  ratings: Record<string, { rating: number; justification: string; evidence_sections?: string[] }>;
}) {
  const entries = Object.entries(ratings);
  if (entries.length === 0) return null;

  // Simple average for display (weighted score computed elsewhere with master params)
  const avgScore = entries.reduce((s, [, r]) => s + r.rating, 0) / entries.length;
  const level = deriveComplexityLevel(avgScore);
  const label = deriveComplexityLabel(avgScore);
  const levelColor = LEVEL_COLORS[level] ?? "";

  function ratingColor(rating: number): string {
    if (rating <= 3) return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (rating <= 5) return "bg-blue-100 text-blue-800 border-blue-300";
    if (rating <= 7) return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-red-100 text-red-800 border-red-300";
  }

  return (
    <div className="space-y-3 border-l-4 border-l-indigo-400 rounded-r-lg">
      <div className="flex items-center gap-2 px-4 pt-3">
        <Sparkles className="h-4 w-4 text-indigo-600" />
        <span className="text-sm font-semibold text-foreground">AI Complexity Assessment</span>
        <Badge className={cn("text-[11px] px-2 py-0.5 border", levelColor)}>
          {level} — {label}
        </Badge>
        <span className="text-xs text-muted-foreground ml-auto">
          Avg: {avgScore.toFixed(1)}/10
        </span>
      </div>

      <div className="relative w-full overflow-auto mx-4 mb-3 pr-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-[140px]">Parameter</TableHead>
              <TableHead className="text-xs w-[70px] text-center">Rating</TableHead>
              <TableHead className="text-xs">Justification</TableHead>
              <TableHead className="text-xs w-[140px]">Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(([key, r]) => (
              <TableRow key={key}>
                <TableCell className="text-sm font-medium py-2">
                  {key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </TableCell>
                <TableCell className="text-center py-2">
                  <Badge className={cn("text-xs px-2 py-0.5 border tabular-nums", ratingColor(r.rating))}>
                    {r.rating}/10
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground py-2 leading-relaxed">
                  {r.justification}
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex flex-wrap gap-1">
                    {(r.evidence_sections ?? []).map((sec) => (
                      <Badge key={sec} variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground font-mono">
                        {sec}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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
  deliverableItems,
  onDeliverableItemsChange,
  badgePrefix = "D",
  confidence,
  onConfirmPass,
  onFlagForReview,
  complexityRatings,
}: AIReviewResultPanelProps) {

  // Local edit state for each format type — always active (no toggle needed)
  const [editedRichText, setEditedRichText] = useState<string | null>(null);
  const [editedLineItems, setEditedLineItems] = useState<string[] | null>(null);
  const [editedTableRows, setEditedTableRows] = useState<Record<string, unknown>[] | null>(null);
  const [editedScheduleRows, setEditedScheduleRows] = useState<Record<string, unknown>[] | null>(null);
  const [editedDate, setEditedDate] = useState<string | null>(null);

  // Parse date from AI suggestion for date-format sections
  const parsedDate = useMemo(() => parseDateFromSuggestion(sectionKey, result.suggested_version), [sectionKey, result.suggested_version]);

  const statusBadge = STATUS_BADGE[result.status];
  const parsedComments = useMemo(() => result.comments.map(parseComment), [result.comments]);

  // For reward_structure, parse structured { type, monetary, nonMonetary } object
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

  // For table sections (eval_criteria), try parsing as row objects
  const tableRows = useMemo(() => {
    if (sectionKey === "evaluation_criteria" && result.suggested_version) {
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

  const hasDeliverableCards = deliverableItems && deliverableItems.length > 0;

  const hasSuggestedVersion = !!(
    result.suggested_version ||
    hasDeliverableCards ||
    (isStructured && structuredItems && structuredItems.length > 0) ||
    (isMasterData && resolvedCodes && resolvedCodes.length > 0) ||
    tableRows ||
    scheduleRows ||
    rewardData ||
    parsedDate
  );

  // Determine which format this suggestion is in
  const suggestedFormat = useMemo(() => {
    if (isMasterData) return "master_data";
    if (rewardData) return "reward_custom";
    if (isStructured && structuredItems && structuredItems.length > 0) {
      const fmt = SECTION_FORMAT_CONFIG[sectionKey]?.format;
      if (fmt === "line_items") return "line_items";
    }
    if (scheduleRows) return "schedule_table";
    if (tableRows) return "table";
    if (parsedDate) return "date";
    if (result.suggested_version) return "rich_text";
    return null;
  }, [isMasterData, rewardData, isStructured, structuredItems, scheduleRows, tableRows, result.suggested_version, sectionKey]);

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

  useEffect(() => {
    if (suggestedFormat === "reward_custom" && rewardData) {
      onSuggestedVersionChange?.(rewardData);
    }
  }, [suggestedFormat, rewardData]);

  useEffect(() => {
    if (suggestedFormat === "date" && parsedDate) {
      setEditedDate(parsedDate);
      onSuggestedVersionChange?.(parsedDate);
    }
  }, [suggestedFormat, parsedDate]);

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

  // ── Pass confirmation shortcut ──
  if (result.status === "pass" && onConfirmPass && onFlagForReview) {
    return (
      <div className="rounded-lg border-l-4 border-l-emerald-400 border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800/40 p-5">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800">Section Verified</span>
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[11px] px-2 py-0.5">
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusBadge.label}
          </Badge>
          {typeof confidence === "number" && (
            <span className="text-[11px] text-emerald-600 ml-1 font-medium">
              {Math.round(confidence * 100)}% confidence
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          AI found no issues with this section.
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onConfirmPass}
          >
            <Check className="h-4 w-4 mr-1.5" />
            Looks good, confirm
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10 border-amber-400 text-amber-700 hover:bg-amber-50"
            onClick={onFlagForReview}
          >
            <AlertTriangle className="h-4 w-4 mr-1.5" />
            Flag for review
          </Button>
        </div>
      </div>
    );
  }

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
          {typeof confidence === "number" && (
            <span className="text-[11px] text-muted-foreground ml-1 font-medium">
              {Math.round(confidence * 100)}% confidence
            </span>
          )}
        </div>

        {/* ── Summary ── */}
        {result.summary && (
          <ExpandableAIComment content={result.summary} />
        )}

        {/* ── Comments as styled checklist ── */}
        {parsedComments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
                    "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors shadow-xs",
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
                        className={cn("text-[11px] px-2 py-0.5 shrink-0", sev.badgeClass)}
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

      {/* ── Complexity Parameter Table ── */}
      {complexityRatings && Object.keys(complexityRatings).length > 0 && (
        <ComplexityParameterTable ratings={complexityRatings} />
      )}

      {/* ── AI Suggested Version — always visible, no collapse ── */}
      {hasSuggestedVersion && !complexityRatings && (
        <div className="space-y-3 border-l-4 border-l-indigo-400 rounded-r-lg">
          <div className="flex items-center gap-2 px-4 pt-3">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-foreground">
              AI Suggested {isMasterData ? "Selection" : "Version"}
            </span>
            <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 text-[11px] px-2 py-0.5">
              Editable
            </Badge>
          </div>

          {/* ── Master-data codes as selectable chips ── */}
          {isMasterData && resolvedCodes && resolvedCodes.length > 0 ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-muted-foreground">
                  {selectedItems.size}/{resolvedCodes.length} selected
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className="text-[11px] underline text-muted-foreground hover:text-foreground"
                    onClick={onSelectAllItems}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="text-[11px] underline text-muted-foreground hover:text-foreground"
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
                      ? "bg-indigo-100/50 border-indigo-300"
                      : "bg-card border-border opacity-60",
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
                      <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground font-mono">
                        {item.code}
                      </Badge>
                      {!item.isValid && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0">Invalid</Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{item.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          ) : rewardData ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 mx-4 mb-3 p-4 shadow-sm space-y-4">
              {/* Type badge */}
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-300 text-xs px-2 py-0.5">
                  {rewardData.type === 'both' ? 'Monetary + Non-Monetary' : rewardData.type === 'non_monetary' ? 'Non-Monetary' : 'Monetary'}
                </Badge>
              </div>

              {/* Monetary tiers */}
              {rewardData.monetary?.tiers && Object.keys(rewardData.monetary.tiers).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prize Tiers</p>
                  {Object.entries(rewardData.monetary.tiers).map(([tier, amount]) => (
                    <div key={tier} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                      <span className="text-sm font-medium text-foreground capitalize">{tier}</span>
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {rewardData.monetary?.currency ?? 'USD'} {Number(amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {rewardData.monetary.justification && (
                    <p className="text-xs text-muted-foreground italic">{rewardData.monetary.justification}</p>
                  )}
                </div>
              )}

              {/* Non-monetary items */}
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
          ) : hasDeliverableCards ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 mx-4 mb-3 p-4 shadow-sm max-h-[500px] overflow-y-auto">
              <DeliverableCardRenderer
                items={deliverableItems!}
                badgePrefix={badgePrefix}
                hideAcceptanceCriteria={badgePrefix === "O" || badgePrefix === "S"}
              />
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
                    <TableLineItemRenderer
                      rows={detection.rows}
                      schema={detection.schema}
                      onChange={(updatedRows) => {
                        const serialized = updatedRows.map((r) => JSON.stringify(r));
                        handleLineItemsChange(serialized);
                      }}
                    />
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
              <EditableTableRows rows={editedTableRows ?? tableRows.map(r => ({ ...r }))} onChange={handleTableRowsChange} />
            </div>
          ) : result.suggested_version ? (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm text-sm leading-relaxed min-h-[160px]">
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
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-foreground">AI Suggested Version</span>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2.5">
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

      {/* ── Accept / Keep original actions — sticky footer ── */}
      {(hasSuggestedVersion || isRefining || (complexityRatings && Object.keys(complexityRatings).length > 0)) && (
        <div className="sticky bottom-0 bg-card flex gap-3 justify-end pt-3 pb-1 border-t border-border -mx-4 px-4">
          <Button
            variant="outline"
            size="sm"
            className="h-10 text-sm border-border text-foreground hover:bg-muted rounded-lg px-5"
            onClick={onDiscard}
            disabled={isRefining}
          >
            Keep original
          </Button>
          <Button
            size="sm"
            className="h-10 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5"
            onClick={onAccept}
            disabled={isRefining}
          >
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
