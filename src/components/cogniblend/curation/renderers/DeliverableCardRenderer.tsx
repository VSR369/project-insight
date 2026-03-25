/**
 * DeliverableCardRenderer — Structured card-based view for deliverables.
 * Renders rich objects with name, description, acceptance_criteria as styled cards.
 * Falls back to plain numbered list for string-only items.
 */

import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface DeliverableObject {
  name: string;
  description?: string;
  acceptance_criteria?: string;
}

interface DeliverableCardRendererProps {
  items: DeliverableObject[];
}

const BADGE_COLORS = [
  "bg-primary/10 text-primary border-primary/20",
  "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
  "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-400",
  "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
  "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400",
  "bg-teal-500/10 text-teal-700 border-teal-500/20 dark:text-teal-400",
];

export function DeliverableCardRenderer({ items }: DeliverableCardRendererProps) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-muted-foreground">No deliverables defined.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const colorClass = BADGE_COLORS[i % BADGE_COLORS.length];
        const hasDescription = item.description && item.description.trim().length > 0;
        const hasCriteria = item.acceptance_criteria && item.acceptance_criteria.trim().length > 0;

        return (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-4 space-y-2.5"
          >
            {/* Header row: badge + name */}
            <div className="flex items-start gap-3">
              <Badge
                variant="outline"
                className={`shrink-0 font-bold text-xs px-2 py-0.5 ${colorClass}`}
              >
                D{i + 1}
              </Badge>
              <span className="font-semibold text-sm text-foreground leading-snug">
                {item.name}
              </span>
            </div>

            {/* Description */}
            {hasDescription && (
              <p className="text-sm text-muted-foreground leading-relaxed pl-[calc(theme(spacing.2)+theme(spacing.3)+2ch)]">
                {item.description}
              </p>
            )}

            {/* Acceptance Criteria callout */}
            {hasCriteria && (
              <div className="ml-[calc(theme(spacing.2)+theme(spacing.3)+2ch)] rounded-md border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                    Acceptance Criteria
                  </span>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  {item.acceptance_criteria}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
