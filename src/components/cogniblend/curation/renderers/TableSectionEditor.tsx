/**
 * TableSectionEditor — Generic inline editor for JSON-array table sections.
 * Supports add/remove/edit rows with named columns.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, X } from "lucide-react";

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
}

export function TableSectionEditor({
  columns,
  initialRows,
  onSave,
  onCancel,
  saving = false,
}: TableSectionEditorProps) {
  const [rows, setRows] = useState<Record<string, string>[]>(
    initialRows.length > 0
      ? initialRows.map((r) => ({ ...r }))
      : [createEmptyRow(columns)],
  );

  const updateCell = (rowIdx: number, colKey: string, value: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === rowIdx ? { ...r, [colKey]: value } : r)),
    );
  };

  const addRow = () => setRows((prev) => [...prev, createEmptyRow(columns)]);

  const removeRow = (idx: number) =>
    setRows((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    const nonEmpty = rows.filter((r) =>
      columns.some((c) => (r[c.key] ?? "").trim().length > 0),
    );
    onSave(nonEmpty);
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

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-xs gap-1"
        onClick={addRow}
      >
        <Plus className="h-3.5 w-3.5" /> Add Row
      </Button>

      <div className="flex gap-2 justify-end pt-2 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={onCancel}
          disabled={saving}
        >
          <X className="h-3.5 w-3.5 mr-1" /> Cancel
        </Button>
        <Button
          size="sm"
          className="text-xs"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function createEmptyRow(columns: TableColumnDef[]): Record<string, string> {
  return Object.fromEntries(columns.map((c) => [c.key, ""]));
}
