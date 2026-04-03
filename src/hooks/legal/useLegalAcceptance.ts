/**
 * useLegalAcceptance — Records acceptance/decline in legal_acceptance_log.
 * Captures IP address and user agent for forensic-grade audit trail.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { getClientIP } from '@/lib/getClientIP';
import type { AcceptanceAction } from '@/types/legal.types';

interface AcceptancePayload {
  userId: string;
  templateId: string;
  documentCode: string;
  documentSection?: string | null;
  documentVersion: string;
  challengeId?: string | null;
  triggerEvent: string;
  action: AcceptanceAction;
}

export function useLegalAcceptanceLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AcceptancePayload) => {
      const ipAddress = await getClientIP();

      const { error } = await supabase
        .from('legal_acceptance_log' as 'legal_acceptance_log')
        .insert({
          user_id: payload.userId,
          template_id: payload.templateId,
          document_code: payload.documentCode,
          document_section: payload.documentSection ?? null,
          document_version: payload.documentVersion,
          challenge_id: payload.challengeId ?? null,
          trigger_event: payload.triggerEvent,
          action: payload.action,
          ip_address: ipAddress || null,
          user_agent: navigator.userAgent,
        } as Record<string, unknown>);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['legal-gate', variables.triggerEvent],
      });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'record_legal_acceptance' });
    },
  });
}
