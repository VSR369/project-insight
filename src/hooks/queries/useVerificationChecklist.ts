/**
 * useVerificationChecklist — persist V2/V5 manual confirmation state to DB.
 * Stores JSONB in seeker_organizations.verification_checklist_results.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { withUpdatedBy } from '@/lib/auditFields';

export interface ChecklistResults {
  v2_confirmed?: boolean;
  v5_confirmed?: boolean;
  [key: string]: boolean | undefined;
}

export function useVerificationChecklistResults(orgId: string | undefined) {
  return useQuery({
    queryKey: ['verification-checklist', orgId],
    queryFn: async () => {
      if (!orgId) return {} as ChecklistResults;
      const { data, error } = await supabase
        .from('seeker_organizations')
        .select('verification_checklist_results')
        .eq('id', orgId)
        .single();
      if (error) throw new Error(error.message);
      return (data?.verification_checklist_results as ChecklistResults) ?? {};
    },
    enabled: !!orgId,
    staleTime: 30_000,
    gcTime: 300_000,
  });
}

export function useSaveVerificationChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, results }: { orgId: string; results: ChecklistResults }) => {
      const updateData = await withUpdatedBy({
        verification_checklist_results: results as any,
        updated_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('seeker_organizations')
        .update(updateData)
        .eq('id', orgId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['verification-checklist', variables.orgId] });
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'save_verification_checklist', component: 'seeker-org-approvals' }),
  });
}
