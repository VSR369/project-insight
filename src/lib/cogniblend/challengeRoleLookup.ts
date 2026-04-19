/**
 * challengeRoleLookup — Resolves active user IDs for given challenge roles.
 * Used by client-side notification dispatch to route messages to the
 * correct recipient(s). Read-only, RLS-respecting (anon client).
 */

import { supabase } from '@/integrations/supabase/client';
import { logWarning } from '@/lib/errorHandler';

/**
 * Returns the distinct user IDs holding ANY of the supplied role codes
 * for a challenge. Inactive assignments are excluded. Empty array on
 * error or no matches — never throws.
 */
export async function getActiveRoleUsers(
  challengeId: string,
  roleCodes: string[],
): Promise<string[]> {
  if (!challengeId || roleCodes.length === 0) return [];
  try {
    const { data, error } = await supabase
      .from('user_challenge_roles')
      .select('user_id')
      .eq('challenge_id', challengeId)
      .eq('is_active', true)
      .in('role_code', roleCodes);

    if (error) {
      logWarning('Failed to look up active role users', {
        operation: 'lookup_active_role_users',
        component: 'challengeRoleLookup',
        additionalData: { challengeId, roleCodes, error: error.message },
      });
      return [];
    }

    const ids = new Set<string>();
    for (const row of (data ?? []) as Array<{ user_id: string | null }>) {
      if (row.user_id) ids.add(row.user_id);
    }
    return Array.from(ids);
  } catch (err) {
    logWarning('Active role lookup threw', {
      operation: 'lookup_active_role_users',
      component: 'challengeRoleLookup',
      additionalData: {
        challengeId,
        roleCodes,
        error: err instanceof Error ? err.message : String(err),
      },
    });
    return [];
  }
}
