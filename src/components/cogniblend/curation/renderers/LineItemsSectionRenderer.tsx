/**
 * LineItemsSectionRenderer — View/edit for line-item sections.
 * Used for: deliverables, submission_guidelines (when structured)
 */

import { DeliverablesEditor } from "@/components/cogniblend/curation/CurationSectionEditor";

interface LineItemsSectionRendererProps {
  items: string[];
  readOnly: boolean;
  editing: boolean;
  onSave: (items: string[]) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function LineItemsSectionRenderer({
  items,
  readOnly,
  editing,
  onSave,
  onCancel,
  saving,
}: LineItemsSectionRendererProps) {
  if (editing && !readOnly) {
    return (
      <DeliverablesEditor
        items={items}
        onSave={onSave}
        onCancel={onCancel}
        saving={saving}
      />
    );
  }

  if (!items || items.length === 0) {
    return <p className="text-sm text-muted-foreground">None defined.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
          <span className="font-medium text-muted-foreground mr-2">{i + 1}.</span>
          {item}
        </div>
      ))}
    </div>
  );
}
