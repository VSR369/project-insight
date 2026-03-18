/**
 * useLegalAcceptance — Records legal document acceptance in legal_acceptance_ledger.
 * Captures IP address and scroll_confirmed flag per BR-LGL-007.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { getClientIP } from '@/lib/getClientIP';

/* ─── Types ──────────────────────────────────────────────── */

export interface LegalAcceptancePayload {
  challengeId: string;
  userId: string;
  documentType: string;
  documentName?: string;
  documentVersion?: string;
  tier?: string;
  phaseTriggered?: number | null;
  scrollConfirmed: boolean;
}

/* ─── Hook ───────────────────────────────────────────────── */

export function useRecordLegalAcceptance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: LegalAcceptancePayload) => {
      const ipAddress = await getClientIP();

      const { data, error } = await supabase
        .from('legal_acceptance_ledger')
        .insert({
          challenge_id: payload.challengeId,
          user_id: payload.userId,
          document_type: payload.documentType,
          document_name: payload.documentName ?? null,
          document_version: payload.documentVersion ?? null,
          tier: payload.tier ?? 'TIER_1',
          phase_triggered: payload.phaseTriggered ?? null,
          accepted_at: new Date().toISOString(),
          ip_address: ipAddress || null,
          scroll_confirmed: payload.scrollConfirmed,
          created_by: payload.userId,
        } as any)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Audit trail entry
      await supabase.from('audit_trail').insert({
        user_id: payload.userId,
        challenge_id: payload.challengeId,
        action: 'LEGAL_ACCEPTED',
        method: 'manual',
        details: {
          document_type: payload.documentType,
          document_name: payload.documentName,
          scroll_confirmed: payload.scrollConfirmed,
          ip_address: ipAddress,
        },
        created_by: payload.userId,
      });

      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['legal-acceptance', variables.challengeId],
      });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'record_legal_acceptance' });
    },
  });
}
