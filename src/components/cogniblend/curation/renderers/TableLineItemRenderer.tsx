/**
 * TableLineItemRenderer — Renders structured JSON line items as a professional
 * editable table with clean inputs, alternating rows, and weight totals.
 */

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { formatColumnHeader } from "@/utils/detectAndParseLineItems";
import { cn } from "@/lib/utils";

interface TableLineItemRendererProps {
  rows: Record<string, unknown>[];
  schema: string[];
  onChange: (rows: Record<string, unknown>[]) => void;
}

export function TableLineItemRenderer({
  rows,
  schema,
  onChange,
}: TableLineItemRendererProps) {
  const handleCellChange = useCallback(
    (rowIndex: number, key: string, value: string) => {
      const updated = rows.map((row, i) => {
        if (i !== rowIndex) return row;
        const numericKeys = ["weight", "weight_percent", "amount"];
        const newVal = numericKeys.includes(key) ? (Number(value) || 0) : value;
        return { ...row, [key]: newVal };
      });
      onChange(updated);
    },
    [rows, onChange]
  );

  const handleRemoveRow = useCallback(
    (rowIndex: number) => {
      onChange(rows.filter((_, i) => i !== rowIndex));
    },
    [rows, onChange]
  );

  const handleAddRow = useCallback(() => {
    const emptyRow: Record<string, unknown> = {};
    schema.forEach((key) => {
      const numericKeys = ["weight", "weight_percent", "amount"];
      emptyRow[key] = numericKeys.includes(key) ? 0 : "";
    });
    onChange([...rows, emptyRow]);
  }, [rows, schema, onChange]);

  // Compute total weight if schema has weight/weight_percent
  const weightKey = schema.find((k) => k === "weight" || k === "weight_percent");
  const totalWeight = weightKey
    ? rows.reduce((sum, row) => sum + (Number(row[weightKey]) || 0), 0)
    : null;

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2 w-8">
                  #
                </TableHead>
                {schema.map((key) => (
                  <TableHead
                    key={key}
                    className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2"
                  >
                    {formatColumnHeader(key)}
                  </TableHead>
                ))}
                <TableHead className="w-8 px-2" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIdx) => (
                <TableRow
                  key={rowIdx}
                  className={cn(
                    "group border-b border-border/50 transition-colors",
                    rowIdx % 2 === 1 ? "bg-muted/30" : ""
                  )}
                >
                  <TableCell className="px-3 py-1.5 text-[11px] text-muted-foreground font-medium align-middle">
                    {rowIdx + 1}
                  </TableCell>
                  {schema.map((key) => (
                    <TableCell key={key} className="px-3 py-1.5 align-middle">
                      <Input
                        value={String(row[key] ?? "")}
                        onChange={(e) => handleCellChange(rowIdx, key, e.target.value)}
                        className="h-8 text-sm bg-background/50 border-border/40"
                        placeholder={formatColumnHeader(key)}
                      />
                    </TableCell>
                  ))}
                  <TableCell className="px-2 py-1.5 align-middle">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveRow(rowIdx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground gap-1 h-7"
          onClick={handleAddRow}
        >
          <Plus className="h-3 w-3" />
          Add row
        </Button>

        {totalWeight !== null && (
          <span
            className={cn(
              "text-xs font-medium",
              totalWeight === 100 ? "text-emerald-600" : "text-amber-600"
            )}
          >
            Total: {totalWeight}%{" "}
            {totalWeight !== 100 && <span className="text-[10px]">(should be 100%)</span>}
          </span>
        )}
      </div>
    </div>
  );
}
