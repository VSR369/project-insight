/**
 * Reviewer Slot Actions Hook
 * 
 * Provides hooks for fetching slot context with dual timezone display
 * and mutations for accepting/declining interview slots.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError, logInfo } from '@/lib/errorHandler';
import { toast } from 'sonner';

// ============= Types =============

export interface ReviewerAssignment {
  id: string;
  reviewerId: string;
  acceptanceStatus: 'pending' | 'accepted' | 'declined';
  acceptedAt: string | null;
  declinedAt: string | null;
  declinedReason: string | null;
}

export interface SlotContextData {
  // Booking info
  bookingId: string;
  scheduledAt: string;
  status: string;
  compositeSlotId: string | null;
  
  // Provider context
  providerId: string;
  providerName: string;
  providerTimezone: string | null;
  
  // Enrollment context
  enrollmentId: string;
  industryName: string;
  expertiseLevelName: string | null;
  
  // Reviewer context
  reviewerTimezone: string;
  
  // Quorum/duration info
  durationMinutes: number;
  
  // Booking reviewer assignment for current reviewer
  reviewerAssignment: ReviewerAssignment | null;
  
  // All reviewers for this booking (for quorum display)
  totalReviewers: number;
  acceptedReviewers: number;
}

export type DeclineReason = 'poor_credentials' | 'reviewer_unavailable';

// ============= Query Hooks =============

/**
 * Fetch slot context for a specific enrollment
 * Returns booking details with dual timezone info
 */
