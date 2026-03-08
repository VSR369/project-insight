/**
 * AuditHistoryTable — Audit trail table for SCR-07-01.
 */

import { useConfigAuditLog } from '@/hooks/queries/useConfigAuditLog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { FileText } from 'lucide-react';

export function AuditHistoryTable() {
  const { data: auditLog, isLoading } = useConfigAuditLog();

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!auditLog || auditLog.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="h-10 w-10 mb-3 opacity-50" />
        <p className="text-sm font-medium">No changes recorded</p>
        <p className="text-xs">Configuration audit trail will appear here after changes are made.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Parameter</TableHead>
            <TableHead>Previous</TableHead>
            <TableHead>New Value</TableHead>
            <TableHead>Changed By</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {auditLog.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="text-xs font-mono whitespace-nowrap">
                {format(new Date(entry.changed_at), 'MMM dd, yyyy HH:mm')}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs font-mono">
                  {entry.param_key}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground font-mono">
                {entry.previous_value ?? '—'}
              </TableCell>
              <TableCell className="text-xs font-mono font-semibold">
                {entry.new_value}
              </TableCell>
              <TableCell className="text-xs">{entry.admin_name}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                {entry.change_reason ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
