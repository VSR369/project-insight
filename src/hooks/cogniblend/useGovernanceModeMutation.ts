/**
 * useGovernanceModeMutation — Extracted from GovernanceModeSwitcher (R2 compliance).
 * Handles governance mode change + audit trail logging.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withUpdatedBy } from '@/lib/auditFields';
import type { GovernanceMode } from '@/lib/governanceMode';

interface UseGovernanceModeMutationOptions {
  challengeId: string;
  currentMode: GovernanceMode;
  userId?: string;
}

export function useGovernanceModeMutation({
  challengeId,
  currentMode,
  userId,
}: UseGovernanceModeMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newMode: GovernanceMode) => {
      const oldMode = currentMode;

      const updatePayload = await withUpdatedBy({
        governance_mode_override: newMode,
      });

      const { error } = await supabase
        .from('challenges')
        .update(updatePayload)
        .eq('id', challengeId);
      if (error) throw new Error(error.message);

      // Audit trail
      if (userId) {
        await supabase.from('audit_trail').insert({
          action: 'governance_mode_changed',
          challenge_id: challengeId,
          user_id: userId,
          method: 'curator_manual',
          details: {
            old_mode: oldMode,
            new_mode: newMode,
            changed_by: userId,
          },
        });
      }
    },
    onSuccess: (_data, newMode) => {
      queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['curation-legal-summary', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['curation-escrow', challengeId] });
      toast.success(`Governance changed to ${newMode}. Validation rules updated.`);
    },
    onError: (err: Error) => {
      handleMutationError(err, {
        operation: 'change_governance_mode',
        component: 'GovernanceModeSwitcher',
      });
    },
  });
}
