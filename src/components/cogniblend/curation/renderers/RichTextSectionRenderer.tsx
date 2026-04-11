/**
 * RichTextSectionRenderer — View/edit for rich text sections.
 * Pure display component — autosave is owned by SectionPanelItem.
 */

import { AiContentRenderer } from '@/components/ui/AiContentRenderer';
import { TextSectionEditor } from '@/components/cogniblend/curation/CurationSectionEditor';
import type { AutoSaveStatus } from '@/hooks/cogniblend/useAutoSaveSection';

interface RichTextSectionRendererProps {
  value: string;
  readOnly: boolean;
  editing: boolean;
  onSave: (val: string) => void;
  onCancel: () => void;
  onEdit: () => void;
  saving?: boolean;
  autoSaveStatus?: AutoSaveStatus;
}

export function RichTextSectionRenderer({
  value,
  readOnly,
  editing,
  onSave,
  onCancel,
  onEdit,
  saving,
  autoSaveStatus,
}: RichTextSectionRendererProps) {
  // Always show editor when not readOnly (autosave mode)
  if (!readOnly) {
    return (
      <TextSectionEditor
        value={value}
        onSave={onSave}
        onCancel={onCancel}
        saving={saving}
        autoSaveStatus={autoSaveStatus}
      />
    );
  }

  return <AiContentRenderer content={value} compact fallback="—" />;
}
