import { useNavigate } from 'react-router-dom';
import { useMyAssignments } from '@/hooks/queries/useVerificationDashboard';
import { SLATimelineBar } from './SLATimelineBar';
import { SLAStatusBadge } from './SLAStatusBadge';
import { AssignmentMethodBadge } from './AssignmentMethodBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';

/**
 * SCR-03-01: My Assignments Tab
 * GAP-4: Days Remaining column
 * GAP-5: SLA Deadline column
 */
export function MyAssignmentsTab() {
  const navigate = useNavigate();
  const { data: assignments, isLoading } = useMyAssignments();

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (!assignments || assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
        <h3 className="text-lg font-semibold">You have no active verifications</h3>
        <p className="text-muted-foreground mt-1">Great work! Check the Open Queue for available tasks.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead>HQ Country</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="min-w-[200px]">SLA Progress</TableHead>
            <TableHead>SLA Deadline</TableHead>
            <TableHead>Days Remaining</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((item) => (
            <AssignmentRow key={item.id} item={item} onClick={() => navigate(`/admin/verifications/${item.id}`)} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AssignmentRow({ item, onClick }: { item: any; onClick: () => void }) {
  const { deadlineText, daysRemaining, daysColor } = useMemo(() => {
    if (!item.sla_start_at || !item.sla_duration_seconds) {
      return { deadlineText: '—', daysRemaining: null, daysColor: '' };
    }
    const startMs = new Date(item.sla_start_at).getTime();
    const pausedMs = (item.sla_paused_duration_hours ?? 0) * 3600 * 1000;
    const deadlineMs = startMs + pausedMs + item.sla_duration_seconds * 1000;
    const deadline = new Date(deadlineMs);
    const diffMs = deadlineMs - Date.now();
    const days = Math.ceil(diffMs / (24 * 3600 * 1000));

    const fmt = deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const remainingMs = Math.abs(diffMs);
    const hrs = Math.floor(remainingMs / 3600000);
    const mins = Math.floor((remainingMs % 3600000) / 60000);
    const relativeText = diffMs >= 0
      ? `${Math.floor(diffMs / 3600000)}h ${mins}m remaining`
      : `Breached ${hrs}h ${mins}m ago`;

    const color = days > 0 ? 'text-emerald-600' : days === 0 ? 'text-amber-600' : 'text-destructive';

    return {
      deadlineText: `${fmt} · ${relativeText}`,
      daysRemaining: days,
      daysColor: color,
    };
  }, [item.sla_start_at, item.sla_paused_duration_hours, item.sla_duration_seconds]);

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onClick}>
      <TableCell className="font-medium">
        {item.organization?.organization_name ?? 'Unknown'}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {item.organization?.country?.name ?? '—'}
      </TableCell>
      <TableCell>
        <AssignmentMethodBadge method={item.assignment_method} />
      </TableCell>
      <TableCell>
        {item.sla_start_at && (
          <SLATimelineBar
            slaStartAt={item.sla_start_at}
            slaPausedHours={item.sla_paused_duration_hours ?? 0}
            slaDurationSeconds={item.sla_duration_seconds}
            breachTier={item.sla_breach_tier ?? 'NONE'}
          />
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap max-w-[220px]">
        {deadlineText}
      </TableCell>
      <TableCell>
        {daysRemaining !== null && (
          <span className={`text-sm font-semibold ${daysColor}`}>
            {daysRemaining > 0 ? `+${daysRemaining}` : daysRemaining}
          </span>
        )}
      </TableCell>
      <TableCell>
        <SLAStatusBadge breachTier={item.sla_breach_tier ?? 'NONE'} />
      </TableCell>
      <TableCell className="text-sm">{item.status?.replace(/_/g, ' ')}</TableCell>
    </TableRow>
  );
}