export function useSlotContext(enrollmentId?: string) {
  return useQuery({
    queryKey: ['slot-context', enrollmentId],
    queryFn: async (): Promise<SlotContextData | null> => {
      if (!enrollmentId) return null;

      // Get current reviewer
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: reviewer } = await supabase
        .from('panel_reviewers')
        .select('id, timezone')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!reviewer) throw new Error('Reviewer not found');

      // Fetch booking for this enrollment
      const { data: booking, error: bookingError } = await supabase
        .from('interview_bookings')
        .select(`
          id,
          scheduled_at,
          status,
          composite_slot_id,
          provider_id,
          enrollment_id
        `)
        .eq('enrollment_id', enrollmentId)
        .not('status', 'in', '("cancelled")') 
        .order('scheduled_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bookingError) throw new Error(bookingError.message);
      if (!booking) return null; // No booking yet

      // Fetch related data in parallel (first batch)
      const [
        providerResult,
        enrollmentResult,
        bookingReviewersResult
      ] = await Promise.all([
        // Provider
        supabase
          .from('solution_providers')
          .select('id, first_name, last_name, timezone')
          .eq('id', booking.provider_id)
          .single(),
        // Enrollment with industry & expertise
        supabase
          .from('provider_industry_enrollments')
          .select(`
            id,
            industry_segment_id,
            expertise_level_id,
            industry_segments(name),
            expertise_levels(name)
          `)
          .eq('id', enrollmentId)
          .single(),
        // All booking reviewers
        supabase
          .from('booking_reviewers')
          .select('id, reviewer_id, status, acceptance_status, accepted_at, declined_at, declined_reason')
          .eq('booking_id', booking.id),
      ]);

      const provider = providerResult.data;
      const enrollment = enrollmentResult.data;
      const bookingReviewers = bookingReviewersResult.data || [];

      if (!provider || !enrollment) {
        throw new Error('Missing provider or enrollment data');
      }

      // Fetch quorum requirement (needs enrollment expertise_level_id)
      let durationMinutes = 60;
      if (enrollment.expertise_level_id) {
        const { data: quorumData } = await supabase
          .from('interview_quorum_requirements')
          .select('interview_duration_minutes')
          .eq('expertise_level_id', enrollment.expertise_level_id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (quorumData?.interview_duration_minutes) {
          durationMinutes = quorumData.interview_duration_minutes;
        }
      }

      // Find current reviewer's assignment
      const myAssignment = bookingReviewers.find(br => br.reviewer_id === reviewer.id);

      // Parse industry/expertise from nested select
      const industryName = (enrollment.industry_segments as { name: string } | null)?.name || 'Unknown';
      const expertiseLevelName = (enrollment.expertise_levels as { name: string } | null)?.name || null;

      return {
        bookingId: booking.id,
        scheduledAt: booking.scheduled_at,
        status: booking.status || 'scheduled',
        compositeSlotId: booking.composite_slot_id,
        
        providerId: provider.id,
        providerName: `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || 'Unknown Provider',
        providerTimezone: provider.timezone || null,
        
        enrollmentId: enrollment.id,
        industryName,
        expertiseLevelName,
        
        reviewerTimezone: reviewer.timezone || 'Asia/Kolkata',
        
        durationMinutes,
        
        reviewerAssignment: myAssignment ? {
          id: myAssignment.id,
          reviewerId: myAssignment.reviewer_id,
          acceptanceStatus: (myAssignment.acceptance_status || 'pending') as 'pending' | 'accepted' | 'declined',
          acceptedAt: myAssignment.accepted_at,
          declinedAt: myAssignment.declined_at,
          declinedReason: myAssignment.declined_reason,
        } : null,
        
        totalReviewers: bookingReviewers.length,
        acceptedReviewers: bookingReviewers.filter(br => br.acceptance_status === 'accepted').length,
      };
    },
    enabled: !!enrollmentId,
    staleTime: 30000,
  });
}

// ============= Mutation Hooks =============

/**
 * Accept an interview slot
 */
export function useAcceptInterviewSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, reviewerId }: { bookingId: string; reviewerId: string }) => {
      // Update booking_reviewers acceptance status
      const { error: reviewerError } = await supabase
        .from('booking_reviewers')
        .update({
          acceptance_status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('booking_id', bookingId)
        .eq('reviewer_id', reviewerId);

      if (reviewerError) throw new Error(reviewerError.message);

      // Update booking status to confirmed
      const { error: bookingError } = await supabase
        .from('interview_bookings')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      if (bookingError) throw new Error(bookingError.message);

      logInfo('Interview slot accepted', {
        operation: 'accept_interview_slot',
        component: 'useAcceptInterviewSlot',
      });

      return { success: true };
    },
    onSuccess: (_, variables) => {
      toast.success('Interview slot accepted. Calendar invite will be sent.');
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['slot-context'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-detail'] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-action-required'] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-upcoming-interviews'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        operation: 'accept_interview_slot',
        component: 'useAcceptInterviewSlot',
      });
    },
  });
}

/**
 * Decline an interview slot with reason
 */
export function useDeclineInterviewSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      reviewerId,
      providerId,
      enrollmentId,
      declineReason,
      additionalNotes,
    }: {
      bookingId: string;
      reviewerId: string;
      providerId: string;
      enrollmentId: string;
      declineReason: DeclineReason;
      additionalNotes?: string;
    }) => {
      // 1. Update booking_reviewers
      const { error: reviewerError } = await supabase
        .from('booking_reviewers')
        .update({
          acceptance_status: 'declined',
          declined_reason: declineReason,
          declined_at: new Date().toISOString(),
        })
        .eq('booking_id', bookingId)
        .eq('reviewer_id', reviewerId);

      if (reviewerError) throw new Error(reviewerError.message);

      // 2. Handle based on decline reason
      if (declineReason === 'poor_credentials') {
        // Update booking status
        const { error: bookingError } = await supabase
          .from('interview_bookings')
          .update({
            status: 'declined_poor_credentials',
            cancelled_reason: 'Declined due to poor credentials',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId);

        if (bookingError) throw new Error(bookingError.message);

        // Revert lifecycle to proof_points_min_met
        const { error: lifecycleError } = await supabase
          .from('provider_industry_enrollments')
          .update({
            lifecycle_status: 'proof_points_min_met',
            lifecycle_rank: 60,
            updated_at: new Date().toISOString(),
          })
          .eq('id', enrollmentId);

        if (lifecycleError) throw new Error(lifecycleError.message);

        // Create immutable notification
        const { error: notifError } = await supabase
          .from('provider_notifications')
          .insert({
            provider_id: providerId,
            enrollment_id: enrollmentId,
            notification_type: 'interview_declined_credentials',
            title: 'Interview Request Declined',
            message: 'We regret to inform you that the expertise and proof points provided are not aligned with the role you selected. You may reapply after 3 months with updated information.',
            is_system_generated: true,
            is_immutable: true,
          });

        if (notifError) throw new Error(notifError.message);

      } else if (declineReason === 'reviewer_unavailable') {
        // Update booking status to cancelled
        const { error: bookingError } = await supabase
          .from('interview_bookings')
          .update({
            status: 'cancelled',
            cancelled_reason: 'Reviewer unavailable - please reschedule',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId);

        if (bookingError) throw new Error(bookingError.message);

        // Revert lifecycle to allow rebooking
        const { error: lifecycleError } = await supabase
          .from('provider_industry_enrollments')
          .update({
            lifecycle_status: 'assessment_passed',
            lifecycle_rank: 110,
            updated_at: new Date().toISOString(),
          })
          .eq('id', enrollmentId);

        if (lifecycleError) throw new Error(lifecycleError.message);

        // Create notification asking to rebook
        const { error: notifError } = await supabase
          .from('provider_notifications')
          .insert({
            provider_id: providerId,
            enrollment_id: enrollmentId,
            notification_type: 'interview_reschedule_requested',
            title: 'Please Select a New Interview Time',
            message: "We regret that the proposed time slot does not work with the reviewer's schedule. Please review the reviewer's available slots and select an alternative time.",
            is_system_generated: true,
          });

        if (notifError) throw new Error(notifError.message);
      }

      logInfo('Interview slot declined', {
        operation: 'decline_interview_slot',
        component: 'useDeclineInterviewSlot',
      });

      return { success: true, declineReason };
    },
    onSuccess: (result) => {
      if (result.declineReason === 'poor_credentials') {
        toast.success('Interview declined. Provider has been notified.');
      } else {
        toast.success('Interview declined. Provider will be asked to reschedule.');
      }
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['slot-context'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-detail'] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-action-required'] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-upcoming-interviews'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        operation: 'decline_interview_slot',
        component: 'useDeclineInterviewSlot',
      });
    },
  });
}
