/**
 * DeliverableCardRenderer — Structured card-based view for deliverables.
 * Renders rich objects with name, description, acceptance_criteria as styled cards.
 */

import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DeliverableItem } from "@/utils/parseDeliverableItem";

export type { DeliverableItem as DeliverableObject };

interface DeliverableCardRendererProps {
  items: DeliverableItem[];
  badgePrefix?: string;
  hideAcceptanceCriteria?: boolean;
}

export function DeliverableCardRenderer({
  items,
  badgePrefix = "D",
}: DeliverableCardRendererProps) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-muted-foreground">No deliverables defined.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => {
        const hasDescription = item.description && item.description.trim().length > 0;
        const hasCriteria = item.acceptance_criteria && item.acceptance_criteria.trim().length > 0;
        const badgeId = item.id || `${badgePrefix}${i + 1}`;

        return (
          <div
            key={i}
            className="rounded-xl border border-border overflow-hidden hover:shadow-sm transition-shadow duration-150"
          >
            {/* Header band */}
            <div className="flex items-center gap-2.5 bg-muted/50 border-b border-border px-4 py-2.5">
              <Badge
                variant="outline"
                className="shrink-0 font-semibold text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
              >
                {badgeId}
              </Badge>
              <span className="font-semibold text-[13px] text-foreground leading-snug flex-1">
                {item.name}
              </span>
            </div>

            {/* Description */}
            {hasDescription && (
              <div className="px-4 pt-3 pb-2">
                <p className="text-[12px] text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            )}

            {/* Acceptance Criteria */}
            {hasCriteria ? (
              <div className="mx-4 mb-3 mt-1">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                      Acceptance Criteria
                    </span>
                  </div>
                  <p className="text-[12px] text-emerald-900 dark:text-emerald-300 leading-relaxed">
                    {item.acceptance_criteria}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-4 mb-3 mt-1">
                <div className="rounded-lg border border-dashed border-border px-3 py-2.5">
                  <p className="text-[11px] text-muted-foreground/50 italic">
                    No acceptance criteria defined
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Footer count */}
      <p className="text-[11px] text-muted-foreground text-center mt-1">
        {items.length} {items.length === 1 ? "deliverable" : "deliverables"} · {badgePrefix}1–{badgePrefix}{items.length}
      </p>
    </div>
  );
}
