/**
 * useUpdateDomainWeights — atomic domain weight save via update_domain_weights RPC (GAP-3 fix).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getClientIP } from '@/lib/getClientIP';
import { toast } from 'sonner';

interface UpdateDomainWeightsParams {
  l1: number;
  l2: number;
  l3: number;
  changeReason?: string;
}

interface UpdateDomainWeightsResult {
  success: boolean;
  l1?: number;
  l2?: number;
  l3?: number;
  error?: string;
  detail?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  DOMAIN_WEIGHT_SUM_VIOLATION: 'Domain weights must sum to 100',
  OUT_OF_RANGE: 'Each weight must be between 0 and 100',
  PERMISSION_DENIED: 'Supervisor access required',
};

export function useUpdateDomainWeights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ l1, l2, l3, changeReason }: UpdateDomainWeightsParams) => {
      const ipAddress = await getClientIP();

      const { data, error } = await supabase.rpc('update_domain_weights', {
        p_l1: l1,
        p_l2: l2,
        p_l3: l3,
        p_change_reason: changeReason ?? null,
        p_ip_address: ipAddress || null,
      });

      if (error) throw new Error(error.message);

      const result = data as unknown as UpdateDomainWeightsResult;
      if (!result.success) {
        const friendlyMsg = ERROR_MESSAGES[result.error ?? ''] ?? result.detail ?? 'Update failed';
        throw new Error(friendlyMsg);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mpa-config'] });
      queryClient.invalidateQueries({ queryKey: ['config-audit'] });
      toast.success('Domain weights updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update weights: ${error.message}`);
    },
  });
}
