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

interface WithdrawParams {
  providerId: string;
  enrollmentId?: string;
  withdrawalReason?: string;
  clearParticipationMode?: boolean;
}

export function useWithdrawApprovalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: WithdrawParams) => {
      const { data, error } = await supabase.functions.invoke('withdraw-approval-request', {
        body: params,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to withdraw request');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-provider'] });
      queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
      toast.success('Approval request withdrawn. You can now update your organization details.');
    },
    onError: (error: Error) => {
      console.error('Error withdrawing approval request:', error);
      toast.error(error.message || 'Failed to withdraw approval request');
    },
  });
}

// Helper to check if organization needs approval
export function checkOrgApprovalStatus(organization: any): {
  needsApproval: boolean;
  status: 'pending' | 'approved' | 'declined' | 'expired' | 'withdrawn' | null;
  canContinue: boolean;
} {
  if (!organization) {
    return { needsApproval: false, status: null, canContinue: true };
  }

  const status = organization.approval_status as 'pending' | 'approved' | 'declined' | 'expired' | 'withdrawn' | null;

  return {
    needsApproval: true,
    status: status || 'pending',
    // Can continue if approved OR withdrawn (withdrawn allows re-entry)
    canContinue: status === 'approved' || status === 'withdrawn',
  };
}
