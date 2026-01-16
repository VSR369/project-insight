import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SendCredentialsParams {
  providerId: string;
  providerName: string;
  providerEmail: string;
  providerDesignation?: string;
  orgName: string;
  managerEmail: string;
  managerName: string;
}

export function useSendManagerCredentials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendCredentialsParams) => {
      const { data, error } = await supabase.functions.invoke('send-manager-credentials', {
        body: params,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to send credentials');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-provider'] });
      toast.success('Approval request sent to your manager');
    },
    onError: (error: Error) => {
      console.error('Error sending manager credentials:', error);
      toast.error(error.message || 'Failed to send approval request');
    },
  });
}

export function useResendManagerCredentials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendCredentialsParams) => {
      const { data, error } = await supabase.functions.invoke('send-manager-credentials', {
        body: params,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to resend credentials');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-provider'] });
      toast.success('Approval request resent to your manager');
    },
    onError: (error: Error) => {
      console.error('Error resending manager credentials:', error);
      toast.error(error.message || 'Failed to resend approval request');
    },
  });
}

// Helper to check if organization needs approval
export function checkOrgApprovalStatus(organization: any): {
  needsApproval: boolean;
  status: 'pending' | 'approved' | 'declined' | 'expired' | null;
  canContinue: boolean;
} {
  if (!organization) {
    return { needsApproval: false, status: null, canContinue: true };
  }

  const status = organization.approval_status as 'pending' | 'approved' | 'declined' | 'expired' | null;

  return {
    needsApproval: true,
    status: status || 'pending',
    canContinue: status === 'approved',
  };
}
