/**
 * AIReviewResultPanel — Format-native display of AI review results.
 *
 * Sub-components:
 *  - ReviewConfigs.ts (types, constants, parse helpers)
 *  - useAIReviewEditState.ts (edit state hook)
 *  - SuggestionEditors.tsx (editable sub-components)
 *  - ReviewCommentList.tsx (comment checklist)
 *  - SuggestionVersionDisplay.tsx (format-aware suggestion rendering)
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, AlertTriangle, Sparkles, CheckCircle2 } from "lucide-react";
import { ExpandableAIComment } from "@/components/curator/ExpandableAIComment";
import { cn } from "@/lib/utils";

import type { AIReviewResultPanelProps } from "./ai-review/ReviewConfigs";
import { STATUS_BADGE } from "./ai-review/ReviewConfigs";
import { useAIReviewEditState } from "./ai-review/useAIReviewEditState";
import { ComplexityParameterTable } from "./ai-review/SuggestionEditors";
import { ReviewCommentList } from "./ai-review/ReviewCommentList";
import { SuggestionVersionDisplay } from "./ai-review/SuggestionVersionDisplay";

// Re-export types for backward compatibility
export type { ReviewComment, CrossSectionIssue, AIReviewResult, AIReviewResultPanelProps } from "./ai-review/ReviewConfigs";

/* ── Component ─────────────────────────────────────────── */

