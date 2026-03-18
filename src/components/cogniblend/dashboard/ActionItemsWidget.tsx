/**
 * ActionItemsWidget — Dashboard widget showing SR stats + action items table
 * for Account Manager (AM) and Change Requestor (RQ) roles.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Clock, Zap, Eye, Pencil, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useOrgModelContext } from '@/hooks/queries/useSolutionRequestContext';
import { useMyRequests, type RequestRow } from '@/hooks/queries/useMyRequests';
import { useCogniUserRoles } from '@/hooks/cogniblend/useCogniUserRoles';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  ACTIVE: { label: 'Created', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'On Hold', className: 'bg-amber-100 text-amber-700' },
};

function formatRequestId(index: number): string {
  const year = new Date().getFullYear();
  return `SR-${year}-${String(index + 1).padStart(3, '0')}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function ActionItemsWidget() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: currentOrg } = useCurrentOrg();
  const { data: orgContext } = useOrgModelContext();
  const { roleCodes } = useCogniUserRoles();

  const isAMorRQ = roleCodes.includes('AM') || roleCodes.includes('RQ');
  const { data, isLoading } = useMyRequests('all', '');

  const allRows = useMemo(
    () => data?.pages.flatMap((p) => p.rows) ?? [],
    [data],
  );

  // Stats
  const myRequestsCount = allRows.length;
  const awaitingCount = allRows.filter(r => r.master_status === 'ACTIVE').length;
  const completedCount = allRows.filter(r => r.master_status === 'COMPLETED').length;

  if (!isAMorRQ) return null;

  if (isLoading) {
    return (
      <div className="space-y-4 mb-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const modelLabel = orgContext?.operatingModel === 'MP' ? 'Marketplace' : 'Aggregator';
  const orgName = currentOrg?.organizationName ?? 'Your Organization';

  return (
    <div className="space-y-4 mb-6">
      {/* Welcome Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Welcome back, {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {orgName}
            <Badge variant="outline" className="ml-2 text-[10px]">
              {modelLabel}
            </Badge>
          </p>
        </div>
        <Button onClick={() => navigate('/cogni/submit-request')} size="sm" className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />
          New Solution Request
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{myRequestsCount}</p>
              <p className="text-xs text-muted-foreground">My Requests</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{awaitingCount}</p>
              <p className="text-xs text-muted-foreground">Awaiting Response</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Challenges Created</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items Table */}
      {allRows.length > 0 && (
        <Card className="border-border">
          <div className="px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-foreground">My Action Items</h3>
          </div>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Request ID</TableHead>
                  <TableHead className="min-w-[180px]">Title</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px]">Created</TableHead>
                  <TableHead className="w-[80px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRows.slice(0, 10).map((req: RequestRow, idx: number) => {
                  const status = STATUS_BADGE[req.master_status] ?? STATUS_BADGE.DRAFT;
                  const isDraft = req.master_status === 'DRAFT';
                  const ActionIcon = isDraft ? (req.title === 'Untitled Draft' ? Play : Pencil) : Eye;
                  const actionLabel = isDraft ? (req.title === 'Untitled Draft' ? 'Resume' : 'Edit') : 'View';

                  return (
                    <TableRow key={req.id} className="cursor-pointer hover:bg-accent/50">
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {formatRequestId(idx)}
                      </TableCell>
                      <TableCell className="font-medium text-sm text-primary truncate max-w-[220px]">
                        {req.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cn('text-[10px]', status.className)}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(req.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => navigate(`/cogni/challenges/${req.id}/edit`)}
                        >
                          <ActionIcon className="h-3.5 w-3.5" />
                          <span className="hidden lg:inline">{actionLabel}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {allRows.length > 10 && (
            <div className="px-4 py-2 border-t text-center">
              <Button variant="link" size="sm" onClick={() => navigate('/cogni/my-requests')}>
                View all {allRows.length} requests →
              </Button>
            </div>
          )}
        </Card>
      )}

      {allRows.length === 0 && (
        <Card className="border-border">
          <CardContent className="py-8 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No solution requests yet.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/cogni/submit-request')}>
              Submit your first request
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
