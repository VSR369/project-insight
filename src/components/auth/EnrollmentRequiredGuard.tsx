/**
 * Enrollment Required Guard
 * 
 * Route guard that ensures an active enrollment exists before accessing wizard pages.
 * Redirects to Dashboard if no enrollment is selected.
 */

import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useOptionalEnrollmentContext } from '@/contexts/EnrollmentContext';
import { toast } from 'sonner';

interface EnrollmentRequiredGuardProps {
  children: ReactNode;
}

export function EnrollmentRequiredGuard({ children }: EnrollmentRequiredGuardProps) {
  const navigate = useNavigate();
  
  // Use optional hook to prevent crashes during ErrorBoundary recovery
  const enrollmentContext = useOptionalEnrollmentContext();
  
  // Extract values with safe defaults for hook dependencies
  const activeEnrollmentId = enrollmentContext?.activeEnrollmentId ?? null;
  const isLoading = enrollmentContext?.isLoading ?? true;
  const contextReady = enrollmentContext?.contextReady ?? false;

  useEffect(() => {
    // Don't take any action until context is available and fully ready
    // The loading spinner (rendered below) handles the waiting state
    if (!enrollmentContext || !contextReady) {
      return;
    }
    
    // Context is ready - now check if enrollment exists
    if (!activeEnrollmentId) {
      toast.info('Please select or add an industry to begin enrollment.');
      navigate('/dashboard', { replace: true });
    }
  }, [enrollmentContext, contextReady, activeEnrollmentId, navigate]);

  // If context isn't ready yet (ErrorBoundary recovery, initial render), show loading briefly
  // The useEffect above will redirect if context remains unavailable
  if (!enrollmentContext) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show loading while checking enrollment OR while context is stabilizing
  // This prevents wizard from rendering with stale data during portal switches
  if (isLoading || !contextReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no enrollment, show loading while redirecting
  if (!activeEnrollmentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
