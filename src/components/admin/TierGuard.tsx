/**
 * TierGuard — Route-level protection for admin tier hierarchy.
 * Config-aware: reads platform_admin_tier_depth to adapt gating.
 * - Depth 1: All guards pass (everyone is Supervisor-level)
 * - Depth 2: senior_admin requirements pass for all, admin routes accessible to senior+
 * - Depth 3: Full hierarchy (current behavior)
 */

import { Navigate } from 'react-router-dom';
import { useAdminTier, type AdminTier } from '@/hooks/useAdminTier';
import { usePlatformTierDepth } from '@/hooks/queries/useTierDepthConfig';
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
  const { tier, isLoading: tierLoading } = useAdminTier();
  const { depth, isLoading: depthLoading } = usePlatformTierDepth();
  const toastShownRef = useRef(false);

  const isLoading = tierLoading || depthLoading;

  // Compute effective access based on tier depth config
  const hasAccess = (() => {
    if (!tier) return false;

    // Depth 1: Everyone is effectively Supervisor — all guards pass
    if (depth === 1) return true;

    // Depth 2: Only Supervisor + Senior Admin exist.
    // Routes requiring 'admin' tier → accessible (senior_admin rank >= admin rank)
    // Routes requiring 'senior_admin' → accessible to senior_admin+
    // Routes requiring 'supervisor' → only supervisor
    // This is already handled by the rank system — no special logic needed.

    // Depth 3 (default): Full hierarchy
    return TIER_RANK[tier] >= TIER_RANK[requiredTier];
  })();

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
