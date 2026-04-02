/**
 * ChecklistItemList — Renders the 15-point checklist items with checkboxes.
 * Extracted from CurationChecklistPanel.tsx.
 */

import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, XCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: number;
  label: string;
  autoChecked: boolean;
  manualOverride: boolean;
  locked: boolean;
}

interface ChecklistItemListProps {
  items: ChecklistItem[];
  onManualToggle: (id: number, checked: boolean) => void;
}

export function ChecklistItemList({ items, onManualToggle }: ChecklistItemListProps) {
  return (
    <div className="mt-3 space-y-1">
      {items.map((item) => {
        const checked = item.autoChecked || item.manualOverride;
        return (
          <div
            key={item.id}
            className="flex items-center gap-2.5 py-1.5 border-b border-border/40 last:border-0"
          >
            <Checkbox
              id={`chk-${item.id}`}
              checked={checked}
              onCheckedChange={(val) => {
                if (!item.autoChecked && !item.locked) {
                  onManualToggle(item.id, !!val);
                }
              }}
              disabled={item.autoChecked || item.locked}
              className="shrink-0"
            />
            <label
              htmlFor={`chk-${item.id}`}
              className={cn(
                "text-xs flex-1 cursor-pointer select-none",
                checked ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {item.id}. {item.label}
            </label>
            {item.locked && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
            {checked ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
