/**
 * useUserPortalRoles — Single source of truth for "what kind of user is this".
 * Determines portal/audience classification for gating decisions (e.g., SPA gate).
 *
 * Parallel queries:
 *  - user_roles                       → platform_admin / panel_reviewer / seeker
 *  - solution_providers               → has Solver record
 *  - org_users                        → tenant member
 *  - get_user_all_challenge_roles RPC → cogni workforce roles (CR/CU/ER/LC/FC)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STABLE } from '@/config/queryCache';

export interface UserPortalRoles {
  isPlatformAdmin: boolean;
  isReviewer: boolean;
  isSeeker: boolean;
  isSolver: boolean;
  isOrgUser: boolean;
  isWorkforce: boolean;
  isLoading: boolean;
}

const WORKFORCE_CODES = new Set(['CR', 'CU', 'ER', 'LC', 'FC']);
const POOL_WORKFORCE_CODES = new Set(['R8', 'R9', 'R10']);

export function useUserPortalRoles(userId: string | undefined): UserPortalRoles {
  const { data, isLoading } = useQuery({
    queryKey: ['user-portal-roles', userId, 'v2'],
    queryFn: async () => {
      if (!userId) {
        return {
          isPlatformAdmin: false,
          isReviewer: false,
          isSeeker: false,
          isSolver: false,
          isOrgUser: false,
          isWorkforce: false,
        };
      }

      const [rolesRes, providerRes, orgRes, challengeRolesRes, poolRes] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId),
        supabase.from('solution_providers').select('id').eq('user_id', userId).limit(1),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('org_users') as any).select('id').eq('user_id', userId).limit(1),
        supabase.rpc('get_user_all_challenge_roles', { p_user_id: userId }),
        supabase
          .from('platform_provider_pool')
          .select('role_codes')
          .eq('user_id', userId)
          .eq('is_active', true),
      ]);

      const roles = (rolesRes.data ?? []).map((r) => r.role);
      const isPlatformAdmin = roles.includes('platform_admin');
      const isReviewer = roles.includes('panel_reviewer');
      const isSeeker = roles.includes('seeker');
      const isSolver = !providerRes.error && (providerRes.data?.length ?? 0) > 0;
      const isOrgUser = !orgRes.error && (orgRes.data?.length ?? 0) > 0;

      let isWorkforce = false;
      if (!challengeRolesRes.error && Array.isArray(challengeRolesRes.data)) {
        for (const row of challengeRolesRes.data as Array<{ role_codes?: string[] }>) {
          for (const code of row.role_codes ?? []) {
            if (WORKFORCE_CODES.has(code)) {
              isWorkforce = true;
              break;
            }
          }
          if (isWorkforce) break;
        }
      }

      // Org-level workforce: users in platform_provider_pool with FC/LC/CU/ER
      // codes count as workforce even without an active challenge assignment.
      if (!isWorkforce && !poolRes.error) {
        for (const row of (poolRes.data ?? []) as Array<{ role_codes?: string[] }>) {
          if ((row.role_codes ?? []).some((c) => POOL_WORKFORCE_CODES.has(c))) {
            isWorkforce = true;
            break;
          }
        }
      }

      return { isPlatformAdmin, isReviewer, isSeeker, isSolver, isOrgUser, isWorkforce };
    },
    enabled: !!userId,
    ...CACHE_STABLE,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    isPlatformAdmin: data?.isPlatformAdmin ?? false,
    isReviewer: data?.isReviewer ?? false,
    isSeeker: data?.isSeeker ?? false,
    isSolver: data?.isSolver ?? false,
    isOrgUser: data?.isOrgUser ?? false,
    isWorkforce: data?.isWorkforce ?? false,
    isLoading,
  };
}
