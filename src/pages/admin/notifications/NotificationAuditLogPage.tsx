/**
 * MOD-04 SCR-04-01: Notification Delivery Audit Log Page
 * Supervisor-only. Shows all notification delivery records with filters, badges, and CSV export.
 */
import { useState, useCallback } from 'react';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { NotificationAuditFilters, type AuditFilters } from '@/components/admin/notifications/NotificationAuditFilters';
import { NotificationAuditTable } from '@/components/admin/notifications/NotificationAuditTable';
import { AuditSummaryCards } from '@/components/admin/notifications/AuditSummaryCards';
import { useNotificationAuditLog, useAuditSummary, useResendNotification } from '@/hooks/queries/useNotificationAuditLog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Bell } from 'lucide-react';

function NotificationAuditLogContent() {
  const [filters, setFilters] = useState<AuditFilters>({
    type: 'ALL',
    emailStatus: 'ALL',
    recipientSearch: '',
    dateFrom: null,
    dateTo: null,
  });

  const { data, isLoading, error } = useNotificationAuditLog(filters);
  const summary = useAuditSummary(data);
  const resendMutation = useResendNotification();

  const handleExportCsv = useCallback(() => {
    if (!data || data.length === 0) return;
    const headers = ['Timestamp', 'Type', 'Recipient', 'Email', 'Verification', 'In-App', 'Email Status', 'Retries', 'Last Retry', 'Error'];
    const rows = data.map((r) => [
      r.created_at,
      r.notification_type,
      r.recipient_name ?? '',
      r.recipient_email ?? '',
      r.verification_id ?? '',
      r.in_app_status,
      r.email_status,
      r.email_retry_count,
      r.last_retry_at ?? '',
      r.email_error_message ?? '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  if (error) {
    return (
      <div className="py-16 text-center text-destructive">
        Failed to load audit log: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">Notification Audit Log</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!data?.length}>
          <Download className="h-4 w-4 mr-1" />
          <span className="hidden lg:inline">Export CSV</span>
        </Button>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <AuditSummaryCards {...summary} />
      )}

      {/* Filters */}
      <NotificationAuditFilters filters={filters} onChange={setFilters} />

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <NotificationAuditTable
          data={data ?? []}
          onResend={(id) => resendMutation.mutate(id)}
          isResending={resendMutation.isPending}
        />
      )}
    </div>
  );
}

export default function NotificationAuditLogPage() {
  return (
    <FeatureErrorBoundary featureName="Notification Audit Log">
      <NotificationAuditLogContent />
    </FeatureErrorBoundary>
  );
}
