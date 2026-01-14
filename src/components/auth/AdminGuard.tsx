import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AdminGuardProps {
  children: ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: rolesLoading } = useUserRoles();

  // Show loading while checking auth and roles
  if (authLoading || rolesLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to dashboard if not admin
  if (!isAdmin) {
    toast.error('Access denied. Administrator privileges required.');
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
