/**
 * usePoolPermissions — Returns write access flag based on admin tier (BR-PP-003)
 * Basic Admin: read-only (canWrite = false)
 * Supervisor + Senior Admin: full CRUD (canWrite = true)
 */

import { useAdminTier } from "@/hooks/useAdminTier";

interface PoolPermissions {
  canWrite: boolean;
  isLoading: boolean;
}

export function usePoolPermissions(): PoolPermissions {
  const { tier, isSupervisor, isSeniorAdmin, isLoading } = useAdminTier();
  return {
    canWrite: isSupervisor || isSeniorAdmin,
    isLoading,
  };
}
