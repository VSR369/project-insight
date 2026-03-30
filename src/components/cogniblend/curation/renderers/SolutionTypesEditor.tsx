/**
 * SolutionTypesEditor — Grouped multi-select checkbox editor for solution types.
 * Shows 15 types organized under 4 proficiency area headers.
 */

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";
import type { SolutionTypeGroup } from "@/hooks/queries/useSolutionTypeMap";

interface SolutionTypesEditorProps {
  groups: SolutionTypeGroup[];
  selectedCodes: string[];
  onSave: (codes: string[]) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function SolutionTypesEditor({
  groups,
  selectedCodes,
  onSave,
  onCancel,
  saving,
}: SolutionTypesEditorProps) {
  const [draft, setDraft] = useState<string[]>(selectedCodes);

  const handleToggle = (code: string) => {
    setDraft((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  };

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.groupCode} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {group.groupLabel}
          </p>
          <div className="space-y-1.5">
            {group.types.map((t) => (
              <label
                key={t.code}
                className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <Checkbox
                  checked={draft.includes(t.code)}
                  onCheckedChange={() => handleToggle(t.code)}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <span className="text-sm font-medium text-foreground">{t.label}</span>
                  {t.description && (
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => onSave(draft)}
          disabled={saving}
          className="text-xs"
        >
          <Save className="h-3 w-3 mr-1" />
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} className="text-xs">
          <X className="h-3 w-3 mr-1" />Cancel
        </Button>
      </div>
    </div>
  );
}
