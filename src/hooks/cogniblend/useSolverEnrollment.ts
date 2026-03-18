/**
 * useSolverEnrollment — Hooks for solver enrollment in challenges.
 * - useSolverEnrollmentStatus: Check current user's enrollment status
 * - useEnrollInChallenge: Create enrollment
 * - useWithdrawEnrollment: Withdraw from challenge
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import { CACHE_STANDARD } from '@/config/queryCache';

/* ─── Types ──────────────────────────────────────────────── */

export interface SolverEnrollmentStatus {
  id: string;
  status: string;
  enrollment_model: string;
  enrolled_at: string;
  approved_at: string | null;
  legal_accepted_at: string | null;
}

/* ─── useSolverEnrollmentStatus ──────────────────────────── */

export function useSolverEnrollmentStatus(challengeId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['solver-enrollment', challengeId, userId],
    queryFn: async (): Promise<SolverEnrollmentStatus | null> => {
      if (!challengeId || !userId) return null;

      const { data, error } = await supabase
        .from('solver_enrollments')
        .select('id, status, enrollment_model, enrolled_at, approved_at, legal_accepted_at')
        .eq('challenge_id', challengeId)
        .eq('solver_id', userId)
        .eq('is_deleted', false)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as SolverEnrollmentStatus | null;
    },
    enabled: !!challengeId && !!userId,
    ...CACHE_STANDARD,
  });
}

/* ─── useEnrollInChallenge ───────────────────────────────── */

export function useEnrollInChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      challengeId,
      solverId,
      tenantId,
      enrollmentModel,
      autoApprove,
      legalAccepted,
      adAccepted = false,
    }: {
      challengeId: string;
      solverId: string;
      tenantId: string;
      enrollmentModel: string;
      autoApprove: boolean;
      legalAccepted: boolean;
      adAccepted?: boolean;
    }) => {
      const enrollment = await withCreatedBy({
        challenge_id: challengeId,
        solver_id: solverId,
        tenant_id: tenantId,
        enrollment_model: enrollmentModel,
        status: autoApprove ? 'APPROVED' : 'PENDING',
        enrolled_at: new Date().toISOString(),
        approved_at: autoApprove ? new Date().toISOString() : null,
        legal_accepted_at: legalAccepted ? new Date().toISOString() : null,
      });

      const { data, error } = await supabase
        .from('solver_enrollments')
        .insert(enrollment as any)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['solver-enrollment', variables.challengeId] });
      if (variables.autoApprove) {
        toast.success('Enrolled successfully! You can now submit solutions.');
      } else {
        toast.success('Enrollment request submitted. You will be notified when approved.');
      }
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'enroll_in_challenge' });
    },
  });
}

/* ─── useWithdrawEnrollment ──────────────────────────────── */

export function useWithdrawEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enrollmentId, challengeId }: { enrollmentId: string; challengeId: string }) => {
      const withAudit = await withUpdatedBy({ status: 'WITHDRAWN', updated_at: new Date().toISOString() });
      const { error } = await supabase
        .from('solver_enrollments')
        .update(withAudit as any)
        .eq('id', enrollmentId);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['solver-enrollment', variables.challengeId] });
      toast.success('Enrollment withdrawn');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'withdraw_enrollment' });
    },
  });
}
