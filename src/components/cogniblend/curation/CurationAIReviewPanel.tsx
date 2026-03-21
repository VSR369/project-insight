/**
 * CurationAIReviewPanel — Interactive per-section AI review with editable
 * comments, AI refinement loop, and per-section re-review.
 *
 * Flow: AI reviews → curator edits comments → "Refine with AI" →
 *       AI rewrites section → Accept / Discard
 *
 * States:
 *   Never reviewed  →  "Pending" badge, collapsed, shows prompt text
 *   Batch reviewed  →  Shows comments, auto-expands if warning/needs_revision
 *   Addressed       →  "Addressed" badge, collapsed, click → "Re-review" button
 *   Re-reviewed     →  Shows fresh comments or "Good to go" message
 */

import { useState, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bot, ChevronDown, Sparkles, Check, X, Loader2, Pencil, RefreshCw } from "lucide-react";
import { SafeHtmlRenderer } from "@/components/ui/SafeHtmlRenderer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface SectionReview {
  section_key: string;
  status: "pass" | "warning" | "needs_revision";
  comments: string[];
  reviewed_at?: string;
}

interface CurationAIReviewPanelProps {
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
  defaultOpen?: boolean;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pass: { label: "Pass", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  warning: { label: "Warning", className: "bg-amber-100 text-amber-800 border-amber-300" },
  needs_revision: { label: "Needs Revision", className: "bg-red-100 text-red-800 border-red-300" },
};

export function CurationAIReviewInline({
  sectionKey,
  review,
  currentContent,
  challengeId,
  challengeContext,
  onAcceptRefinement,
  onSingleSectionReview,
  defaultOpen = false,
}: CurationAIReviewPanelProps) {
  const [editedComments, setEditedComments] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refinedContent, setRefinedContent] = useState<string | null>(null);
  const [isAddressed, setIsAddressed] = useState(false);
  const [isReReviewing, setIsReReviewing] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen && !isAddressed);

  // Auto-expand when review arrives with warning/needs_revision, but only if not addressed
  useEffect(() => {
    if (defaultOpen && !isAddressed) setIsOpen(true);
  }, [defaultOpen, isAddressed]);

  // Sync edited comments when review changes
  const comments = editedComments.length > 0 ? editedComments : (review?.comments ?? []);

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

  /** Re-review a single section via edge function */
  const handleReReview = useCallback(async () => {
    if (!challengeId) return;
    setIsReReviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke("review-challenge-sections", {
        body: { challenge_id: challengeId, section_key: sectionKey },
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
  }, [challengeId, sectionKey, onSingleSectionReview]);

  const handleRefineWithAI = useCallback(async () => {
    if (!challengeId || !currentContent) return;

    const instructions = comments.join("\n\n");
    if (!instructions.trim()) {
      toast.error("No review comments to use as refinement instructions.");
      return;
    }

    setIsRefining(true);
    setRefinedContent(null);

    try {
      const { data, error } = await supabase.functions.invoke("refine-challenge-section", {
        body: {
          challenge_id: challengeId,
          section_key: sectionKey,
          current_content: currentContent,
          curator_instructions: instructions,
          context: {
            title: challengeContext.title,
            maturity_level: challengeContext.maturity_level,
            domain_tags: challengeContext.domain_tags,
          },
        },
      });

      if (error) {
        let msg = error.message;
        try {
          const body = await (error as any).context?.json?.();
          msg = body?.error?.message ?? msg;
        } catch {}
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
  }, [challengeId, sectionKey, currentContent, comments, challengeContext]);

  const handleAccept = useCallback(() => {
    if (refinedContent) {
      onAcceptRefinement(sectionKey, refinedContent);
      setRefinedContent(null);
      setEditedComments([]);
      setIsAddressed(true);
      setIsOpen(false);
    }
  }, [refinedContent, onAcceptRefinement, sectionKey]);

  const handleDiscard = useCallback(() => {
    setRefinedContent(null);
  }, []);

  const isPending = !review;
  const isPassWithNoComments = review?.status === "pass" && (!review.comments || review.comments.length === 0);

  const style = isPending
    ? { label: "Pending", className: "bg-muted text-muted-foreground border-border" }
    : isAddressed
      ? { label: "Addressed", className: "bg-blue-100 text-blue-800 border-blue-300" }
      : (STATUS_STYLES[review.status] ?? STATUS_STYLES.pass);

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
            Run <span className="font-medium text-foreground">"Review Sections by AI"</span> to generate review comments for this section.
          </p>
        ) : isAddressed ? (
          /* Addressed state — offer re-review */
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground italic py-1">
              This section has been addressed. Click below to re-review with AI.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-7"
              onClick={handleReReview}
              disabled={isReReviewing}
            >
              {isReReviewing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
              )}
              {isReReviewing ? "Re-reviewing…" : "Re-review this section"}
            </Button>
          </div>
        ) : (
          <>
            {/* Pass with no comments */}
            {isPassWithNoComments ? (
              <p className="text-xs text-emerald-700 py-1 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                This section looks good — no issues found.
              </p>
            ) : (
              /* Editable comments */
              <div className="space-y-2">
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
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setEditingIndex(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" className="h-6 text-[10px] px-2" onClick={handleSaveComment}>
                            <Check className="h-3 w-3 mr-0.5" />Done
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex items-start gap-1.5 cursor-pointer hover:bg-muted/50 rounded p-1 -mx-1 transition-colors"
                        onClick={() => handleEditComment(i)}
                      >
                        <span className="text-xs text-muted-foreground leading-relaxed flex-1">• {comment}</span>
                        <Pencil className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Refine button */}
            {!refinedContent && !isPassWithNoComments && (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs h-7"
                onClick={handleRefineWithAI}
                disabled={isRefining || !currentContent}
              >
                {isRefining ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                )}
                {isRefining ? "Refining…" : "Refine with AI"}
              </Button>
            )}

            {/* Re-review button for reviewed sections */}
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-xs h-6 text-muted-foreground"
              onClick={handleReReview}
              disabled={isReReviewing}
            >
              {isReReviewing ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              {isReReviewing ? "Re-reviewing…" : "Re-review this section"}
            </Button>

            {/* Refined content preview */}
            {refinedContent && (
              <div className="space-y-2">
                <p className="text-[10px] font-medium text-primary uppercase tracking-wide">Proposed Refinement</p>
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm leading-relaxed max-h-60 overflow-y-auto">
                  <SafeHtmlRenderer html={refinedContent} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleDiscard}>
                    <X className="h-3.5 w-3.5 mr-1" />Discard
                  </Button>
                  <Button size="sm" className="h-7 text-xs" onClick={handleAccept}>
                    <Check className="h-3.5 w-3.5 mr-1" />Accept & Save
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
