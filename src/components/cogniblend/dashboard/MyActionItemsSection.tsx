/**
 * MyActionItemsSection — Focused "needs your action" table.
 * Shows: AM_APPROVAL_PENDING, DRAFT, RETURNED items for the active role.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Eye, Pencil, Play, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useMyChallenges } from '@/hooks/cogniblend/useMyChallenges';
import { useMyRequests } from '@/hooks/queries/useMyRequests';
import { useCogniRoleContext } from '@/contexts/CogniRoleContext';
import { ROLE_DISPLAY } from '@/types/cogniRoles';

/* ── Phase → role label map ──────────────────────────────── */

const PHASE_ROLE_LABEL: Record<number, string> = {
  1: 'AM / RQ',
  2: 'Challenge Creator',
  3: 'Curator',
  4: 'Innovation Director',
  5: 'Innovation Director',
  6: 'Innovation Director',
  7: 'Evaluation Reviewer',
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

/* ── Status badge config ──────────────────────────────── */

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  RETURNED: { label: 'Returned', className: 'bg-orange-100 text-orange-700' },
  AM_APPROVAL_PENDING: { label: 'Awaiting Your Approval', className: 'bg-violet-100 text-violet-700' },
  IN_PREPARATION: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
  ACTIVE: { label: 'Active', className: 'bg-blue-100 text-blue-700' },
};

/* ── Route helper ────────────────────────────────────── */

function getActionRoute(item: { id: string; status: string; phase?: number; phase_status?: string | null }): {
  route: string; label: string; icon: typeof Eye;
} {
  // AM approval items
  if (item.phase_status === 'AM_APPROVAL_PENDING' || item.status === 'AM_APPROVAL_PENDING') {
    return { route: `/cogni/approval`, label: 'Review & Approve', icon: ShieldCheck };
  }
  // Drafts
  if (item.status === 'DRAFT') {
    return { route: `/cogni/challenges/${item.id}/edit`, label: 'Continue Editing', icon: Pencil };
  }
  // Returned
  if (item.status === 'RETURNED') {
    return { route: `/cogni/challenges/${item.id}/edit`, label: 'Revise', icon: Pencil };
  }
  // Phase-aware routing
  if (item.phase === 1) return { route: `/cogni/challenges/${item.id}/spec`, label: 'Review Spec', icon: Eye };
  if (item.phase === 2) return { route: `/cogni/challenges/${item.id}/spec`, label: 'Review Spec', icon: Eye };
  if (item.phase === 3) return { route: `/cogni/challenges/${item.id}/legal`, label: 'Legal Docs', icon: Eye };
  if (item.phase === 4 || item.phase === 5) return { route: `/cogni/approval`, label: 'Approve', icon: ShieldCheck };
  if (item.status === 'PUBLISHED') return { route: `/cogni/challenges/${item.id}`, label: 'Manage', icon: Eye };
  // Default
  return { route: `/cogni/challenges/${item.id}`, label: 'View', icon: Eye };
}

export function MyActionItemsSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeRole, challengeRoleMap, isRolesLoading } = useCogniRoleContext();
  const { data: challengesData, isLoading: chLoading } = useMyChallenges(user?.id);
  const { data: requestsData, isLoading: reqLoading } = useMyRequests('all', '');

  const isLoading = chLoading || reqLoading || isRolesLoading;

  const challengeItems = challengesData?.items ?? [];
  const allSRRows = useMemo(
    () => requestsData?.pages.flatMap((p) => p.rows) ?? [],
    [requestsData],
  );

  // Build action items: challenges needing action + draft SRs
  const actionItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      status: string;
      phase?: number;
      phase_status?: string | null;
      created_at: string;
    }> = [];

    // Challenges the user has a role on that need action
    for (const ch of challengeItems) {
      const roles = challengeRoleMap.get(ch.challenge_id) ?? [];
      const isRelevant = !activeRole || roles.includes(activeRole) || ch.master_status === 'DRAFT';
      if (!isRelevant) continue;

      // Only show items that need the user's action
      const needsAction =
        ch.master_status === 'DRAFT' ||
        ch.master_status === 'RETURNED' ||
        ch.phase_status === 'AM_APPROVAL_PENDING';

      if (needsAction) {
        items.push({
          id: ch.challenge_id,
          title: ch.title,
          status: ch.phase_status === 'AM_APPROVAL_PENDING' ? 'AM_APPROVAL_PENDING' : ch.master_status,
          phase: ch.current_phase,
          phase_status: ch.phase_status,
          created_at: '',
        });
      }
    }

    // Draft SRs (only for AM/RQ)
    const showSRs = !activeRole || ['AM', 'RQ'].includes(activeRole);
    if (showSRs) {
      for (const sr of allSRRows) {
        if (sr.master_status === 'DRAFT' && !items.some((i) => i.id === sr.id)) {
          items.push({
            id: sr.id,
            title: sr.title,
            status: 'DRAFT',
            phase: sr.current_phase ?? undefined,
            phase_status: sr.phase_status,
            created_at: sr.created_at,
          });
        }
      }
    }

    return items;
  }, [challengeItems, allSRRows, activeRole, challengeRoleMap]);

  const roleName = ROLE_DISPLAY[activeRole] ?? 'Team Member';

  if (isLoading) {
    return (
      <section className="mb-6">
        <h2 className="text-base lg:text-lg font-bold text-foreground mb-3">My Action Items</h2>
        <Skeleton className="h-40 w-full rounded-xl" />
      </section>
    );
  }

  if (actionItems.length === 0) {
    return (
      <section className="mb-6">
        <h2 className="text-base lg:text-lg font-bold text-foreground mb-3">My Action Items</h2>
        <div className="flex flex-col items-center rounded-xl bg-[hsl(150,40%,93%)] p-5 animate-fade-in">
          <CheckCircle className="h-8 w-8 text-[hsl(155,68%,37%)] mb-2" />
          <p className="text-sm font-bold text-[hsl(155,68%,37%)]">All caught up!</p>
          <p className="text-xs text-muted-foreground">
            No items need your attention as {roleName} right now.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <h2 className="text-base lg:text-lg font-bold text-foreground mb-3">My Action Items</h2>
      <Card className="border-border">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Title</TableHead>
                <TableHead className="w-[100px]">Phase</TableHead>
                <TableHead className="w-[160px]">Status</TableHead>
                <TableHead className="w-[120px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actionItems.map((item) => {
                const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.ACTIVE;
                const { route, label, icon: ActionIcon } = getActionRoute(item);

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-sm text-foreground truncate max-w-[260px]">
                      {item.title}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.phase ? PHASE_LABELS[item.phase] ?? `Phase ${item.phase}` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-[10px]', badge.className)}>
                        {badge.label}
                      </Badge>
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
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </section>
  );
}
