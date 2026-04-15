/**
 * PreviewSectionEditor — Routes to the correct editor per section format.
 * Used inside PreviewDocument for inline editing.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { normalizeAiContentForEditor } from '@/lib/aiContentFormatter';
import { getSectionFormat, type SectionFormat } from '@/lib/cogniblend/curationSectionFormats';

interface PreviewSectionEditorProps {
  sectionKey: string;
  initialValue: unknown;
  onSave: (value: unknown) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function PreviewSectionEditor({
  sectionKey,
  initialValue,
  onSave,
  onCancel,
  saving = false,
}: PreviewSectionEditorProps) {
  const config = getSectionFormat(sectionKey);
  const format = config?.format ?? 'rich_text';

  return (
    <div className="space-y-3">
      <EditorByFormat
        format={format}
        initialValue={initialValue}
        onSave={onSave}
        onCancel={onCancel}
        saving={saving}
      />
    </div>
  );
}

interface EditorByFormatProps {
  format: SectionFormat;
  initialValue: unknown;
  onSave: (value: unknown) => void;
  onCancel: () => void;
  saving: boolean;
}

function EditorByFormat({ format, initialValue, onSave, onCancel, saving }: EditorByFormatProps) {
  const [value, setValue] = useState<string>(
    typeof initialValue === 'string' ? initialValue : JSON.stringify(initialValue ?? '', null, 2),
  );

  const handleSave = useCallback(() => {
    if (format === 'rich_text') {
      onSave(value);
    } else {
      // Try parsing as JSON for structured formats
      try {
        onSave(JSON.parse(value));
      } catch {
        onSave(value);
      }
    }
  }, [value, onSave, format]);

  if (format === 'rich_text') {
    return (
      <div className="space-y-2">
        <RichTextEditor
          content={normalizeAiContentForEditor(value)}
          onChange={(html) => setValue(html)}
        />
        <ActionButtons onSave={handleSave} onCancel={onCancel} saving={saving} />
      </div>
    );
  }

  // Fallback: textarea for structured formats
  return (
    <div className="space-y-2">
      <textarea
        className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <ActionButtons onSave={handleSave} onCancel={onCancel} saving={saving} />
    </div>
  );
}

function ActionButtons({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving: boolean }) {
  return (
    <div className="flex items-center gap-2 justify-end">
      <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
        <X className="h-3.5 w-3.5 mr-1" /> Cancel
      </Button>
      <Button size="sm" onClick={onSave} disabled={saving}>
        <Check className="h-3.5 w-3.5 mr-1" /> {saving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  );
}
