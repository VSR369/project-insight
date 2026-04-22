/**
 * useFcFinanceSubmit — Submit-to-curation flow for the FC workspace.
 * Calls complete_financial_review RPC, invalidates caches, routes back
 * to the FC queue on phase advance. Mirrors useLcLegalSubmit.
 */
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UseFcFinanceSubmitArgs {
  challengeId: string | undefined;
  userId: string | undefined;
}

interface CompleteFinancialReviewResult {
  success?: boolean;
  phase_advanced?: boolean;
  current_phase?: number;
  message?: string;
  awaiting?: string;
  error?: string;
}

export function useFcFinanceSubmit({ challengeId, userId }: UseFcFinanceSubmitArgs) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [gateFailures, setGateFailures] = useState<string[]>([]);

  const submit = async () => {
    if (!challengeId || !userId) return;
    setSubmitting(true);
    setGateFailures([]);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rpcData, error } = await (supabase.rpc as any)(
        'complete_financial_review',
        { p_challenge_id: challengeId, p_user_id: userId },
      );
      if (error) throw new Error(error.message);

      const result = (rpcData ?? {}) as CompleteFinancialReviewResult;
      if (result.error) {
        setGateFailures([result.error]);
        toast.error(`Cannot submit: ${result.error}`);
        return;
      }

      [
        ['fc-escrow-challenges'],
        ['fc-challenge-queue'],
        ['escrow-deposit', challengeId],
        ['publication-readiness', challengeId],
        ['cogni-dashboard'],
        ['challenge-fc-detail', challengeId],
      ].forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));

      const msg = result.awaiting === 'creator_approval'
        ? 'Financial review complete — Creator approval requested'
        : result.phase_advanced
          ? 'Financial compliance confirmed — challenge advanced.'
          : 'Financial compliance confirmed — waiting for legal review.';
      toast.success(msg);
      if (result.phase_advanced) navigate('/cogni/fc-queue');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit financial review';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, submitting, gateFailures };
}
