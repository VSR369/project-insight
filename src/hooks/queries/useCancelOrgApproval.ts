import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { logAuditEvent, handleMutationError } from '@/lib/errorHandler';

/**
 * Centralized hook for cancelling organization approval and resetting participation mode.
 * 
 * This hook:
 * 1. Performs an OPTIMISTIC cache update immediately (before API calls complete)
 * 2. Calls the withdraw-approval-request edge function with clearParticipationMode=true
 * 3. Navigates to /enroll/participation-mode with replace:true
 * 4. Refetches provider data in background to sync final state
 * 
 * This ensures:
 * - No race conditions with stale cache data
 * - Consistent behavior from all cancel entry points
 * - User always lands on MODE screen after cancellation
 */
export function useCancelOrgApprovalAndResetMode() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ 
      providerId,
      enrollmentId,
      withdrawalReason 
    }: { 
      providerId: string;
      enrollmentId?: string;
      withdrawalReason?: string;
    }) => {
      // Step 1: OPTIMISTIC UPDATE - Update cache immediately before API call
      // This prevents any redirect guards from firing based on stale data
      queryClient.setQueryData(['current-provider'], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          participation_mode_id: null,
          organization: oldData.organization ? {
            ...oldData.organization,
            approval_status: 'withdrawn',
            approval_token: null,
            manager_temp_password_hash: null,
            credentials_expire_at: null,
            withdrawn_at: new Date().toISOString(),
            withdrawal_reason: withdrawalReason || 'User cancelled to change participation mode',
          } : null,
        };
      });

      // Step 2: Call edge function (handles both withdrawal + clear mode in one call)
      const { data, error } = await supabase.functions.invoke('withdraw-approval-request', {
        body: {
          providerId,
          enrollmentId,
          withdrawalReason: withdrawalReason || 'User cancelled to change participation mode',
          clearParticipationMode: true,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to withdraw approval request');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to withdraw approval request');
      }

      return data;
    },
    onSuccess: (_data, variables) => {
      // Log audit event for destructive action
      logAuditEvent('ORG_APPROVAL_WITHDRAWN', {
        providerId: variables.providerId,
        enrollmentId: variables.enrollmentId,
        withdrawalReason: variables.withdrawalReason,
        clearParticipationMode: true,
      });

      // Step 3: Navigate IMMEDIATELY to participation mode (with replace to prevent back nav issues)
      navigate('/enroll/participation-mode', { replace: true });
      
      // Step 4: Show success feedback
      toast.success('Request cancelled. Please select a new participation mode.');
      
      // Step 5: Invalidate in background to ensure cache syncs with DB
      // This runs after navigation, so UI already reflects optimistic state
      queryClient.invalidateQueries({ queryKey: ['current-provider'] });
      queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'cancel_org_approval' });
      
      // Rollback optimistic update by refetching
      queryClient.invalidateQueries({ queryKey: ['current-provider'] });
    },
  });
}
