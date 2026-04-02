/**
 * ReviewConfigs — Types, constants, and pure helper functions
 * extracted from AIReviewResultPanel.
 */

import { ThumbsUp, AlertTriangle, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";
import { SECTION_FORMAT_CONFIG } from "@/lib/cogniblend/curationSectionFormats";

/* ── Types ──────────────────────────────────────────────── */

export interface ReviewComment {
  text: string;
  severity?: "strength" | "warning" | "required";
  type?: "error" | "warning" | "suggestion" | "best_practice" | "strength";
  applies_to?: string;
  field?: string | null;
  reasoning?: string | null;
}

export interface CrossSectionIssue {
  related_section: string;
  issue: string;
  suggested_resolution?: string;
}

export interface AIReviewResult {
  status: "pass" | "warning" | "needs_revision" | "inferred" | "generated";
  comments: (string | { text: string; type?: string; severity?: string; field?: string; comment?: string; reasoning?: string })[];
  summary?: string;
  suggested_version?: string;
  guidelines?: string[];
  cross_section_issues?: CrossSectionIssue[];
}

export interface MasterDataOption {
  value: string;
  label: string;
  description?: string;
}

import type { DeliverableItem } from "@/utils/parseDeliverableItem";
export type { DeliverableItem };

export type AIReviewResultPanelProps = {
  sectionKey: string;
  result: AIReviewResult;
  isRefining?: boolean;
  structuredItems: string[] | null;
  selectedItems: Set<number>;
  onToggleItem: (index: number) => void;
  onSelectAllItems: () => void;
  onClearItems: () => void;
  onAccept: () => void;
  onDiscard: () => void;
  isStructured: boolean;
  isMasterData?: boolean;
  suggestedCodes?: string[] | null;
  masterDataOptions?: MasterDataOption[];
  onSuggestedVersionChange?: (editedContent: any) => void;
  deliverableItems?: DeliverableItem[];
  onDeliverableItemsChange?: (items: DeliverableItem[]) => void;
  badgePrefix?: string;
  confidence?: number;
  onConfirmPass?: () => void;
  onFlagForReview?: () => void;
  complexityRatings?: Record<string, { rating: number; justification: string; evidence_sections?: string[] }>;
};

/* ── Multi-tier comment type config ─────────────────────── */

export const COMMENT_TYPE_CONFIG: Record<string, { label: string; icon: typeof ThumbsUp; badgeClass: string }> = {
  error:         { label: "Error",         icon: ShieldAlert,    badgeClass: "bg-red-100 text-red-800 border-red-300" },
  warning:       { label: "Warning",       icon: AlertTriangle,  badgeClass: "bg-amber-100 text-amber-800 border-amber-300" },
  suggestion:    { label: "Suggestion",    icon: Sparkles,       badgeClass: "bg-blue-100 text-blue-700 border-blue-300" },
  best_practice: { label: "Best Practice", icon: CheckCircle2,   badgeClass: "bg-purple-100 text-purple-700 border-purple-300" },
  strength:      { label: "Strength",      icon: ThumbsUp,       badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300" },
};

export const SEVERITY_TO_TYPE: Record<string, string> = {
  required: 'error',
  warning: 'warning',
  strength: 'strength',
};

export const SEVERITY_CONFIG = {
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

export const STATUS_BADGE = {
  pass: { label: "Pass", icon: ThumbsUp, className: "bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full px-3 py-1 text-xs font-medium" },
  warning: { label: "Warning", icon: AlertTriangle, className: "bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-3 py-1 text-xs font-medium" },
  needs_revision: { label: "Needs Revision", icon: ShieldAlert, className: "bg-red-100 text-red-700 border border-red-300 rounded-full px-3 py-1 text-xs font-medium" },
  inferred: { label: "AI Inferred", icon: Sparkles, className: "bg-violet-100 text-violet-700 border border-violet-300 rounded-full px-3 py-1 text-xs font-medium" },
};

/* ── Parse helpers ──────────────────────────────────────── */

export function inferSeverity(comment: string): ReviewComment["severity"] {
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

export function parseComment(raw: string | { text?: string; type?: string; severity?: string; field?: string; comment?: string; reasoning?: string }): ReviewComment {
  if (typeof raw === 'object' && raw !== null) {
    const rawText = raw.text || raw.comment || '';
    const text = typeof rawText === 'string' ? rawText : JSON.stringify(rawText);
    const type = raw.type as ReviewComment['type'] || undefined;
    const severity = type
      ? (type === 'error' ? 'required' : type === 'best_practice' ? 'strength' : type as ReviewComment['severity'])
      : inferSeverity(text);
    const rawReasoning = raw.reasoning || null;
    const reasoning = rawReasoning && typeof rawReasoning !== 'string' ? JSON.stringify(rawReasoning) : rawReasoning;
    return { text, type, severity, field: typeof raw.field === 'string' ? raw.field : (raw.field ? JSON.stringify(raw.field) : null), reasoning };
  }

  let text = raw as string;
  let applies_to: string | undefined;
  const appliesMatch = text.match(/\[applies[_ ]to:\s*(.+?)\]\s*$/i);
  if (appliesMatch) {
    applies_to = appliesMatch[1];
    text = text.slice(0, appliesMatch.index).trim();
  }
  const severity = inferSeverity(text);
  return { text, severity, applies_to };
}

export function parseTableRows(content: string): Record<string, unknown>[] | null {
  const cleaned = content.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  
  const tryExtract = (text: string): Record<string, unknown>[] | null => {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
        return parsed;
      }
      if (parsed?.criteria && Array.isArray(parsed.criteria)) return parsed.criteria;
      if (parsed?.rows && Array.isArray(parsed.rows)) return parsed.rows;
      if (parsed?.items && Array.isArray(parsed.items)) return parsed.items;
    } catch {
      // not valid JSON
    }
    return null;
  };

  const direct = tryExtract(cleaned);
  if (direct) return direct;

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const extracted = tryExtract(arrayMatch[0]);
    if (extracted) return extracted;
  }

  return null;
}

export function isScheduleFormat(sectionKey: string): boolean {
  return SECTION_FORMAT_CONFIG[sectionKey]?.format === 'schedule_table';
}

export function isDateFormat(sectionKey: string): boolean {
  return SECTION_FORMAT_CONFIG[sectionKey]?.format === 'date';
}

export function parseDateFromSuggestion(sectionKey: string, suggestedVersion: string | undefined): string | null {
  if (!isDateFormat(sectionKey) || !suggestedVersion) return null;
  const cleaned = suggestedVersion.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim().replace(/^["']|["']$/g, "");
  const match = cleaned.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}
