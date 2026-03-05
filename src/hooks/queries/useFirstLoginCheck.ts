/**
 * useFirstLoginCheck — Detects if org is 'verified' but not yet 'active'.
 * On T&C acceptance, transitions org to 'active'.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withUpdatedBy } from '@/lib/auditFields';

export function useActivateOrgOnTcAcceptance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, tcVersion }: { orgId: string; tcVersion: string }) => {
      const updateData = await withUpdatedBy({
        verification_status: 'active' as any,
        tc_version_accepted: tcVersion,
        updated_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('seeker_organizations')
        .update(updateData)
        .eq('id', orgId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-profile'] });
      queryClient.invalidateQueries({ queryKey: ['seeker-orgs'] });
      toast.success('Terms accepted. Organization activated.');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'activate_org_tc', component: 'first-login' }),
  });
}

export function useAcceptTcVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orgId, tcVersion }: { orgId: string; tcVersion: string }) => {
      const updateData = await withUpdatedBy({
        tc_version_accepted: tcVersion,
        updated_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('seeker_organizations')
        .update(updateData)
        .eq('id', orgId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-profile'] });
      toast.success('Terms & Conditions accepted.');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'accept_tc_version', component: 'tc-modal' }),
  });
}
