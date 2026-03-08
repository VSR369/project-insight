/**
 * SCR-02-02: Engine Audit Log — Supervisor Only
 * Aligned with Figma design: inline filters, admin dropdown, no card wrappers.
 */

import { useState, Fragment } from 'react';
import { format, subDays } from 'date-fns';
import { Download, ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { useEngineAuditLog, type AuditLogFilters } from '@/hooks/queries/useEngineAuditLog';
import { usePlatformAdmins } from '@/hooks/queries/usePlatformAdmins';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScoringSnapshotPanel } from '@/components/admin/assignment-audit/ScoringSnapshotPanel';

function AuditLogContent() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AuditLogFilters>({
    dateFrom: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    outcome: 'all',
  });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { data: logs = [], isLoading } = useEngineAuditLog(filters);
  const { data: admins = [] } = usePlatformAdmins();

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Date/Time', 'Verification ID', 'Org Name', 'Event', 'Assigned To', 'Score', 'Selection Reason', 'Pool Size', 'Initiator'];
    const rows = logs.map((log) => {
      const snapshot = (log.scoring_snapshot ?? {}) as Record<string, unknown>;
      return [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.verification_id,
        (snapshot.org_name as string) ?? '',
        log.event_type,
        (snapshot.selected_admin_name as string) ?? 'N/A',
        (snapshot.total_score as number) ?? 'N/A',
        (snapshot.selection_reason as string) ?? '',
        (snapshot.pool_size as number) ?? '',
        log.initiator,
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getOutcomeBadge = (eventType: string) => {
    switch (eventType) {
      case 'AUTO_ASSIGNED':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Assigned</Badge>;
      case 'AFFINITY_RESUBMISSION':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Affinity</Badge>;
      case 'FALLBACK_TO_QUEUE':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Fallback: Queue</Badge>;
      case 'CONCURRENT_CONFLICT':
        return <Badge variant="destructive">Timeout</Badge>;
      default:
        return <Badge variant="outline">{eventType}</Badge>;
    }
  };

  const getSelectionReasonBadge = (reason: string | null) => {
    if (!reason) return <span className="text-muted-foreground">—</span>;
    const config: Record<string, { label: string; className: string }> = {
      highest_domain_score: { label: 'highest score', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
      workload_tiebreaker: { label: 'workload tiebreaker', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
      priority_tiebreaker: { label: 'Priority Tie', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
      round_robin: { label: 'Round Robin', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
      NO_ELIGIBLE_ADMIN: { label: 'NO ELIGIBLE ADMIN', className: 'border-red-300 text-red-700' },
      NO_INDUSTRY_MATCH: { label: 'No Match', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
      AFFINITY_RESUBMISSION: { label: 'Affinity', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
    };
    const c = config[reason] ?? { label: reason, className: '' };
    const isOutline = reason === 'NO_ELIGIBLE_ADMIN';
    return <Badge variant={isOutline ? 'outline' : 'default'} className={`text-[10px] ${c.className}`}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">Assignment Engine Audit Log</h1>
            <p className="text-muted-foreground text-sm mt-1">
              View detailed logs of all assignment engine decisions and scoring
            </p>
          </div>
          <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50 shrink-0 self-start mt-1">
            Supervisor Only
          </Badge>
        </div>
      </div>

      {/* Inline Filters */}
      <div className="flex flex-col lg:flex-row items-end gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs text-muted-foreground mb-1 block">From Date</label>
          <Input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs text-muted-foreground mb-1 block">To Date</label>
          <Input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs text-muted-foreground mb-1 block">Admin</label>
          <Select
            value={filters.adminId ?? 'all'}
            onValueChange={(v) => setFilters((f) => ({ ...f, adminId: v === 'all' ? undefined : v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Admins" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Admins</SelectItem>
              {admins.map((admin) => (
                <SelectItem key={admin.id} value={admin.id}>
                  {admin.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs text-muted-foreground mb-1 block">Outcome</label>
          <Select
            value={filters.outcome ?? 'all'}
            onValueChange={(v) => setFilters((f) => ({ ...f, outcome: v as AuditLogFilters['outcome'] }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outcomes</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="fallback">Fallback</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={handleExportCSV} disabled={logs.length === 0} className="shrink-0">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Table — no Card wrapper */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm font-medium">No audit log entries found</p>
          <p className="text-xs mt-1">Adjust filters or wait for assignments to be processed.</p>
        </div>
      ) : (
        <div className="relative w-full overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Date/Time</TableHead>
                <TableHead>Org Name</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Domain Score</TableHead>
                <TableHead>Selection Reason</TableHead>
                <TableHead>Pool Size</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const snapshot = (log.scoring_snapshot ?? {}) as Record<string, unknown>;
                const isExpanded = expandedRow === log.id;
                const totalScore = snapshot.total_score as number | undefined;
                const poolSize = snapshot.pool_size as number | undefined;
                return (
                  <>
                    <TableRow
                      key={log.id}
                      className="cursor-pointer"
                      onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>
                      <TableCell className="text-sm font-medium max-w-40 truncate">
                        <button
                          type="button"
                          className="text-primary hover:underline text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/verifications/${log.verification_id}`);
                          }}
                        >
                          {(snapshot.org_name as string) ?? '—'}
                        </button>
                      </TableCell>
                      <TableCell>{getOutcomeBadge(log.event_type)}</TableCell>
                      <TableCell className="text-sm">
                        {(snapshot.selected_admin_name as string) ?? '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {typeof totalScore === 'number' ? `${totalScore}/100` : '—'}
                          </span>
                          {typeof totalScore === 'number' && (
                            <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(100, totalScore)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getSelectionReasonBadge((snapshot.selection_reason as string) ?? null)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {typeof poolSize === 'number' ? `${poolSize} candidates` : '—'}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${log.id}-detail`}>
                        <TableCell colSpan={8} className="bg-muted/30 p-0">
                          <ScoringSnapshotPanel snapshot={snapshot} />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function AssignmentAuditLogPage() {
  return (
    <FeatureErrorBoundary featureName="Assignment Audit Log">
      <AuditLogContent />
    </FeatureErrorBoundary>
  );
}
