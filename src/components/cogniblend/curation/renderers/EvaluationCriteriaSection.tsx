/**
 * EvaluationCriteriaSection — Rich view/edit for evaluation criteria.
 * Edit mode extracted to CriteriaEditMode.
 */

import { CheckCircle } from "lucide-react";
import {
  WeightBar, ColumnHeaders, MiniBar, getColor,
  type CriterionRow,
} from "./EvalCriteriaSubComponents";
import { CriteriaEditMode } from "./CriteriaEditMode";

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

export function EvaluationCriteriaSection({
  criteria, readOnly, editing, onSave, onCancel, saving, aiStatus, onReReview,
}: EvaluationCriteriaSectionProps) {
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
            <div key={i} className="flex items-center gap-0 border border-border/40 rounded-[9px] overflow-hidden bg-background">
              <span className="w-7 text-center text-[11px] font-semibold text-muted-foreground shrink-0 py-[10px]">{i + 1}</span>
              <span className="flex-1 text-[13px] text-foreground py-[10px] pr-2">{c.name || "—"}</span>
              <span className="border-l border-border/40 flex items-center gap-0 shrink-0">
                <span className="w-[44px] text-center text-[13px] font-semibold text-foreground py-[10px]">{c.weight ?? 0}</span>
                <span className="text-[11px] text-muted-foreground pr-[10px] select-none">%</span>
              </span>
              <MiniBar weight={c.weight} color={getColor(i)} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-4 pl-5 py-[6px]">
          <span className="text-[11px] text-muted-foreground">{viewRows.length} criteria</span>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground">Total:</span>
            {(() => {
              const vt = viewRows.reduce((s, r) => s + (r.weight || 0), 0);
              if (vt === 100) return (
                <>
                  <span className="text-[12px] font-semibold text-primary">100%</span>
                  <CheckCircle size={13} className="text-primary" />
                </>
              );
              return <span className="text-[12px] font-semibold text-destructive">{vt}%</span>;
            })()}
          </div>
        </div>
      </div>
    );
  }

  // ─── Edit Mode (extracted) ───
  return (
    <CriteriaEditMode
      criteria={criteria}
      onSave={onSave}
      onCancel={onCancel}
      saving={saving}
      aiStatus={aiStatus}
      onReReview={onReReview}
    />
  );
}
