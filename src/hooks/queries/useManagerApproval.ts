import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

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
      handleMutationError(error, { operation: 'sendManagerCredentials' }, true);
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
      handleMutationError(error, { operation: 'resendManagerCredentials' }, true);
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
      handleMutationError(error, { operation: 'withdrawApprovalRequest' }, true);
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

interface ManagerDecisionParams {
  orgId: string;
  approvalToken: string;
  decision: 'approve' | 'decline';
  declineReason?: string;
}

export function useManagerDecision() {
  return useMutation({
    mutationFn: async (params: ManagerDecisionParams) => {
      const { data: result, error: fnError } = await supabase.functions.invoke(
        'process-manager-decision',
        {
          body: {
            orgId: params.orgId,
            approvalToken: params.approvalToken,
            decision: params.decision,
            declineReason: params.decision === 'decline' ? params.declineReason : undefined,
          },
        },
      );
      if (fnError) throw new Error(fnError.message);
      if (!result?.success) throw new Error(result?.error || 'Failed to process decision');
      return { success: true };
    },
    onError: (error) => {
      handleMutationError(error, { operation: 'process_manager_decision' });
    },
  });
}
