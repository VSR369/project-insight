/**
 * SelectSectionRenderer — View/edit for select dropdown sections.
 * Used for: challenge_visibility
 */

import { Badge } from "@/components/ui/badge";
import { SelectFieldEditor } from "@/components/cogniblend/curation/CurationSectionEditor";

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface SelectSectionRendererProps {
  value: string | null;
  options: Option[];
  readOnly: boolean;
  editing: boolean;
  onSave: (val: string) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function SelectSectionRenderer({
  value,
  options,
  readOnly,
  editing,
  onSave,
  onCancel,
  saving,
}: SelectSectionRendererProps) {
  if (editing && !readOnly) {
    return (
      <SelectFieldEditor
        value={value ?? ""}
        options={options}
        onSave={onSave}
        onCancel={onCancel}
        saving={saving}
      />
    );
  }

  if (!value) return <p className="text-sm text-muted-foreground italic">Not set</p>;

  return <Badge variant="secondary" className="capitalize">{value.replace(/_/g, " ")}</Badge>;
}
