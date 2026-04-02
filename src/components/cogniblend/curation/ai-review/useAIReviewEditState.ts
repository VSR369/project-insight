/**
 * useAIReviewEditState — Manages local edit state for AI suggestion formats.
 *
 * Extracted from AIReviewResultPanel.tsx to keep the panel under 200 lines.
 * Handles: rich text, line items, table rows, schedule rows, date, reward, solver expertise.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { SECTION_FORMAT_CONFIG } from "@/lib/cogniblend/curationSectionFormats";
import {
  parseTableRows,
  isScheduleFormat,
  parseDateFromSuggestion,
  parseComment,
  type ReviewComment,
} from "./ReviewConfigs";
import type { AIReviewResult } from "./ReviewConfigs";

interface UseAIReviewEditStateArgs {
  sectionKey: string;
  result: AIReviewResult;
  isMasterData: boolean;
  isStructured: boolean;
  structuredItems: string[] | null;
  suggestedCodes?: string[] | null;
  masterDataOptions?: Array<{ value: string; label: string; description?: string }>;
  deliverableItems?: any[];
  onSuggestedVersionChange?: (editedContent: any) => void;
}

export function useAIReviewEditState({
  sectionKey, result, isMasterData, isStructured, structuredItems,
  suggestedCodes, masterDataOptions, deliverableItems, onSuggestedVersionChange,
}: UseAIReviewEditStateArgs) {
  const [editedRichText, setEditedRichText] = useState<string | null>(null);
  const [editedLineItems, setEditedLineItems] = useState<string[] | null>(null);
  const [editedTableRows, setEditedTableRows] = useState<Record<string, unknown>[] | null>(null);
  const [editedScheduleRows, setEditedScheduleRows] = useState<Record<string, unknown>[] | null>(null);
  const [editedDate, setEditedDate] = useState<string | null>(null);

  const parsedDate = useMemo(() => parseDateFromSuggestion(sectionKey, result.suggested_version), [sectionKey, result.suggested_version]);
  const parsedComments = useMemo(() => result.comments.map(parseComment), [result.comments]);

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
  }, [isMasterData, rewardData, solverExpertiseData, isStructured, structuredItems, scheduleRows, tableRows, result.suggested_version, sectionKey, parsedDate]);

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

  // Comment selection state
  const [selectedComments, setSelectedComments] = useState<Set<number>>(() => new Set(parsedComments.map((_, i) => i)));
  const toggleComment = useCallback((index: number) => {
    setSelectedComments(prev => { const next = new Set(prev); next.has(index) ? next.delete(index) : next.add(index); return next; });
  }, []);
  const allCommentsSelected = selectedComments.size === parsedComments.length;
  const toggleAllComments = useCallback(() => {
    if (allCommentsSelected) setSelectedComments(new Set());
    else setSelectedComments(new Set(parsedComments.map((_, i) => i)));
  }, [allCommentsSelected, parsedComments]);

  return {
    // Parsed/computed data
    parsedDate, parsedComments, rewardData, solverExpertiseData,
    tableRows, scheduleRows, resolvedCodes,
    hasDeliverableCards: !!hasDeliverableCards,
    hasSuggestedVersion, suggestedFormat,
    // Edit state
    editedRichText, editedLineItems, editedTableRows, editedScheduleRows, editedDate,
    // Change handlers
    handleRichTextChange, handleLineItemsChange, handleTableRowsChange,
    handleScheduleRowsChange, handleDateChange,
    // Comment state
    selectedComments, toggleComment, allCommentsSelected, toggleAllComments,
  };
}
