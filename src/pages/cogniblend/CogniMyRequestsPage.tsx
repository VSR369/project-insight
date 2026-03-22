/**
 * CogniMyRequestsPage — "My Requests" list rendered inside CogniShell.
 * Route: /cogni/my-requests
 *
 * Reuses the shared useMyRequests hook. Renders without outer layout wrapper.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileInput, Loader2, Search } from 'lucide-react';
import { useOrgModelContext } from '@/hooks/queries/useSolutionRequestContext';
import { useMyRequests } from '@/hooks/queries/useMyRequests';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Submitted' },
  { value: 'COMPLETED', label: 'Approved' },
] as const;

const STATUS_BADGE_MAP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  ACTIVE: { label: 'Submitted', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
};

const PHASE_STATUS_BADGE_MAP: Record<string, { label: string; className: string }> = {
  AM_APPROVAL_PENDING: { label: 'Awaiting Your Approval', className: 'bg-amber-100 text-amber-700' },
  AM_DECLINED: { label: 'Declined', className: 'bg-red-100 text-red-700' },
  AM_APPROVED: { label: 'Approved → ID Review', className: 'bg-green-100 text-green-700' },
};

const URGENCY_BADGE_MAP: Record<string, { label: string; className: string }> = {
  standard: { label: 'Standard', className: 'bg-muted text-muted-foreground' },
  urgent: { label: 'Urgent', className: 'bg-amber-100 text-amber-700' },
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700' },
};

const MODEL_BADGE_MAP: Record<string, { label: string; className: string }> = {
  MP: { label: 'MP', className: 'bg-violet-100 text-violet-700' },
  AGG: { label: 'AGG', className: 'bg-sky-100 text-sky-700' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CogniMyRequestsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: orgContext, isLoading: orgLoading } = useOrgModelContext();
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useMyRequests(statusFilter, searchTerm);

  const allRows = useMemo(() => data?.pages.flatMap((p) => p.rows) ?? [], [data]);

  if (isLoading || orgLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-3"><Skeleton className="h-10 w-40" /><Skeleton className="h-10 flex-1" /></div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  const isEmpty = !error && allRows.length === 0;

  return (
    <div className="space-y-6 max-w-[960px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-primary">My Requests</h1>
        <Button onClick={() => navigate('/cogni/submit-request')} size="sm">
          <Plus className="h-4 w-4 mr-1" />New Request
        </Button>
      </div>

      {/* Filters */}
      {!isEmpty && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by title…" className="pl-9" />
          </div>
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm text-destructive">
            Failed to load requests: {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {isEmpty && (
        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-16 text-center space-y-3">
            <FileInput className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="text-base font-semibold text-foreground">No solution requests yet</h3>
            <p className="text-[13px] text-muted-foreground">Submit your first request to get started.</p>
            <Button onClick={() => navigate('/cogni/submit-request')} size="sm" className="mt-2">
              <Plus className="h-4 w-4 mr-1" />New Request
            </Button>
          </CardContent>
        </Card>
      )}

      {allRows.length > 0 && (
        <Card className="rounded-xl border-border shadow-sm">
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Title</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[80px]">Model</TableHead>
                  <TableHead className="w-[120px]">Created</TableHead>
                  <TableHead className="w-[100px]">Urgency</TableHead>
                  <TableHead className="w-[150px]">Assigned To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRows.map((req) => {
                  const phaseStatus = (req as any).phase_status as string | null;
                  const phaseStatusBadge = phaseStatus ? PHASE_STATUS_BADGE_MAP[phaseStatus] : null;
                  const status = phaseStatusBadge ?? STATUS_BADGE_MAP[req.master_status] ?? STATUS_BADGE_MAP.DRAFT;
                  const urgency = URGENCY_BADGE_MAP[req.urgency] ?? URGENCY_BADGE_MAP.standard;
                  const model = req.operating_model ? MODEL_BADGE_MAP[req.operating_model] : null;
                  const assignedTo = req.architect_name ?? (req.operating_model === 'AGG' ? 'Self' : '—');

                  const isReviewable = phaseStatus === 'AM_APPROVAL_PENDING';
                  const rowTarget = isReviewable
                    ? `/cogni/my-requests/${req.id}/review`
                    : `/cogni/challenges/${req.id}/edit`;

                  return (
                    <TableRow key={req.id} className="cursor-pointer hover:bg-accent/50" onClick={() => navigate(rowTarget)}>
                      <TableCell className="font-medium text-sm text-primary">{req.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('text-[10px]', status.className)}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {model ? <Badge variant="secondary" className={cn('text-[10px]', model.className)}>{model.label}</Badge> : <span className="text-sm text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(req.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('text-[10px]', urgency.className)}>{urgency.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{assignedTo}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {hasNextPage && (
            <div className="flex justify-center py-4 border-t">
              <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="gap-2">
                {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
                Load More
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
