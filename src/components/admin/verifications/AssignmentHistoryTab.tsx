import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Json } from '@/integrations/supabase/types';

interface HistoryEntry {
  id: string;
  created_at: string;
  event_type: string;
  from_admin_id: string | null;
  to_admin_id: string | null;
  initiator: string;
  reason: string | null;
  scoring_snapshot: Json | null;
}

interface AssignmentHistoryTabProps {
  history: HistoryEntry[];
}

const EVENT_COLORS: Record<string, string> = {
  AUTO_ASSIGNED: 'bg-blue-100 text-blue-800',
  CLAIMED_FROM_QUEUE: 'bg-emerald-100 text-emerald-800',
  RELEASED_TO_QUEUE: 'bg-amber-100 text-amber-800',
  REASSIGNMENT_REQUESTED: 'bg-purple-100 text-purple-800',
  REASSIGNED: 'bg-purple-100 text-purple-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
  RETURNED_FOR_CORRECTION: 'bg-amber-100 text-amber-800',
};

export function AssignmentHistoryTab({ history }: AssignmentHistoryTabProps) {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No assignment history yet.</p>;
  }

  return (
    <div className="relative w-full overflow-auto pt-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date/Time</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Initiator</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="text-sm whitespace-nowrap">
                {format(new Date(entry.created_at), 'MMM d, yyyy HH:mm')}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={EVENT_COLORS[entry.event_type] ?? 'bg-muted text-muted-foreground'}
                >
                  {entry.event_type.replace(/_/g, ' ')}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{entry.initiator}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                {entry.reason ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
