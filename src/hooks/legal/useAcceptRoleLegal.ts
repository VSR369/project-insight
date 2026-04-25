/**
 * useAcceptRoleLegal — Records a role-level (first-login) legal acceptance
 * to `legal_acceptance_log` AND marks the matching pending row resolved.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { getClientIP } from '@/lib/getClientIP';
import type { LegalDocCode } from '@/services/legal/roleToDocumentMap';

interface AcceptRoleLegalPayload {
  pendingId: string;
  userId: string;
  templateId: string;
  docCode: LegalDocCode;
  documentVersion: string;
  triggerEvent: string;
}

export function useAcceptRoleLegal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AcceptRoleLegalPayload) => {
      const ipAddress = await getClientIP();
      const acceptedAt = new Date().toISOString();

      // 1) Write to legal_acceptance_log (forensic-grade record)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: log, error: logErr } = await (supabase.from('legal_acceptance_log') as any)
        .insert({
          user_id: payload.userId,
          template_id: payload.templateId,
          document_code: payload.docCode,
          document_version: payload.documentVersion,
          action: 'accepted',
          trigger_event: payload.triggerEvent,
          accepted_at: acceptedAt,
          ip_address: ipAddress || null,
          user_agent: navigator.userAgent,
        })
        .select('id')
        .single();
      if (logErr) throw new Error(logErr.message);

      // 2) Resolve the pending row
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: pendErr } = await (supabase.from('pending_role_legal_acceptance') as any)
        .update({
          resolved_at: acceptedAt,
          resolved_log_id: log?.id ?? null,
          updated_at: acceptedAt,
        })
        .eq('id', payload.pendingId);
      if (pendErr) throw new Error(pendErr.message);

      return { logId: log?.id as string | undefined };
    },
    onSuccess: (_d, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-role-legal-acceptance', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['spa-acceptance-status', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['skpa-acceptance-status', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['pwa-acceptance-status', variables.userId] });
    },
    onError: (e: Error) => {
      handleMutationError(e, { operation: 'accept_role_legal' });
    },
  });
}