export function AIReviewResultPanel({
  sectionKey, result, isRefining = false,
  structuredItems, selectedItems, onToggleItem, onSelectAllItems, onClearItems,
  onAccept, onDiscard, isStructured,
  isMasterData = false, suggestedCodes, masterDataOptions,
  onSuggestedVersionChange, deliverableItems, onDeliverableItemsChange,
  badgePrefix = "D", confidence, onConfirmPass, onFlagForReview, complexityRatings,
}: AIReviewResultPanelProps) {
  const state = useAIReviewEditState({
    sectionKey, result, isMasterData, isStructured: isStructured ?? false,
    structuredItems, suggestedCodes, masterDataOptions, deliverableItems,
    onSuggestedVersionChange,
  });

  const statusBadge = STATUS_BADGE[result.status] ?? STATUS_BADGE.warning;
  const StatusIcon = statusBadge.icon;

  // ── Pass confirmation shortcut ──
  if (result.status === "pass" && onConfirmPass && onFlagForReview) {
    return (
      <div className="rounded-lg border-l-4 border-l-emerald-400 border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800/40 p-5">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-800">Section Verified</span>
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[11px] px-2 py-0.5">
            <StatusIcon className="h-3 w-3 mr-1" />{statusBadge.label}
          </Badge>
          {typeof confidence === "number" && (
            <span className="text-[11px] text-emerald-600 ml-1 font-medium">{Math.round(confidence * 100)}% confidence</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-3">AI found no issues with this section.</p>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onConfirmPass}>
            <Check className="h-4 w-4 mr-1.5" />Looks good, confirm
          </Button>
          <Button variant="outline" size="sm" className="h-10 border-amber-400 text-amber-700 hover:bg-amber-50" onClick={onFlagForReview}>
            <AlertTriangle className="h-4 w-4 mr-1.5" />Flag for review
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      {/* ── AI Review block ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Review</span>
          <span className={cn("inline-flex items-center gap-1", statusBadge.className)}>
            <StatusIcon className="h-3 w-3" />{statusBadge.label}
          </span>
          {typeof confidence === "number" && (
            <span className="text-[11px] text-muted-foreground ml-1 font-medium">{Math.round(confidence * 100)}% confidence</span>
          )}
        </div>

        {result.summary && <ExpandableAIComment content={result.summary} />}

        <ReviewCommentList
          parsedComments={state.parsedComments}
          selectedComments={state.selectedComments}
          onToggleComment={state.toggleComment}
          onToggleAll={state.toggleAllComments}
          allSelected={state.allCommentsSelected}
        />

        {result.guidelines && result.guidelines.length > 0 && (
          <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800/40">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1.5">Domain Guidelines</p>
            {result.guidelines.map((g: string, gi: number) => (
              <p key={gi} className="text-sm text-indigo-600 dark:text-indigo-400 mt-1 leading-relaxed">• {g}</p>
            ))}
          </div>
        )}

        {result.cross_section_issues && result.cross_section_issues.length > 0 && (
          <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800/40">
            <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-1.5">Cross-Section Issues</p>
            {result.cross_section_issues.map((issue, ci) => (
              <div key={ci} className="text-sm text-orange-600 dark:text-orange-400 mt-1 leading-relaxed">
                <span className="font-medium">↔ {issue.related_section.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}: </span>
                {issue.issue}
                {issue.suggested_resolution && (
                  <span className="text-orange-500 dark:text-orange-300 ml-1">→ {issue.suggested_resolution}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {complexityRatings && Object.keys(complexityRatings).length > 0 && (
        <ComplexityParameterTable ratings={complexityRatings} />
      )}

      {state.hasSuggestedVersion && !complexityRatings && (
        <SuggestionVersionDisplay
          suggestedFormat={state.suggestedFormat}
          suggestedVersion={result.suggested_version}
          isMasterData={isMasterData}
          isStructured={isStructured ?? false}
          resolvedCodes={state.resolvedCodes}
          selectedItems={selectedItems ?? new Set()}
          onToggleItem={onToggleItem ?? (() => {})}
          onSelectAllItems={onSelectAllItems ?? (() => {})}
          onClearItems={onClearItems ?? (() => {})}
          rewardData={state.rewardData}
          solverExpertiseData={state.solverExpertiseData}
          hasDeliverableCards={state.hasDeliverableCards}
          deliverableItems={deliverableItems}
          badgePrefix={badgePrefix}
          scheduleRows={state.scheduleRows}
          editedScheduleRows={state.editedScheduleRows}
          onScheduleRowsChange={state.handleScheduleRowsChange}
          structuredItems={structuredItems ?? null}
          editedLineItems={state.editedLineItems}
          onLineItemsChange={state.handleLineItemsChange}
          tableRows={state.tableRows}
          editedTableRows={state.editedTableRows}
          onTableRowsChange={state.handleTableRowsChange}
          sectionKey={sectionKey}
          parsedDate={state.parsedDate}
          editedDate={state.editedDate}
          onDateChange={state.handleDateChange}
          editedRichText={state.editedRichText}
          onRichTextChange={state.handleRichTextChange}
        />
      )}

      {isRefining && !state.hasSuggestedVersion && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-foreground">AI Suggested Version</span>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" /><span>Generating AI suggestion…</span>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-muted animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-muted animate-pulse" />
              <div className="h-3 w-3/5 rounded bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {(state.hasSuggestedVersion || isRefining || (complexityRatings && Object.keys(complexityRatings).length > 0)) && (
        <div className="sticky bottom-0 bg-card flex gap-3 justify-end pt-3 pb-1 border-t border-border -mx-4 px-4">
          <Button variant="outline" size="sm" className="h-10 text-sm border-border text-foreground hover:bg-muted rounded-lg px-5" onClick={onDiscard} disabled={isRefining}>
            Keep original
          </Button>
          <Button size="sm" className="h-10 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5" onClick={onAccept} disabled={isRefining}>
            <Check className="h-4 w-4 mr-1.5" />
            {complexityRatings && Object.keys(complexityRatings).length > 0
              ? "Accept complexity ratings"
              : isMasterData && state.resolvedCodes
              ? `Accept ${(selectedItems?.size ?? 0)} selection${(selectedItems?.size ?? 0) !== 1 ? "s" : ""}`
              : isStructured && structuredItems
                ? `Accept ${(selectedItems?.size ?? 0)} item${(selectedItems?.size ?? 0) !== 1 ? "s" : ""}`
                : "Accept suggestion"}
          </Button>
        </div>
      )}
    </div>
  );
}
