/**
 * Enrollment Completion Detection Hooks
 * 
 * These hooks check actual database state for step completion,
 * replacing the naive onboarding_status === 'completed' check.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Get proof points count for an enrollment
 * Step 5 is complete if count > 0
 */
export function useProofPointsCount(enrollmentId?: string) {
  return useQuery({
    queryKey: ['proof-points-count', enrollmentId],
    queryFn: async (): Promise<number> => {
      if (!enrollmentId) return 0;

      const { count, error } = await supabase
        .from('proof_points')
        .select('*', { count: 'exact', head: true })
        .eq('enrollment_id', enrollmentId)
        .eq('is_deleted', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!enrollmentId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get assessment pass status for an enrollment
 * Step 6 is complete if is_passed = true
 */
export function useEnrollmentAssessmentStatus(enrollmentId?: string) {
  return useQuery({
    queryKey: ['enrollment-assessment-status', enrollmentId],
    queryFn: async () => {
      if (!enrollmentId) return null;

      const { data, error } = await supabase
        .from('assessment_attempts')
        .select('id, is_passed, submitted_at, score_percentage')
        .eq('enrollment_id', enrollmentId)
        .eq('is_passed', true)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!enrollmentId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get interview booking status for an enrollment
 * Step 7 is complete if booking exists with status 'scheduled' or 'completed'
 */
export function useEnrollmentInterviewBooking(enrollmentId?: string) {
  return useQuery({
    queryKey: ['enrollment-interview-booking', enrollmentId],
    queryFn: async () => {
      if (!enrollmentId) return null;

      const { data, error } = await supabase
        .from('interview_bookings')
        .select('id, scheduled_at, status')
        .eq('enrollment_id', enrollmentId)
        .in('status', ['scheduled', 'completed'])
        .order('scheduled_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!enrollmentId,
    staleTime: 30 * 1000,
  });
}
