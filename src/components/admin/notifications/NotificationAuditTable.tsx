/**
 * MOD-04 SCR-04-01: Notification Audit Log data table
 */
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { NotificationTypeBadge } from './NotificationTypeBadge';
import { EmailStatusBadge } from './EmailStatusBadge';
import { ChevronDown, ChevronRight, RefreshCw, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface AuditLogRow {
  id: string;
  created_at: string;
  notification_type: string;
  recipient_email: string | null;
  recipient_name: string | null;
  recipient_type: string;
  verification_id: string | null;
  in_app_status: string;
  email_status: string;
  email_retry_count: number;
  last_retry_at: string | null;
  sms_status: string | null;
  email_error_message: string | null;
  email_provider_id: string | null;
  triggered_by: string | null;
}

interface NotificationAuditTableProps {
  data: AuditLogRow[];
  onResend?: (id: string) => void;
  isResending?: boolean;
}

export function NotificationAuditTable({ data, onResend, isResending }: NotificationAuditTableProps) {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground text-sm">
        No notification records found matching your filters.
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Timestamp</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Verification</TableHead>
            <TableHead>In-App</TableHead>
            <TableHead>Email Status</TableHead>
            <TableHead>Retries</TableHead>
            <TableHead>Last Retry</TableHead>
            <TableHead className="w-16">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const isExpanded = expandedId === row.id;
            const isExhausted = row.email_status === 'EXHAUSTED';
            return (
              <>
                <TableRow
                  key={row.id}
                  className={cn(isExhausted && 'bg-red-50/50 dark:bg-red-950/20')}
                >
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setExpandedId(isExpanded ? null : row.id)}
                    >
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </Button>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell><NotificationTypeBadge type={row.notification_type} /></TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">
                    {row.recipient_name ?? row.recipient_email ?? '—'}
                  </TableCell>
                  <TableCell>
                    {row.verification_id ? (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs gap-1"
                        onClick={() => navigate(`/admin/verifications/${row.verification_id}`)}
                      >
                        {row.verification_id.slice(0, 8)}…
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'text-xs',
                      row.in_app_status === 'SENT' ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'
                    )}>
                      {row.in_app_status}
                    </span>
                  </TableCell>
                  <TableCell><EmailStatusBadge status={row.email_status} /></TableCell>
                  <TableCell className="text-xs text-center">{row.email_retry_count}/3</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {row.last_retry_at ? formatDistanceToNow(new Date(row.last_retry_at), { addSuffix: true }) : '—'}
                  </TableCell>
                  <TableCell>
                    {isExhausted && onResend && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={isResending}
                        onClick={() => onResend(row.id)}
                        title="Re-send"
                      >
                        <RefreshCw className={cn('h-3.5 w-3.5', isResending && 'animate-spin')} />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow key={`${row.id}-detail`} className="bg-muted/30">
                    <TableCell colSpan={10} className="p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Recipient Type: </span>
                          <span className="font-medium">{row.recipient_type}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email: </span>
                          <span>{row.recipient_email ?? '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Triggered By: </span>
                          <span>{row.triggered_by ?? '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Provider ID: </span>
                          <span className="font-mono text-xs">{row.email_provider_id ?? '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">SMS Status: </span>
                          <span>{row.sms_status ?? 'NOT_SENT'}</span>
                        </div>
                        {row.email_error_message && (
                          <div className="lg:col-span-3">
                            <span className="text-muted-foreground">Error: </span>
                            <span className="text-destructive">{row.email_error_message}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
