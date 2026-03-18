/**
 * LegalVersionHistory — expandable section showing document version timeline.
 */

import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface VersionEntry {
  version: number;
  modified_by: string;
  modified_at: string;
  change_type: string;
}

interface LegalVersionHistoryProps {
  history: VersionEntry[];
  className?: string;
}

const CHANGE_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  default_applied: { label: "Default Applied", className: "bg-muted text-muted-foreground" },
  custom_uploaded: { label: "Custom Upload", className: "bg-primary/10 text-primary border-primary/30" },
  replaced: { label: "Replaced", className: "bg-accent text-accent-foreground" },
  reverted_to_default: { label: "Reverted to Default", className: "bg-secondary text-secondary-foreground" },
};

export function LegalVersionHistory({ history, className }: LegalVersionHistoryProps) {
  const [expanded, setExpanded] = useState(false);

  if (!history || history.length === 0) return null;

  const sorted = [...history].sort((a, b) => b.version - a.version);

  return (
    <div className={cn("mt-2", className)}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <History className="h-3 w-3" />
        <span>{sorted.length} version{sorted.length !== 1 ? "s" : ""}</span>
      </button>

      {expanded && (
        <div className="mt-2 ml-5 border-l-2 border-border/50 pl-3 space-y-2">
          {sorted.map((entry) => {
            const changeInfo = CHANGE_TYPE_LABELS[entry.change_type] ?? {
              label: entry.change_type,
              className: "bg-muted text-muted-foreground",
            };

            return (
              <div key={entry.version} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-foreground">
                      v{entry.version}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] px-1.5 py-0 font-normal border", changeInfo.className)}
                    >
                      {changeInfo.label}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(new Date(entry.modified_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
