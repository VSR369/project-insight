/**
 * useSolverFeedback — Submit and query solver challenge clarity ratings.
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FeedbackPayload {
  clarity_overall: number;
  clarity_problem: number | null;
  clarity_deliverables: number | null;
  clarity_evaluation: number | null;
  missing_info: string | null;
}

export function useSolverFeedback(challengeId: string, solverId: string) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: existingFeedback } = useQuery({
    queryKey: ['solver-feedback', challengeId, solverId],
    queryFn: async () => {
      const { data } = await supabase
        .from('solver_challenge_feedback' as any)
        .select('id')
        .eq('challenge_id', challengeId)
        .eq('solver_id', solverId)
        .maybeSingle();
      return data;
    },
    enabled: !!challengeId && !!solverId,
    staleTime: 5 * 60_000,
  });

  const hasSubmitted = !!existingFeedback;

  const submit = useCallback(async (payload: FeedbackPayload) => {
    if (hasSubmitted) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('solver_challenge_feedback' as any).insert({
        challenge_id: challengeId,
        solver_id: solverId,
        ...payload,
      });
      if (error) throw new Error(error.message);
      toast.success('Thank you for your feedback!');
    } catch (err: any) {
      toast.error(`Feedback failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [challengeId, solverId, hasSubmitted]);

  return { submit, isSubmitting, hasSubmitted };
}
