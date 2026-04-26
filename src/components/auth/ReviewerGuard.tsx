import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReviewerGuardProps {
  children: ReactNode;
}

/**
 * ReviewerGuard — Gates Expert Reviewer surfaces.
 *
 * Legal v3: PWA gate removed from this guard. Expert Reviewer role agreement
 * (PWA family) is signed once at role grant via RoleLegalGate at first login,
 * not on every workspace entry.
 */
export function ReviewerGuard({ children }: ReviewerGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { isReviewer, isLoading: rolesLoading } = useUserRoles();

  if (authLoading || rolesLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isReviewer) {
    toast.error('Access denied. Panel reviewer privileges required.');
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
