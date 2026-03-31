/**
 * MyActionItemsSection — Unified action items queue.
 * Shows: AM_APPROVAL_PENDING, DRAFT, RETURNED items for the active role.
 * For CA/CR: also shows unread lifecycle notifications (SLA, amendments, etc.)
 */

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Eye, Pencil, ShieldCheck, AlertTriangle, Bell, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useMyChallenges } from '@/hooks/cogniblend/useMyChallenges';

import { useCogniRoleContext } from '@/contexts/CogniRoleContext';
import { useCogniPermissions } from '@/hooks/cogniblend/useCogniPermissions';
import { ROLE_DISPLAY } from '@/types/cogniRoles';
import { supabase } from '@/integrations/supabase/client';

/* ── Phase labels ──────────────────────────────────── */

const PHASE_LABELS: Record<number, string> = {
  1: 'Intake', 2: 'Spec Review', 3: 'Legal Docs', 4: 'Curation',
  5: 'Approval', 6: 'Publication', 7: 'Submissions', 8: 'Evaluation',
  9: 'Award', 10: 'Escrow', 11: 'Legal Close', 12: 'Payout', 13: 'Archive',
};

/* ── Status badge config ──────────────────────────── */

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  RETURNED: { label: 'Returned', className: 'bg-orange-100 text-orange-700' },
  AM_APPROVAL_PENDING: { label: 'Awaiting Your Approval', className: 'bg-violet-100 text-violet-700' },
  IN_PREPARATION: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
  ACTIVE: { label: 'Active', className: 'bg-blue-100 text-blue-700' },
  SLA_BREACH: { label: 'SLA Breach', className: 'bg-destructive/10 text-destructive' },
  SLA_WARNING: { label: 'SLA Warning', className: 'bg-orange-100 text-orange-700' },
  AMENDMENT_NOTICE: { label: 'Amendment', className: 'bg-violet-100 text-violet-700' },
  PHASE_COMPLETE: { label: 'Phase Complete', className: 'bg-emerald-100 text-emerald-700' },
  WAITING_FOR_YOU: { label: 'Waiting for You', className: 'bg-blue-100 text-blue-700' },
  ROLE_ASSIGNED: { label: 'Role Assigned', className: 'bg-emerald-100 text-emerald-700' },
  ROLE_REASSIGNED: { label: 'Role Reassigned', className: 'bg-amber-100 text-amber-700' },
  NOTIFICATION: { label: 'Notification', className: 'bg-muted text-muted-foreground' },
};

/* ── Notification type to icon ──────────────────────── */

function getNotificationIcon(type: string) {
  if (type.includes('SLA') || type.includes('BREACH')) return AlertTriangle;
  if (type.includes('WAITING') || type.includes('AMENDMENT')) return Bell;
  return Info;
}

/* ── Route helper ────────────────────────────────── */

interface ActionItem {
  id: string;
  title: string;
  status: string;
  phase?: number;
  phase_status?: string | null;
  created_at: string;
  isNotification?: boolean;
  notificationId?: string;
  challengeId?: string;
  /** Role codes the user holds on this challenge */
  roleCodes?: string[];
}

function getActionRoute(item: ActionItem): {
  route: string; label: string; icon: typeof Eye;
} {
  // Notification-based items → challenge view
  if (item.isNotification) {
    const targetId = item.challengeId || item.id;
    return { route: `/cogni/my-challenges/${targetId}`, label: 'View', icon: Eye };
  }
  // Drafts
  if (item.status === 'DRAFT') {
    return { route: `/cogni/challenges/${item.id}/edit`, label: 'Continue Editing', icon: Pencil };
  }
  // Returned
  if (item.status === 'RETURNED') {
    return { route: `/cogni/challenges/${item.id}/edit`, label: 'Revise', icon: Pencil };
  }
  // Default: challenge view
  return { route: `/cogni/my-challenges/${item.id}`, label: 'View', icon: Eye };
}

export function MyActionItemsSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { activeRole, challengeRoleMap, isRolesLoading } = useCogniRoleContext();
  const { data: challengesData, isLoading: chLoading } = useMyChallenges(user?.id);
  

  const { isSpecRole } = useCogniPermissions();

  // Fetch unread notifications for CA/CR roles
  const { data: unreadNotifications = [], isLoading: notifLoading } = useQuery({
    queryKey: ['cogni-notifications-unread', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('cogni_notifications')
        .select('id, user_id, challenge_id, notification_type, title, message, is_read, created_at')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!user?.id && isSpecRole,
    staleTime: 10_000,
  });

  const isLoading = chLoading || isRolesLoading || (isSpecRole && notifLoading);

  const challengeItems = challengesData?.items ?? [];

  // Mark notification as read + navigate
  const handleNotificationAction = useCallback(
    async (notifId: string, challengeId: string | null) => {
      await supabase.rpc('mark_notification_read', { p_notification_id: notifId });
      queryClient.invalidateQueries({ queryKey: ['cogni-notifications-unread', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['cogni-notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['cogni-unread-count', user?.id] });
      if (challengeId) {
        navigate(`/cogni/my-requests/${challengeId}/view`);
      }
    },
    [user?.id, queryClient, navigate],
  );

  // Build action items — show ALL roles simultaneously (Phase 4: unified dashboard)
  const actionItems = useMemo(() => {
    const items: ActionItem[] = [];

    // Challenges the user has a role on that need action — across ALL roles
    for (const ch of challengeItems) {
      const roles = challengeRoleMap.get(ch.challenge_id) ?? [];
      // Include if user has any role on this challenge (no activeRole filter)
      if (roles.length === 0 && ch.master_status !== 'DRAFT') continue;

      // Standard action items: DRAFT, RETURNED, AM_APPROVAL_PENDING
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
          roleCodes: roles,
        });
      }
    }

    // Unread notifications for CA/CR (lifecycle alerts)
    if (isSpecRole) {
      for (const notif of unreadNotifications) {
        // Avoid duplicate if challenge is already in the list
        if (notif.challenge_id && items.some((i) => i.id === notif.challenge_id)) continue;

        const badgeKey = STATUS_BADGE[notif.notification_type]
          ? notif.notification_type
          : 'NOTIFICATION';

        items.push({
          id: notif.id,
          title: notif.title,
          status: badgeKey,
          created_at: notif.created_at,
          isNotification: true,
          notificationId: notif.id,
          challengeId: notif.challenge_id ?? undefined,
        });
      }
    }

    return items;
  }, [challengeItems, challengeRoleMap, isSpecRole, unreadNotifications]);

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
                const badge = STATUS_BADGE[item.status] ?? STATUS_BADGE.NOTIFICATION;
                const { route, label, icon: ActionIcon } = getActionRoute(item);
                const NotifIcon = item.isNotification ? getNotificationIcon(item.status) : null;

                return (
                  <TableRow key={item.isNotification ? `notif-${item.id}` : item.id}>
                    <TableCell className="font-medium text-sm text-foreground truncate max-w-[260px]">
                      <span className="flex items-center gap-1.5">
                        {NotifIcon && <NotifIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                        {item.title}
                      </span>
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
                        onClick={() => {
                          if (item.isNotification && item.notificationId) {
                            handleNotificationAction(item.notificationId, item.challengeId ?? null);
                          } else {
                            navigate(route);
                          }
                        }}
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
