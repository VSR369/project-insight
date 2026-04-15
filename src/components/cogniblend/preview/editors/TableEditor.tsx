/**
 * TableEditor — Inline table/row editor for table / schedule_table sections in preview.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { getSectionFormat } from '@/lib/cogniblend/curationSectionFormats';
import { formatColumnHeader } from '@/utils/detectAndParseLineItems';

interface TableEditorProps {
  sectionKey: string;
  initialValue: unknown;
  onSave: (value: unknown) => void;
  onCancel: () => void;
  saving: boolean;
}

function parseRows(val: unknown): Record<string, string>[] {
  if (Array.isArray(val)) {
    return val.map((r) => {
      if (typeof r === 'string') {
        try { return JSON.parse(r); } catch { return { value: r }; }
      }
      return r as Record<string, string>;
    });
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* ignore */ }
  }
  return [];
}

export function TableEditor({ sectionKey, initialValue, onSave, onCancel, saving }: TableEditorProps) {
  const config = getSectionFormat(sectionKey);
  const columns = config?.columns ?? [];

  const [rows, setRows] = useState<Record<string, string>[]>(() => {
    const parsed = parseRows(initialValue);
    return parsed.length > 0 ? parsed : [createEmpty(columns)];
  });

  const updateCell = (ri: number, col: string, val: string) => {
    setRows((prev) => prev.map((r, i) => (i === ri ? { ...r, [col]: val } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, createEmpty(columns)]);

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = useCallback(() => {
    const nonEmpty = rows.filter((r) => columns.some((c) => (r[c] ?? '').trim().length > 0));
    onSave(nonEmpty);
  }, [rows, columns, onSave]);

  return (
    <div className="space-y-3">
      {rows.map((row, ri) => (
        <div key={ri} className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Row {ri + 1}</span>
            {rows.length > 1 && (
              <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeRow(ri)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {columns.map((col) => (
              <div key={col}>
                <label className="text-xs text-muted-foreground mb-1 block">{formatColumnHeader(col)}</label>
                <Input
                  value={row[col] ?? ''}
                  onChange={(e) => updateCell(ri, col, e.target.value)}
                  placeholder={formatColumnHeader(col)}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="text-xs gap-1" onClick={addRow}>
        <Plus className="h-3.5 w-3.5" /> Add Row
      </Button>
    </div>
  );
}

function createEmpty(columns: string[]): Record<string, string> {
  return Object.fromEntries(columns.map((c) => [c, '']));
}
