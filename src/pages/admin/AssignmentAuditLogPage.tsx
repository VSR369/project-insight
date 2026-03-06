/**
 * SCR-02-02: Engine Audit Log — Supervisor Only
 * GAP-14: Selection Reason column. GAP-15: Org Name column.
 */

import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { Download, ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { useEngineAuditLog, type AuditLogFilters } from '@/hooks/queries/useEngineAuditLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [filters, setFilters] = useState<AuditLogFilters>({
    dateFrom: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    outcome: 'all',
  });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { data: logs = [], isLoading } = useEngineAuditLog(filters);

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Date/Time', 'Verification ID', 'Org Name', 'Event', 'Assigned To', 'Score', 'Selection Reason', 'Pool Size', 'Reason', 'Initiator'];
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
        log.reason ?? '',
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
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Fallback</Badge>;
      case 'CONCURRENT_CONFLICT':
        return <Badge variant="destructive">Timeout</Badge>;
      default:
        return <Badge variant="outline">{eventType}</Badge>;
    }
  };

  const getSelectionReasonBadge = (reason: string | null) => {
    if (!reason) return <span className="text-muted-foreground">—</span>;
    const config: Record<string, { label: string; className: string }> = {
      highest_domain_score: { label: 'Highest Score', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
      workload_tiebreaker: { label: 'Workload Tie', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
      priority_tiebreaker: { label: 'Priority Tie', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
      round_robin: { label: 'Round Robin', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
      NO_ELIGIBLE_ADMIN: { label: 'No Eligible', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
      NO_INDUSTRY_MATCH: { label: 'No Match', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
      AFFINITY_RESUBMISSION: { label: 'Affinity', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
    };
    const c = config[reason] ?? { label: reason, className: '' };
    return <Badge className={`text-[10px] ${c.className}`}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Assignment Engine Audit Log</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Review auto-assignment decisions, scoring snapshots, and fallback reasons.
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} disabled={logs.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">From</label>
              <Input
                type="date"
                value={filters.dateFrom ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">To</label>
              <Input
                type="date"
                value={filters.dateTo ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Outcome</label>
              <Select
                value={filters.outcome ?? 'all'}
                onValueChange={(v) => setFilters((f) => ({ ...f, outcome: v as AuditLogFilters['outcome'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="fallback">Fallback</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
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
            <div className="relative w-full overflow-auto">
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
                    <TableHead>Fallback Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const snapshot = (log.scoring_snapshot ?? {}) as Record<string, unknown>;
                    const isExpanded = expandedRow === log.id;
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
                            {format(new Date(log.created_at), 'MMM d, HH:mm')}
                          </TableCell>
                          <TableCell>{getOutcomeBadge(log.event_type)}</TableCell>
                          <TableCell className="text-sm">
                            {(snapshot.selected_admin_name as string) ?? '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {(snapshot.total_score as number) ?? '—'}
                              </span>
                              {typeof snapshot.total_score === 'number' && (
                                <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Math.min(100, (snapshot.total_score as number))}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getSelectionReasonBadge(log.reason)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {(snapshot.pool_size as number) ?? '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                            {log.event_type === 'FALLBACK_TO_QUEUE' ? (log.reason ?? '—') : '—'}
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
        </CardContent>
      </Card>
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
