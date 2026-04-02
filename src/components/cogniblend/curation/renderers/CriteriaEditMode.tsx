/**
 * CriteriaEditMode — Edit mode for evaluation criteria.
 * Extracted from EvaluationCriteriaSection for ≤200 line compliance.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { Plus, Trash2, Check, X, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  WeightBar, ColumnHeaders, MiniBar, getColor, type CriterionRow,
} from "./EvalCriteriaSubComponents";

interface CriteriaEditModeProps {
  criteria: CriterionRow[];
  onSave: (criteria: CriterionRow[]) => void;
  onCancel: () => void;
  saving?: boolean;
  aiStatus?: string;
  onReReview?: () => void;
}

export function CriteriaEditMode({
  criteria, onSave, onCancel, saving, aiStatus, onReReview,
}: CriteriaEditModeProps) {
  const [rows, setRows] = useState<CriterionRow[]>(() =>
    criteria.length ? criteria.map(c => ({ ...c })) : [{ name: "", weight: 0 }]
  );

  useEffect(() => {
    setRows(criteria.length ? criteria.map(c => ({ ...c })) : [{ name: "", weight: 0 }]);
  }, [criteria]);

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

  return (
    <div>
      <WeightBar rows={rows} />
      <ColumnHeaders showDelete />

      <div className="px-4 pl-5 flex flex-col gap-1.5 pb-2 pt-1">
        {rows.map((c, i) => (
          <div key={i} className="group relative flex flex-col gap-1.5">
            <div className="flex items-center gap-0 border border-border/40 rounded-[9px] overflow-hidden bg-background hover:border-border hover:shadow-sm transition-all duration-150">
              <span className="w-7 text-center text-[11px] font-semibold text-muted-foreground shrink-0 py-[10px]">{i + 1}</span>
              <input
                className="flex-1 border-none outline-none bg-transparent text-[13px] text-foreground py-[10px] pr-2 placeholder:text-muted-foreground/50"
                placeholder="Enter criterion name..."
                value={c.name}
                onChange={e => updateRow(i, "name", e.target.value)}
              />
              <div className="border-l border-border/40 flex items-center gap-0 shrink-0">
                <input
                  type="number"
                  min={0} max={100} step={1}
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

      <div
        className="flex items-center gap-2 mx-4 ml-5 mb-3 px-3 py-[8px] border border-dashed border-border/50 rounded-[8px] cursor-pointer text-primary text-[12px] font-medium hover:border-primary/40 hover:bg-primary/5 transition-all"
        onClick={addRow}
      >
        <Plus size={12} />
        Add criterion
        <span className="text-[11px] text-muted-foreground/40 ml-auto">Weights must total 100%</span>
      </div>

      <div className="flex items-center justify-between px-4 pl-5 py-[6px]">
        <span className="text-[11px] text-muted-foreground">{rows.length} criteria</span>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground">Total:</span>
          {total === 100 ? (
            <>
              <span className="text-[12px] font-semibold text-primary">100%</span>
              <CheckCircle size={13} className="text-primary" />
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
            <button type="button" className="text-[11px] text-primary underline cursor-pointer ml-2" onClick={autoBalance}>
              Auto-balance
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center px-4 py-[9px] bg-muted/40 border-t border-border/40">
        <span className="text-[11px] text-muted-foreground">Drag rows to reorder</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-[11px] font-medium px-3 py-[5px] h-auto rounded-[7px]" onClick={onCancel} disabled={saving}>
            <X size={10} />Cancel
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button size="sm" className="text-[11px] font-semibold px-4 py-[5px] h-auto rounded-[7px] disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleSave} disabled={!isValid || saving}>
                    <Check size={10} />{saving ? "Saving…" : "Save"}
                  </Button>
                </span>
              </TooltipTrigger>
              {!isValid && <TooltipContent><p>Weights must total 100% before saving</p></TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {(aiStatus === "pass" || aiStatus === "reviewed" || aiStatus === "addressed") && (
        <div className="flex items-center justify-between px-4 py-[9px] bg-primary/5 border-t border-primary/10">
          <div className="flex items-center gap-1.5">
            <CheckCircle size={12} className="text-primary" />
            <span className="text-[11px] font-medium text-primary">Section reviewed and addressed</span>
          </div>
          {onReReview && (
            <Button variant="outline" size="sm" className="text-[11px] font-medium px-3 py-[5px] h-auto rounded-[7px] bg-background text-muted-foreground hover:bg-muted/40" onClick={onReReview}>
              <RefreshCw size={11} />Re-review this section
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
