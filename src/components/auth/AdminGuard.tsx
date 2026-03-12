import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { checkSessionType } from '@/lib/sessionIsolation';
import { MfaGuard } from '@/components/auth/MfaGuard';

interface AdminGuardProps {
  children: ReactNode;
}

// Inner component that uses auth hooks safely inside AuthGuard
function AdminRoleCheck({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isAdmin, isLoading: rolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isOrgOnly, setIsOrgOnly] = useState(false);

  // GAP 4: Block org-only admins from platform routes
  useEffect(() => {
    if (!user || rolesLoading) return;
    if (isAdmin) {
      setSessionChecked(true);
      return;
    }
    // Not a platform admin — check if they're an org admin
    checkSessionType(user.id).then((type) => {
      if (type === 'org_admin') {
        setIsOrgOnly(true);
      }
      setSessionChecked(true);
    });
  }, [user, rolesLoading, isAdmin]);

  // Show loading while checking roles
  if (rolesLoading || (!sessionChecked && !isAdmin)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect org-only users to org portal
  if (isOrgOnly) {
    toast.error('Please use the organization portal.');
    return <Navigate to="/org/dashboard" replace />;
  }

  // Redirect to dashboard if not admin
  if (!isAdmin) {
    toast.error('Access denied. Administrator privileges required.');
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function AdminGuard({ children }: AdminGuardProps) {
  // Wrap with AuthGuard first, then MfaGuard for admin-tier MFA enforcement (TS §0.3)
  return (
    <AuthGuard>
      <MfaGuard requireMfa={true}>
        <AdminRoleCheck>{children}</AdminRoleCheck>
      </MfaGuard>
    </AuthGuard>
  );
}
