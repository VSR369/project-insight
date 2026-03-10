/**
 * useCurrentAdminTier — Resolves current user's seeking org admin tier
 * (PRIMARY vs DELEGATED) and their domain_scope for scoped access control.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgContext } from '@/contexts/OrgContext';
import type { Json } from '@/integrations/supabase/types';

export type SeekingAdminTier = 'PRIMARY' | 'DELEGATED';

interface CurrentAdminTierResult {
  adminTier: SeekingAdminTier | null;
  domainScope: Json | null;
  isPrimary: boolean;
  isDelegated: boolean;
  isLoading: boolean;
}

export function useCurrentAdminTier(): CurrentAdminTierResult {
  const { organizationId } = useOrgContext();

  const { data, isLoading } = useQuery({
    queryKey: ['current-seeking-admin-tier', organizationId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: admin, error } = await supabase
        .from('seeking_org_admins')
        .select('admin_tier, domain_scope')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw new Error(error.message);
      return admin;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const adminTier = (data?.admin_tier as SeekingAdminTier) ?? null;

  return {
    adminTier,
    domainScope: data?.domain_scope ?? null,
    isPrimary: adminTier === 'PRIMARY',
    isDelegated: adminTier === 'DELEGATED',
    isLoading,
  };
}
