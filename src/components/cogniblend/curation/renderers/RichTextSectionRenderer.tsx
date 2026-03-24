/**
 * RichTextSectionRenderer — View/edit for rich text sections.
 * Used for: problem_statement, scope, submission_guidelines, ip_model, visibility_eligibility, hook
 */

import { AiContentRenderer } from "@/components/ui/AiContentRenderer";
import { TextSectionEditor } from "@/components/cogniblend/curation/CurationSectionEditor";

interface RichTextSectionRendererProps {
  value: string;
  readOnly: boolean;
  editing: boolean;
  onSave: (val: string) => void;
  onCancel: () => void;
  onEdit: () => void;
  saving?: boolean;
}

export function RichTextSectionRenderer({
  value,
  readOnly,
  editing,
  onSave,
  onCancel,
  onEdit,
  saving,
}: RichTextSectionRendererProps) {
  if (editing && !readOnly) {
    return (
      <TextSectionEditor
        value={value}
        onSave={onSave}
        onCancel={onCancel}
        saving={saving}
      />
    );
  }

  return <AiContentRenderer content={value} compact fallback="—" />;
}
