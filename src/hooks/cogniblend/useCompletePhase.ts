/**
 * useCompletePhase — Calls complete_phase RPC and shows sequential
 * auto-completion toasts with visual feedback.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { CheckCircle, AlertTriangle, Rocket, ArrowRight } from 'lucide-react';
import { createElement } from 'react';

/* ── Role → navigation route mapping ─────────────────────── */

const ROLE_NAV_MAP: Record<string, { label: string; path: string }> = {
  CR: { label: 'Challenge Creator', path: '/cogni/my-challenges' },
  CU: { label: 'Curator', path: '/cogni/curation' },
  ID: { label: 'Innovation Director', path: '/cogni/approval' },
  ER: { label: 'Evaluation Reviewer', path: '/cogni/review' },
  LC: { label: 'Legal Counsel', path: '/cogni/legal' },
  FC: { label: 'Finance Controller', path: '/cogni/escrow' },
  AM: { label: 'Account Manager', path: '/cogni/my-requests' },
  RQ: { label: 'Challenge Requestor', path: '/cogni/my-requests' },
};

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
  userRoleCodes?: Set<string>,
  navigateFn?: (path: string) => void,
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
      result.waiting_for_role
    ) {
      // Check if user holds the waiting role → smart "Next step" toast
      const userHoldsRole = userRoleCodes?.has(result.waiting_for_role);
      const navTarget = ROLE_NAV_MAP[result.waiting_for_role];

      if (userHoldsRole && navTarget && navigateFn) {
        toast(
          createElement(
            'div',
            { className: 'flex items-center gap-2' },
            createElement(ArrowRight, {
              className: 'h-4 w-4 shrink-0 text-primary',
            }),
            createElement(
              'span',
              { className: 'text-[13px]' },
              `Next: Act as ${navTarget.label} → Phase ${result.new_phase}`,
            ),
          ),
          {
            duration: 5000,
            className:
              'border-l-4 border-l-primary shadow-md w-[320px] cursor-pointer',
            action: {
              label: 'Go →',
              onClick: () => navigateFn(navTarget.path),
            },
          },
        );

        // Auto-navigate after a short delay
        setTimeout(() => navigateFn(navTarget.path), 2000);
      } else {
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
              `Waiting for: ${result.waiting_for_role_name ?? result.waiting_for_role} to take action on Phase ${result.new_phase}.`,
            ),
          ),
          {
            duration: 3000,
            className:
              'border-l-4 border-l-[hsl(38,68%,41%)] shadow-md w-[280px]',
          },
        );
      }
    }

    // Refresh after final toast
    setTimeout(onAllDone, 300);
  }, delay);
}

/* ── Hook ─────────────────────────────────────────────────── */

export function useCompletePhase(
  userRoleCodes?: Set<string>,
  navigateFn?: (path: string) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      challengeId: string;
      userId: string;
    }): Promise<CompletePhaseResult> => {
      // ── Pre-flight: check for outstanding REQUIRED modification points ──
      const { data: amendments } = await supabase
        .from('amendment_records')
        .select('id, amendment_number, status')
        .eq('challenge_id', params.challengeId)
        .order('amendment_number', { ascending: false })
        .limit(1);

      if (amendments && amendments.length > 0) {
        const latestAmendment = amendments[0];

        // Check 3-cycle max (GAP-09: escalate to ID instead of allowing another return)
        if (latestAmendment.amendment_number >= 3 && latestAmendment.status === 'PENDING') {
          throw new Error(
            'Maximum modification cycles (3) reached. This challenge must be escalated to the Innovation Director for resolution.'
          );
        }

        // Check for unaddressed REQUIRED points
        const { data: outstandingPoints } = await supabase
          .from('modification_points')
          .select('id, severity, status')
          .eq('amendment_id', latestAmendment.id)
          .eq('severity', 'REQUIRED')
          .eq('status', 'OUTSTANDING');

        if (outstandingPoints && outstandingPoints.length > 0) {
          throw new Error(
            `Cannot proceed: ${outstandingPoints.length} required modification point(s) are still outstanding. All REQUIRED points must be ADDRESSED or WAIVED before resubmission.`
          );
        }
      }

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
      showSequentialToasts(
        result,
        () => {
          queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['cogni-waiting-for'] });
          queryClient.invalidateQueries({ queryKey: ['cogni-open-challenges'] });
        },
        userRoleCodes,
        navigateFn,
      );
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'complete_phase' });
    },
  });
}
