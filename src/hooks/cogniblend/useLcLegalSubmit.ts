/**
 * useLcLegalSubmit — Submit-to-curation flow for the LC workspace.
 * Validates the legal gate, calls complete_legal_review RPC, invalidates
 * caches, and routes home on phase advance. Extracted from
 * LcLegalWorkspacePage to keep that page ≤ 250 lines (R1).
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UseLcLegalSubmitArgs {
  challengeId: string | undefined;
  userId: string | undefined;
}

interface CompleteLegalReviewResult {
  success: boolean;
  phase_advanced: boolean;
  current_phase: number;
  message?: string;
  awaiting?: string;
  error?: string;
}

export function useLcLegalSubmit({ challengeId, userId }: UseLcLegalSubmitArgs) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [gateFailures, setGateFailures] = useState<string[]>([]);

  const submit = async () => {
    if (!challengeId || !userId) return;
    setSubmitting(true);
    setGateFailures([]);
    try {
      const { data: gateResult } = await supabase.rpc('validate_gate_02', {
        p_challenge_id: challengeId,
      });
      const gate = gateResult as unknown as { passed: boolean; failures: string[] } | null;
      if (!gate?.passed) {
        const failures = gate?.failures ?? ['Unknown validation failure'];
        setGateFailures(failures);
        toast.error(`Cannot advance: ${failures.join(', ')}`);
        return;
      }

      const { data: reviewResult, error } = await supabase.rpc('complete_legal_review', {
        p_challenge_id: challengeId,
        p_user_id: userId,
      });
      if (error) throw new Error(error.message);

      const result = reviewResult as unknown as CompleteLegalReviewResult;
      if (!result?.success) throw new Error(result?.error ?? 'Legal review RPC failed');

      [
        ['cogni-dashboard'],
        ['cogni-waiting-for'],
        ['cogni-open-challenges'],
        ['curation-queue'],
        ['challenge-lc-detail', challengeId],
        ['challenge-preview', challengeId],
      ].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));

      const msg = result.awaiting === 'creator_approval'
        ? 'Legal review complete — Creator approval requested'
        : result.phase_advanced
          ? 'Legal review complete — challenge handed back to the Curator for finalisation.'
          : 'Legal review complete — waiting for financial compliance';
      toast.success(msg);
      if (result.phase_advanced) navigate('/cogni/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, submitting, gateFailures };
}
