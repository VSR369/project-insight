/**
 * useLogConfidentialAccess — records every view/download of Confidential
 * content in the audit trail (BR-CHL-P09 / 9.3) via the server RPC,
 * which re-validates CPA acceptance before logging.
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import type { ConfidentialAccessAction } from '@/services/cogniblend/lifecycle/challengeConfidentiality';

interface LogConfidentialAccessInput {
  challengeId: string;
  attachmentId?: string;
  action: ConfidentialAccessAction;
}

export function useLogConfidentialAccess() {
  return useMutation({
    mutationFn: async ({ challengeId, attachmentId, action }: LogConfidentialAccessInput): Promise<void> => {
      const { error } = await supabase.rpc('log_confidential_content_access', {
        p_challenge_id: challengeId,
        p_attachment_id: attachmentId ?? null,
        p_action: action.toUpperCase(),
      });
      if (error) throw error;
    },
    onError: (e) => handleMutationError(e, { operation: 'log_confidential_content_access' }),
  });
}
