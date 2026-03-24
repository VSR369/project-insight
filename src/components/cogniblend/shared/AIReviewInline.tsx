/**
 * AIReviewInline — Role-agnostic per-section AI review panel.
 * Extracted from CurationAIReviewInline for reuse across AM/RQ, CR/CA, and CU roles.
 *
 * Flow: AI reviews → user selects comments → "Refine with AI" →
 *       AI rewrites section → Accept / Discard (item-level for structured sections)
 *
 * States:
 *   Never reviewed  →  "Pending" badge, collapsed
 *   Batch reviewed  →  Shows comments, auto-expands if warning/needs_revision
 *   Addressed       →  "Addressed" badge, collapsed, "Re-review" button
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bot, ChevronDown, Sparkles, Check, X, Loader2, Pencil, RefreshCw } from "lucide-react";
import { AiContentRenderer } from "@/components/ui/AiContentRenderer";
import { AIReviewResultPanel } from "@/components/cogniblend/curation/AIReviewResultPanel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface SectionReview {
  section_key: string;
  status: "pass" | "warning" | "needs_revision";
  comments: string[];
  reviewed_at?: string;
  addressed?: boolean;
}

export type RoleContext = "intake" | "spec" | "curation";

/** Sections that return structured JSON arrays from AI refinement */
const STRUCTURED_SECTIONS = new Set(["deliverables", "evaluation_criteria"]);

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
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pass: { label: "Pass", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  warning: { label: "Warning", className: "bg-amber-100 text-amber-800 border-amber-300" },
  needs_revision: { label: "Needs Revision", className: "bg-red-100 text-red-800 border-red-300" },
};

/**
 * Parse AI refinement output into an array of structured items.
 * Handles: JSON array, JSON object with items/criteria key, markdown lists, numbered lists.
 */
