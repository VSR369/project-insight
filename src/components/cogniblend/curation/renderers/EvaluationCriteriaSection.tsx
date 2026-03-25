/**
 * EvaluationCriteriaSection — Rich view/edit for evaluation criteria
 * with color-coded weight distribution bar, mini bars, live totals.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { Plus, Trash2, Check, X, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CRITERION_COLORS = [
  "#378ADD", "#1D9E75", "#7F77DD",
  "#EF9F27", "#D85A30", "#D4537E",
];

function getColor(index: number) {
  return CRITERION_COLORS[index % CRITERION_COLORS.length];
}

function truncate(str: string, max = 16) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

interface CriterionRow {
  name: string;
  weight: number;
  description?: string;
}

interface EvaluationCriteriaSectionProps {
  criteria: CriterionRow[];
  readOnly: boolean;
  editing: boolean;
  onSave: (criteria: CriterionRow[]) => void;
  onCancel: () => void;
  saving?: boolean;
  aiStatus?: string;
  onReReview?: () => void;
}

/* ─── Weight Distribution Bar ─── */
function WeightBar({ rows }: { rows: CriterionRow[] }) {
  const total = rows.reduce((s, r) => s + (r.weight || 0), 0);
  if (!rows.length || total === 0) return null;

  return (
    <div className="px-4 pt-3 pb-1 pl-5">
      {/* Stacked bar */}
      <div className="flex h-[6px] rounded-[3px] overflow-hidden" style={{ gap: "1px" }}>
        {rows.map((r, i) => {
          const pct = total > 0 ? (r.weight / total) * 100 : 0;
          return (
            <div
              key={i}
              className="h-full rounded-[1px]"
              style={{
                width: `${pct}%`,
                backgroundColor: getColor(i),
                transition: "width 0.3s ease",
                minWidth: pct > 0 ? "2px" : "0",
              }}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 mb-1">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-sm shrink-0"
              style={{ backgroundColor: getColor(i) }}
            />
            <span className="text-[10px] text-muted-foreground">
              {truncate(r.name || "Untitled")} {r.weight}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Column Headers ─── */
function ColumnHeaders({ showDelete }: { showDelete: boolean }) {
  return (
    <div className="flex items-center px-4 py-[6px] pl-5 border-y border-border/40 bg-muted/40">
      <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground pl-7">
        Criterion
      </span>
      <span className="w-[88px] text-center text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        Weight
      </span>
      <span className="w-[60px] text-center text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        Distribution
      </span>
      {showDelete && <span className="w-8" />}
    </div>
  );
}

/* ─── Mini Bar ─── */
function MiniBar({ weight, color }: { weight: number; color: string }) {
  const pct = Math.min(Math.max(weight, 0), 100);
  return (
    <div className="w-[52px] shrink-0 px-1 flex items-center">
      <div className="w-full h-[3px] rounded-full bg-muted/60 relative">
        <div
          className="h-[3px] rounded-full absolute left-0 top-0"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            transition: "width 0.25s ease",
          }}
        />
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export function EvaluationCriteriaSection({
  criteria,
  readOnly,
  editing,
  onSave,
  onCancel,
  saving,
  aiStatus,
  onReReview,
}: EvaluationCriteriaSectionProps) {
  const [rows, setRows] = useState<CriterionRow[]>(() =>
    criteria.length ? criteria.map(c => ({ ...c })) : [{ name: "", weight: 0 }]
  );

  const total = useMemo(() => rows.reduce((s, r) => s + (r.weight || 0), 0), [rows]);
  const isValid = total === 100;

  const updateRow = useCallback((index: number, field: "name" | "weight", value: string | number) => {
    setRows(prev => prev.map((r, i) =>
      i === index
        ? { ...r, [field]: field === "weight" ? Math.max(0, Math.min(100, Number(value) || 0)) : value }
        : r
    ));
  }, []);

  const deleteRow = useCallback((index: number) => {
    setRows(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  }, []);

  const addRow = useCallback(() => {
    setRows(prev => [...prev, { name: "", weight: 0 }]);
  }, []);

  const autoBalance = useCallback(() => {
    setRows(prev => {
      if (prev.length === 0) return prev;
      // If all weights are 0, distribute equally
      const allZero = prev.every(r => (r.weight || 0) === 0);
      if (allZero) {
        const base = Math.floor(100 / prev.length);
        const remainder = 100 - base * prev.length;
        return prev.map((r, i) => ({ ...r, weight: base + (i < remainder ? 1 : 0) }));
      }
      const currentTotal = prev.reduce((s, r) => s + (r.weight || 0), 0);
      if (currentTotal === 0) return prev;
      const scaled = prev.map(r => ({ ...r, weight: Math.round((r.weight / currentTotal) * 100) }));
      const scaledTotal = scaled.reduce((s, r) => s + r.weight, 0);
      const diff = 100 - scaledTotal;
      if (diff !== 0) {
        // Add remainder to the largest criterion
        let maxIdx = 0;
        scaled.forEach((r, i) => { if (r.weight > scaled[maxIdx].weight) maxIdx = i; });
        scaled[maxIdx] = { ...scaled[maxIdx], weight: scaled[maxIdx].weight + diff };
      }
      return scaled;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (isValid) onSave(rows);
  }, [isValid, rows, onSave]);

  // ─── View Mode ───
  if (!editing || readOnly) {
    const viewRows = criteria || [];
    if (!viewRows.length) {
      return <p className="text-sm text-muted-foreground">Not defined.</p>;
    }
    return (
      <div>
        <WeightBar rows={viewRows} />
        <ColumnHeaders showDelete={false} />
        <div className="px-4 pl-5 flex flex-col gap-1.5 pb-2 pt-1">
          {viewRows.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-0 border border-border/40 rounded-[9px] overflow-hidden bg-background"
            >
              <span className="w-7 text-center text-[11px] font-semibold text-muted-foreground shrink-0 py-[10px]">
                {i + 1}
              </span>
              <span className="flex-1 text-[13px] text-foreground py-[10px] pr-2">
                {c.name || "—"}
              </span>
              <span className="border-l border-border/40 flex items-center gap-0 shrink-0">
                <span className="w-[44px] text-center text-[13px] font-semibold text-foreground py-[10px]">
                  {c.weight ?? 0}
                </span>
                <span className="text-[11px] text-muted-foreground pr-[10px] select-none">%</span>
              </span>
              <MiniBar weight={c.weight} color={getColor(i)} />
            </div>
          ))}
        </div>
        {/* Totals in view mode */}
        <div className="flex items-center justify-between px-4 pl-5 py-[6px]">
          <span className="text-[11px] text-muted-foreground">{viewRows.length} criteria</span>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground">Total:</span>
            {(() => {
              const vt = viewRows.reduce((s, r) => s + (r.weight || 0), 0);
              if (vt === 100) return (
                <>
                  <span className="text-[12px] font-semibold text-emerald-600">100%</span>
                  <CheckCircle size={13} className="text-emerald-500" />
                </>
              );
              return <span className="text-[12px] font-semibold text-destructive">{vt}%</span>;
            })()}
          </div>
        </div>
      </div>
    );
  }

  // ─── Edit Mode ───
  return (
    <div>
      <WeightBar rows={rows} />
      <ColumnHeaders showDelete />

      {/* Rows */}
      <div className="px-4 pl-5 flex flex-col gap-1.5 pb-2 pt-1">
        {rows.map((c, i) => (
          <div key={i} className="group relative flex flex-col gap-1.5">
            <div className="flex items-center gap-0 border border-border/40 rounded-[9px] overflow-hidden bg-background hover:border-border hover:shadow-sm transition-all duration-150">
              <span className="w-7 text-center text-[11px] font-semibold text-muted-foreground shrink-0 py-[10px]">
                {i + 1}
              </span>
              <input
                className="flex-1 border-none outline-none bg-transparent text-[13px] text-foreground py-[10px] pr-2 placeholder:text-muted-foreground/50"
                placeholder="Enter criterion name..."
                value={c.name}
                onChange={e => updateRow(i, "name", e.target.value)}
              />
              <div className="border-l border-border/40 flex items-center gap-0 shrink-0">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  className="w-[44px] border-none outline-none bg-transparent text-[13px] font-semibold text-foreground text-center py-[10px]"
                  value={c.weight}
                  onChange={e => updateRow(i, "weight", e.target.value)}
                />
                <span className="text-[11px] text-muted-foreground pr-[10px] select-none">%</span>
              </div>
              <MiniBar weight={c.weight} color={getColor(i)} />
              <button
                type="button"
                className="w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                onClick={() => deleteRow(i)}
                tabIndex={-1}
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add row */}
      <div
        className="flex items-center gap-2 mx-4 ml-5 mb-3 px-3 py-[8px] border border-dashed border-border/50 rounded-[8px] cursor-pointer text-primary text-[12px] font-medium hover:border-primary/40 hover:bg-primary/5 transition-all"
        onClick={addRow}
      >
        <Plus size={12} />
        Add criterion
        <span className="text-[11px] text-muted-foreground/40 ml-auto">Weights must total 100%</span>
      </div>

      {/* Totals */}
      <div className="flex items-center justify-between px-4 pl-5 py-[6px]">
        <span className="text-[11px] text-muted-foreground">{rows.length} criteria</span>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground">Total:</span>
          {total === 100 ? (
            <>
              <span className="text-[12px] font-semibold text-emerald-600">100%</span>
              <CheckCircle size={13} className="text-emerald-500" />
            </>
          ) : total < 100 ? (
            <>
              <span className="text-[12px] font-semibold text-amber-600">{total}%</span>
              <AlertCircle size={13} className="text-amber-500" />
              <span className="bg-amber-50 text-amber-600 text-[10px] font-medium px-2 py-0.5 rounded-md ml-1">
                {100 - total}% remaining
              </span>
            </>
          ) : (
            <>
              <span className="text-[12px] font-semibold text-destructive">{total}%</span>
              <AlertCircle size={13} className="text-destructive" />
              <span className="bg-destructive/10 text-destructive text-[10px] font-medium px-2 py-0.5 rounded-md ml-1">
                {total - 100}% over
              </span>
            </>
          )}
          {total !== 100 && (
            <button
              type="button"
              className="text-[11px] text-primary underline cursor-pointer ml-2"
              onClick={autoBalance}
            >
              Auto-balance
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center px-4 py-[9px] bg-muted/40 border-t border-border/40">
        <span className="text-[11px] text-muted-foreground">Drag rows to reorder</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-[11px] font-medium px-3 py-[5px] h-auto rounded-[7px]"
            onClick={onCancel}
            disabled={saving}
          >
            <X size={10} />
            Cancel
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm"
                    className="text-[11px] font-semibold px-4 py-[5px] h-auto rounded-[7px] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSave}
                    disabled={!isValid || saving}
                  >
                    <Check size={10} />
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </span>
              </TooltipTrigger>
              {!isValid && (
                <TooltipContent>
                  <p>Weights must total 100% before saving</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Reviewed state footer */}
      {(aiStatus === "pass" || aiStatus === "reviewed" || aiStatus === "addressed") && (
        <div className="flex items-center justify-between px-4 py-[9px] bg-emerald-50 border-t border-emerald-100">
          <div className="flex items-center gap-1.5">
            <CheckCircle size={12} className="text-emerald-600" />
            <span className="text-[11px] font-medium text-emerald-700">
              Section reviewed and addressed
            </span>
          </div>
          {onReReview && (
            <Button
              variant="outline"
              size="sm"
              className="text-[11px] font-medium px-3 py-[5px] h-auto rounded-[7px] bg-background text-muted-foreground hover:bg-muted/40"
              onClick={onReReview}
            >
              <RefreshCw size={11} />
              Re-review this section
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
