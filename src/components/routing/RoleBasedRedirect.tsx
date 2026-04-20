import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { pickCogniLandingRoute } from '@/lib/cogniLanding';

type PortalType = 'admin' | 'provider' | 'reviewer' | 'organization' | 'cogniblend';

const PORTAL_ROUTES: Record<PortalType, string> = {
  admin: '/admin',
  provider: '/pulse/feed',
  reviewer: '/reviewer/dashboard',
  organization: '/org/dashboard',
  cogniblend: '/cogni/dashboard',
};

/**
 * Role-based redirect component for the root route.
 * Determines the appropriate portal based on user roles and redirects accordingly.
 * Priority: Admin > Reviewer > Provider
 */
export function RoleBasedRedirect() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const determineAndRedirect = async () => {
      // Wait for auth to complete
      if (authLoading) return;

      // Not logged in - go to login
      if (!user) {
        navigate('/home', { replace: true });
        return;
      }

      // Prevent duplicate redirects
      if (isRedirecting) return;
      setIsRedirecting(true);

      // Check sessionStorage for cached portal preference
      const cachedPortal = sessionStorage.getItem('activePortal') as PortalType | null;

      // Fetch roles and provider/reviewer/org/cogni/pool records in parallel
      const [rolesResult, providerResult, reviewerResult, orgUserResult, cogniRolesResult, poolResult] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        supabase.from('solution_providers').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('panel_reviewers').select('id, approval_status').eq('user_id', user.id).maybeSingle(),
        supabase.from('org_users').select('id').eq('user_id', user.id).eq('is_active', true).limit(1).maybeSingle(),
        supabase.rpc('get_user_all_challenge_roles', { p_user_id: user.id }),
        supabase.from('platform_provider_pool').select('role_codes').eq('user_id', user.id).eq('is_active', true),
      ]);

      const roles = rolesResult.data;
      const isPlatformAdmin = roles?.some(r => r.role === 'platform_admin');
      const isPanelReviewer = roles?.some(r => r.role === 'panel_reviewer') || !!reviewerResult.data;
      const isPendingReviewer = reviewerResult.data?.approval_status === 'pending';
      const hasProviderRecord = !!providerResult.data;
      const hasOrgUserRecord = !!orgUserResult.data;
      const challengeRows = (cogniRolesResult.data as Array<{ role_codes?: string[] }> | null) ?? [];
      const poolRows = (poolResult.data as Array<{ role_codes?: string[] }> | null) ?? [];
      const hasCogniRoles = challengeRows.length > 0 || poolRows.length > 0;

      // Workforce signal — pool/challenge membership with workforce SLM codes means
      // the user belongs to CogniBlend workspace, NOT the provider portal.
      const WORKFORCE_CODES = new Set(['R8', 'R9', 'R10', 'R10_CR', 'CU', 'ER', 'LC', 'FC', 'CR', 'R3', 'R4']);
      const isWorkforce =
        poolRows.some((r) => (r.role_codes ?? []).some((c) => WORKFORCE_CODES.has(c))) ||
        challengeRows.some((r) => (r.role_codes ?? []).some((c) => WORKFORCE_CODES.has(c)));

      // Validate cached portal - user must still have access
      if (cachedPortal) {
        const canAccessCached =
          (cachedPortal === 'admin' && isPlatformAdmin) ||
          (cachedPortal === 'provider' && hasProviderRecord && !isWorkforce) ||
          (cachedPortal === 'reviewer' && isPanelReviewer) ||
          (cachedPortal === 'organization' && hasOrgUserRecord) ||
          (cachedPortal === 'cogniblend' && hasCogniRoles);

        if (canAccessCached) {
          if (cachedPortal === 'reviewer' && isPendingReviewer) {
            navigate('/reviewer/pending-approval', { replace: true });
            return;
          }
          if (cachedPortal === 'cogniblend') {
            const allCodes: string[] = [
              ...poolRows.flatMap((r) => r.role_codes ?? []),
              ...challengeRows.flatMap((r) => r.role_codes ?? []),
            ];
            navigate(pickCogniLandingRoute(allCodes), { replace: true });
            return;
          }
          navigate(PORTAL_ROUTES[cachedPortal], { replace: true });
          return;
        }
        sessionStorage.removeItem('activePortal');
      }

      // Determine portal by role priority:
      // Admin > Reviewer > Organization > CogniBlend (workforce/cogni) > Provider
      let targetPortal: PortalType = 'provider';
      if (isPlatformAdmin) {
        targetPortal = 'admin';
      } else if (isPanelReviewer) {
        targetPortal = 'reviewer';
      } else if (hasOrgUserRecord) {
        targetPortal = 'organization';
      } else if (isWorkforce || hasCogniRoles) {
        // Workforce users (LC/FC/CU/ER/CR) ALWAYS land in CogniBlend, never provider.
        targetPortal = 'cogniblend';
      } else if (hasProviderRecord) {
        targetPortal = 'provider';
      }

      // Persist for future navigations
      sessionStorage.setItem('activePortal', targetPortal);

      // Handle pending reviewer
      if (targetPortal === 'reviewer' && isPendingReviewer) {
        navigate('/reviewer/pending-approval', { replace: true });
        return;
      }

      if (targetPortal === 'cogniblend') {
        const allCodes: string[] = [
          ...poolRows.flatMap((r) => r.role_codes ?? []),
          ...challengeRows.flatMap((r) => r.role_codes ?? []),
        ];
        navigate(pickCogniLandingRoute(allCodes), { replace: true });
        return;
      }

      navigate(PORTAL_ROUTES[targetPortal], { replace: true });
    };

    determineAndRedirect();
  }, [user, authLoading, navigate, isRedirecting]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
