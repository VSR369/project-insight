/**
 * PermissionGuard — Route-level protection using the dynamic permission matrix.
 * Replaces TierGuard for all admin routes. Checks hasPermission() against
 * the tier_permissions table (source of truth) instead of static tier hierarchy.
 *
 * Supports single key or array (any match = access granted).
 */

import { Navigate } from 'react-router-dom';
import { useAdminTier } from '@/hooks/useAdminTier';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PermissionGuardProps {
  /** Single permission key or array of keys (OR logic — any match grants access) */
  permissionKey: string | string[];
  children: React.ReactNode;
}

export function PermissionGuard({ permissionKey, children }: PermissionGuardProps) {
  const { hasPermission, isLoading } = useAdminTier();
  const toastShownRef = useRef(false);

  const keys = Array.isArray(permissionKey) ? permissionKey : [permissionKey];
  const hasAccess = keys.some((key) => hasPermission(key));

  useEffect(() => {
    if (!isLoading && !hasAccess && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.error('Permission denied: you do not have access to this section');
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
