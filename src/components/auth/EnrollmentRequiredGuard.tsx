/**
 * Enrollment Required Guard
 * 
 * Route guard that ensures an active enrollment exists before accessing wizard pages.
 * Redirects to Dashboard if no enrollment is selected.
 */

import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';
import { toast } from 'sonner';

interface EnrollmentRequiredGuardProps {
  children: ReactNode;
}

export function EnrollmentRequiredGuard({ children }: EnrollmentRequiredGuardProps) {
  const navigate = useNavigate();
  const { activeEnrollmentId, isLoading } = useEnrollmentContext();

  useEffect(() => {
    if (!isLoading && !activeEnrollmentId) {
      toast.info('Please select or add an industry to begin enrollment.');
      navigate('/dashboard', { replace: true });
    }
  }, [isLoading, activeEnrollmentId, navigate]);

  // Show loading while checking enrollment
  if (isLoading) {
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
