/**
 * ReviewCommentList — Renders the selectable comment checklist in AI review panels.
 *
 * Extracted from AIReviewResultPanel.tsx (Batch 2).
 */

import React, { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, ChevronUp, Square, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewComment } from "./ReviewConfigs";
import { COMMENT_TYPE_CONFIG, SEVERITY_TO_TYPE } from "./ReviewConfigs";

interface ReviewCommentListProps {
  parsedComments: ReviewComment[];
  selectedComments: Set<number>;
  onToggleComment: (index: number) => void;
  onToggleAll: () => void;
  allSelected: boolean;
}

export function ReviewCommentList({
  parsedComments,
  selectedComments,
  onToggleComment,
  onToggleAll,
  allSelected,
}: ReviewCommentListProps) {
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const toggleExpand = useCallback((index: number) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }, []);

  if (parsedComments.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Comments ({parsedComments.length})</p>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center bg-muted text-muted-foreground text-xs rounded-full px-2 py-0.5">
            {selectedComments.size}/{parsedComments.length} selected
          </span>
          <button type="button" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={onToggleAll}>
            {allSelected ? (<><Square className="h-3.5 w-3.5" />Clear all</>) : (<><CheckSquare className="h-3.5 w-3.5" />Select all</>)}
          </button>
        </div>
      </div>
      {parsedComments.map((comment, i) => {
        const commentType = comment.type || SEVERITY_TO_TYPE[comment.severity || 'warning'] || 'warning';
        const typeConfig = COMMENT_TYPE_CONFIG[commentType] || COMMENT_TYPE_CONFIG.warning;
        const TypeIcon = typeConfig.icon;
        const isSelected = selectedComments.has(i);
        const isExpanded = expandedComments.has(i);
        const isLong = comment.text.length > 160;
        return (
          <label key={i} className={cn(
            "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors shadow-xs",
            isSelected ? "bg-primary/5 border-primary/40" : "bg-card border-border hover:border-primary/30"
          )}>
            <button type="button" className={cn(
              "mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors",
              isSelected ? "bg-primary border-primary" : "border-muted-foreground/30 bg-background"
            )} onClick={(e) => { e.preventDefault(); onToggleComment(i); }}>
              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
            </button>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2 mb-0.5">
                <Badge className={cn("text-[11px] px-2 py-0.5 shrink-0", typeConfig.badgeClass)}>
                  <TypeIcon className="h-2.5 w-2.5 mr-0.5" />{typeConfig.label}
                </Badge>
                {comment.field && (
                  <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{comment.field}</span>
                )}
              </div>
              <span className={cn("text-sm text-foreground leading-relaxed block", !isExpanded && isLong && "line-clamp-2")}>{comment.text}</span>
              {comment.reasoning && <p className="text-xs text-muted-foreground italic mt-1">{comment.reasoning}</p>}
              {isLong && (
                <button type="button" className="inline-flex items-center gap-0.5 text-xs text-primary hover:text-primary/80 font-medium" onClick={(e) => { e.preventDefault(); toggleExpand(i); }}>
                  {isExpanded ? (<>Read less <ChevronUp className="h-3 w-3" /></>) : (<>Read more <ChevronDown className="h-3 w-3" /></>)}
                </button>
              )}
              {comment.applies_to && (
                <blockquote className="border-l-2 border-primary/40 pl-2.5 text-[11px] text-muted-foreground italic">{comment.applies_to}</blockquote>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
