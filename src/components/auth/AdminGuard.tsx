import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AdminGuardProps {
  children: ReactNode;
}

// Inner component that uses auth hooks safely inside AuthGuard
function AdminRoleCheck({ children }: { children: ReactNode }) {
  const { isAdmin, isLoading: rolesLoading } = useUserRoles();

  // Show loading while checking roles
  if (rolesLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to dashboard if not admin
  if (!isAdmin) {
    toast.error('Access denied. Administrator privileges required.');
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function AdminGuard({ children }: AdminGuardProps) {
  // Wrap with AuthGuard first to ensure auth context is valid
  return (
    <AuthGuard>
      <AdminRoleCheck>{children}</AdminRoleCheck>
    </AuthGuard>
  );
}
