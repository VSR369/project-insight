/**
 * useSolutionTransition — Validates and executes forward-only solution status transitions.
 *
 * 1. Validates against VALID_TRANSITIONS map
 * 2. Updates solutions row
 * 3. Logs to audit_trail
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withUpdatedBy } from '@/lib/auditFields';
import {
  deriveSolutionDisplayStatus,
  validateSolutionTransition,
  SOLUTION_STATUS_META,
  type SolutionDisplayStatus,
} from '@/constants/solutionStatus.constants';

/* ─── Types ──────────────────────────────────────────────── */

interface TransitionInput {
  solutionId: string;
  challengeId: string;
  /** Current values (to derive fromStatus) */
  currentPhase: number | null;
  phaseStatus: string | null;
  selectionStatus: string | null;
  /** Target status */
  toStatus: SolutionDisplayStatus;
  /** New DB values to write */
  newPhase: number;
  newPhaseStatus: string;
  newSelectionStatus?: string;
}

/* ─── Audit helper ───────────────────────────────────────── */

async function logTransitionAudit(
  userId: string,
  solutionId: string,
  challengeId: string,
  fromLabel: string,
  toLabel: string,
  phaseFrom: number | null,
  phaseTo: number,
) {
  await supabase.from('audit_trail').insert({
    user_id: userId,
    solution_id: solutionId,
    challenge_id: challengeId,
    action: 'SOLUTION_STATUS_CHANGE',
    method: 'UI',
    phase_from: phaseFrom,
    phase_to: phaseTo,
    details: { from: fromLabel, to: toLabel },
  } as any);
}

/* ─── Hook ───────────────────────────────────────────────── */

export function useSolutionTransition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TransitionInput) => {
      // 1. Derive current display status
      const fromStatus = deriveSolutionDisplayStatus(
        input.currentPhase,
        input.phaseStatus,
        input.selectionStatus,
      );

      // 2. Validate transition
      const result = validateSolutionTransition(fromStatus, input.toStatus);
      if (!result.valid) {
        throw new Error(result.reason ?? 'Invalid transition');
      }

      // 3. Build update payload
      const updateData: Record<string, unknown> = {
        current_phase: input.newPhase,
        phase_status: input.newPhaseStatus,
        updated_at: new Date().toISOString(),
      };
      if (input.newSelectionStatus !== undefined) {
        updateData.selection_status = input.newSelectionStatus;
      }

      const withAudit = await withUpdatedBy(updateData);

      // 4. Update solution
      const { data, error } = await supabase
        .from('solutions')
        .update(withAudit as any)
        .eq('id', input.solutionId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // 5. Audit trail
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fromLabel = SOLUTION_STATUS_META[fromStatus].label;
        const toLabel = SOLUTION_STATUS_META[input.toStatus].label;
        await logTransitionAudit(
          user.id,
          input.solutionId,
          input.challengeId,
          fromLabel,
          toLabel,
          input.currentPhase,
          input.newPhase,
        );
      }

      return data;
    },
    onSuccess: (_data, variables) => {
      const toLabel = SOLUTION_STATUS_META[variables.toStatus].label;
      queryClient.invalidateQueries({ queryKey: ['solver-solution', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['manage-challenge', variables.challengeId] });
      toast.success(`Solution status updated to "${toLabel}"`);
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'solution_status_transition' });
    },
  });
}
