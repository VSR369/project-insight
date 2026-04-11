/**
 * CheckboxSingleSectionRenderer — View/edit for single-select sections.
 * Used for: maturity_level
 */

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutoSaveIndicator } from "@/components/cogniblend/curation/AutoSaveIndicator";
import type { AutoSaveStatus } from "@/hooks/cogniblend/useAutoSaveSection";

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface CheckboxSingleSectionRendererProps {
  value: string | null;
  options: Option[];
  readOnly: boolean;
  editing: boolean;
  onSave: (val: string) => void;
  onCancel: () => void;
  saving?: boolean;
  autoSaveStatus?: AutoSaveStatus;
  /** Optional label and description to show in view mode */
  getLabel?: (val: string) => string;
  getDescription?: (val: string) => string | undefined;
}

export function CheckboxSingleSectionRenderer({
  value,
  options,
  readOnly,
  editing,
  onSave,
  onCancel,
  saving,
  autoSaveStatus,
  getLabel,
  getDescription,
}: CheckboxSingleSectionRendererProps) {
  // Always show select when not readOnly (autosave mode)
  if (!readOnly) {
    return (
      <div className="space-y-2">
        <Select value={value ?? ""} onValueChange={(val) => onSave(val)}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div>
                  <span className="font-medium">{opt.label}</span>
                  {opt.description && (
                    <span className="text-xs text-muted-foreground ml-2">— {opt.description}</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <AutoSaveIndicator status={autoSaveStatus ?? (saving ? "saving" : "idle")} />
      </div>
    );
  }

  if (!value) return <p className="text-sm text-muted-foreground">Not set.</p>;

  const displayLabel = getLabel ? getLabel(value) : value;
  const displayDesc = getDescription ? getDescription(value) : undefined;

  return (
    <div className="space-y-1">
      <Badge variant="secondary" className="capitalize">{displayLabel}</Badge>
      {displayDesc && <p className="text-xs text-muted-foreground">{displayDesc}</p>}
    </div>
  );
}
