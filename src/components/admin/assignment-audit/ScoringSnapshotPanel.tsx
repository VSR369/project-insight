/**
 * ScoringSnapshotPanel — Expanded row detail for audit log.
 * Aligned with Figma: no summary grid, updated headers, strikethrough on eliminated.
 */

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Candidate {
  admin_id?: string;
  full_name?: string;
  industry_score?: number;
  country_score?: number;
  org_type_score?: number;
  total_score?: number;
  workload_ratio?: number;
  assignment_priority?: number;
}

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

  const candidates = (snapshot.candidates ?? []) as Candidate[];
  const winnerId = snapshot.selected_admin_id as string | undefined;

  if (candidates.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No candidate data available for this entry.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <div>
        <h4 className="text-sm font-semibold">Candidate Scoring Snapshot</h4>
        <p className="text-xs text-muted-foreground">
          Detailed breakdown of all candidates evaluated by the assignment engine
        </p>
      </div>

      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Admin Name</TableHead>
              <TableHead className="text-xs text-right">L1 Score</TableHead>
              <TableHead className="text-xs text-right">L2 Score</TableHead>
              <TableHead className="text-xs text-right">L3 Score</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
              <TableHead className="text-xs text-right">Workload %</TableHead>
              <TableHead className="text-xs text-right">Priority</TableHead>
              <TableHead className="text-xs">Outcome</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((c, i) => {
              const isWinner = c.admin_id === winnerId;
              const isEliminated = (c.industry_score ?? 0) === 0;
              return (
                <TableRow
                  key={c.admin_id ?? i}
                  className={isWinner ? 'bg-green-50 dark:bg-green-950/20' : ''}
                >
                  <TableCell className={`text-xs font-medium ${isEliminated ? 'line-through text-muted-foreground' : ''}`}>
                    {c.full_name ?? '—'}
                  </TableCell>
                  <TableCell className={`text-xs text-right ${isEliminated ? 'text-destructive font-semibold' : ''}`}>
                    {c.industry_score ?? 0}
                  </TableCell>
                  <TableCell className="text-xs text-right">{c.country_score ?? 0}</TableCell>
                  <TableCell className="text-xs text-right">{c.org_type_score ?? 0}</TableCell>
                  <TableCell className="text-xs text-right font-semibold">{c.total_score ?? 0}</TableCell>
                  <TableCell className="text-xs text-right">
                    {typeof c.workload_ratio === 'number'
                      ? `${(c.workload_ratio * 100).toFixed(0)}%`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-right">{c.assignment_priority ?? '—'}</TableCell>
                  <TableCell>
                    {isWinner ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">Winner</Badge>
                    ) : isEliminated ? (
                      <Badge variant="destructive" className="text-[10px]">Eliminated</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Runner-up</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
