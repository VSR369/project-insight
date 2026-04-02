/**
 * EvalCriteriaSubComponents — Sub-components for EvaluationCriteriaSection.
 * Extracted: WeightBar, ColumnHeaders, MiniBar, color/truncate helpers.
 */

const CRITERION_COLORS = [
  "#378ADD", "#1D9E75", "#7F77DD",
  "#EF9F27", "#D85A30", "#D4537E",
];

export function getColor(index: number) {
  return CRITERION_COLORS[index % CRITERION_COLORS.length];
}

export function truncate(str: string, max = 16) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export interface CriterionRow {
  name: string;
  weight: number;
  description?: string;
}

/* ─── Weight Distribution Bar ─── */
export function WeightBar({ rows }: { rows: CriterionRow[] }) {
  const total = rows.reduce((s, r) => s + (r.weight || 0), 0);
  if (!rows.length || total === 0) return null;

  return (
    <div className="px-4 pt-3 pb-1 pl-5">
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
export function ColumnHeaders({ showDelete }: { showDelete: boolean }) {
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
export function MiniBar({ weight, color }: { weight: number; color: string }) {
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
