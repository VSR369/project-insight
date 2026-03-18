/**
 * Notification Routing Service
 *
 * Resolves notification_routing config and fans out notifications
 * to ALL listed recipients (primary + cc + escalation) via cogni_notifications.
 *
 * Usage:
 *   await sendRoutedNotification({
 *     challengeId, phase, eventType, title, message,
 *   });
 *
 * The service:
 *  1. Looks up routing config for (phase, event_type)
 *  2. Resolves role → user_ids via user_challenge_roles
 *  3. Inserts a cogni_notification for every unique user
 */

import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoutedNotificationParams {
  challengeId: string;
  phase: number;
  eventType: string;
  title: string;
  message: string;
  /** Optional: override the routing lookup and send directly to these users */
  overrideUserIds?: string[];
}

interface RoutingRow {
  primary_recipient_role: string;
  cc_roles: string[];
  escalation_roles: string[];
}

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

/**
 * Send a routed notification to all recipients defined in notification_routing.
 * Returns the number of notifications inserted.
 */
export async function sendRoutedNotification(
  params: RoutedNotificationParams,
): Promise<number> {
  const { challengeId, phase, eventType, title, message, overrideUserIds } = params;

  // ── 1. If override provided, skip routing lookup ─────────────────────
  if (overrideUserIds && overrideUserIds.length > 0) {
    return insertNotifications(overrideUserIds, challengeId, eventType, title, message);
  }

  // ── 2. Fetch routing config ──────────────────────────────────────────
  const { data: routing, error: routingErr } = await supabase
    .from('notification_routing')
    .select('primary_recipient_role, cc_roles, escalation_roles')
    .eq('phase', phase)
    .eq('event_type', eventType)
    .eq('is_active', true)
    .maybeSingle();

  if (routingErr) {
    console.error('[sendRoutedNotification] routing lookup failed:', routingErr.message);
    return 0;
  }

  if (!routing) {
    // No routing config for this phase/event — silent no-op
    return 0;
  }

  const row = routing as RoutingRow;

  // ── 3. Collect all target roles ──────────────────────────────────────
  const allRoles = new Set<string>();
  allRoles.add(row.primary_recipient_role);
  (row.cc_roles ?? []).forEach((r) => allRoles.add(r));
  (row.escalation_roles ?? []).forEach((r) => allRoles.add(r));

  // ── 4. Resolve roles → user IDs via user_challenge_roles ─────────────
  const roleArray = [...allRoles];
  const userIds = await resolveRoleUsers(challengeId, roleArray);

  if (userIds.length === 0) return 0;

  // ── 5. Fan out notifications ─────────────────────────────────────────
  return insertNotifications(userIds, challengeId, eventType, title, message);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve which user IDs hold the given roles for a challenge.
 * Queries user_challenge_roles first, falls back to challenge_role_assignments.
 */
async function resolveRoleUsers(
  challengeId: string,
  roles: string[],
): Promise<string[]> {
  const userIdSet = new Set<string>();

  // Try user_challenge_roles (direct user → role mapping)
  const { data: ucr } = await supabase
    .from('user_challenge_roles')
    .select('user_id, role_code')
    .eq('challenge_id', challengeId)
    .in('role_code', roles);

  (ucr ?? []).forEach((r: any) => {
    if (r.user_id) userIdSet.add(r.user_id);
  });

  // Also check challenge_role_assignments for pool-based roles
  // Pool members have a user_id via platform_provider_pool
  if (userIdSet.size === 0 || roles.some((r) => !['AM', 'CR'].includes(r))) {
    const { data: cra } = await supabase
      .from('challenge_role_assignments')
      .select('pool_member_id, role_code, platform_provider_pool!challenge_role_assignments_pool_member_id_fkey(user_id)')
      .eq('challenge_id', challengeId)
      .eq('status', 'active')
      .in('role_code', roles);

    (cra ?? []).forEach((r: any) => {
      const userId =
        r.platform_provider_pool?.user_id ?? r.platform_provider_pool?.[0]?.user_id;
      if (userId) userIdSet.add(userId);
    });
  }

  // For ORG_ADMIN role, look up from seeking_org_admins via the challenge's org
  if (roles.includes('ORG_ADMIN')) {
    const { data: challenge } = await supabase
      .from('challenges')
      .select('organization_id')
      .eq('id', challengeId)
      .single();

    if (challenge?.organization_id) {
      const { data: admins } = await (supabase as any)
        .from('seeking_org_admins')
        .select('user_id')
        .eq('organization_id', challenge.organization_id)
        .eq('is_active', true);

      (admins ?? []).forEach((a: any) => {
        if (a.user_id) userIdSet.add(a.user_id);
      });
    }
  }

  return [...userIdSet];
}

const BATCH_SIZE = 50;

/**
 * Insert cogni_notifications for a list of user IDs, batched.
 */
async function insertNotifications(
  userIds: string[],
  challengeId: string,
  notificationType: string,
  title: string,
  messageBody: string,
): Promise<number> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return 0;

  const rows = unique.map((uid) => ({
    user_id: uid,
    challenge_id: challengeId,
    notification_type: notificationType,
    title,
    message: messageBody,
    is_read: false,
  }));

  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('cogni_notifications').insert(batch as any);
    if (error) {
      console.error('[sendRoutedNotification] insert batch failed:', error.message);
    } else {
      inserted += batch.length;
    }
  }

  return inserted;
}
