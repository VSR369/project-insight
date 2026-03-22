/**
 * MyRequestsTracker — All requests submitted by the AM, with expandable status history.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Eye, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useMyRequests, type RequestRow } from '@/hooks/queries/useMyRequests';
import { supabase } from '@/integrations/supabase/client';

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
  1: 'Intake',
  2: 'Spec Review',
  3: 'Legal Docs',
  4: 'Curation',
  5: 'Approval',
  6: 'Publication',
  7: 'Submissions',
  8: 'Evaluation',
  9: 'Award',
  10: 'Escrow',
  11: 'Legal Close',
  12: 'Payout',
  13: 'Archive',
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ── Status History Timeline (expandable row) ────────── */

function StatusTimeline({ challengeId }: { challengeId: string }) {
  const { data: events, isLoading } = useQuery({
    queryKey: ['challenge-audit-timeline', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_trail')
        .select('action, created_at, phase_from, phase_to, details')
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: true })
        .limit(30);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  if (isLoading) return <Skeleton className="h-16 w-full rounded-lg" />;

  if (!events || events.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2 px-4">No history available yet.</p>
    );
  }

  return (
    <div className="py-3 px-4 lg:px-6">
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Status History</p>
      <div className="relative border-l-2 border-border pl-4 space-y-2.5">
        {events.map((evt, i) => {
          const actionLabel = (evt.action ?? '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase());

          const phaseInfo = evt.phase_to
            ? ` → ${PHASE_LABELS[evt.phase_to] ?? `Phase ${evt.phase_to}`}`
            : '';

          return (
            <div key={i} className="relative">
              <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
              <p className="text-xs text-foreground font-medium">
                {actionLabel}{phaseInfo}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatDateTime(evt.created_at)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Route helper for View button ─────────────── */

function getViewRoute(item: RequestRow): { route: string; label: string } {
  if (item.master_status === 'DRAFT') {
    return { route: `/cogni/challenges/${item.id}/edit`, label: 'Edit' };
  }
  const phase = item.current_phase ?? 1;
  if (phase <= 2) return { route: `/cogni/challenges/${item.id}/spec`, label: 'View Spec' };
  if (phase === 3) return { route: `/cogni/challenges/${item.id}/legal`, label: 'Legal' };
  if (item.master_status === 'PUBLISHED' || phase >= 7) {
    return { route: `/cogni/challenges/${item.id}`, label: 'Manage' };
  }
  return { route: `/cogni/challenges/${item.id}/spec`, label: 'View' };
}

/* ── Expandable Row ──────────────────────────────────── */

function RequestRowItem({ item }: { item: RequestRow }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const badge = STATUS_BADGE[item.master_status] ?? STATUS_BADGE.ACTIVE;
  const phase = item.current_phase;
  const withWhom = phase ? (PHASE_OWNER[phase] ?? '—') : '—';
  const phaseLabel = phase ? (PHASE_LABELS[phase] ?? `Phase ${phase}`) : '—';
  const { route, label } = getViewRoute(item);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <TableRow className="cursor-pointer hover:bg-accent/50">
        <TableCell className="w-8">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
        </TableCell>
        <TableCell className="font-medium text-sm text-foreground truncate max-w-[220px]">
          {item.title}
        </TableCell>
        <TableCell>
          <Badge variant="secondary" className={cn('text-[10px]', badge.className)}>
            {badge.label}
          </Badge>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">{phaseLabel}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{withWhom}</TableCell>
        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(item.created_at)}
        </TableCell>
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              navigate(route);
            }}
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">{label}</span>
          </Button>
        </TableCell>
      </TableRow>
      {open && (
        <tr>
          <td colSpan={7} className="p-0 bg-accent/20">
            <CollapsibleContent>
              <StatusTimeline challengeId={item.id} />
            </CollapsibleContent>
          </td>
        </tr>
      )}
    </Collapsible>
  );
}

/* ── Main Component ──────────────────────────────────── */

export function MyRequestsTracker() {
  const { data: requestsData, isLoading } = useMyRequests('all', '');

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
                <TableHead className="w-8" />
                <TableHead className="min-w-[180px]">Title</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[100px]">Phase</TableHead>
                <TableHead className="w-[140px]">With</TableHead>
                <TableHead className="w-[100px]">Created</TableHead>
                <TableHead className="w-[80px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allRows.map((row) => (
                <RequestRowItem key={row.id} item={row} />
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </section>
  );
}
