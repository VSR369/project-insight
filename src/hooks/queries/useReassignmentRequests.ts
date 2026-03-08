/**
 * React Query hook for MOD-06: Reassignment Requests Inbox
 * Realtime subscription on reassignment_requests INSERT
 */
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { toast } from 'sonner';

export interface ReassignmentRequest {
  id: string;
  verification_id: string;
  requesting_admin_id: string;
  suggested_admin_id: string | null;
  reason: string;
  status: string;
  actioned_by_id: string | null;
  actioned_at: string | null;
  decline_reason: string | null;
  created_at: string;
  // Joined data
  requesting_admin?: { full_name: string; availability_status: string };
  suggested_admin?: { full_name: string } | null;
  verification?: {
    id: string;
    organization_id: string;
    status: string;
    sla_start_at: string | null;
    sla_duration_seconds: number | null;
    sla_breach_tier: string | null;
    reassignment_count: number;
    organization?: {
      organization_name: string;
      country_id: string | null;
    };
  };
}

export function useReassignmentRequests(status: 'PENDING' | 'APPROVED' | 'DECLINED' = 'PENDING') {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['reassignment-requests', status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reassignment_requests')
        .select(`
          id, verification_id, requesting_admin_id, suggested_admin_id,
          reason, status, actioned_by_id, actioned_at, decline_reason, created_at
        `)
        .eq('status', status)
        .order('created_at', { ascending: status === 'PENDING' });

      if (error) throw new Error(error.message);
      if (!data || data.length === 0) return [] as ReassignmentRequest[];

      // Fetch related data
      const verificationIds = [...new Set(data.map(r => r.verification_id))];
      const adminIds = [...new Set([
        ...data.map(r => r.requesting_admin_id),
        ...data.filter(r => r.suggested_admin_id).map(r => r.suggested_admin_id!),
      ])];

      const [verificationsRes, adminsRes] = await Promise.all([
        supabase
          .from('platform_admin_verifications')
          .select('id, organization_id, status, sla_start_at, sla_duration_seconds, sla_breach_tier, reassignment_count')
          .in('id', verificationIds),
        supabase
          .from('platform_admin_profiles')
          .select('id, full_name, availability_status')
          .in('id', adminIds),
      ]);

      const verificationMap = new Map((verificationsRes.data ?? []).map(v => [v.id, v]));
      const adminMap = new Map((adminsRes.data ?? []).map(a => [a.id, a]));

      // Fetch org names
      const orgIds = [...new Set((verificationsRes.data ?? []).map(v => v.organization_id).filter(Boolean))];
      let orgMap = new Map<string, { organization_name: string; country_id: string | null }>();
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from('seeker_organizations')
          .select('id, organization_name, country_id')
          .in('id', orgIds);
        orgMap = new Map((orgs ?? []).map(o => [o.id, { organization_name: o.organization_name, country_id: o.country_id }]));
      }

      return data.map(r => {
        const v = verificationMap.get(r.verification_id);
        return {
          ...r,
          requesting_admin: adminMap.get(r.requesting_admin_id),
          suggested_admin: r.suggested_admin_id ? adminMap.get(r.suggested_admin_id) : null,
          verification: v ? {
            ...v,
            organization: orgMap.get(v.organization_id),
          } : undefined,
        } as ReassignmentRequest;
      });
    },
    staleTime: 30_000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('reassignment_requests_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reassignment_requests',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['reassignment-requests'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

/** Count of PENDING reassignment requests (for sidebar badge) */
export function usePendingReassignmentCount() {
  return useQuery({
    queryKey: ['reassignment-requests', 'pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('reassignment_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDING');
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    staleTime: 30_000,
  });
}

/** Decline a reassignment request */
export function useDeclineReassignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, declineReason }: { requestId: string; declineReason: string }) => {
      const { data: profile } = await supabase
        .from('platform_admin_profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single();

      const { error } = await supabase
        .from('reassignment_requests')
        .update({
          status: 'DECLINED',
          decline_reason: declineReason,
          actioned_by_id: profile?.id,
          actioned_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reassignment-requests'] });
      toast.success('Reassignment request declined');
    },
    onError: (err: Error) => handleMutationError(err, { operation: 'decline_reassignment' }),
  });
}
