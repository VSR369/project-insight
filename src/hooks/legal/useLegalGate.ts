/**
 * useLegalGate — Checks legal gate for a given trigger event.
 * Calls check_legal_gate RPC and returns pending documents.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { LegalGateResult, TriggerEvent } from '@/types/legal.types';

interface UseLegalGateParams {
  triggerEvent: TriggerEvent | string;
  challengeId?: string | null;
  userRole?: string;
  governanceMode?: string;
  enabled?: boolean;
}

export function useLegalGate({
  triggerEvent,
  challengeId,
  userRole = 'ALL',
  governanceMode = 'ALL',
  enabled = true,
}: UseLegalGateParams) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['legal-gate', triggerEvent, challengeId, userRole, governanceMode, user?.id],
    queryFn: async (): Promise<LegalGateResult> => {
      if (!user?.id) return { gate_open: true, pending_documents: [] };

      const { data, error } = await supabase.rpc('check_legal_gate', {
        p_user_id: user.id,
        p_trigger_event: triggerEvent,
        p_challenge_id: challengeId ?? null,
        p_user_role: userRole,
        p_governance_mode: governanceMode,
      });

      if (error) throw new Error(error.message);

      const result = data as unknown as LegalGateResult;
      return {
        gate_open: result.gate_open,
        pending_documents: Array.isArray(result.pending_documents)
          ? result.pending_documents
          : [],
      };
    },
    enabled: enabled && !!user?.id,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
}
