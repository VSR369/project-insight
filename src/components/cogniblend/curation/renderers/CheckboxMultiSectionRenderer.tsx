/**
 * CheckboxMultiSectionRenderer — View/edit for multi-select checkbox sections.
 * Used for: eligibility, visibility (master-data-driven)
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface CheckboxMultiSectionRendererProps {
  selectedValues: string[];
  options: Option[];
  readOnly: boolean;
  editing: boolean;
  onSave: (values: string[]) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function CheckboxMultiSectionRenderer({
  selectedValues,
  options,
  readOnly,
  editing,
  onSave,
  onCancel,
  saving,
}: CheckboxMultiSectionRendererProps) {
  const [draft, setDraft] = useState<string[]>(selectedValues);

  const handleToggle = (value: string) => {
    setDraft((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  if (editing && !readOnly) {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <Checkbox
                checked={draft.includes(opt.value)}
                onCheckedChange={() => handleToggle(opt.value)}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
                {opt.description && (
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
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

  if (!selectedValues || selectedValues.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Not configured</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {selectedValues.map((val) => {
        const opt = options.find((o) => o.value === val);
        return (
          <Badge key={val} variant="secondary" className="capitalize">
            {opt?.label ?? val}
          </Badge>
        );
      })}
    </div>
  );
}
