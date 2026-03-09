/**
 * useTierDepthConfig — Config-driven hooks for admin tier depth and org delegation.
 * Reads from md_mpa_config via existing useMpaConfigValue pattern.
 */

import { useMpaConfigValue } from './useMpaConfig';

export type TierDepth = 1 | 2 | 3;

/**
 * Returns the active platform admin tier depth (1, 2, or 3).
 * - 1: Supervisor only (single-person operation)
 * - 2: Supervisor + Senior Admin
 * - 3: Full hierarchy (Supervisor + Senior Admin + Admin)
 */
export function usePlatformTierDepth(): { depth: TierDepth; isLoading: boolean } {
  const { data, isLoading } = useMpaConfigValue('platform_admin_tier_depth');
  const parsed = data ? parseInt(data, 10) : 3;
  const depth = ([1, 2, 3].includes(parsed) ? parsed : 3) as TierDepth;
  return { depth, isLoading };
}

/**
 * Returns whether org admin delegation is enabled.
 * When false, only PRIMARY admins exist — delegation UI is hidden.
 */
export function useOrgDelegationEnabled(): { enabled: boolean; isLoading: boolean } {
  const { data, isLoading } = useMpaConfigValue('org_admin_delegation_enabled');
  const enabled = data !== 'false'; // default true
  return { enabled, isLoading };
}
