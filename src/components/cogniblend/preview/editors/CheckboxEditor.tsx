/**
 * CheckboxEditor — Inline selector for checkbox_single / checkbox_multi sections in preview.
 * Renders options from master data or parsed current value.
 */

import { useState, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

interface CheckboxEditorProps {
  sectionKey: string;
  initialValue: unknown;
  isSingle: boolean;
  onSave: (value: unknown) => void;
  onCancel: () => void;
  saving: boolean;
}

function parseCurrentValue(val: unknown, isSingle: boolean): { selected: string[]; rationale: string } {
  if (isSingle) {
    if (val && typeof val === 'object' && 'selected_id' in (val as Record<string, unknown>)) {
      const obj = val as Record<string, unknown>;
      return { selected: [String(obj.selected_id ?? '')], rationale: String(obj.rationale ?? '') };
    }
    if (typeof val === 'string') return { selected: [val], rationale: '' };
    return { selected: [], rationale: '' };
  }
  // Multi
  if (Array.isArray(val)) return { selected: val.map(String), rationale: '' };
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return { selected: parsed.map(String), rationale: '' };
    } catch { /* ignore */ }
    return { selected: [val], rationale: '' };
  }
  return { selected: [], rationale: '' };
}

export function CheckboxEditor({ sectionKey, initialValue, isSingle, onSave, onCancel, saving }: CheckboxEditorProps) {
  const parsed = parseCurrentValue(initialValue, isSingle);
  const [selected, setSelected] = useState<string[]>(parsed.selected);
  const [rationale, setRationale] = useState(parsed.rationale);

  const toggle = (code: string) => {
    if (isSingle) {
      setSelected([code]);
    } else {
      setSelected((prev) =>
        prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
      );
    }
  };

  const handleSave = useCallback(() => {
    if (isSingle) {
      onSave({ selected_id: selected[0] ?? '', rationale });
    } else {
      onSave(selected);
    }
  }, [selected, rationale, isSingle, onSave]);

  // If we have current selections, show them as toggleable items
  // For a more complete experience, master data options would be passed in
  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="space-y-2">
          {selected.map((code) => (
            <label key={code} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={true}
                onCheckedChange={() => toggle(code)}
              />
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{code}</span>
            </label>
          ))}
        </div>
      )}
      {isSingle && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Rationale</label>
          <Input
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Reason for selection…"
            className="h-8 text-sm"
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Edit the raw value below if you need to change the selection code.
      </p>
      <Input
        value={isSingle ? (selected[0] ?? '') : selected.join(', ')}
        onChange={(e) => {
          if (isSingle) {
            setSelected([e.target.value.trim()]);
          } else {
            setSelected(e.target.value.split(',').map((s) => s.trim()).filter(Boolean));
          }
        }}
        placeholder={isSingle ? 'Code' : 'Comma-separated codes'}
        className="h-8 text-sm font-mono"
      />
    </div>
  );
}
