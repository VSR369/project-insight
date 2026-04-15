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
import { LineItemsEditor } from './editors/LineItemsEditor';
import { TableEditor } from './editors/TableEditor';
import { CheckboxEditor } from './editors/CheckboxEditor';

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
        sectionKey={sectionKey}
        initialValue={initialValue}
        onSave={onSave}
        onCancel={onCancel}
        saving={saving}
      />
      <ActionButtons onSave={() => {}} onCancel={onCancel} saving={saving} hidden />
    </div>
  );
}

interface EditorByFormatProps {
  format: SectionFormat;
  sectionKey: string;
  initialValue: unknown;
  onSave: (value: unknown) => void;
  onCancel: () => void;
  saving: boolean;
}

function EditorByFormat({ format, sectionKey, initialValue, onSave, onCancel, saving }: EditorByFormatProps) {
  const [value, setValue] = useState<string>(
    typeof initialValue === 'string' ? initialValue : JSON.stringify(initialValue ?? '', null, 2),
  );

  const handleSave = useCallback(() => {
    if (format === 'rich_text') {
      onSave(value);
    } else {
      try { onSave(JSON.parse(value)); } catch { onSave(value); }
    }
  }, [value, onSave, format]);

  // ── Rich text ──
  if (format === 'rich_text') {
    return (
      <div className="space-y-2">
        <RichTextEditor
          value={normalizeAiContentForEditor(value)}
          onChange={(html) => setValue(html)}
        />
        <ActionButtons onSave={handleSave} onCancel={onCancel} saving={saving} />
      </div>
    );
  }

  // ── Line items / tag input ──
  if (format === 'line_items' || format === 'tag_input') {
    return (
      <div className="space-y-2">
        <LineItemsEditor initialValue={initialValue} onSave={onSave} onCancel={onCancel} saving={saving} />
        <ActionButtons onSave={() => {}} onCancel={onCancel} saving={saving} hidden />
      </div>
    );
  }

  // ── Table / schedule_table ──
  if (format === 'table' || format === 'schedule_table') {
    return (
      <div className="space-y-2">
        <TableEditor sectionKey={sectionKey} initialValue={initialValue} onSave={onSave} onCancel={onCancel} saving={saving} />
        <ActionButtons onSave={() => {}} onCancel={onCancel} saving={saving} hidden />
      </div>
    );
  }

  // ── Checkbox single / multi ──
  if (format === 'checkbox_single' || format === 'checkbox_multi') {
    return (
      <div className="space-y-2">
        <CheckboxEditor
          sectionKey={sectionKey}
          initialValue={initialValue}
          isSingle={format === 'checkbox_single'}
          onSave={onSave}
          onCancel={onCancel}
          saving={saving}
        />
        <ActionButtons onSave={() => {}} onCancel={onCancel} saving={saving} hidden />
      </div>
    );
  }

  // ── Fallback: textarea for structured_fields / custom / radio / etc ──
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

function ActionButtons({ onSave, onCancel, saving, hidden }: { onSave: () => void; onCancel: () => void; saving: boolean; hidden?: boolean }) {
  if (hidden) return null;
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
