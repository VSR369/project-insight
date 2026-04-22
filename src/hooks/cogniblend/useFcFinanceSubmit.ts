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
      const { data: rpcData, error } = await supabase.rpc('complete_financial_review', {
        p_challenge_id: challengeId,
        p_user_id: userId,
      });
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

      const message = result.awaiting === 'creator_approval'
        ? 'Financial review complete — Creator approval requested'
        : result.phase_advanced
          ? 'Financial compliance confirmed — challenge advanced.'
          : 'Financial compliance confirmed — waiting for legal review.';

      toast.success(message);
      if (result.phase_advanced) navigate('/cogni/fc-queue');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit financial review';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, submitting, gateFailures };
}
