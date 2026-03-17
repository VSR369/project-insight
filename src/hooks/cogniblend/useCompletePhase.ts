/**
 * useCompletePhase — Calls complete_phase RPC and shows sequential
 * auto-completion toasts with visual feedback.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { CheckCircle, AlertTriangle, Rocket } from 'lucide-react';
import { createElement } from 'react';

/* ── Response shape from complete_phase ───────────────────── */

interface AutoCompletedPhase {
  from_phase: number;
  to_phase: number;
  method: string;
}

interface CompletePhaseResult {
  success: boolean;
  challenge_id: string;
  new_phase: number;
  phases_auto_completed?: AutoCompletedPhase[];
  stopped_reason?: 'different_actor' | 'solver_phase' | null;
  waiting_for_role?: string | null;
  waiting_for_role_name?: string | null;
}

/* ── Sequential toast helper ──────────────────────────────── */

function showSequentialToasts(
  result: CompletePhaseResult,
  onAllDone: () => void,
) {
  const phases = result.phases_auto_completed ?? [];
  let delay = 0;

  // Show each auto-completed phase toast sequentially
  phases.forEach((p) => {
    setTimeout(() => {
      toast(
        createElement(
          'div',
          { className: 'flex items-center gap-2' },
          createElement(CheckCircle, {
            className: 'h-4 w-4 shrink-0 text-[hsl(210,68%,54%)]',
          }),
          createElement(
            'span',
            { className: 'text-[13px]' },
            `Phase ${p.from_phase} complete → Phase ${p.to_phase}`,
          ),
        ),
        {
          duration: 2000,
          className:
            'border-l-4 border-l-[hsl(210,68%,54%)] shadow-md w-[280px]',
        },
      );
    }, delay);
    delay += 500;
  });

  // Final status toast
  setTimeout(() => {
    if (result.stopped_reason === 'solver_phase' || result.new_phase === 7) {
      toast(
        createElement(
          'div',
          { className: 'flex items-center gap-2' },
          createElement(Rocket, {
            className: 'h-4 w-4 shrink-0 text-[hsl(210,68%,54%)]',
          }),
          createElement(
            'span',
            { className: 'text-[13px] font-medium' },
            'Challenge published! Waiting for solver submissions.',
          ),
        ),
        {
          duration: 3000,
          className:
            'border-l-4 border-l-[hsl(210,68%,54%)] shadow-md w-[280px]',
        },
      );
    } else if (
      result.stopped_reason === 'different_actor' &&
      result.waiting_for_role_name
    ) {
      toast(
        createElement(
          'div',
          { className: 'flex items-center gap-2' },
          createElement(AlertTriangle, {
            className: 'h-4 w-4 shrink-0 text-[hsl(38,68%,41%)]',
          }),
          createElement(
            'span',
            { className: 'text-[13px]' },
            `Waiting for: ${result.waiting_for_role_name} to take action on Phase ${result.new_phase}.`,
          ),
        ),
        {
          duration: 3000,
          className:
            'border-l-4 border-l-[hsl(38,68%,41%)] shadow-md w-[280px]',
        },
      );
    }

    // Refresh after final toast
    setTimeout(onAllDone, 300);
  }, delay);
}

/* ── Hook ─────────────────────────────────────────────────── */

export function useCompletePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      challengeId: string;
      userId: string;
    }): Promise<CompletePhaseResult> => {
      // Small delay so user sees the spinner state
      await new Promise((r) => setTimeout(r, 500));

      const { data, error } = await supabase.rpc('complete_phase', {
        p_challenge_id: params.challengeId,
        p_user_id: params.userId,
      });
      if (error) throw new Error(error.message);

      const result = (
        typeof data === 'string' ? JSON.parse(data) : data
      ) as CompletePhaseResult;

      return result;
    },
    onSuccess: (result) => {
      showSequentialToasts(result, () => {
        queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['cogni-waiting-for'] });
        queryClient.invalidateQueries({ queryKey: ['cogni-open-challenges'] });
      });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'complete_phase' });
    },
  });
}
