/**
 * DateSectionRenderer — View/edit for date sections.
 * Used for: submission_deadline
 */

import { DateFieldEditor } from "@/components/cogniblend/curation/CurationSectionEditor";

interface DateSectionRendererProps {
  value: string | null;
  readOnly: boolean;
  editing: boolean;
  onSave: (val: string) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function DateSectionRenderer({
  value,
  readOnly,
  editing,
  onSave,
  onCancel,
  saving,
}: DateSectionRendererProps) {
  if (editing && !readOnly) {
    return (
      <DateFieldEditor
        value={value}
        onSave={onSave}
        onCancel={onCancel}
        saving={saving}
      />
    );
  }

  if (!value) return <p className="text-sm text-muted-foreground italic">Not set</p>;

  return (
    <p className="text-sm font-medium text-foreground">
      {new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}
    </p>
  );
}
