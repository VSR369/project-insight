/**
 * useAdminExpertiseScope — Returns the current platform admin's expertise
 * scope filters or a bypass flag for Supervisors.
 *
 * Supervisors bypass all scope checks (global access).
 * Senior/Basic Admins are scoped to their profile's expertise arrays.
 */

import { useAdminTier } from '@/hooks/useAdminTier';
import { useCurrentAdminProfile } from '@/hooks/queries/useCurrentAdminProfile';

interface ExpertiseScopeResult {
  /** True when scope checks should be skipped (Supervisor) */
  isScopeBypassed: boolean;
  /** Industry segment UUIDs the admin is scoped to (empty if bypassed) */
  industryScope: string[];
  /** Country UUIDs the admin is scoped to (empty if bypassed) */
  countryScope: string[];
  /** Organization type UUIDs the admin is scoped to (empty if bypassed) */
  orgTypeScope: string[];
  isLoading: boolean;
}

export function useAdminExpertiseScope(): ExpertiseScopeResult {
  const { tier, isLoading: tierLoading } = useAdminTier();
  const { data: profile, isLoading: profileLoading } = useCurrentAdminProfile();

  const isScopeBypassed = tier === 'supervisor';

  return {
    isScopeBypassed,
    industryScope: isScopeBypassed ? [] : (profile?.industry_expertise as string[] ?? []),
    countryScope: isScopeBypassed ? [] : (profile?.country_region_expertise as string[] ?? []),
    orgTypeScope: isScopeBypassed ? [] : (profile?.org_type_expertise as string[] ?? []),
    isLoading: tierLoading || profileLoading,
  };
}
