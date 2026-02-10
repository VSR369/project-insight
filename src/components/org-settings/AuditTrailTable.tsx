/**
 * Audit Trail Table (ORG-001)
 * 
 * Displays organization profile change history from seeker_organization_audit.
 */

import { format } from 'date-fns';
import { History } from 'lucide-react';

import { useOrgAuditTrail } from '@/hooks/queries/useOrgSettings';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface AuditTrailTableProps {
  organizationId: string;
}

export function AuditTrailTable({ organizationId }: AuditTrailTableProps) {
  const { data: auditEntries, isLoading } = useOrgAuditTrail(organizationId);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  if (!auditEntries || auditEntries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>No changes recorded yet.</p>
      </div>
    );
  }

  const formatFieldName = (name: string) =>
    name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="relative w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Field</TableHead>
            <TableHead>Old Value</TableHead>
            <TableHead>New Value</TableHead>
            <TableHead>Changed At</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {auditEntries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>
                <Badge variant="outline" className="text-xs font-mono">
                  {formatFieldName(entry.field_name)}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                {entry.old_value || '—'}
              </TableCell>
              <TableCell className="text-sm text-foreground max-w-[200px] truncate">
                {entry.new_value || '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {format(new Date(entry.changed_at), 'MMM d, yyyy h:mm a')}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                {entry.change_reason || '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
