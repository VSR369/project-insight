/**
 * ActionItemsWidget — Dashboard widget showing welcome banner, stats, and action items.
 * Filters by active workspace role from CogniRoleContext.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Clock, AlertTriangle, Eye, Pencil, Play, ArrowRight, Layers } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useOrgModelContext } from '@/hooks/queries/useSolutionRequestContext';
import { useMyRequests } from '@/hooks/queries/useMyRequests';
import { useMyChallenges } from '@/hooks/cogniblend/useMyChallenges';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { Skeleton } from '@/components/ui/skeleton';
import { useCogniRoleContext } from '@/contexts/CogniRoleContext';
import { ROLE_DISPLAY, ROLE_PRIMARY_ACTION } from '@/types/cogniRoles';

/* ── Status badge config ──────────────────────────────── */

const STATUS_BADGE: Record<string, { label: string; subLabel?: string; className: string }> = {
  DRAFT: { label: 'Draft', subLabel: 'Editing in progress', className: 'bg-muted text-muted-foreground' },
  ACTIVE: { label: 'Created', subLabel: 'Awaiting review', className: 'bg-blue-100 text-blue-700' },
  IN_PREPARATION: { label: 'In Preparation', subLabel: 'Workflow active', className: 'bg-blue-100 text-blue-700' },
  ON_HOLD: { label: 'On Hold', subLabel: 'Paused by user', className: 'bg-amber-100 text-amber-700' },
  RETURNED: { label: 'Returned', subLabel: 'Needs revision', className: 'bg-orange-100 text-orange-700' },
  UNDER_REVIEW: { label: 'Under Review', subLabel: 'Being evaluated', className: 'bg-violet-100 text-violet-700' },
  PUBLISHED: { label: 'Published', subLabel: 'Live on platform', className: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
};

/* ── Helpers ──────────────────────────────────────────── */

function formatChallengeId(index: number): string {
  const year = new Date().getFullYear();
  return `CH-${year}-${String(index + 1).padStart(3, '0')}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── Component ───────────────────────────────────────── */

export function ActionItemsWidget() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: currentOrg } = useCurrentOrg();
  const { data: orgContext } = useOrgModelContext();
  const {
    activeRole,
    challengeRoleMap,
    isRolesLoading,
  } = useCogniRoleContext();
  const { data: requestsData, isLoading: reqLoading } = useMyRequests('all', '');
  const { data: challengesData, isLoading: chLoading } = useMyChallenges(user?.id);

  const isLoading = reqLoading || chLoading || isRolesLoading;

  const allSRRows = useMemo(
    () => requestsData?.pages.flatMap((p) => p.rows) ?? [],
    [requestsData],
  );

  const challengeItems = challengesData?.items ?? [];

  // Filter challenges by active role using challengeRoleMap
  const filteredChallengeItems = useMemo(() => {
    if (!activeRole) return challengeItems;
    return challengeItems.filter((ch) => {
      const roles = challengeRoleMap.get(ch.challenge_id) ?? [];
      // Always show drafts created by the user (the "Finish Draft" edge case)
      if (ch.master_status === 'DRAFT') return true;
      return roles.includes(activeRole);
    });
  }, [challengeItems, activeRole, challengeRoleMap]);

  // Merge into unified action items
  const actionItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      status: string;
      created_at: string;
      type: 'challenge' | 'request';
      phase?: number;
    }> = [];

    for (const ch of filteredChallengeItems) {
      items.push({
        id: ch.challenge_id,
        title: ch.title,
        status: ch.master_status,
        created_at: '',
        type: 'challenge',
        phase: ch.current_phase,
      });
    }

    // SRs only relevant for AM/RQ roles or if no active role
    const showSRs = !activeRole || ['AM', 'RQ'].includes(activeRole);
    if (showSRs) {
      for (const sr of allSRRows) {
        if (!items.some((i) => i.id === sr.id)) {
          items.push({
            id: sr.id,
            title: sr.title,
            status: sr.master_status,
            created_at: sr.created_at,
            type: 'request',
          });
        }
      }
    }

    return items.slice(0, 15);
  }, [filteredChallengeItems, allSRRows, activeRole]);

  // Stats (filtered)
  const activeChallenges = filteredChallengeItems.filter(
    (c) => c.master_status === 'ACTIVE' || c.master_status === 'IN_PREPARATION' || c.master_status === 'PUBLISHED'
  ).length;
  const pendingActions = filteredChallengeItems.filter(
    (c) => c.master_status === 'DRAFT' || c.master_status === 'RETURNED'
  ).length + ((!activeRole || ['AM', 'RQ'].includes(activeRole))
    ? allSRRows.filter((r) => r.master_status === 'DRAFT').length
    : 0);

  const roleName = ROLE_DISPLAY[activeRole] ?? 'Team Member';
  const modelLabel = orgContext?.operatingModel === 'MP' ? 'Marketplace' : 'Aggregator';
  const orgName = currentOrg?.orgName ?? 'Your Organization';

  // Dynamic primary action based on active role
  const primaryAction = ROLE_PRIMARY_ACTION[activeRole] ?? ROLE_PRIMARY_ACTION['CR'];

  if (isLoading) {
    return (
      <div className="space-y-4 mb-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      {/* ── Welcome Banner ──────────── */}
      <div className="rounded-xl p-5 text-white" style={{ background: 'linear-gradient(135deg, hsl(218 52% 22%) 0%, hsl(218 52% 35%) 100%)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">
              Welcome back, {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
            </h2>
            <p className="text-sm text-white/70 mt-0.5">
              {roleName} · {orgName}
              <Badge variant="outline" className="ml-2 text-[10px] border-white/30 text-white/80">
                {modelLabel}
              </Badge>
            </p>
          </div>
          <Button
            onClick={() => navigate(primaryAction.route)}
            size="sm"
            className="gap-1.5 shrink-0 bg-white text-[hsl(218,52%,25%)] hover:bg-white/90"
          >
            <Plus className="h-4 w-4" />
            {primaryAction.label}
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeChallenges}</p>
              <p className="text-xs text-muted-foreground">Active Challenges</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{pendingActions}</p>
              <p className="text-xs text-muted-foreground">Pending Actions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">0</p>
              <p className="text-xs text-muted-foreground">SLA Alerts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Action Items Table ─────────────────────── */}
      {actionItems.length > 0 && (
        <Card className="border-border">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">My Action Items</h3>
          </div>
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">ID</TableHead>
                  <TableHead className="min-w-[180px]">Title</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-[100px]">Created</TableHead>
                  <TableHead className="w-[140px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionItems.map((item, idx) => {
                  const status = STATUS_BADGE[item.status] ?? STATUS_BADGE.DRAFT;
                  const isDraft = item.status === 'DRAFT';
                  const isOnHold = item.status === 'ON_HOLD';
                  const isReturned = item.status === 'RETURNED';
                  const isPublished = item.status === 'PUBLISHED';

                  let ActionIcon = Eye;
                  let actionLabel = 'View';
                  let actionRoute = `/cogni/challenges/${item.id}/edit`;

                  if (isDraft && item.title === 'Untitled Draft') {
                    ActionIcon = Play;
                    actionLabel = 'Resume';
                  } else if (isDraft) {
                    ActionIcon = Pencil;
                    actionLabel = 'Continue Editing';
                  } else if (isOnHold) {
                    ActionIcon = Play;
                    actionLabel = 'Resume';
                  } else if (isReturned) {
                    ActionIcon = Pencil;
                    actionLabel = 'Edit Challenge';
                  } else if (item.type === 'request' && item.status === 'ACTIVE') {
                    ActionIcon = ArrowRight;
                    actionLabel = 'Create Challenge';
                    actionRoute = `/cogni/challenges/new`;
                  }

                  if (isPublished) {
                    actionRoute = `/cogni/challenges/${item.id}`;
                  }

                  return (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-accent/50">
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {item.type === 'challenge' ? formatChallengeId(idx) : `SR-${new Date().getFullYear()}-${String(idx + 1).padStart(3, '0')}`}
                      </TableCell>
                      <TableCell className="font-medium text-sm text-primary truncate max-w-[220px]">
                        {item.title}
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge variant="secondary" className={cn('text-[10px]', status.className)}>
                            {status.label}
                          </Badge>
                          {status.subLabel && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{status.subLabel}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {item.created_at ? formatDate(item.created_at) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => navigate(actionRoute)}
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

          {/* "See all tasks" secondary link */}
          {activeRole && challengeItems.length > filteredChallengeItems.length && (
            <div className="px-4 py-2.5 border-t border-border">
              <button
                onClick={() => navigate('/cogni/my-challenges')}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                <Layers className="h-3 w-3" />
                See all tasks across roles ({challengeItems.length} total)
              </button>
            </div>
          )}
        </Card>
      )}

      {actionItems.length === 0 && (
        <Card className="border-border">
          <CardContent className="py-8 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              No items for your {roleName} workspace.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate(primaryAction.route)}>
              {primaryAction.label}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
