/**
 * MyRequestsTracker — Role-adaptive requests table.
 * AM/RQ: Shows "My Requests" (created by me).
 * CA/CR: Shows "Incoming Requests" (assigned to me via user_challenge_roles).
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, FileText, Pencil, FileSearch } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMyRequests, type RequestRow } from '@/hooks/queries/useMyRequests';
import { useMyChallenges } from '@/hooks/cogniblend/useMyChallenges';
import { useCogniPermissions } from '@/hooks/cogniblend/useCogniPermissions';
import { useAuth } from '@/hooks/useAuth';

/* ── Phase → current owner role ──────────────────────── */

const PHASE_OWNER: Record<number, string> = {
  1: 'You',
  2: 'Challenge Creator / Architect',
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
  13: 'Challenge Creator / Architect',
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
 * Route helper: AM "View" goes to AM read-only brief page.
 * CA/CR goes to spec review page for Phase 2.
 */
function getViewRoute(
  item: { id: string; master_status: string; current_phase?: number | null },
  isSpecRole: boolean,
): { route: string; label: string; icon: typeof Eye } {
  if (item.master_status === 'DRAFT') {
    return { route: `/cogni/challenges/${item.id}/edit`, label: 'Edit', icon: Pencil };
  }
  // CA/CR viewing Phase 2 challenges → intake form in edit mode (same layout as "New Challenge")
  if (isSpecRole && item.current_phase === 2) {
    return { route: `/cogni/my-requests/${item.id}/view`, label: 'Review', icon: Eye };
  }
  // AM read-only view
  return { route: `/cogni/my-requests/${item.id}/view`, label: 'View', icon: Eye };
}

/* ── Main Component ──────────────────────────────────── */

export function MyRequestsTracker() {
  const { user } = useAuth();
  const { isSpecRole, isBusinessOwner } = useCogniPermissions();

  const isAmRqRole = isBusinessOwner;

  // AM/RQ: show requests created by this user
  const { data: requestsData, isLoading: reqLoading } = useMyRequests('all', '', 'mine');
  // CA/CR: show challenges assigned to user via user_challenge_roles
  const { data: challengesData, isLoading: chLoading } = useMyChallenges(user?.id);

  const isLoading = isSpecRole ? chLoading : reqLoading;

  // AM/RQ rows
  const amRows = useMemo(
    () => requestsData?.pages.flatMap((p) => p.rows) ?? [],
    [requestsData],
  );

  // CA/CR rows: challenges assigned to them (filter to Phase 2 active)
  const specRows = useMemo(() => {
    if (!isSpecRole) return [];
    const items = challengesData?.items ?? [];
    // Show Phase 2 challenges where user has CA/CR role
    return items.filter((ch) =>
      (ch.role_code === 'CA' || ch.role_code === 'CR') &&
      ch.current_phase >= 2
    );
  }, [challengesData, isSpecRole]);

  const sectionTitle = isSpecRole ? 'Incoming Requests' : 'My Requests';
  const emptyMessage = isSpecRole
    ? 'No challenges assigned to you for specification review.'
    : 'No requests submitted yet. Create your first challenge request to get started.';

  if (isLoading) {
    return (
      <section className="mb-6">
        <h2 className="text-base lg:text-lg font-bold text-foreground mb-3">{sectionTitle}</h2>
        <Skeleton className="h-48 w-full rounded-xl" />
      </section>
    );
  }

  // Render CA/CR view
  if (isSpecRole) {
    if (specRows.length === 0) {
      return (
        <section className="mb-6">
          <h2 className="text-base lg:text-lg font-bold text-foreground mb-3">{sectionTitle}</h2>
          <Card className="border-border">
            <CardContent className="py-8 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </CardContent>
          </Card>
        </section>
      );
    }

    return (
      <section className="mb-6">
        <h2 className="text-base lg:text-lg font-bold text-foreground mb-3">{sectionTitle}</h2>
        <Card className="border-border">
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Title</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[100px]">Phase</TableHead>
                  <TableHead className="w-[100px]">Model</TableHead>
                  <TableHead className="w-[80px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {specRows.map((row) => {
                  const badge = STATUS_BADGE[row.master_status] ?? STATUS_BADGE.ACTIVE;
                  const phaseLabel = PHASE_LABELS[row.current_phase] ?? `Phase ${row.current_phase}`;
                  const { route, label, icon: ActionIcon } = getViewRoute(
                    { id: row.challenge_id, master_status: row.master_status, current_phase: row.current_phase },
                    true,
                  );

                  return (
                    <SpecRowView
                      key={row.challenge_id}
                      row={row}
                      badge={badge}
                      phaseLabel={phaseLabel}
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

  // Render AM/RQ view
  if (amRows.length === 0) {
    return (
      <section className="mb-6">
        <h2 className="text-base lg:text-lg font-bold text-foreground mb-3">{sectionTitle}</h2>
        <Card className="border-border">
          <CardContent className="py-8 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <h2 className="text-base lg:text-lg font-bold text-foreground mb-3">{sectionTitle}</h2>
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
              {amRows.map((row) => {
                const badge = STATUS_BADGE[row.master_status] ?? STATUS_BADGE.ACTIVE;
                const phase = row.current_phase;
                const withWhom = phase ? (PHASE_OWNER[phase] ?? '—') : '—';
                const phaseLabel = phase ? (PHASE_LABELS[phase] ?? `Phase ${phase}`) : '—';
                const { route, label, icon: ActionIcon } = getViewRoute(row, false);

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

/* ── AM/RQ Row Component ── */

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

/* ── CA/CR Row Component ── */

function SpecRowView({
  row, badge, phaseLabel, route, label, ActionIcon,
}: {
  row: { challenge_id: string; title: string; master_status: string; operating_model: string | null };
  badge: { label: string; className: string };
  phaseLabel: string;
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
      <TableCell className="text-xs text-muted-foreground">
        {row.operating_model === 'MP' ? 'Marketplace' : 'Aggregator'}
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