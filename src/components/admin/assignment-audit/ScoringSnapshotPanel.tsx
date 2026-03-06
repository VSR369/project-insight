/**
 * ScoringSnapshotPanel — Expanded row detail for audit log.
 * Shows scoring breakdown from the assignment engine snapshot JSONB.
 */

import { Badge } from '@/components/ui/badge';

interface ScoringSnapshotPanelProps {
  snapshot: Record<string, unknown>;
}

export function ScoringSnapshotPanel({ snapshot }: ScoringSnapshotPanelProps) {
  if (!snapshot || Object.keys(snapshot).length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No scoring details available for this entry.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h4 className="text-sm font-semibold">Scoring Breakdown</h4>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ScoreItem label="Industry Score" value={snapshot.industry_score} max={40} />
        <ScoreItem label="Country Score" value={snapshot.country_score} max={30} />
        <ScoreItem label="Org Type Score" value={snapshot.org_type_score} max={30} />
        <ScoreItem label="Total Score" value={snapshot.total_score} max={100} highlight />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t">
        <div>
          <span className="text-xs text-muted-foreground">Method</span>
          <div className="mt-0.5">
            <Badge variant="outline" className="text-xs">
              {(snapshot.method as string) ?? 'N/A'}
            </Badge>
          </div>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Pool Size</span>
          <p className="text-sm font-medium mt-0.5">{(snapshot.pool_size as number) ?? '—'}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Workload Ratio</span>
          <p className="text-sm font-medium mt-0.5">
            {typeof snapshot.workload_ratio === 'number'
              ? `${(snapshot.workload_ratio as number * 100).toFixed(0)}%`
              : '—'}
          </p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Selected Admin</span>
          <p className="text-sm font-medium mt-0.5">
            {(snapshot.selected_admin_name as string) ?? '—'}
          </p>
        </div>
      </div>

      {snapshot.reason && (
        <div className="pt-2 border-t">
          <span className="text-xs text-muted-foreground">Fallback Reason</span>
          <p className="text-sm mt-0.5">{snapshot.reason as string}</p>
        </div>
      )}
    </div>
  );
}

function ScoreItem({
  label,
  value,
  max,
  highlight,
}: {
  label: string;
  value: unknown;
  max: number;
  highlight?: boolean;
}) {
  const numValue = typeof value === 'number' ? value : 0;
  const pct = max > 0 ? Math.min(100, (numValue / max) * 100) : 0;

  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 mt-0.5">
        <span className={`text-sm ${highlight ? 'font-bold' : 'font-medium'}`}>
          {typeof value === 'number' ? value : '—'}
        </span>
        <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${highlight ? 'bg-primary' : 'bg-primary/60'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
