/**
 * RichTextSectionRenderer — View/edit for rich text sections.
 * Issue #8: Now wires useAutoSaveSection for debounced autosave.
 */

import { useCallback, useEffect, useRef } from 'react';
import { AiContentRenderer } from '@/components/ui/AiContentRenderer';
import { TextSectionEditor } from '@/components/cogniblend/curation/CurationSectionEditor';
import { useAutoSaveSection } from '@/hooks/cogniblend/useAutoSaveSection';
import type { AutoSaveStatus } from '@/hooks/cogniblend/useAutoSaveSection';

interface SaveMutation {
  mutate: (args: { field: string; value: unknown }) => void;
}

interface RichTextSectionRendererProps {
  value: string;
  readOnly: boolean;
  editing: boolean;
  onSave: (val: string) => void;
  onCancel: () => void;
  onEdit: () => void;
  saving?: boolean;
  autoSaveStatus?: AutoSaveStatus;
  /** DB field name for autosave — when provided, enables debounced autosave */
  sectionDbField?: string;
  /** Save mutation — required when sectionDbField is provided */
  saveSectionMutation?: SaveMutation;
}

export function RichTextSectionRenderer({
  value,
  readOnly,
  editing,
  onSave,
  onCancel,
  onEdit,
  saving,
  autoSaveStatus: externalAutoSaveStatus,
  sectionDbField,
  saveSectionMutation,
}: RichTextSectionRendererProps) {
  // Wire autosave when dbField + mutation are provided
  const canAutoSave = !!sectionDbField && !!saveSectionMutation;
  const autoSave = useAutoSaveSection(
    saveSectionMutation ?? { mutate: () => {} },
    { field: sectionDbField ?? '', disabled: !canAutoSave },
  );

  // Flush pending autosave on unmount
  const flushRef = useRef(autoSave.flush);
  flushRef.current = autoSave.flush;
  useEffect(() => () => flushRef.current(), []);

  const handleSave = useCallback((val: string) => {
    if (canAutoSave) {
      autoSave.save(val);
    }
    // Always call onSave so parent (store sync, etc.) stays updated
    onSave(val);
  }, [canAutoSave, autoSave, onSave]);

  const effectiveAutoSaveStatus = canAutoSave ? autoSave.status : externalAutoSaveStatus;

  // Always show editor when not readOnly (autosave mode)
  if (!readOnly) {
    return (
      <TextSectionEditor
        value={value}
        onSave={handleSave}
        onCancel={onCancel}
        saving={saving}
        autoSaveStatus={effectiveAutoSaveStatus}
      />
    );
  }

  return <AiContentRenderer content={value} compact fallback="—" />;
}
