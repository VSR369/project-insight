import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { SlaBreachRecord } from '@/hooks/queries/useAdminMetricsDetail';

interface SlaBreachHistoryProps {
  data: SlaBreachRecord[];
  isLoading: boolean;
}

const TIER_COLORS: Record<string, string> = {
  TIER1: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  TIER2: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
  TIER3: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
};

function formatCompletionTime(row: SlaBreachRecord): string {
  if (!row.completed_at || !row.sla_start_at) return '—';
  const totalHours =
    (new Date(row.completed_at).getTime() - new Date(row.sla_start_at).getTime()) / 3600000
    - (row.sla_paused_duration_hours ?? 0);
  const days = (totalHours / 24).toFixed(1);
  const pctOfSla = row.sla_target_hours > 0
    ? Math.round((totalHours / row.sla_target_hours) * 100)
    : 0;
  return `${days}d (${pctOfSla}% of SLA)`;
}

export function SlaBreachHistory({ data, isLoading }: SlaBreachHistoryProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading breach history…</div>;
  }

  if (!data.length) {
    return <div className="text-center py-8 text-muted-foreground">No SLA breaches in the last 90 days.</div>;
  }

  return (
    <div className="relative w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead>Breach Tier</TableHead>
            <TableHead>Completed</TableHead>
            <TableHead className="text-right">Completion Time</TableHead>
            <TableHead className="text-right">Reassigned</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium text-sm">
                {row.organization_name || '—'}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={TIER_COLORS[row.sla_breach_tier ?? ''] || ''}>
                  {row.sla_breach_tier || '—'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {row.completed_at ? format(new Date(row.completed_at), 'dd MMM yyyy') : '—'}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCompletionTime(row)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {row.reassignment_count > 0 ? (
                  <Badge variant="outline" className="text-xs">{row.reassignment_count}×</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
