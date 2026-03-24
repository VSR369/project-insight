/**
 * AIReviewResultPanel — Format-native display of AI review results.
 *
 * Renders:
 *  - Summary badge + status
 *  - Comments with severity badges (STRENGTH / WARNING / REQUIRED) and blockquote applies_to
 *  - AI Suggested Version using the section's native renderer in readOnly mode
 *  - Accept / Reject actions
 *
 * This replaces the inline refined-content rendering in AIReviewInline.
 */

import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Check, X, ChevronDown, AlertTriangle, ShieldAlert, ThumbsUp } from "lucide-react";
import { AiContentRenderer } from "@/components/ui/AiContentRenderer";
import { LineItemsSectionRenderer } from "@/components/cogniblend/curation/renderers/LineItemsSectionRenderer";
import { TableSectionRenderer } from "@/components/cogniblend/curation/renderers/TableSectionRenderer";
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

interface AIReviewResultPanelProps {
  sectionKey: string;
  result: AIReviewResult;
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
  pass: { label: "Pass", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  warning: { label: "Warning", className: "bg-amber-100 text-amber-800 border-amber-300" },
  needs_revision: { label: "Needs Revision", className: "bg-red-100 text-red-800 border-red-300" },
};

/**
 * Attempt to infer severity from comment text using keyword heuristics.
 */
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

/**
 * Parse a raw comment string into a structured ReviewComment.
 */
function parseComment(raw: string): ReviewComment {
  // Check for "applies_to:" pattern at end
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

/**
 * Parse structured items from refined content for table sections like eval_criteria.
 */
function parseTableRows(content: string): Record<string, unknown>[] | null {
  const cleaned = content.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
      return parsed;
    }
    if (parsed?.criteria && Array.isArray(parsed.criteria)) return parsed.criteria;
    if (parsed?.rows && Array.isArray(parsed.rows)) return parsed.rows;
  } catch {
    // not JSON
  }
  return null;
}

/* ── Component ─────────────────────────────────────────── */

export function AIReviewResultPanel({
  sectionKey,
  result,
  structuredItems,
  selectedItems,
  onToggleItem,
  onSelectAllItems,
  onClearItems,
  onAccept,
  onDiscard,
  isStructured,
}: AIReviewResultPanelProps) {
  const [detailsOpen, setDetailsOpen] = useState(true);

  const statusBadge = STATUS_BADGE[result.status];
  const parsedComments = useMemo(() => result.comments.map(parseComment), [result.comments]);

  // For table sections (eval_criteria), try parsing as row objects
  const tableRows = useMemo(() => {
    if (sectionKey === "evaluation_criteria" && result.suggested_version) {
      return parseTableRows(result.suggested_version);
    }
    return null;
  }, [sectionKey, result.suggested_version]);

  const hasSuggestedVersion = !!(
    result.suggested_version ||
    (isStructured && structuredItems && structuredItems.length > 0) ||
    tableRows
  );

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      {/* Header: status badge */}
      <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            AI Review Result
          </span>
          <Badge className={cn("text-[10px] px-1.5 py-0", statusBadge.className)}>
            {statusBadge.label}
          </Badge>
          <ChevronDown
            className={cn("h-3.5 w-3.5 ml-auto text-muted-foreground transition-transform", detailsOpen && "rotate-180")}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3 space-y-4">
          {/* ── Summary ── */}
          {result.summary && (
            <div className="text-sm text-muted-foreground">
              <AiContentRenderer content={result.summary} compact />
            </div>
          )}

          {/* ── Comments with severity badges ── */}
          {parsedComments.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Comments ({parsedComments.length})
              </p>
              {parsedComments.map((comment, i) => {
                const sev = comment.severity ? SEVERITY_CONFIG[comment.severity] : SEVERITY_CONFIG.warning;
                const SevIcon = sev.icon;
                return (
                  <div key={i} className="rounded-md border bg-muted/30 p-2.5 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <Badge
                        className={cn("text-[9px] px-1.5 py-0 shrink-0 mt-0.5", sev.badgeClass)}
                      >
                        <SevIcon className="h-2.5 w-2.5 mr-0.5" />
                        {sev.label}
                      </Badge>
                      <span className="text-xs leading-relaxed text-foreground flex-1">
                        {comment.text}
                      </span>
                    </div>
                    {comment.applies_to && (
                      <blockquote className="ml-6 border-l-2 border-primary/40 pl-2.5 text-[11px] text-muted-foreground italic">
                        {comment.applies_to}
                      </blockquote>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── AI Suggested Version (format-native) ── */}
          {hasSuggestedVersion && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                AI Suggested Version
              </p>

              {/* Structured line items (deliverables etc.) */}
              {isStructured && structuredItems && structuredItems.length > 0 ? (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 max-h-72 overflow-y-auto space-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-muted-foreground">
                      {selectedItems.size}/{structuredItems.length} items selected
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
                  {structuredItems.map((item, i) => (
                    <label
                      key={i}
                      className={cn(
                        "flex items-start gap-2 rounded p-1.5 cursor-pointer transition-colors text-sm",
                        selectedItems.has(i) ? "bg-primary/10" : "opacity-50"
                      )}
                    >
                      <Checkbox
                        checked={selectedItems.has(i)}
                        onCheckedChange={() => onToggleItem(i)}
                        className="mt-0.5 h-3.5 w-3.5"
                      />
                      <span className="flex-1 leading-relaxed">{item}</span>
                    </label>
                  ))}
                </div>
              ) : tableRows ? (
                /* Table-format suggested version (eval criteria, reward) */
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 max-h-72 overflow-y-auto">
                  <TableSectionRenderer
                    sectionKey={sectionKey}
                    rows={tableRows.map((r) => ({
                      criterion_name: String(r.name ?? r.criterion_name ?? ""),
                      weight_percentage: Number(r.weight ?? r.weight_percentage ?? 0),
                      scoring_type: String(r.scoring_type ?? "score"),
                      evaluator_role: String(r.evaluator_role ?? ""),
                      description: String(r.description ?? ""),
                    }))}
                    readOnly
                    editing={false}
                    onSave={() => {}}
                    onCancel={() => {}}
                    showWeightTotal
                  />
                </div>
              ) : result.suggested_version ? (
                /* Rich text / markdown fallback */
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm leading-relaxed max-h-72 overflow-y-auto">
                  <AiContentRenderer content={result.suggested_version} compact />
                </div>
              ) : null}
            </div>
          )}

          {/* ── Accept / Reject actions ── */}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onDiscard}>
              <X className="h-3.5 w-3.5 mr-1" />
              Discard
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={onAccept}>
              <Check className="h-3.5 w-3.5 mr-1" />
              {isStructured && structuredItems
                ? `Accept ${selectedItems.size} item${selectedItems.size !== 1 ? "s" : ""}`
                : "Accept & Save"}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
