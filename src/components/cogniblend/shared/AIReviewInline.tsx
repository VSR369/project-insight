/**
 * AIReviewInline — Role-agnostic per-section AI review panel.
 * State and handlers extracted to useAIReviewInlineState.ts.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, RefreshCw, Send } from "lucide-react";
import { AIReviewResultPanel } from "@/components/cogniblend/curation/AIReviewResultPanel";
import { cn } from "@/lib/utils";
import { STATUS_STYLES, getDeliverableBadgePrefix } from "./aiReviewInlineHelpers";
import { useAIReviewInlineState } from "./useAIReviewInlineState";

/** Comment can be a plain string (legacy) or structured object (multi-tier) */
export type SectionComment = string | { text: string; type?: string; severity?: string; field?: string; comment?: string; reasoning?: string };

export interface SectionReview {
  section_key: string;
  status: "pass" | "warning" | "needs_revision" | "generated";
  comments: SectionComment[];
  reviewed_at?: string;
  addressed?: boolean;
  prompt_source?: "supervisor" | "default";
  triage_status?: "pass" | "warning" | "inferred";
  phase?: "triage" | "deep";
  confidence?: number;
  suggestion?: string | null;
  guidelines?: string[];
  cross_section_issues?: { related_section: string; issue: string; suggested_resolution?: string }[];
}

export type RoleContext = "intake" | "spec" | "curation";

interface AIReviewInlineProps {
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
  masterDataOptions?: { value: string; label: string; description?: string }[];
  isLockedSection?: boolean;
  onSendToCoordinator?: (editedComments: string) => void;
  coordinatorRole?: "LC" | "FC";
  hasSentBefore?: boolean;
  onReReview?: (sectionKey: string) => Promise<void>;
  initialRefinedContent?: string | null;
  complexityRatings?: Record<string, { rating: number; justification: string; evidence_sections?: string[] }>;
  prerequisitesReady?: boolean;
  missingPrerequisites?: string[];
  suppressAutoRefine?: boolean;
}

export function AIReviewInline(props: AIReviewInlineProps) {
  const {
    sectionKey, review, isLockedSection = false,
    onSendToCoordinator, coordinatorRole, hasSentBefore = false,
    onSingleSectionReview, onMarkAddressed, masterDataOptions,
  } = props;

  const state = useAIReviewInlineState(props);
  const {
    comments, selectedComments, isRefining, refinedContent,
    isAddressed, isReReviewing, isOpen, selectedItems,
    isStructured, isMasterData, structuredItems,
    parsedDeliverableObjects, suggestedCodes,
    setIsOpen, setEditedSuggestedContent, setEditedDeliverableItems, setSelectedItems,
    handleReReview, handleAccept, handleDiscard, handleToggleItem,
  } = state;

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

  return (
    <div className={cn("mt-3 rounded-md border bg-muted/30", isAddressed ? "border-blue-200/60" : "border-border/60")}>
      <div className="px-3 py-3 space-y-3">
        {isPending ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground italic py-1">
              Run <span className="font-medium text-foreground">"Review with AI"</span> to generate review comments for this section.
            </p>
            {!isLockedSection && (
              <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={handleReReview} disabled={isReReviewing}>
                {isReReviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                {isReReviewing ? "Reviewing…" : "Review this section with AI"}
              </Button>
            )}
          </div>
        ) : isAddressed ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground italic py-1">This section has been addressed. Click below to re-review with AI.</p>
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
                  <Check className="h-3.5 w-3.5" />This section looks good — no issues found.
                </p>
                <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={handleReReview} disabled={isReReviewing}>
                  {isReReviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                  {isReReviewing ? "Re-reviewing…" : "Re-review this section"}
                </Button>
              </div>
            ) : (
              <>
                {isLockedSection && !isPassWithNoComments && onSendToCoordinator && (
                  <Button
                    size="sm" variant="outline" className="w-full text-xs h-7"
                    onClick={() => {
                      const toText = (c: any): string => typeof c === 'string' ? c : (c.text ?? c.comment ?? JSON.stringify(c));
                      const selectedText = comments.filter((_, i) => selectedComments.has(i)).map(toText).join("\n\n");
                      onSendToCoordinator(selectedText || comments.map(toText).join("\n\n"));
                    }}
                    disabled={selectedComments.size === 0}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    {hasSentBefore ? `Send Follow-up to ${coordinatorRole ?? "Coordinator"}` : `Send to ${coordinatorRole ?? "Coordinator"}`}
                  </Button>
                )}

                {!isLockedSection && (
                  <AIReviewResultPanel
                    sectionKey={sectionKey}
                    result={{ status: review?.status ?? "warning", comments, suggested_version: refinedContent ?? undefined }}
                    isRefining={isRefining}
                    structuredItems={structuredItems}
                    selectedItems={selectedItems}
                    onToggleItem={handleToggleItem}
                    onSelectAllItems={() => { const items = suggestedCodes ?? structuredItems; if (items) setSelectedItems(new Set(items.map((_, i) => i))); }}
                    onClearItems={() => setSelectedItems(new Set())}
                    onAccept={handleAccept}
                    onDiscard={handleDiscard}
                    isStructured={isStructured}
                    isMasterData={isMasterData}
                    suggestedCodes={suggestedCodes}
                    masterDataOptions={masterDataOptions}
                    onSuggestedVersionChange={setEditedSuggestedContent}
                    deliverableItems={parsedDeliverableObjects ?? undefined}
                    onDeliverableItemsChange={setEditedDeliverableItems}
                    badgePrefix={getDeliverableBadgePrefix(sectionKey)}
                    confidence={review?.confidence}
                    complexityRatings={state.isStructured ? undefined : undefined}
                    onConfirmPass={review?.status === "pass" && review?.phase === "triage" ? () => onMarkAddressed?.(sectionKey) : undefined}
                    onFlagForReview={review?.status === "pass" && review?.phase === "triage" ? () => onSingleSectionReview?.(sectionKey, { ...review, status: "warning", triage_status: "warning" }) : undefined}
                  />
                )}

                {!isLockedSection && (
                  <Button size="sm" variant="outline" className="w-full text-xs h-7 mt-2" onClick={handleReReview} disabled={isReReviewing}>
                    {isReReviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                    {isReReviewing ? "Re-reviewing…" : "Re-review this section"}
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
