/**
 * sessionIsolation — Determines user's session type for cross-portal blocking.
 * Returns 'platform_admin' | 'org_admin' | 'both' | 'none'.
 */

import { supabase } from '@/integrations/supabase/client';

export type SessionType = 'platform_admin' | 'org_admin' | 'both' | 'none';

export async function checkSessionType(userId: string): Promise<SessionType> {
  const [rolesResult, orgAdminResult] = await Promise.all([
    supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('seeking_org_admins')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
  ]);

  const isPlatformAdmin = !!rolesResult.data;
  const isOrgAdmin = !!orgAdminResult.data;

  if (isPlatformAdmin && isOrgAdmin) return 'both';
  if (isPlatformAdmin) return 'platform_admin';
  if (isOrgAdmin) return 'org_admin';
  return 'none';
}
