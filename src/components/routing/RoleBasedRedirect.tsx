import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type PortalType = 'admin' | 'provider' | 'reviewer';

const PORTAL_ROUTES: Record<PortalType, string> = {
  admin: '/admin',
  provider: '/dashboard',
  reviewer: '/reviewer/dashboard',
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
        navigate('/login', { replace: true });
        return;
      }

      // Prevent duplicate redirects
      if (isRedirecting) return;
      setIsRedirecting(true);

      // Check sessionStorage for cached portal preference
      const cachedPortal = sessionStorage.getItem('activePortal') as PortalType | null;

      // Fetch roles and records to validate cached portal or determine new one
      const [rolesResult, providerResult, reviewerResult] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        supabase.from('solution_providers').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('panel_reviewers').select('id, approval_status').eq('user_id', user.id).maybeSingle()
      ]);

      const roles = rolesResult.data;
      const isPlatformAdmin = roles?.some(r => r.role === 'platform_admin');
      const isPanelReviewer = roles?.some(r => r.role === 'panel_reviewer') || !!reviewerResult.data;
      const isPendingReviewer = reviewerResult.data?.approval_status === 'pending';
      const hasProviderRecord = !!providerResult.data;

      // Validate cached portal - user must still have access
      if (cachedPortal) {
        const canAccessCached =
          (cachedPortal === 'admin' && isPlatformAdmin) ||
          (cachedPortal === 'provider' && hasProviderRecord) ||
          (cachedPortal === 'reviewer' && isPanelReviewer);

        if (canAccessCached) {
          // Handle pending reviewer special case
          if (cachedPortal === 'reviewer' && isPendingReviewer) {
            navigate('/reviewer/pending-approval', { replace: true });
            return;
          }
          navigate(PORTAL_ROUTES[cachedPortal], { replace: true });
          return;
        }
        // Cached portal no longer valid - clear it
        sessionStorage.removeItem('activePortal');
      }

      // Determine portal by role priority: Admin > Reviewer > Provider
      let targetPortal: PortalType = 'provider';
      if (isPlatformAdmin) {
        targetPortal = 'admin';
      } else if (isPanelReviewer) {
        targetPortal = 'reviewer';
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
