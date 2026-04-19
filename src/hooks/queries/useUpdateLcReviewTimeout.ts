/**
 * useUpdateLcReviewTimeout — Mutation hook for updating
 * `md_governance_mode_config.lc_review_timeout_days` for a given mode.
 *
 * Only STRUCTURED and CONTROLLED governance modes are valid targets;
 * the hook performs no client-side mode validation (relies on the
 * parent component to gate UI). RLS enforces admin authority on the
 * server.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { withUpdatedBy } from '@/lib/auditFields';
import { handleMutationError } from '@/lib/errorHandler';

interface UpdateTimeoutInput {
  governanceMode: string;
  days: number;
}

export function useUpdateLcReviewTimeout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ governanceMode, days }: UpdateTimeoutInput) => {
      const updates = await withUpdatedBy({ lc_review_timeout_days: days });
      const { error } = await supabase
        .from('md_governance_mode_config')
        .update(updates as never)
        .eq('governance_mode', governanceMode);
      if (error) throw new Error(error.message);
      return { governanceMode, days };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['governance-mode-config'] });
      toast.success(
        `LC review timeout for ${result.governanceMode} set to ${result.days} business day${result.days === 1 ? '' : 's'}`,
      );
    },
    onError: (e: Error) =>
      handleMutationError(e, {
        operation: 'update_lc_review_timeout',
        component: 'useUpdateLcReviewTimeout',
      }),
  });
}
