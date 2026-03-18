/**
 * useRoleReadinessGate — Pre-creation readiness check for CogniBlend.
 *
 * Checks `role_readiness_cache` for the user's org + model.
 * When NOT_READY, triggers `role-readiness-notify` Edge Function
 * to alert Platform Admin (MP) or SOA (AGG).
 *
 * Returns { isReady, isLoading, missingRoles, adminContact, orgId, model }
 */

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useOrgModelContext } from '@/hooks/queries/useSolutionRequestContext';

interface ReadinessResult {
  isReady: boolean;
  isLoading: boolean;
  missingRoles: string[];
  adminContact: { name: string; email: string } | null;
  orgId: string;
  model: string;
}

export function useRoleReadinessGate(): ReadinessResult {
  const { data: currentOrg } = useCurrentOrg();
  const { data: orgContext, isLoading: orgLoading } = useOrgModelContext();
  const notifiedRef = useRef(false);

  const orgId = currentOrg?.organizationId ?? '';
  const model = orgContext?.operatingModel ?? '';

  const { data, isLoading: cacheLoading } = useQuery({
    queryKey: ['role-readiness-gate', orgId, model],
    queryFn: async () => {
      if (!orgId) return null;
      let query = supabase
        .from('role_readiness_cache')
        .select('overall_status, missing_roles, responsible_admin_contact')
        .eq('org_id', orgId);
      if (model) query = query.eq('engagement_model', model);
      const { data: rows, error } = await query.limit(1);
      if (error) throw new Error(error.message);
      return rows?.[0] ?? null;
    },
    enabled: !!orgId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const isLoading = orgLoading || cacheLoading;
  const isReady = !data || data.overall_status === 'ready';
  const missingRoles = (data?.missing_roles as string[]) ?? [];
  const adminContact = data?.responsible_admin_contact
    ? {
        name: (data.responsible_admin_contact as any)?.name ?? '',
        email: (data.responsible_admin_contact as any)?.email ?? '',
      }
    : null;

  // Trigger role-readiness-notify edge function once when NOT_READY
  useEffect(() => {
    if (isLoading || isReady || notifiedRef.current || !orgId || !model) return;
    notifiedRef.current = true;

    supabase.functions.invoke('role-readiness-notify', {
      body: {
        org_id: orgId,
        engagement_model: model,
        transition_type: 'not_ready',
        missing_roles: missingRoles,
        source: 'cogniblend_gate',
      },
    }).catch(() => {
      // non-blocking — notification delivery is best-effort
    });
  }, [isLoading, isReady, orgId, model, missingRoles]);

  return { isReady, isLoading, missingRoles, adminContact, orgId, model };
}
