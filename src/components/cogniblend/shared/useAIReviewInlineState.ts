/**
 * useAIReviewInlineState — State management and handlers for AIReviewInline.
 * Extracted from AIReviewInline.tsx to reduce component size.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { SECTION_FORMAT_CONFIG } from "@/lib/cogniblend/curationSectionFormats";
import { parseDeliverables, type DeliverableItem } from "@/utils/parseDeliverableItem";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DELIVERABLE_LIKE_SECTIONS,
  isStructuredSection,
  isMasterDataSection,
  getSectionFormatType,
  parseStructuredItems,
  parseRawStructuredArray,
  parseMasterDataCodes,
  getDeliverableBadgePrefix,
} from "./aiReviewInlineHelpers";
import type { SectionComment, SectionReview, RoleContext } from "./AIReviewInline";

interface MasterDataOption {
  value: string;
  label: string;
  description?: string;
}

interface UseAIReviewInlineStateParams {
  sectionKey: string;
  review: SectionReview | undefined;
  currentContent: string | null;
  challengeId: string;
  challengeContext: Record<string, any>;
  onAcceptRefinement: (sectionKey: string, newContent: string) => void;
  onSingleSectionReview?: (sectionKey: string, review: SectionReview) => void;
  onMarkAddressed?: (sectionKey: string) => void;
  defaultOpen?: boolean;
  roleContext?: RoleContext;
  masterDataOptions?: MasterDataOption[];
  isLockedSection?: boolean;
  onReReview?: (sectionKey: string) => Promise<void>;
  initialRefinedContent?: string | null;
  complexityRatings?: Record<string, { rating: number; justification: string; evidence_sections?: string[] }>;
  prerequisitesReady?: boolean;
  missingPrerequisites?: string[];
  suppressAutoRefine?: boolean;
}

export function useAIReviewInlineState(params: UseAIReviewInlineStateParams) {
  const {
    sectionKey, review, currentContent, challengeId, challengeContext,
    onAcceptRefinement, onSingleSectionReview, onMarkAddressed,
    defaultOpen = false, roleContext = "curation", masterDataOptions,
    isLockedSection = false, onReReview, initialRefinedContent,
    complexityRatings, prerequisitesReady, missingPrerequisites,
    suppressAutoRefine = false,
  } = params;

  const [editedComments, setEditedComments] = useState<SectionComment[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedComments, setSelectedComments] = useState<Set<number>>(new Set());
  const [isRefining, setIsRefining] = useState(false);
  const [refinedContent, setRefinedContent] = useState<string | null>(initialRefinedContent ?? null);
  const [isAddressed, setIsAddressed] = useState(review?.addressed ?? false);
  const [isReReviewing, setIsReReviewing] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen && !(review?.addressed ?? false));
  const [prereqWarningShown, setPrereqWarningShown] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [editedSuggestedContent, setEditedSuggestedContent] = useState<any>(null);
  const [editedDeliverableItems, setEditedDeliverableItems] = useState<DeliverableItem[] | null>(null);

  const isStructured = isStructuredSection(sectionKey);
  const isMasterData = isMasterDataSection(sectionKey);
  const isDeliverableLike = DELIVERABLE_LIKE_SECTIONS.has(sectionKey);
  const autoRefineTriggered = useRef(false);
  const prevReviewSignature = useRef<string | null>(null);

  const comments = editedComments.length > 0 ? editedComments : (review?.comments ?? []);

  useEffect(() => {
    if (defaultOpen && !isAddressed) setIsOpen(true);
  }, [defaultOpen, isAddressed]);

  useEffect(() => {
    if (initialRefinedContent != null) {
      setRefinedContent(initialRefinedContent);
      autoRefineTriggered.current = true;
    }
  }, [initialRefinedContent]);

  useEffect(() => {
    if (comments.length > 0 && selectedComments.size === 0) {
      setSelectedComments(new Set(comments.map((_, i) => i)));
    }
  }, [comments.length]);

  // Seed refinedContent from review.suggestion when available (even if suppressAutoRefine is true)
  useEffect(() => {
    if (
      !autoRefineTriggered.current &&
      review &&
      !review.addressed &&
      review.suggestion != null
    ) {
      const suggestionStr = typeof review.suggestion === 'string' ? review.suggestion : JSON.stringify(review.suggestion);
      if (suggestionStr.trim().length > 0) {
        setRefinedContent(suggestionStr);
        autoRefineTriggered.current = true;
      }
    }
  }, [review?.suggestion, review?.addressed]);

  // Auto-refine trigger — suppressed between Pass 1 and Generate Suggestions
  // This only fires the AI call to *generate* a suggestion; it does NOT block showing an existing one
  useEffect(() => {
    if (suppressAutoRefine) return;
    if (
      !autoRefineTriggered.current &&
      !isLockedSection &&
      sectionKey !== 'complexity' &&
      review &&
      !review.addressed &&
      (review.status === "pass" || review.status === "warning" || review.status === "needs_revision" || review.status === "generated") &&
      review.comments && review.comments.length > 0 &&
      !refinedContent &&
      !isRefining &&
      selectedComments.size > 0
    ) {
      autoRefineTriggered.current = true;

      // If review already has a suggestion from Pass 2, use it directly (handled above)
      // Only fall through to AI call if no suggestion exists
      if (review.suggestion != null) {
        return; // Already seeded by the effect above
      }

      if (review.status === 'pass') {
        const hasActionable = review.comments?.some((c: any) => {
          const type = typeof c === 'string' ? 'warning' : (c.type || c.severity || 'warning');
          return type === 'error' || type === 'warning' || type === 'suggestion';
        });
        if (!hasActionable) return;
      }

      const timer = setTimeout(() => {
        handleRefineWithAI();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [review, refinedContent, isRefining, isLockedSection, selectedComments.size, sectionKey, suppressAutoRefine]);

  // Reset auto-refine on review change
  useEffect(() => {
    const commentHash = (review?.comments ?? []).map((c: any) =>
      typeof c === 'string' ? c : c.text ?? JSON.stringify(c)
    ).join('\x1f');
    const sig = `${review?.reviewed_at}|${review?.status}|${commentHash}`;
    if (prevReviewSignature.current !== null && prevReviewSignature.current !== sig) {
      autoRefineTriggered.current = false;
      setRefinedContent(null);
      setEditedSuggestedContent(null);
      setEditedDeliverableItems(null);
      setSelectedItems(new Set());
    }
    prevReviewSignature.current = sig;
  }, [review?.reviewed_at, review?.status, review?.comments]);

  // Parsed items
  const structuredItems = useMemo(() => {
    if (!isStructured || !refinedContent) return null;
    return parseStructuredItems(refinedContent, sectionKey);
  }, [isStructured, refinedContent, sectionKey]);

  const parsedDeliverableObjects = useMemo(() => {
    if (!isDeliverableLike || !refinedContent) return null;
    const cleaned = refinedContent.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      const arr = Array.isArray(parsed) ? parsed : (parsed?.items ?? parsed?.deliverables ?? null);
      if (Array.isArray(arr) && arr.length > 0) {
        return parseDeliverables(arr, getDeliverableBadgePrefix(sectionKey));
      }
    } catch { /* not JSON */ }
    return null;
  }, [isDeliverableLike, refinedContent, sectionKey]);

  const suggestedCodes = useMemo(() => {
    if (!isMasterData || !refinedContent) return null;
    return parseMasterDataCodes(refinedContent, sectionKey);
  }, [isMasterData, refinedContent, sectionKey]);

  useEffect(() => {
    if (structuredItems && structuredItems.length > 0) setSelectedItems(new Set(structuredItems.map((_, i) => i)));
  }, [structuredItems]);

  useEffect(() => {
    if (suggestedCodes && suggestedCodes.length > 0) setSelectedItems(new Set(suggestedCodes.map((_, i) => i)));
  }, [suggestedCodes]);

  // Handlers
  const handleEditComment = useCallback((index: number) => {
    if (editedComments.length === 0 && review?.comments) setEditedComments([...review.comments]);
    setEditingIndex(index);
  }, [editedComments.length, review?.comments]);

  const handleCommentChange = useCallback((index: number, value: string) => {
    setEditedComments((prev) => {
      const updated = [...prev];
      const original = prev[index] ?? (review?.comments?.[index]);
      updated[index] = (original && typeof original === 'object') ? { ...original, text: value } : value;
      return updated;
    });
  }, [review?.comments]);

  const handleSaveComment = useCallback(() => { setEditingIndex(null); }, []);

  const handleToggleComment = useCallback((index: number) => {
    setSelectedComments((prev) => { const next = new Set(prev); if (next.has(index)) next.delete(index); else next.add(index); return next; });
  }, []);

  const handleSelectAllComments = useCallback(() => { setSelectedComments(new Set(comments.map((_, i) => i))); }, [comments]);
  const handleClearAllComments = useCallback(() => { setSelectedComments(new Set()); }, []);

  const handleToggleItem = useCallback((index: number) => {
    setSelectedItems((prev) => { const next = new Set(prev); if (next.has(index)) next.delete(index); else next.add(index); return next; });
  }, []);

  const handleReReview = useCallback(async () => {
    if (!challengeId) return;
    if (prerequisitesReady === false && !prereqWarningShown) {
      const names = missingPrerequisites?.slice(0, 3).join(', ') ?? 'prerequisite sections';
      toast.warning(`For best results, complete ${names} first. Click Re-review again to proceed anyway.`, { duration: 5000 });
      setPrereqWarningShown(true);
      return;
    }
    setPrereqWarningShown(false);
    setIsReReviewing(true);
    try {
      if (onReReview) {
        await onReReview(sectionKey);
        setIsAddressed(false); setEditedComments([]); setSelectedComments(new Set());
        setRefinedContent(null); setEditedSuggestedContent(null); setEditedDeliverableItems(null);
        setSelectedItems(new Set()); autoRefineTriggered.current = false;
        return;
      }

      const { data, error } = await supabase.functions.invoke("review-challenge-sections", {
        body: {
          challenge_id: challengeId, section_key: sectionKey, role_context: roleContext,
          wave_action: currentContent?.trim()?.length && currentContent.trim().length > 30 ? 'review' : 'generate',
          current_content: currentContent,
          context: challengeContext ? { ...challengeContext, maturityLevel: challengeContext.maturity_level, todaysDate: new Date().toISOString().split('T')[0] } : undefined,
        },
      });

      if (error) {
        let msg = error.message;
        try { const body = await (error as any).context?.json?.(); msg = body?.error?.message ?? msg; } catch {}
        throw new Error(msg);
      }

      if (data?.success && data.data?.sections) {
        const freshReview = (data.data.sections as SectionReview[])[0];
        if (freshReview) {
          setIsAddressed(false); setEditedComments([]);
          setSelectedComments(new Set(freshReview.comments.map((_, i) => i)));
          setRefinedContent(null); setEditedSuggestedContent(null); setEditedDeliverableItems(null);
          setSelectedItems(new Set()); autoRefineTriggered.current = false;
          onSingleSectionReview?.(sectionKey, freshReview);
          const freshHash = freshReview.comments.map((c: any) => typeof c === 'string' ? c : c.text).join('\x1f');
          prevReviewSignature.current = `${freshReview.reviewed_at}|${freshReview.status}|${freshHash}`;
          if (freshReview.suggestion != null) {
            const suggestionStr = typeof freshReview.suggestion === 'string' ? freshReview.suggestion : JSON.stringify(freshReview.suggestion);
            if (suggestionStr.trim().length > 0) { setRefinedContent(suggestionStr); autoRefineTriggered.current = true; }
          }
          const hasIssues = freshReview.comments.length > 0;
          toast.success(hasIssues ? "Re-review complete — see updated comments." : "Section looks good — no issues found.");
        }
      } else {
        throw new Error(data?.error?.message ?? "Unexpected response from AI review");
      }
    } catch (e: any) {
      toast.error(`Re-review failed: ${e.message ?? "Unknown error"}`);
    } finally {
      setIsReReviewing(false);
    }
  }, [challengeId, sectionKey, roleContext, currentContent, challengeContext, onSingleSectionReview, onReReview, prerequisitesReady, prereqWarningShown, missingPrerequisites]);

  const handleRefineWithAI = useCallback(async () => {
    if (!challengeId) return;
    const commentToText = (c: SectionComment): string => typeof c === 'string' ? c : (c.text ?? (c as any).comment ?? JSON.stringify(c));
    const selectedInstructions = comments.filter((_, i) => selectedComments.has(i)).map(commentToText).join("\n\n");
    if (!selectedInstructions.trim()) { toast.error("Select at least one review comment to use as refinement instructions."); return; }

    setIsRefining(true);
    setRefinedContent(null);

    try {
      const selectedCommentObjects = comments.filter((_, i) => selectedComments.has(i)).map(c => {
        if (typeof c === 'object' && c !== null && 'text' in c) return c;
        return { text: typeof c === 'string' ? c : String(c), type: 'warning' as const, field: null, reasoning: null };
      });

      const { data, error } = await supabase.functions.invoke("review-challenge-sections", {
        body: {
          challenge_id: challengeId, section_key: sectionKey, role_context: roleContext, wave_action: 'review', skip_analysis: true,
          provided_comments: [{ section_key: sectionKey, status: 'needs_revision', comments: selectedCommentObjects, guidelines: [], cross_section_issues: [], reviewed_at: new Date().toISOString() }],
          context: { title: challengeContext.title, maturityLevel: challengeContext.maturity_level, solutionType: (challengeContext as any).solution_type, domain_tags: challengeContext.domain_tags, todaysDate: new Date().toISOString().split('T')[0] },
        },
      });

      if (error) {
        let msg = error.message;
        try { const body = await (error as any).context?.json?.(); msg = body?.error?.message ?? msg; } catch {}
        throw new Error(msg);
      }

      const sectionResult = data?.data?.sections?.find((s: any) => s.section_key === sectionKey);
      if (data?.success && sectionResult?.suggestion) {
        setRefinedContent(sectionResult.suggestion);
        toast.success("AI refinement ready — review the proposed changes below.");
      } else {
        throw new Error(data?.error?.message ?? "No suggestion generated. Try selecting different comments.");
      }
    } catch (e: any) {
      toast.error(`Refinement failed: ${e.message ?? "Unknown error"}`);
    } finally {
      setIsRefining(false);
    }
  }, [challengeId, sectionKey, currentContent, comments, selectedComments, challengeContext, roleContext]);

  const handleAccept = useCallback(() => {
    if (sectionKey === 'complexity' && complexityRatings && Object.keys(complexityRatings).length > 0) {
      onAcceptRefinement(sectionKey, JSON.stringify(complexityRatings));
      setRefinedContent(null); setEditedComments([]); setSelectedItems(new Set());
      setEditedSuggestedContent(null); setEditedDeliverableItems(null);
      setIsAddressed(true); setIsOpen(false); onMarkAddressed?.(sectionKey);
      return;
    }

    if (!refinedContent) {
      if (review?.status === 'pass') { setIsAddressed(true); setIsOpen(false); onMarkAddressed?.(sectionKey); return; }
      toast.error("No AI suggestion available to accept. Try re-reviewing the section first.");
      return;
    }

    const hasEdits = editedSuggestedContent != null;

    if (isDeliverableLike && (editedDeliverableItems || parsedDeliverableObjects)) {
      const items = editedDeliverableItems ?? parsedDeliverableObjects;
      if (!items || items.length === 0) { toast.error("No deliverable items to accept."); return; }
      onAcceptRefinement(sectionKey, JSON.stringify({ items }));
    } else if (isMasterData && suggestedCodes && suggestedCodes.length > 0) {
      const accepted = suggestedCodes.filter((_, i) => selectedItems.has(i));
      if (accepted.length === 0) { toast.error("Select at least one option to accept."); return; }
      if (masterDataOptions && masterDataOptions.length > 0) {
        const validCodes = new Set(masterDataOptions.map(o => o.value));
        const invalid = accepted.filter(c => !validCodes.has(c));
        if (invalid.length > 0) { toast.error(`AI returned invalid codes: ${invalid.join(", ")}. Only valid master data codes are allowed.`); return; }
      }
      const fmt = SECTION_FORMAT_CONFIG[sectionKey];
      if (fmt && ['checkbox_single', 'select', 'radio'].includes(fmt.format)) onAcceptRefinement(sectionKey, accepted[0]);
      else if (fmt && fmt.format === 'line_items') onAcceptRefinement(sectionKey, JSON.stringify({ items: accepted }));
      else onAcceptRefinement(sectionKey, JSON.stringify(accepted));
    } else if (hasEdits) {
      const editFmt = SECTION_FORMAT_CONFIG[sectionKey]?.format;
      if ((editFmt === 'table' || editFmt === 'schedule_table') && typeof editedSuggestedContent === 'string') { toast.error("AI returned text instead of table data. Please re-review this section."); return; }
      if (typeof editedSuggestedContent === "string") onAcceptRefinement(sectionKey, editedSuggestedContent);
      else if (Array.isArray(editedSuggestedContent)) {
        const ef = getSectionFormatType(sectionKey);
        if (ef === 'line_items') onAcceptRefinement(sectionKey, JSON.stringify({ items: editedSuggestedContent }));
        else onAcceptRefinement(sectionKey, JSON.stringify(editedSuggestedContent));
      } else onAcceptRefinement(sectionKey, JSON.stringify(editedSuggestedContent));
    } else if (isStructured && structuredItems && structuredItems.length > 0) {
      const fmt = getSectionFormatType(sectionKey);
      if (fmt === 'table' || fmt === 'schedule_table') {
        const rawArray = parseRawStructuredArray(refinedContent);
        if (rawArray) {
          const accepted = rawArray.filter((_, i) => selectedItems.has(i));
          if (accepted.length === 0) { toast.error("Select at least one item to accept."); return; }
          onAcceptRefinement(sectionKey, JSON.stringify(accepted));
        } else { toast.error("AI did not return valid structured data. Please try again."); return; }
      } else {
        const accepted = structuredItems.filter((_, i) => selectedItems.has(i));
        if (accepted.length === 0) { toast.error("Select at least one item to accept."); return; }
        const itemFmt = getSectionFormatType(sectionKey);
        if (itemFmt === 'line_items') onAcceptRefinement(sectionKey, JSON.stringify({ items: accepted }));
        else onAcceptRefinement(sectionKey, JSON.stringify(accepted));
      }
    } else {
      onAcceptRefinement(sectionKey, refinedContent);
    }

    setRefinedContent(null); setEditedComments([]); setSelectedItems(new Set());
    setEditedSuggestedContent(null); setEditedDeliverableItems(null);
    setIsAddressed(true); setIsOpen(false); onMarkAddressed?.(sectionKey);
  }, [refinedContent, onAcceptRefinement, sectionKey, onMarkAddressed, isStructured, structuredItems, selectedItems, isMasterData, suggestedCodes, masterDataOptions, editedSuggestedContent, isDeliverableLike, editedDeliverableItems, parsedDeliverableObjects, complexityRatings]);

  const handleDiscard = useCallback(() => {
    setRefinedContent(null); setSelectedItems(new Set());
    setEditedSuggestedContent(null); setEditedDeliverableItems(null);
  }, []);

  return {
    // State
    editedComments, editingIndex, selectedComments, isRefining, refinedContent,
    isAddressed, isReReviewing, isOpen, selectedItems, editedSuggestedContent,
    editedDeliverableItems, isStructured, isMasterData, isDeliverableLike,
    comments, structuredItems, parsedDeliverableObjects, suggestedCodes,
    // Setters
    setIsOpen, setEditedSuggestedContent, setEditedDeliverableItems, setSelectedItems,
    // Handlers
    handleEditComment, handleCommentChange, handleSaveComment,
    handleToggleComment, handleSelectAllComments, handleClearAllComments,
    handleToggleItem, handleReReview, handleRefineWithAI, handleAccept, handleDiscard,
  };
}
