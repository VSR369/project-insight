/**
 * AIReviewInline — Role-agnostic per-section AI review panel.
 * Extracted from CurationAIReviewInline for reuse across AM/RQ, CR/CA, and CU roles.
 *
 * Phase 5B: Now format-aware for master-data sections (checkbox_multi, checkbox_single,
 * select, radio). AI suggestions for these sections are parsed as code arrays/strings
 * and rendered natively — never as prose.
 *
 * Flow: AI reviews → auto-refine → unified panel with review + suggestion →
 *       Accept suggestion / Keep original
 */

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, RefreshCw, Send } from "lucide-react";
import { AIReviewResultPanel } from "@/components/cogniblend/curation/AIReviewResultPanel";
import { SECTION_FORMAT_CONFIG } from "@/lib/cogniblend/curationSectionFormats";
import { parseDeliverables, type DeliverableItem } from "@/utils/parseDeliverableItem";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface SectionReview {
  section_key: string;
  status: "pass" | "warning" | "needs_revision";
  comments: string[];
  reviewed_at?: string;
  addressed?: boolean;
  prompt_source?: "supervisor" | "default";
  /** Original triage status from Phase 1 (preserved through Phase 2 deep review) */
  triage_status?: "pass" | "warning" | "inferred";
  /** Which phase generated this review */
  phase?: "triage" | "deep";
  /** Confidence score from Phase 1 triage (0.0-1.0) */
  confidence?: number;
}

export type RoleContext = "intake" | "spec" | "curation";

/** Sections that should render as structured deliverable cards */
const DELIVERABLE_LIKE_SECTIONS = new Set(['deliverables', 'expected_outcomes']);

function getDeliverableBadgePrefix(sectionKey: string): string {
  if (sectionKey === 'expected_outcomes') return 'O';
  return 'D';
}

/** Determine if a section returns structured JSON arrays from AI refinement */
function isStructuredSection(sectionKey: string): boolean {
  const fmt = SECTION_FORMAT_CONFIG[sectionKey];
  if (!fmt) return false;
  return ['line_items', 'table', 'schedule_table'].includes(fmt.format);
}

/** Determine the format type of a section */
function getSectionFormatType(sectionKey: string): string | null {
  return SECTION_FORMAT_CONFIG[sectionKey]?.format ?? null;
}

/** Determine if a section is a master-data selection (codes, not prose) */
function isMasterDataSection(sectionKey: string): boolean {
  const fmt = SECTION_FORMAT_CONFIG[sectionKey];
  if (!fmt) return false;
  return ['checkbox_multi', 'checkbox_single', 'select', 'radio'].includes(fmt.format);
}

interface MasterDataOption {
  value: string;
  label: string;
  description?: string;
}

