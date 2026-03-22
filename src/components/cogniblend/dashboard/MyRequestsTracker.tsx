/**
 * MyRequestsTracker — AM's own requests table with "View" routing to AM read-only brief.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, FileText, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMyRequests, type RequestRow } from '@/hooks/queries/useMyRequests';

/* ── Phase → current owner role ──────────────────────── */

const PHASE_OWNER: Record<number, string> = {
  1: 'You',
  2: 'Challenge Creator',
  3: 'Legal Coordinator',
  4: 'Curator',
  5: 'Innovation Director',
  6: 'Innovation Director',
  7: 'Solvers (Open)',
  8: 'Evaluation Reviewer',
  9: 'Innovation Director',
  10: 'Finance Controller',
  11: 'Legal Compliance',
  12: 'Finance Controller',
  13: 'Challenge Creator',
};

const PHASE_LABELS: Record<number, string> = {
  1: 'Intake', 2: 'Spec Review', 3: 'Legal Docs', 4: 'Curation',
  5: 'Approval', 6: 'Publication', 7: 'Submissions', 8: 'Evaluation',
  9: 'Award', 10: 'Escrow', 11: 'Legal Close', 12: 'Payout', 13: 'Archive',
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  ACTIVE: { label: 'Active', className: 'bg-blue-100 text-blue-700' },
  IN_PREPARATION: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
  ON_HOLD: { label: 'On Hold', className: 'bg-amber-100 text-amber-700' },
  RETURNED: { label: 'Returned', className: 'bg-orange-100 text-orange-700' },
  UNDER_REVIEW: { label: 'Under Review', className: 'bg-violet-100 text-violet-700' },
  PUBLISHED: { label: 'Published', className: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/**
 * Route helper: AM "View" always goes to the AM read-only brief page.
 * DRAFT goes to edit. Everything else → AM read-only view.
 */
function getViewRoute(item: RequestRow): { route: string; label: string; icon: typeof Eye } {
  if (item.master_status === 'DRAFT') {
    return { route: `/cogni/challenges/${item.id}/edit`, label: 'Edit', icon: Pencil };
  }
  // All non-draft: show AM's read-only brief (what they entered)
  return { route: `/cogni/my-requests/${item.id}/view`, label: 'View', icon: Eye };
}

/* ── Main Component ──────────────────────────────────── */

export function MyRequestsTracker() {
  // scope='mine' ensures only this AM's created requests
  const { data: requestsData, isLoading } = useMyRequests('all', '', 'mine');

  const allRows = useMemo(
    () => requestsData?.pages.flatMap((p) => p.rows) ?? [],
    [requestsData],
  );

  if (isLoading) {
    return (
      <section className="mb-6">
        <h2 className="text-base lg:text-lg font-bold text-foreground mb-3">My Requests</h2>
        <Skeleton className="h-48 w-full rounded-xl" />
      </section>
    );
  }

  if (allRows.length === 0) {
    return (
      <section className="mb-6">
        <h2 className="text-base lg:text-lg font-bold text-foreground mb-3">My Requests</h2>
        <Card className="border-border">
          <CardContent className="py-8 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              No requests submitted yet. Create your first challenge request to get started.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <h2 className="text-base lg:text-lg font-bold text-foreground mb-3">My Requests</h2>
      <Card className="border-border">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Title</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[100px]">Phase</TableHead>
                <TableHead className="w-[140px]">With</TableHead>
                <TableHead className="w-[100px]">Created</TableHead>
                <TableHead className="w-[80px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allRows.map((row) => {
                const badge = STATUS_BADGE[row.master_status] ?? STATUS_BADGE.ACTIVE;
                const phase = row.current_phase;
                const withWhom = phase ? (PHASE_OWNER[phase] ?? '—') : '—';
                const phaseLabel = phase ? (PHASE_LABELS[phase] ?? `Phase ${phase}`) : '—';
                const { route, label, icon: ActionIcon } = getViewRoute(row);

                return (
                  <RequestRowView
                    key={row.id}
                    row={row}
                    badge={badge}
                    phaseLabel={phaseLabel}
                    withWhom={withWhom}
                    route={route}
                    label={label}
                    ActionIcon={ActionIcon}
                  />
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </section>
  );
}

/* ── Row Component (no Collapsible to avoid DOM warnings) ── */

function RequestRowView({
  row, badge, phaseLabel, withWhom, route, label, ActionIcon,
}: {
  row: RequestRow;
  badge: { label: string; className: string };
  phaseLabel: string;
  withWhom: string;
  route: string;
  label: string;
  ActionIcon: typeof Eye;
}) {
  const navigate = useNavigate();

  return (
    <TableRow>
      <TableCell className="font-medium text-sm text-foreground truncate max-w-[220px]">
        {row.title}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className={cn('text-[10px]', badge.className)}>
          {badge.label}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{phaseLabel}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{withWhom}</TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(row.created_at)}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => navigate(route)}
        >
          <ActionIcon className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">{label}</span>
        </Button>
      </TableCell>
    </TableRow>
  );
}
