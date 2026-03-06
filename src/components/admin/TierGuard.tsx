/**
 * TierGuard — Route-level protection for admin tier hierarchy.
 * Redirects to /admin with a toast if the user's tier is insufficient.
 */

import { Navigate } from 'react-router-dom';
import { useAdminTier, type AdminTier } from '@/hooks/useAdminTier';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const TIER_RANK: Record<AdminTier, number> = {
  admin: 1,
  senior_admin: 2,
  supervisor: 3,
};

interface TierGuardProps {
  /** Minimum tier required to access this route */
  requiredTier: AdminTier;
  children: React.ReactNode;
}

export function TierGuard({ requiredTier, children }: TierGuardProps) {
  const { tier, isLoading } = useAdminTier();
  const toastShownRef = useRef(false);

  const hasAccess = tier ? TIER_RANK[tier] >= TIER_RANK[requiredTier] : false;

  useEffect(() => {
    if (!isLoading && !hasAccess && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.error('Permission denied: insufficient admin tier');
    }
  }, [isLoading, hasAccess]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
