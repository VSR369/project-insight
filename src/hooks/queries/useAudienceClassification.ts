/**
 * useAudienceClassification — Single source of truth for "what kind of user is this".
 *
 * This hook unifies portal/legal/routing gating decisions so SPA, PMA, PWA,
 * Login redirect, and RoleBasedRedirect all agree on user audience.
 *
 * KEY RULE: `isPureSolutionProvider` is true ONLY when the user has a
 * solution_providers record AND no workforce/admin/reviewer/org/cogni
 * affiliation. This is the ONLY signal that should gate the SPA modal.
 *
 * Sources (parallel):
 *  - user_roles                       → platform_admin / panel_reviewer / seeker
 *  - solution_providers               → has Solver record
 *  - panel_reviewers                  → reviewer record + approval_status
 *  - org_users                        → tenant member
 *  - get_user_all_challenge_roles RPC → challenge-level workforce roles
 *  - platform_provider_pool           → org-level workforce roles (R5_MP, R7_MP, R8, R9, etc.)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STABLE } from '@/config/queryCache';
import { getPoolCodesForGovernanceRole } from '@/constants/roleCodeMapping.constants';

export interface AudienceClassification {
  // Raw signals
  isPlatformAdmin: boolean;
  isReviewer: boolean;
  isPendingReviewer: boolean;
  isSeeker: boolean;
  isOrgUser: boolean;
  hasSolutionProviderRecord: boolean;
  hasCogniRoles: boolean;
  isWorkforce: boolean;

  // Derived audience flags (use these for gating)
  /** TRUE only when user is exclusively a Solution Provider. SPA gate uses this. */
  isPureSolutionProvider: boolean;
  /** TRUE if user has any CogniBlend access (challenge role or pool workforce). */
  hasCogniAccess: boolean;

  isLoading: boolean;
}

/**
 * Build the set of SLM pool codes that classify a user as workforce
 * (i.e., not a pure solution provider). Derived from the governance
 * mapping so we stay aligned with role architecture.
 *
 * Workforce = anyone in the pool fulfilling CU / ER / LC / FC / CR roles.
 * (Solution providers themselves use R5_MP / R7_MP for marketplace work,
 * which IS a provider role and must NOT be classified as workforce.)
 */
const WORKFORCE_POOL_CODES: Set<string> = (() => {
  const set = new Set<string>();
  // Curator, Expert Reviewer, Legal Compliance, Finance Controller, Challenge Reviewer
  for (const gov of ['CU', 'ER', 'LC', 'FC', 'CR']) {
    for (const code of getPoolCodesForGovernanceRole(gov)) set.add(code);
  }
  // Defensive: also include shorthand forms used historically in pool rows
  ['R8', 'R9', 'R10', 'R10_CR', 'CU', 'ER', 'LC', 'FC', 'CR'].forEach((c) => set.add(c));
  return set;
})();

/**
 * Workforce codes from per-challenge assignments.
 * (R3/R4 challenge-creator codes also count as workforce — a CR is not a Solver.)
 */
const WORKFORCE_CHALLENGE_CODES = new Set([
  'CR', 'CU', 'ER', 'LC', 'FC',
  'R3', 'R4', 'R8', 'R9', 'R10', 'R10_CR',
]);

export function useAudienceClassification(
  userId: string | undefined,
): AudienceClassification {
  const { data, isLoading } = useQuery({
    queryKey: ['audience-classification', userId, 'v1'],
    queryFn: async () => {
      if (!userId) return null;

      const [rolesRes, providerRes, reviewerRes, orgRes, challengeRolesRes, poolRes] =
        await Promise.all([
          supabase.from('user_roles').select('role').eq('user_id', userId),
          supabase.from('solution_providers').select('id').eq('user_id', userId).limit(1),
          supabase
            .from('panel_reviewers')
            .select('id, approval_status')
            .eq('user_id', userId)
            .maybeSingle(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase.from('org_users') as any)
            .select('id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .limit(1),
          supabase.rpc('get_user_all_challenge_roles', { p_user_id: userId }),
          supabase
            .from('platform_provider_pool')
            .select('role_codes')
            .eq('user_id', userId)
            .eq('is_active', true),
        ]);

      const roles = (rolesRes.data ?? []).map((r) => r.role);
      const isPlatformAdmin = roles.includes('platform_admin');
      const isReviewerRole = roles.includes('panel_reviewer');
      const isSeeker = roles.includes('seeker');
      const hasSolutionProviderRecord =
        !providerRes.error && (providerRes.data?.length ?? 0) > 0;
      const hasReviewerRecord = !reviewerRes.error && !!reviewerRes.data;
      const isReviewer = isReviewerRole || hasReviewerRecord;
      const isPendingReviewer = reviewerRes.data?.approval_status === 'pending';
      const isOrgUser = !orgRes.error && (orgRes.data?.length ?? 0) > 0;

      // Workforce: challenge-level
      let isWorkforce = false;
      let hasCogniRoles = false;
      if (!challengeRolesRes.error && Array.isArray(challengeRolesRes.data)) {
        const rows = challengeRolesRes.data as Array<{ role_codes?: string[] }>;
        if (rows.length > 0) hasCogniRoles = true;
        for (const row of rows) {
          for (const code of row.role_codes ?? []) {
            if (WORKFORCE_CHALLENGE_CODES.has(code)) {
              isWorkforce = true;
              break;
            }
          }
          if (isWorkforce) break;
        }
      }

      // Workforce: org-level (pool membership with workforce SLM codes)
      if (!poolRes.error) {
        for (const row of (poolRes.data ?? []) as Array<{ role_codes?: string[] }>) {
          const codes = row.role_codes ?? [];
          if (codes.length > 0) hasCogniRoles = true;
          if (codes.some((c) => WORKFORCE_POOL_CODES.has(c))) {
            isWorkforce = true;
          }
        }
      }

      // Pure Solution Provider — POSITIVE rule.
      // Must have provider record AND no other affiliation.
      const isPureSolutionProvider =
        hasSolutionProviderRecord &&
        !isWorkforce &&
        !isPlatformAdmin &&
        !isReviewer &&
        !isOrgUser;

      const hasCogniAccess = hasCogniRoles || isWorkforce || isPlatformAdmin;

      return {
        isPlatformAdmin,
        isReviewer,
        isPendingReviewer,
        isSeeker,
        isOrgUser,
        hasSolutionProviderRecord,
        hasCogniRoles,
        isWorkforce,
        isPureSolutionProvider,
        hasCogniAccess,
      };
    },
    enabled: !!userId,
    ...CACHE_STABLE,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    isPlatformAdmin: data?.isPlatformAdmin ?? false,
    isReviewer: data?.isReviewer ?? false,
    isPendingReviewer: data?.isPendingReviewer ?? false,
    isSeeker: data?.isSeeker ?? false,
    isOrgUser: data?.isOrgUser ?? false,
    hasSolutionProviderRecord: data?.hasSolutionProviderRecord ?? false,
    hasCogniRoles: data?.hasCogniRoles ?? false,
    isWorkforce: data?.isWorkforce ?? false,
    isPureSolutionProvider: data?.isPureSolutionProvider ?? false,
    hasCogniAccess: data?.hasCogniAccess ?? false,
    isLoading,
  };
}
