/**
 * aiReviewInlineHelpers — Pure helper functions extracted from AIReviewInline.
 */

import { SECTION_FORMAT_CONFIG } from "@/lib/cogniblend/curationSectionFormats";

/** Sections that should render as structured deliverable cards */
export const DELIVERABLE_LIKE_SECTIONS = new Set(['deliverables', 'expected_outcomes', 'submission_guidelines']);

export const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pass: { label: "Pass", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  warning: { label: "Warning", className: "bg-amber-100 text-amber-800 border-amber-300" },
  needs_revision: { label: "Needs Revision", className: "bg-red-100 text-red-800 border-red-300" },
  inferred: { label: "AI Inferred", className: "bg-violet-100 text-violet-800 border-violet-300" },
};

export function getDeliverableBadgePrefix(sectionKey: string): string {
  if (sectionKey === 'expected_outcomes') return 'O';
  if (sectionKey === 'submission_guidelines') return 'S';
  return 'D';
}

/** Determine if a section returns structured JSON arrays from AI refinement. */
export function isStructuredSection(sectionKey: string): boolean {
  const fmt = SECTION_FORMAT_CONFIG[sectionKey];
  if (!fmt) return false;
  return ['line_items', 'table', 'schedule_table'].includes(fmt.format);
}

/** Determine the format type of a section */
export function getSectionFormatType(sectionKey: string): string | null {
  return SECTION_FORMAT_CONFIG[sectionKey]?.format ?? null;
}

/** Determine if a section is a master-data selection (codes, not prose) */
export function isMasterDataSection(sectionKey: string): boolean {
  const fmt = SECTION_FORMAT_CONFIG[sectionKey];
  if (!fmt) return false;
  return ['checkbox_multi', 'checkbox_single', 'select', 'radio'].includes(fmt.format);
}

/**
 * Parse AI refinement output into structured data.
 * Format-aware: preserves row objects for table/schedule_table, returns strings for line_items.
 */
export function parseStructuredItems(content: string, sectionKey: string): string[] | null {
  const trimmed = content.trim();
  const cleaned = trimmed.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.requires_human_input) {
      return null;
    }
    if (Array.isArray(parsed)) {
      const fmt = getSectionFormatType(sectionKey);
      if (fmt === 'line_items') {
        return parsed.map((item: any) =>
          typeof item === "string" ? item : item?.name ?? item?.criterion_name ?? JSON.stringify(item)
        );
      }
      return parsed.map((item: any) =>
        typeof item === "string" ? item : JSON.stringify(item)
      );
    }
    const wrapperKey = sectionKey === "evaluation_criteria" ? "criteria" : "items";
    if (parsed && typeof parsed === "object" && Array.isArray(parsed[wrapperKey])) {
      const items = parsed[wrapperKey];
      const fmt = getSectionFormatType(sectionKey);
      if (fmt === 'line_items') {
        return items.map((item: any) =>
          typeof item === "string" ? item : item?.name ?? item?.criterion_name ?? JSON.stringify(item)
        );
      }
      return items.map((item: any) =>
        typeof item === "string" ? item : JSON.stringify(item)
      );
    }
  } catch {
    // Not JSON — try line-based parsing
  }

  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
  const listItems = lines
    .map(l => l.replace(/^(?:\d+[\.\)]\s*|[-*•]\s*)/, '').trim())
    .filter(l => l.length > 0);

  if (listItems.length >= 2) return listItems;
  return null;
}

/**
 * Get the raw parsed JSON array from refined content (for table/schedule sections).
 */
export function parseRawStructuredArray(content: string): any[] | null {
  const cleaned = content.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (parsed?.criteria && Array.isArray(parsed.criteria)) return parsed.criteria;
    if (parsed?.items && Array.isArray(parsed.items)) return parsed.items;
    if (parsed?.rows && Array.isArray(parsed.rows)) return parsed.rows;
  } catch { /* not JSON */ }
  return null;
}

/**
 * Parse AI output as master-data code(s).
 */
export function parseMasterDataCodes(content: string, _sectionKey: string): string[] | null {
  const cleaned = content.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.filter((v: any) => typeof v === "string" && v.trim().length > 0);
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const code = parsed.selected_id ?? parsed.id ?? parsed.code ?? parsed.value;
      if (code && typeof code === 'string') return [code];
    }
  } catch {
    // Not valid JSON
  }

  const singleCode = cleaned.replace(/^["']|["']$/g, '').trim();
  if (singleCode.length > 0 && !singleCode.includes(' ')) {
    return [singleCode];
  }

  const parts = singleCode.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  if (parts.length > 0) return parts;

  return null;
}