function parseStructuredItems(content: string, sectionKey: string): string[] | null {
  const trimmed = content.trim();

  // Strip markdown code fences
  const cleaned = trimmed.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  // Try JSON parse
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) =>
        typeof item === "string" ? item : item?.name ?? item?.criterion_name ?? JSON.stringify(item)
      );
    }
    // Object with wrapper key
    const wrapperKey = sectionKey === "evaluation_criteria" ? "criteria" : "items";
    if (parsed && typeof parsed === "object" && Array.isArray(parsed[wrapperKey])) {
      return parsed[wrapperKey].map((item: any) =>
        typeof item === "string" ? item : item?.name ?? item?.criterion_name ?? JSON.stringify(item)
      );
    }
  } catch {
    // Not JSON — try line-based parsing
  }

  // Try numbered/bulleted list parsing
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
  const listItems = lines
    .map(l => l.replace(/^(?:\d+[\.\)]\s*|[-*•]\s*)/, '').trim())
    .filter(l => l.length > 0);

  if (listItems.length >= 2) return listItems;

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
}: AIReviewInlineProps) {
  const [editedComments, setEditedComments] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedComments, setSelectedComments] = useState<Set<number>>(new Set());
  const [isRefining, setIsRefining] = useState(false);
  const [refinedContent, setRefinedContent] = useState<string | null>(null);
  const [isAddressed, setIsAddressed] = useState(review?.addressed ?? false);
  const [isReReviewing, setIsReReviewing] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen && !(review?.addressed ?? false));

  // Structured items state (for deliverables, eval criteria)
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const isStructured = STRUCTURED_SECTIONS.has(sectionKey);

  useEffect(() => {
    if (defaultOpen && !isAddressed) setIsOpen(true);
  }, [defaultOpen, isAddressed]);

  const comments = editedComments.length > 0 ? editedComments : (review?.comments ?? []);

  // Initialize all comments as selected when comments change
  useEffect(() => {
    if (comments.length > 0 && selectedComments.size === 0) {
      setSelectedComments(new Set(comments.map((_, i) => i)));
    }
  }, [comments.length]);

  // Parse structured items from refined content
  const structuredItems = useMemo(() => {
    if (!isStructured || !refinedContent) return null;
    return parseStructuredItems(refinedContent, sectionKey);
  }, [isStructured, refinedContent, sectionKey]);

  // Select all structured items by default when they appear
  useEffect(() => {
    if (structuredItems && structuredItems.length > 0) {
      setSelectedItems(new Set(structuredItems.map((_, i) => i)));
    }
  }, [structuredItems]);

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
          const hasIssues = freshReview.comments.length > 0 && freshReview.status !== "pass";
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

    // Use only selected comments
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

    // For structured sections with parsed items, build JSON from selected items only
    if (isStructured && structuredItems && structuredItems.length > 0) {
      const accepted = structuredItems.filter((_, i) => selectedItems.has(i));
      if (accepted.length === 0) {
        toast.error("Select at least one item to accept.");
        return;
      }
      const wrapperKey = sectionKey === "evaluation_criteria" ? "criteria" : "items";
      const jsonPayload = JSON.stringify({ [wrapperKey]: accepted });
      onAcceptRefinement(sectionKey, jsonPayload);
    } else {
      onAcceptRefinement(sectionKey, refinedContent);
    }

    setRefinedContent(null);
    setEditedComments([]);
    setSelectedItems(new Set());
    setIsAddressed(true);
    setIsOpen(false);
    onMarkAddressed?.(sectionKey);
  }, [refinedContent, onAcceptRefinement, sectionKey, onMarkAddressed, isStructured, structuredItems, selectedItems]);

  const handleDiscard = useCallback(() => {
    setRefinedContent(null);
    setSelectedItems(new Set());
  }, []);

  const isPending = !review;
  const isPassWithNoComments = review?.status === "pass" && (!review.comments || review.comments.length === 0);

  const style = isPending
    ? { label: "Pending", className: "bg-muted text-muted-foreground border-border" }
    : isAddressed
      ? { label: "Addressed", className: "bg-blue-100 text-blue-800 border-blue-300" }
      : (STATUS_STYLES[review.status] ?? STATUS_STYLES.pass);

  const allCommentsSelected = selectedComments.size === comments.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("mt-3 rounded-md border bg-muted/30", isAddressed ? "border-blue-200/60" : "border-border/60")}>
      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full px-3 py-2">
        <Bot className="h-3.5 w-3.5" />
        <span className="font-medium">AI Review</span>
        <Badge className={cn("text-[10px] px-1.5 py-0", style.className)}>{style.label}</Badge>
        <ChevronDown className={cn("h-3 w-3 ml-auto transition-transform", isOpen && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 space-y-3">
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
              <p className="text-xs text-emerald-700 py-1 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                This section looks good — no issues found.
              </p>
            ) : (
              <div className="space-y-2">
                {/* Select all / Clear all toggle for comments */}
                {comments.length > 1 && !refinedContent && (
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <button
                      type="button"
                      className="underline hover:text-foreground transition-colors"
                      onClick={allCommentsSelected ? handleClearAllComments : handleSelectAllComments}
                    >
                      {allCommentsSelected ? "Clear all" : "Select all"}
                    </button>
                    <span>({selectedComments.size}/{comments.length} selected)</span>
                  </div>
                )}
                {comments.map((comment, i) => (
                  <div key={i} className="group">
                    {editingIndex === i ? (
                      <div className="space-y-1.5">
                        <Textarea
                          value={editedComments[i] ?? comment}
                          onChange={(e) => handleCommentChange(i, e.target.value)}
                          className="text-xs min-h-[60px] bg-background"
                          placeholder="Edit this review comment to refine the AI instruction..."
                        />
                        <div className="flex gap-1.5 justify-end">
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setEditingIndex(null)}>Cancel</Button>
                          <Button size="sm" className="h-6 text-[10px] px-2" onClick={handleSaveComment}>
                            <Check className="h-3 w-3 mr-0.5" />Done
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1.5 hover:bg-muted/50 rounded p-1 -mx-1 transition-colors">
                        {!refinedContent && (
                          <Checkbox
                            checked={selectedComments.has(i)}
                            onCheckedChange={() => handleToggleComment(i)}
                            className="mt-0.5 h-3.5 w-3.5"
                          />
                        )}
                        <span
                          className={cn(
                            "text-xs leading-relaxed flex-1 cursor-pointer",
                            selectedComments.has(i) ? "text-foreground" : "text-muted-foreground line-through"
                          )}
                          onClick={() => handleEditComment(i)}
                        >
                          {comment}
                        </span>
                        <Pencil className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity cursor-pointer" onClick={() => handleEditComment(i)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!refinedContent && !isPassWithNoComments && (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs h-7"
                onClick={handleRefineWithAI}
                disabled={isRefining || selectedComments.size === 0}
              >
                {isRefining ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                {isRefining ? "Refining…" : currentContent ? "Refine with AI" : "Draft with AI"}
              </Button>
            )}

            {refinedContent && (
              <AIReviewResultPanel
                sectionKey={sectionKey}
                result={{
                  status: review?.status ?? "warning",
                  comments: comments,
                  suggested_version: refinedContent,
                }}
                structuredItems={structuredItems}
                selectedItems={selectedItems}
                onToggleItem={handleToggleItem}
                onSelectAllItems={() => structuredItems && setSelectedItems(new Set(structuredItems.map((_, i) => i)))}
                onClearItems={() => setSelectedItems(new Set())}
                onAccept={handleAccept}
                onDiscard={handleDiscard}
                isStructured={isStructured}
              />
            )}
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
