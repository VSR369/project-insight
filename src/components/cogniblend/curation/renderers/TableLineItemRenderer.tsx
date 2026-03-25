/**
 * TableLineItemRenderer — Renders structured JSON line items as a professional
 * editable table with weight pills, scoring breakdowns, and role badges.
 */

import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
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
import { parseScoringMethod, formatColumnHeader } from "@/utils/detectAndParseLineItems";
import { cn } from "@/lib/utils";

interface TableLineItemRendererProps {
  rows: Record<string, unknown>[];
  schema: string[];
  onChange: (rows: Record<string, unknown>[]) => void;
}

function WeightPill({ weight }: { weight: number }) {
  const num = Number(weight) || 0;
  const colorClass =
    num >= 25
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : num >= 15
        ? "bg-purple-100 text-purple-700 border-purple-200"
        : "bg-muted text-muted-foreground border-border";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", colorClass)}>
      {num} pts
    </span>
  );
}

function ScoringMethodCell({ value }: { value: string }) {
  const segments = parseScoringMethod(String(value ?? ""));
  if (segments.length === 0) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="space-y-0.5">
      {segments.map((seg, i) => (
        <div key={i} className="text-[11px] leading-tight">
          <span className="font-medium text-foreground">{seg.condition}</span>
          {seg.points && (
            <>
              <span className="text-muted-foreground"> = </span>
              <span className="text-muted-foreground">{seg.points}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function EvaluatorRoleBadge({ role }: { role: string }) {
  if (!role) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
      {String(role)}
    </Badge>
  );
}

function renderCellValue(key: string, value: unknown) {
  const strVal = String(value ?? "");

  if (key === "weight" || key === "weight_percent") {
    return <WeightPill weight={Number(value) || 0} />;
  }
  if (key === "scoring_method" || key === "scoring_type") {
    return <ScoringMethodCell value={strVal} />;
  }
  if (key === "evaluator_role") {
    return <EvaluatorRoleBadge role={strVal} />;
  }
  if (key === "criterion" || key === "parameter" || key === "name") {
    return <span className="font-medium text-foreground">{strVal || "—"}</span>;
  }
  return <span className="text-foreground">{strVal || "—"}</span>;
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
                  className="group border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="px-3 py-2 text-[11px] text-muted-foreground font-medium">
                    {rowIdx + 1}
                  </TableCell>
                  {schema.map((key) => (
                    <TableCell key={key} className="px-3 py-2 align-top">
                      <div className="space-y-1">
                        {renderCellValue(key, row[key])}
                        <Input
                          value={String(row[key] ?? "")}
                          onChange={(e) => handleCellChange(rowIdx, key, e.target.value)}
                          className="h-7 text-[11px] bg-background/50 border-border/40 mt-1"
                          placeholder={formatColumnHeader(key)}
                        />
                      </div>
                    </TableCell>
                  ))}
                  <TableCell className="px-2 py-2 align-top">
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
