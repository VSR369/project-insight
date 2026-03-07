import { useNavigate } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WorkloadBar } from '@/components/admin/platform-admins/WorkloadBar';
import { AdminStatusBadge } from '@/components/admin/platform-admins/AdminStatusBadge';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import type { AdminMetricRow } from '@/hooks/queries/useAllAdminMetrics';

interface AdminPerformanceTableProps {
  data: AdminMetricRow[];
}

function SlaGauge({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-muted-foreground">—</span>;
  const filled = Math.round((rate / 100) * 5);
  const color = rate >= 90 ? 'text-green-500' : rate >= 80 ? 'text-yellow-500' : 'text-destructive';
  return (
    <div className="flex items-center gap-1">
      <span className={cn('text-sm font-medium', color)}>{rate}%</span>
      <span className={cn('text-xs tracking-wider', color)}>
        {'●'.repeat(filled)}{'○'.repeat(5 - filled)}
      </span>
    </div>
  );
}

export function AdminPerformanceTable({ data }: AdminPerformanceTableProps) {
  const navigate = useNavigate();

  if (!data.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No admin performance data available.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Admin</TableHead>
          <TableHead>SLA Rate</TableHead>
          <TableHead className="text-right">Completed</TableHead>
          <TableHead className="text-right">Avg Time</TableHead>
          <TableHead>Pending</TableHead>
          <TableHead className="text-right">At-Risk</TableHead>
          <TableHead className="text-right">Queue</TableHead>
          <TableHead className="text-right">In/Out</TableHead>
          <TableHead className="w-[80px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => {
          const slaRate = row.completed_total > 0
            ? Math.round((row.sla_compliant_total / row.completed_total) * 100)
            : null;
          const isLowSla = slaRate !== null && slaRate < 80;
          const isZero = row.completed_total === 0;

          return (
            <TableRow
              key={row.admin_id}
              className={cn(
                isLowSla && 'bg-destructive/5',
                isZero && 'opacity-60',
              )}
            >
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">{row.full_name}</span>
                  <AdminStatusBadge status={row.availability_status} />
                </div>
              </TableCell>
              <TableCell>
                <SlaGauge rate={slaRate} />
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {row.completed_total}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {row.avg_processing_hours !== null ? `${row.avg_processing_hours}h` : '—'}
              </TableCell>
              <TableCell>
                <WorkloadBar
                  current={row.current_pending}
                  max={row.max_concurrent_verifications}
                />
              </TableCell>
              <TableCell className="text-right">
                {row.sla_at_risk_count > 0 ? (
                  <Badge variant="destructive" className="text-xs">
                    {row.sla_at_risk_count}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">0</span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {row.open_queue_claims}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {row.reassignments_received}/{row.reassignments_sent}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/admin/performance/${row.admin_id}`)}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