interface AIReviewInlineProps {
  sectionKey: string;
  review: SectionReview | undefined;
  currentContent: string | null;
  challengeId: string;
  challengeContext: {
    title?: string;
    maturity_level?: string | null;
    domain_tags?: string[];
  };
  onAcceptRefinement: (sectionKey: string, newContent: string) => void;
  onSingleSectionReview?: (sectionKey: string, review: SectionReview) => void;
  onMarkAddressed?: (sectionKey: string) => void;
  defaultOpen?: boolean;
  /** Role context for edge function — tailors review & refinement prompts */
  roleContext?: RoleContext;
  /** Master data options for this section (if applicable) */
  masterDataOptions?: MasterDataOption[];
  /** When true, hides Refine/Accept/Discard and shows Send to LC/FC instead */
  isLockedSection?: boolean;
  /** Callback when curator clicks "Send to LC" or "Send to FC" — receives edited comments text */
  onSendToCoordinator?: (editedComments: string) => void;
  /** Which coordinator role to display: "LC" or "FC" */
  coordinatorRole?: "LC" | "FC";
  /** Whether comments have been sent before (changes button to "Send Follow-up") */
  hasSentBefore?: boolean;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pass: { label: "Pass", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  warning: { label: "Warning", className: "bg-amber-100 text-amber-800 border-amber-300" },
  needs_revision: { label: "Needs Revision", className: "bg-red-100 text-red-800 border-red-300" },
  inferred: { label: "AI Inferred", className: "bg-violet-100 text-violet-800 border-violet-300" },
};

/**
 * Parse AI refinement output into structured data.
 * Format-aware: preserves row objects for table/schedule_table, returns strings for line_items.
 */
function parseStructuredItems(content: string, sectionKey: string): string[] | null {
  const trimmed = content.trim();
  const cleaned = trimmed.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      // For line_items: flatten to strings
      const fmt = getSectionFormatType(sectionKey);
      if (fmt === 'line_items') {
        return parsed.map((item: any) =>
          typeof item === "string" ? item : item?.name ?? item?.criterion_name ?? JSON.stringify(item)
        );
      }
      // For table/schedule_table: store as JSON strings to preserve row structure
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
 * Returns null if not parseable.
 */
function parseRawStructuredArray(content: string): any[] | null {
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
 * For multi-select: returns array of code strings.
 * For single-select: returns array with one code string.
 */
function parseMasterDataCodes(content: string, sectionKey: string): string[] | null {
  const cleaned = content.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  // Try JSON array parse (multi-select)
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.filter((v: any) => typeof v === "string" && v.trim().length > 0);
    }
  } catch {
    // Not a JSON array
  }

  // For single-code sections, treat the whole string as a code (strip quotes)
  const singleCode = cleaned.replace(/^["']|["']$/g, '').trim();
  if (singleCode.length > 0 && !singleCode.includes(' ')) {
    return [singleCode];
  }

  // Try comma-separated
  const parts = singleCode.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  if (parts.length > 0) return parts;

  return null;
}

export function AIReviewInline({
  sectionKey,
  review,
  currentContent,
  challengeId,
  challengeContext,
  onAcceptRefinement,
  onSingleSectionReview,
  onMarkAddressed,
  defaultOpen = false,
  roleContext = "curation",
  masterDataOptions,
  isLockedSection = false,
  onSendToCoordinator,
  coordinatorRole,
  hasSentBefore = false,
}: AIReviewInlineProps) {
  const [editedComments, setEditedComments] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedComments, setSelectedComments] = useState<Set<number>>(new Set());
  const [isRefining, setIsRefining] = useState(false);
  const [refinedContent, setRefinedContent] = useState<string | null>(null);
  const [isAddressed, setIsAddressed] = useState(review?.addressed ?? false);
  const [isReReviewing, setIsReReviewing] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen && !(review?.addressed ?? false));

  // Structured items state (for deliverables, eval criteria, line_items)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [editedSuggestedContent, setEditedSuggestedContent] = useState<any>(null);

  // Structured deliverable items state (for deliverables/expected_outcomes card rendering)
  const [editedDeliverableItems, setEditedDeliverableItems] = useState<DeliverableItem[] | null>(null);

  const isStructured = isStructuredSection(sectionKey);
  const isMasterData = isMasterDataSection(sectionKey);
  const isDeliverableLike = DELIVERABLE_LIKE_SECTIONS.has(sectionKey);

  useEffect(() => {
    if (defaultOpen && !isAddressed) setIsOpen(true);
  }, [defaultOpen, isAddressed]);

  const comments = editedComments.length > 0 ? editedComments : (review?.comments ?? []);

  useEffect(() => {
    if (comments.length > 0 && selectedComments.size === 0) {
      setSelectedComments(new Set(comments.map((_, i) => i)));
    }
  }, [comments.length]);

  // ── Auto-refine: trigger refinement automatically after review arrives with comments ──
  const autoRefineTriggered = React.useRef(false);
  useEffect(() => {
    if (
      !autoRefineTriggered.current &&
      !isLockedSection &&
      review &&
      !review.addressed &&
      (review.status === "warning" || review.status === "needs_revision") &&
      review.comments && review.comments.length > 0 &&
      !refinedContent &&
      !isRefining &&
      selectedComments.size > 0
    ) {
      autoRefineTriggered.current = true;
      // Small delay to allow UI to settle
      const timer = setTimeout(() => {
        handleRefineWithAI();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [review, refinedContent, isRefining, isLockedSection, selectedComments.size]);

  // Reset auto-refine flag AND stale suggestion state when review changes (e.g. re-review or new deep review)
  const prevReviewSignature = React.useRef<string | null>(null);
  useEffect(() => {
    const sig = `${review?.reviewed_at}|${review?.status}|${(review?.comments ?? []).length}`;
    if (prevReviewSignature.current !== null && prevReviewSignature.current !== sig) {
      // Review changed — clear stale refinement/suggestion state
      autoRefineTriggered.current = false;
      setRefinedContent(null);
      setEditedSuggestedContent(null);
      setEditedDeliverableItems(null);
      setSelectedItems(new Set());
    }
    prevReviewSignature.current = sig;
  }, [review?.reviewed_at, review?.status, review?.comments]);

  // Parse structured items from refined content
  const structuredItems = useMemo(() => {
    if (!isStructured || !refinedContent) return null;
    return parseStructuredItems(refinedContent, sectionKey);
  }, [isStructured, refinedContent, sectionKey]);

  // Parse deliverable objects from refined content (for deliverables/expected_outcomes)
  const parsedDeliverableObjects = useMemo(() => {
    if (!isDeliverableLike || !refinedContent) return null;
    const cleaned = refinedContent.trim().replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      const arr = Array.isArray(parsed) ? parsed : (parsed?.items ?? parsed?.deliverables ?? null);
      if (Array.isArray(arr) && arr.length > 0) {
        const prefix = getDeliverableBadgePrefix(sectionKey);
        return parseDeliverables(arr, prefix);
      }
    } catch { /* not JSON — fall through */ }
    return null;
  }, [isDeliverableLike, refinedContent, sectionKey]);

  // Parse master-data codes from refined content
  const suggestedCodes = useMemo(() => {
    if (!isMasterData || !refinedContent) return null;
    return parseMasterDataCodes(refinedContent, sectionKey);
  }, [isMasterData, refinedContent, sectionKey]);

  // Select all structured items by default when they appear
  useEffect(() => {
    if (structuredItems && structuredItems.length > 0) {
      setSelectedItems(new Set(structuredItems.map((_, i) => i)));
    }
  }, [structuredItems]);

  // Select all master-data codes by default when they appear
  useEffect(() => {
    if (suggestedCodes && suggestedCodes.length > 0) {
      setSelectedItems(new Set(suggestedCodes.map((_, i) => i)));
    }
  }, [suggestedCodes]);

  const handleEditComment = useCallback((index: number) => {
    if (editedComments.length === 0 && review?.comments) {
      setEditedComments([...review.comments]);
    }
    setEditingIndex(index);
  }, [editedComments.length, review?.comments]);

  const handleCommentChange = useCallback((index: number, value: string) => {
    setEditedComments((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }, []);

  const handleSaveComment = useCallback(() => {
    setEditingIndex(null);
  }, []);

  const handleToggleComment = useCallback((index: number) => {
    setSelectedComments((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }, []);

  const handleSelectAllComments = useCallback(() => {
    setSelectedComments(new Set(comments.map((_, i) => i)));
  }, [comments]);

  const handleClearAllComments = useCallback(() => {
    setSelectedComments(new Set());
  }, []);

  const handleToggleItem = useCallback((index: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }, []);

  const handleReReview = useCallback(async () => {
    if (!challengeId) return;
    setIsReReviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke("review-challenge-sections", {
        body: { challenge_id: challengeId, section_key: sectionKey, role_context: roleContext },
      });

      if (error) {
        let msg = error.message;
        try { const body = await (error as any).context?.json?.(); msg = body?.error?.message ?? msg; } catch {}
        throw new Error(msg);
      }

      if (data?.success && data.data?.sections) {
        const freshReview = (data.data.sections as SectionReview[])[0];
        if (freshReview) {
          setIsAddressed(false);
          setEditedComments([]);
          setSelectedComments(new Set(freshReview.comments.map((_, i) => i)));
          onSingleSectionReview?.(sectionKey, freshReview);
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
  }, [challengeId, sectionKey, roleContext, onSingleSectionReview]);

  const handleRefineWithAI = useCallback(async () => {
    if (!challengeId) return;

    const selectedInstructions = comments
      .filter((_, i) => selectedComments.has(i))
      .join("\n\n");

    if (!selectedInstructions.trim()) {
      toast.error("Select at least one review comment to use as refinement instructions.");
      return;
    }

    setIsRefining(true);
    setRefinedContent(null);

    try {
      const { data, error } = await supabase.functions.invoke("refine-challenge-section", {
        body: {
          challenge_id: challengeId,
          section_key: sectionKey,
          current_content: currentContent || "[empty — no content yet]",
          issues: comments,
          curator_instructions: selectedInstructions,
          role_context: roleContext,
          context: {
            title: challengeContext.title,
            maturity_level: challengeContext.maturity_level,
            domain_tags: challengeContext.domain_tags,
          },
        },
      });

      if (error) {
        let msg = error.message;
        try { const body = await (error as any).context?.json?.(); msg = body?.error?.message ?? msg; } catch {}
        throw new Error(msg);
      }

      if (data?.success && data.data?.refined_content) {
        setRefinedContent(data.data.refined_content);
        toast.success("AI refinement ready — review the proposed changes below.");
      } else {
        throw new Error(data?.error?.message ?? "Unexpected response from AI refinement");
      }
    } catch (e: any) {
      toast.error(`Refinement failed: ${e.message ?? "Unknown error"}`);
    } finally {
      setIsRefining(false);
    }
  }, [challengeId, sectionKey, currentContent, comments, selectedComments, challengeContext, roleContext]);

  const handleAccept = useCallback(() => {
    if (!refinedContent) return;

    // If user edited the suggestion, use the edited version
    const hasEdits = editedSuggestedContent != null;

    // Deliverable-like sections: serialize as structured objects
    if (isDeliverableLike && (editedDeliverableItems || parsedDeliverableObjects)) {
      const items = editedDeliverableItems ?? parsedDeliverableObjects;
      if (!items || items.length === 0) {
        toast.error("No deliverable items to accept.");
        return;
      }
      onAcceptRefinement(sectionKey, JSON.stringify({ items }));
    }
    // Master-data sections: validate codes against options and pass as JSON array
    else if (isMasterData && suggestedCodes && suggestedCodes.length > 0) {
      const accepted = suggestedCodes.filter((_, i) => selectedItems.has(i));
      if (accepted.length === 0) {
        toast.error("Select at least one option to accept.");
        return;
      }
      if (masterDataOptions && masterDataOptions.length > 0) {
        const validCodes = new Set(masterDataOptions.map(o => o.value));
        const invalid = accepted.filter(c => !validCodes.has(c));
        if (invalid.length > 0) {
          toast.error(`AI returned invalid codes: ${invalid.join(", ")}. Only valid master data codes are allowed.`);
          return;
        }
      }
      const fmt = SECTION_FORMAT_CONFIG[sectionKey];
      if (fmt && ['checkbox_single', 'select', 'radio'].includes(fmt.format)) {
        onAcceptRefinement(sectionKey, accepted[0]);
      } else if (fmt && fmt.format === 'line_items') {
        onAcceptRefinement(sectionKey, JSON.stringify({ items: accepted }));
      } else {
        onAcceptRefinement(sectionKey, JSON.stringify(accepted));
      }
    } else if (hasEdits) {
      // User manually edited the suggestion — use edited content
      if (typeof editedSuggestedContent === "string") {
        onAcceptRefinement(sectionKey, editedSuggestedContent);
      } else if (Array.isArray(editedSuggestedContent)) {
        const editFmt = getSectionFormatType(sectionKey);
        if (editFmt === 'line_items') {
          onAcceptRefinement(sectionKey, JSON.stringify({ items: editedSuggestedContent }));
        } else {
          onAcceptRefinement(sectionKey, JSON.stringify(editedSuggestedContent));
        }
      } else {
        onAcceptRefinement(sectionKey, JSON.stringify(editedSuggestedContent));
      }
    } else if (isStructured && structuredItems && structuredItems.length > 0) {
      const fmt = getSectionFormatType(sectionKey);
      
      if (fmt === 'table' || fmt === 'schedule_table') {
        const rawArray = parseRawStructuredArray(refinedContent);
        if (rawArray) {
          const accepted = rawArray.filter((_, i) => selectedItems.has(i));
          if (accepted.length === 0) {
            toast.error("Select at least one item to accept.");
            return;
          }
          onAcceptRefinement(sectionKey, JSON.stringify(accepted));
        } else {
          toast.error("AI did not return valid structured data. Please try again.");
          return;
        }
      } else {
        const accepted = structuredItems.filter((_, i) => selectedItems.has(i));
        if (accepted.length === 0) {
          toast.error("Select at least one item to accept.");
          return;
        }
        const itemFmt = getSectionFormatType(sectionKey);
        if (itemFmt === 'line_items') {
          onAcceptRefinement(sectionKey, JSON.stringify({ items: accepted }));
        } else {
          onAcceptRefinement(sectionKey, JSON.stringify(accepted));
        }
      }
    } else {
      onAcceptRefinement(sectionKey, refinedContent);
    }

    setRefinedContent(null);
    setEditedComments([]);
    setSelectedItems(new Set());
    setEditedSuggestedContent(null);
    setEditedDeliverableItems(null);
    setIsAddressed(true);
    setIsOpen(false);
    onMarkAddressed?.(sectionKey);
  }, [refinedContent, onAcceptRefinement, sectionKey, onMarkAddressed, isStructured, structuredItems, selectedItems, isMasterData, suggestedCodes, masterDataOptions, editedSuggestedContent, isDeliverableLike, editedDeliverableItems, parsedDeliverableObjects]);

  const handleDiscard = useCallback(() => {
    setRefinedContent(null);
    setSelectedItems(new Set());
    setEditedSuggestedContent(null);
    setEditedDeliverableItems(null);
  }, []);

  const isPending = !review;
  const isInferred = review?.triage_status === "inferred";
  const isPassWithNoComments = review?.status === "pass" && (!review.comments || review.comments.length === 0);

  const style = isPending
    ? { label: "Pending", className: "bg-muted text-muted-foreground border-border" }
    : isAddressed
      ? { label: "Addressed", className: "bg-blue-100 text-blue-800 border-blue-300" }
      : isInferred
        ? STATUS_STYLES.inferred
        : (STATUS_STYLES[review.status] ?? STATUS_STYLES.pass);

  const allCommentsSelected = selectedComments.size === comments.length;

  return (
    <div className={cn("mt-3 rounded-md border bg-muted/30", isAddressed ? "border-blue-200/60" : "border-border/60")}>
      <div className="px-3 py-3 space-y-3">
        {isPending ? (
          <p className="text-xs text-muted-foreground italic py-2">
            Run <span className="font-medium text-foreground">"Review with AI"</span> to generate review comments for this section.
          </p>
        ) : isAddressed ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground italic py-1">
              This section has been addressed. Click below to re-review with AI.
            </p>
            <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={handleReReview} disabled={isReReviewing}>
              {isReReviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
              {isReReviewing ? "Re-reviewing…" : "Re-review this section"}
            </Button>
          </div>
        ) : (
          <>
            {isPassWithNoComments ? (
              <div className="space-y-2">
                <p className="text-xs text-emerald-700 py-1 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  This section looks good — no issues found.
                </p>
                <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={handleReReview} disabled={isReReviewing}>
                  {isReReviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                  {isReReviewing ? "Re-reviewing…" : "Re-review this section"}
                </Button>
              </div>
            ) : (
              <>
                {/* Locked sections: Send to LC/FC button */}
                {isLockedSection && !isPassWithNoComments && onSendToCoordinator && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs h-7"
                    onClick={() => {
                      const selectedText = comments
                        .filter((_, i) => selectedComments.has(i))
                        .join("\n\n");
                      onSendToCoordinator(selectedText || comments.join("\n\n"));
                    }}
                    disabled={selectedComments.size === 0}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    {hasSentBefore
                      ? `Send Follow-up to ${coordinatorRole ?? "Coordinator"}`
                      : `Send to ${coordinatorRole ?? "Coordinator"}`}
                  </Button>
                )}

                {/* Non-locked sections: Unified panel with review + suggested version */}
                {!isLockedSection && (
                  <AIReviewResultPanel
                    sectionKey={sectionKey}
                    result={{
                      status: review?.status ?? "warning",
                      comments: comments,
                      suggested_version: refinedContent ?? undefined,
                    }}
                    isRefining={isRefining}
                    structuredItems={structuredItems}
                    selectedItems={selectedItems}
                    onToggleItem={handleToggleItem}
                    onSelectAllItems={() => {
                      const items = suggestedCodes ?? structuredItems;
                      if (items) setSelectedItems(new Set(items.map((_, i) => i)));
                    }}
                    onClearItems={() => setSelectedItems(new Set())}
                    onAccept={handleAccept}
                    onDiscard={handleDiscard}
                    isStructured={isStructured}
                    isMasterData={isMasterData}
                    suggestedCodes={suggestedCodes}
                    masterDataOptions={masterDataOptions}
                    onSuggestedVersionChange={setEditedSuggestedContent}
                    confidence={review?.confidence}
                    onConfirmPass={review?.status === "pass" && review?.phase === "triage" ? () => onMarkAddressed?.(sectionKey) : undefined}
                    onFlagForReview={review?.status === "pass" && review?.phase === "triage" ? () => onSingleSectionReview?.(sectionKey, { ...review, status: "warning", triage_status: "warning" }) : undefined}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
