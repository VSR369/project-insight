/**
 * Hook for MOD-M-05: Bulk Reassign Confirmation Modal
 * Fetches Under_Verification verifications for an admin
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BulkReassignPreviewItem {
  id: string;
  organization_id: string;
  status: string;
  sla_start_at: string | null;
  sla_duration_seconds: number | null;
  sla_breach_tier: string | null;
  organization_name: string;
}

export function useBulkReassignPreview(adminId: string | undefined) {
  return useQuery({
    queryKey: ['bulk-reassign-preview', adminId],
    queryFn: async () => {
      if (!adminId) return [];

      const { data: verifications, error } = await supabase
        .from('platform_admin_verifications')
        .select('id, organization_id, status, sla_start_at, sla_duration_seconds, sla_breach_tier')
        .eq('assigned_admin_id', adminId)
        .eq('status', 'Under_Verification');

      if (error) throw new Error(error.message);
      if (!verifications || verifications.length === 0) return [];

      const orgIds = [...new Set(verifications.map(v => v.organization_id))];
      const { data: orgs } = await supabase
        .from('seeker_organizations')
        .select('id, organization_name')
        .in('id', orgIds);

      const orgMap = new Map((orgs ?? []).map(o => [o.id, o.organization_name]));

      return verifications.map(v => ({
        ...v,
        organization_name: orgMap.get(v.organization_id) ?? 'Unknown',
      })) as BulkReassignPreviewItem[];
    },
    enabled: !!adminId,
    staleTime: 10_000,
  });
}
