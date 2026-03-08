/**
 * useUpdateConfig — mutation hook for update_config_param RPC (API-07-05).
 * Calls server-side RPC with full validation (type, range, sum, ordering).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getClientIP } from '@/lib/getClientIP';
import { toast } from 'sonner';

interface UpdateConfigParams {
  paramKey: string;
  newValue: string | null;
  changeReason?: string;
}

interface UpdateConfigResult {
  success: boolean;
  param_key?: string;
  new_value?: string | null;
  error?: string;
  detail?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  DOMAIN_WEIGHT_SUM_VIOLATION: 'Domain weights must sum to 100',
  SLA_TIER_ORDER_VIOLATION: 'SLA thresholds must satisfy Tier 1 < Tier 2 < Tier 3',
  INVALID_REFERENCE: 'Referenced admin profile not found',
  BELOW_MINIMUM: 'Value is below the minimum allowed',
  ABOVE_MAXIMUM: 'Value exceeds the maximum allowed',
  INVALID_TYPE: 'Invalid value type',
  PARAM_NOT_FOUND: 'Parameter not found',
  PERMISSION_DENIED: 'Supervisor access required',
};

export function useUpdateConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ paramKey, newValue, changeReason }: UpdateConfigParams) => {
      const ipAddress = await getClientIP();

      const { data, error } = await supabase.rpc('update_config_param', {
        p_param_key: paramKey,
        p_new_value: newValue ?? '',
        p_change_reason: changeReason ?? null,
        p_ip_address: ipAddress || null,
      });

      if (error) throw new Error(error.message);

      const result = data as unknown as UpdateConfigResult;
      if (!result.success) {
        const friendlyMsg = ERROR_MESSAGES[result.error ?? ''] ?? result.detail ?? 'Update failed';
        throw new Error(friendlyMsg);
      }

      return result;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mpa-config'] });
      queryClient.invalidateQueries({ queryKey: ['config-audit'] });
      toast.success(`Parameter "${variables.paramKey}" updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}
