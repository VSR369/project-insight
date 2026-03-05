/**
 * Admin Transfer Request Hooks
 * 
 * Queries and mutations for the admin_transfer_requests table,
 * implementing the formal Primary Admin Transfer Protocol (BR-SOA-010).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CACHE = { staleTime: 30 * 1000, gcTime: 5 * 60 * 1000 };

// ============================================================
// Pending Transfer Request Query
// ============================================================
export function usePendingTransferRequest(organizationId?: string) {
  return useQuery({
    queryKey: ['pending_transfer_request', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('admin_transfer_requests')
        .select('id, to_admin_email, to_admin_name, status, requested_at, created_at')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!organizationId,
    ...CACHE,
  });
}

// ============================================================
// Request Admin Transfer Mutation
// ============================================================
export function useRequestAdminTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      from_admin_id: string;
      to_admin_email: string;
      to_admin_name?: string;
    }) => {
      const { data, error } = await supabase
        .from('admin_transfer_requests')
        .insert({
          organization_id: params.organization_id,
          from_admin_id: params.from_admin_id,
          to_admin_email: params.to_admin_email,
          to_admin_name: params.to_admin_name ?? null,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending_transfer_request', variables.organization_id] });
      toast.success('Admin transfer request submitted for Platform Admin approval');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit transfer request: ${error.message}`);
    },
  });
}

// ============================================================
// Cancel Transfer Request Mutation
// ============================================================
export function useCancelTransferRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; organization_id: string }) => {
      const { error } = await supabase
        .from('admin_transfer_requests')
        .update({ status: 'cancelled' })
        .eq('id', params.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending_transfer_request', variables.organization_id] });
      toast.success('Transfer request cancelled');
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel request: ${error.message}`);
    },
  });
}
