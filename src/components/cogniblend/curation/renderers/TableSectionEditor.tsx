/**
 * TableSectionEditor — Generic inline editor for JSON-array table sections.
 * Autosaves on every cell change (debounced by parent).
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { AutoSaveIndicator } from "@/components/cogniblend/curation/AutoSaveIndicator";
import type { AutoSaveStatus } from "@/hooks/cogniblend/useAutoSaveSection";

export interface TableColumnDef {
  key: string;
  label: string;
  placeholder?: string;
}

interface TableSectionEditorProps {
  columns: TableColumnDef[];
  initialRows: Record<string, string>[];
  onSave: (rows: Record<string, string>[]) => void;
  onCancel: () => void;
  saving?: boolean;
  autoSaveStatus?: AutoSaveStatus;
}

export function TableSectionEditor({
  columns,
  initialRows,
  onSave,
  onCancel,
  saving = false,
  autoSaveStatus,
}: TableSectionEditorProps) {
  const [rows, setRows] = useState<Record<string, string>[]>(
    initialRows.length > 0
      ? initialRows.map((r) => ({ ...r }))
      : [createEmptyRow(columns)],
  );

  const triggerSave = useCallback((newRows: Record<string, string>[]) => {
    const nonEmpty = newRows.filter((r) =>
      columns.some((c) => (r[c.key] ?? "").trim().length > 0),
    );
    onSave(nonEmpty);
  }, [columns, onSave]);

  const updateCell = (rowIdx: number, colKey: string, value: string) => {
    const next = rows.map((r, i) => (i === rowIdx ? { ...r, [colKey]: value } : r));
    setRows(next);
    triggerSave(next);
  };

  const addRow = () => setRows((prev) => [...prev, createEmptyRow(columns)]);

  const removeRow = (idx: number) => {
    const next = rows.filter((_, i) => i !== idx);
    setRows(next);
    triggerSave(next);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {rows.map((row, ri) => (
          <div
            key={ri}
            className="rounded-md border border-border bg-muted/20 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Row {ri + 1}
              </span>
              {rows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive"
                  onClick={() => removeRow(ri)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {columns.map((col) => (
                <div key={col.key}>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {col.label}
                  </label>
                  <Input
                    value={row[col.key] ?? ""}
                    onChange={(e) => updateCell(ri, col.key, e.target.value)}
                    placeholder={col.placeholder ?? col.label}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs gap-1"
          onClick={addRow}
        >
          <Plus className="h-3.5 w-3.5" /> Add Row
        </Button>
        <AutoSaveIndicator status={autoSaveStatus ?? (saving ? "saving" : "idle")} />
      </div>
    </div>
  );
}

function createEmptyRow(columns: TableColumnDef[]): Record<string, string> {
  return Object.fromEntries(columns.map((c) => [c.key, ""]));
}
