/**
 * CheckboxMultiSectionRenderer — View/edit for multi-select checkbox sections.
 * Autosaves immediately on every toggle (no Save/Cancel buttons).
 */

import { useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AutoSaveIndicator } from "@/components/cogniblend/curation/AutoSaveIndicator";
import type { AutoSaveStatus } from "@/hooks/cogniblend/useAutoSaveSection";

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
  autoSaveStatus?: AutoSaveStatus;
}

export function CheckboxMultiSectionRenderer({
  selectedValues,
  options,
  readOnly,
  editing,
  onSave,
  onCancel,
  saving,
  autoSaveStatus,
}: CheckboxMultiSectionRendererProps) {
  // Use a ref to track optimistic state during save to avoid race with prop sync
  const pendingSaveRef = useRef<string[] | null>(null);

  const displayValues = pendingSaveRef.current ?? selectedValues;

  const handleToggle = useCallback((value: string) => {
    const current = pendingSaveRef.current ?? selectedValues;
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    pendingSaveRef.current = next;
    onSave(next);
    // Clear pending after a tick to allow prop sync
    setTimeout(() => { pendingSaveRef.current = null; }, 500);
  }, [selectedValues, onSave]);

  // Always show checkboxes when not readOnly (autosave mode)
  if (!readOnly) {
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <Checkbox
                checked={displayValues.includes(opt.value)}
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
        <div className="flex justify-end">
          <AutoSaveIndicator status={autoSaveStatus ?? (saving ? "saving" : "idle")} />
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
