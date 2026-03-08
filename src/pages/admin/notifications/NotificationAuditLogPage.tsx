/**
 * MOD-04 SCR-04-01: Notification Delivery Audit Log Page
 * Supervisor-only. Shows all notification delivery records with filters, badges, and CSV export.
 */
import { useState, useCallback, useMemo } from 'react';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { NotificationAuditFilters, type AuditFilters } from '@/components/admin/notifications/NotificationAuditFilters';
import { NotificationAuditTable } from '@/components/admin/notifications/NotificationAuditTable';
import { AuditSummaryCards } from '@/components/admin/notifications/AuditSummaryCards';
import { useNotificationAuditLog, computeAuditSummary, useResendNotification } from '@/hooks/queries/useNotificationAuditLog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 5;

function NotificationAuditLogContent() {
  const [filters, setFilters] = useState<AuditFilters>({
    type: 'ALL',
    emailStatus: 'ALL',
    recipientSearch: '',
    dateFrom: null,
    dateTo: null,
  });
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error } = useNotificationAuditLog(filters);
  const summary = computeAuditSummary(data);
  const resendMutation = useResendNotification();

  // Reset page when filters change
  const handleFiltersChange = useCallback((newFilters: AuditFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  // Pagination
  const totalItems = data?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const paginatedData = useMemo(() => {
    if (!data) return [];
    const start = (currentPage - 1) * PAGE_SIZE;
    return data.slice(start, start + PAGE_SIZE);
  }, [data, currentPage]);

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

  // Generate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Notification Delivery Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor notification delivery status and retry attempts</p>
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

      {/* Filters — includes Export CSV */}
      <NotificationAuditFilters filters={filters} onChange={handleFiltersChange} onExportCsv={handleExportCsv} hasData={!!data?.length} />

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <NotificationAuditTable
          data={paginatedData}
          onResend={(id) => resendMutation.mutate(id)}
          isResending={resendMutation.isPending}
        />
      )}

      {/* Pagination Footer */}
      {!isLoading && totalItems > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, totalItems)}–{Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems} notifications
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {pageNumbers.map((n) => (
              <Button
                key={n}
                variant={n === currentPage ? 'default' : 'outline'}
                size="icon"
                className="h-8 w-8 text-xs"
                onClick={() => setCurrentPage(n)}
              >
                {n}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
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
