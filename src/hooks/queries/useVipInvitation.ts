/**
 * useVipInvitation — CRUD hook for VIP invitation management.
 * Spec 10.1: VIP invitation lifecycle (create, accept, expire).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { toast } from 'sonner';

interface VipInvitation {
  id: string;
  invitee_email: string;
  invitee_name: string | null;
  status: string;
  invitation_token: string;
  industry_segment_id: string | null;
  personal_message: string | null;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  provider_id: string | null;
}

const VIP_SELECT = [
  'id', 'invitee_email', 'invitee_name', 'status', 'invitation_token',
  'industry_segment_id', 'personal_message', 'expires_at', 'created_at',
  'accepted_at', 'provider_id',
].join(', ');

export function useVipInvitations(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['vip-invitations', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vip_invitations')
        .select(VIP_SELECT)
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as VipInvitation[];
    },
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useVipInvitationByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['vip-invitation-token', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vip_invitations')
        .select(VIP_SELECT)
        .eq('invitation_token', token!)
        .eq('status', 'pending')
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as VipInvitation;
    },
    enabled: !!token,
  });
}

export function useAcceptVipInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invitationId, providerId }: { invitationId: string; providerId: string }) => {
      const { error } = await supabase
        .from('vip_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          provider_id: providerId,
        })
        .eq('id', invitationId)
        .eq('status', 'pending');
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vip-invitations'] });
      toast.success('VIP invitation accepted');
    },
    onError: (err) => handleMutationError(err, { operation: 'accept_vip_invitation' }),
  });
}
