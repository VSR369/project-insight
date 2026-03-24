/**
 * RadioSectionRenderer — View/edit for radio-button sections.
 * Used for: effort_level
 */

import { Badge } from "@/components/ui/badge";
import { RadioFieldEditor } from "@/components/cogniblend/curation/CurationSectionEditor";

interface Option {
  value: string;
  label: string;
  description?: string;
}

interface RadioSectionRendererProps {
  value: string | null;
  options: Option[];
  readOnly: boolean;
  editing: boolean;
  onSave: (val: string) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function RadioSectionRenderer({
  value,
  options,
  readOnly,
  editing,
  onSave,
  onCancel,
  saving,
}: RadioSectionRendererProps) {
  if (editing && !readOnly) {
    return (
      <RadioFieldEditor
        value={value ?? ""}
        options={options}
        onSave={onSave}
        onCancel={onCancel}
        saving={saving}
      />
    );
  }

  if (!value) return <p className="text-sm text-muted-foreground italic">Not set</p>;

  return <Badge variant="outline" className="capitalize">{value}</Badge>;
}
