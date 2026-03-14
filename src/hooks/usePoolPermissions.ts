/**
 * usePoolPermissions — Returns write access flag based on permission matrix (BR-PP-003)
 * Uses hasPermission('marketplace.manage_pool') instead of tier-based checks.
 * Basic Admin: read-only (canWrite = false)
 * Supervisor + Senior Admin: full CRUD (canWrite = true)
 */

import { useAdminTier } from "@/hooks/useAdminTier";

interface PoolPermissions {
  canWrite: boolean;
  isLoading: boolean;
}

export function usePoolPermissions(): PoolPermissions {
  const { hasPermission, isLoading } = useAdminTier();
  return {
    canWrite: hasPermission('marketplace.manage_pool'),
    isLoading,
  };
}
