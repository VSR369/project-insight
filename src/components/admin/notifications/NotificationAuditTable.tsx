/**
 * MOD-04 SCR-04-01: Notification Audit Log data table
 * Figma: stacked timestamp/recipient, V-XXXX format, badge statuses, text re-send button, red error box
 */
import { useState, Fragment } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationTypeBadge } from './NotificationTypeBadge';
import { EmailStatusBadge } from './EmailStatusBadge';
import { ChevronDown, ChevronRight, ExternalLink, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
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

const HEAD_CLASS = 'text-[11px] uppercase tracking-wider text-muted-foreground font-medium';

function formatVerificationShort(id: string | null): string {
  if (!id) return '—';
  return `V-${id.slice(0, 4).toUpperCase()}`;
}

function InAppBadge({ status }: { status: string }) {
  const variant = status === 'SENT' ? 'default' : 'secondary';
  const colorClass = status === 'SENT'
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
    : '';
  return (
    <Badge variant={variant} className={cn('text-[10px] font-medium', colorClass)}>
      {status}
    </Badge>
  );
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
            <TableHead className={cn(HEAD_CLASS, 'w-8')} />
            <TableHead className={HEAD_CLASS}>Timestamp</TableHead>
            <TableHead className={HEAD_CLASS}>Type</TableHead>
            <TableHead className={HEAD_CLASS}>Recipient</TableHead>
            <TableHead className={HEAD_CLASS}>Verification</TableHead>
            <TableHead className={HEAD_CLASS}>In-App</TableHead>
            <TableHead className={HEAD_CLASS}>Email Status</TableHead>
            <TableHead className={HEAD_CLASS}>Retries</TableHead>
            <TableHead className={HEAD_CLASS}>Last Retry</TableHead>
            <TableHead className={cn(HEAD_CLASS, 'w-20')}>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const isExpanded = expandedId === row.id;
            const isExhausted = row.email_status === 'EXHAUSTED';
            const createdDate = new Date(row.created_at);
            return (
              <Fragment key={row.id}>
                <TableRow
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
                  {/* Timestamp: relative + absolute stacked */}
                  <TableCell className="whitespace-nowrap">
                    <div className="text-xs font-medium">
                      {formatDistanceToNow(createdDate, { addSuffix: true })}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {format(createdDate, 'yyyy-MM-dd hh:mm a')}
                    </div>
                  </TableCell>
                  <TableCell><NotificationTypeBadge type={row.notification_type} /></TableCell>
                  {/* Recipient: name + email stacked */}
                  <TableCell className="max-w-[200px]">
                    <div className="text-sm font-medium truncate">{row.recipient_name ?? '—'}</div>
                    {row.recipient_email && (
                      <div className="text-[10px] text-muted-foreground truncate">{row.recipient_email}</div>
                    )}
                  </TableCell>
                  {/* Verification: V-XXXX format */}
                  <TableCell>
                    {row.verification_id ? (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs gap-1"
                        onClick={() => navigate(`/admin/verifications/${row.verification_id}`)}
                      >
                        {formatVerificationShort(row.verification_id)}
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    ) : '—'}
                  </TableCell>
                  <TableCell><InAppBadge status={row.in_app_status} /></TableCell>
                  <TableCell><EmailStatusBadge status={row.email_status} /></TableCell>
                  <TableCell className="text-xs text-center">{row.email_retry_count}/3</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {row.last_retry_at ? (
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(row.last_retry_at), { addSuffix: true })}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isExhausted && onResend && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
                        disabled={isResending}
                        onClick={() => onResend(row.id)}
                      >
                        Re-send
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={10} className="p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Recipient Type</span>
                          <p className="font-medium text-sm">{row.recipient_type}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Provider ID</span>
                          <p className="font-mono text-xs">{row.email_provider_id ?? '—'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Triggered By</span>
                          <p className="text-sm">{row.triggered_by ?? '—'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">SMS Status</span>
                          <p className="text-sm">{row.sms_status ?? 'N/A'}</p>
                        </div>
                        {row.last_retry_at && (
                          <div>
                            <span className="text-muted-foreground text-xs">Next Retry At</span>
                            <p className="text-sm">
                              {row.email_status === 'RETRY_QUEUED'
                                ? format(new Date(new Date(row.last_retry_at).getTime() + 15 * 60 * 1000), 'yyyy-MM-dd hh:mm a')
                                : '—'}
                            </p>
                          </div>
                        )}
                        {row.email_error_message && (
                          <div className="lg:col-span-4">
                            <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
                              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-medium text-red-800 dark:text-red-300">Error Details</p>
                                <p className="text-sm text-red-700 dark:text-red-400">{row.email_error_message}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
