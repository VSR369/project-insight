/**
 * LineItemsEditor — Inline list editor for line_items / tag_input sections in preview.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

interface LineItemsEditorProps {
  initialValue: unknown;
  onSave: (value: unknown) => void;
  onCancel: () => void;
  saving: boolean;
}

export function LineItemsEditor({ initialValue, onSave, onCancel, saving }: LineItemsEditorProps) {
  const [items, setItems] = useState<string[]>(() => {
    if (Array.isArray(initialValue)) return initialValue.map(String);
    if (typeof initialValue === 'string') {
      try {
        const parsed = JSON.parse(initialValue);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch { /* ignore */ }
      return initialValue.split('\n').filter(Boolean);
    }
    return [''];
  });

  const updateItem = (idx: number, val: string) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? val : it)));
  };

  const addItem = () => setItems((prev) => [...prev, '']);

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = useCallback(() => {
    onSave(items.filter((it) => it.trim().length > 0));
  }, [items, onSave]);

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{i + 1}.</span>
          <Input
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder="Enter item…"
            className="h-8 text-sm flex-1"
          />
          {items.length > 1 && (
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removeItem(i)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="text-xs gap-1" onClick={addItem}>
        <Plus className="h-3.5 w-3.5" /> Add Item
      </Button>
    </div>
  );
}
