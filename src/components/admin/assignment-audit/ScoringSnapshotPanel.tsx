/**
 * ScoringSnapshotPanel — Expanded row detail for audit log.
 * GAP-13: Per-candidate scoring breakdown with outcome badges.
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
  admin_tier?: string;
  industry_score?: number;
  country_score?: number;
  org_type_score?: number;
  total_score?: number;
  workload_ratio?: number;
  assignment_priority?: number;
  availability_status?: string;
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
  const selectionReason = snapshot.selection_reason as string | undefined;

  return (
    <div className="p-4 space-y-3">
      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <span className="text-xs text-muted-foreground">Method</span>
          <div className="mt-0.5">
            <Badge variant="outline" className="text-xs">
              {(snapshot.method as string) ?? 'N/A'}
            </Badge>
          </div>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Pass</span>
          <p className="text-sm font-medium mt-0.5">{(snapshot.pass as string) ?? '—'}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Pool Size</span>
          <p className="text-sm font-medium mt-0.5">{(snapshot.pool_size as number) ?? '—'}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Selection Reason</span>
          <div className="mt-0.5">
            {selectionReason ? (
              <SelectionReasonBadge reason={selectionReason} />
            ) : (
              <span className="text-sm">—</span>
            )}
          </div>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Winner</span>
          <p className="text-sm font-medium mt-0.5">
            {(snapshot.selected_admin_name as string) ?? '—'}
          </p>
        </div>
      </div>

      {/* GAP-13: Per-candidate breakdown table */}
      {candidates.length > 0 && (
        <div className="pt-2 border-t">
          <h4 className="text-sm font-semibold mb-2">Candidate Scoring Breakdown</h4>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Admin</TableHead>
                  <TableHead className="text-xs">Tier</TableHead>
                  <TableHead className="text-xs text-right">L1 (Industry)</TableHead>
                  <TableHead className="text-xs text-right">L2 (Country)</TableHead>
                  <TableHead className="text-xs text-right">L3 (Org Type)</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs text-right">Workload</TableHead>
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
                      <TableCell className="text-xs font-medium">
                        {c.full_name ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs">{c.admin_tier ?? '—'}</TableCell>
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
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">WINNER</Badge>
                        ) : isEliminated ? (
                          <Badge variant="destructive" className="text-[10px]">L1=0</Badge>
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
        </div>
      )}

      {snapshot.reason && (
        <div className="pt-2 border-t">
          <span className="text-xs text-muted-foreground">Fallback Reason</span>
          <p className="text-sm mt-0.5">{snapshot.reason as string}</p>
        </div>
      )}
    </div>
  );
}

function SelectionReasonBadge({ reason }: { reason: string }) {
  const config: Record<string, { label: string; className: string }> = {
    highest_domain_score: { label: 'Highest Score', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
    workload_tiebreaker: { label: 'Workload Tie', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
    priority_tiebreaker: { label: 'Priority Tie', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
    round_robin: { label: 'Round Robin', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
    NO_ELIGIBLE_ADMIN: { label: 'No Eligible', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
    NO_INDUSTRY_MATCH: { label: 'No Match', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  };
  const c = config[reason] ?? { label: reason, className: '' };
  return <Badge className={`text-[10px] ${c.className}`}>{c.label}</Badge>;
}
