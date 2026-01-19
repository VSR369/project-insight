/**
 * Reviewer Dashboard Hooks
 * 
 * Enrollment-centric queries for reviewer dashboard:
 * - Stats (total enrollments, new, action required, upcoming)
 * - Upcoming interviews with enrollment context
 * - Action required enrollments (flagged for clarification)
 * - New enrollment submissions (last 7 days)
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/lib/auditFields";
import { logInfo, logWarning } from "@/lib/errorHandler";

// Types for dashboard data
export interface ReviewerDashboardStats {
  totalEnrollments: number;
  newSubmissions: number;
  actionRequired: number;
  upcomingInterviews: number;
}

export interface UpcomingInterview {
  bookingId: string;
  enrollmentId: string;
  providerId: string;
  providerName: string;
  industryName: string;
  expertiseLevelName: string;
  lifecycleStatus: string;
  scheduledAt: string;
  startAt: string;
  endAt: string;
  bookingStatus: string;
  slotId: string;
}

export interface ActionRequiredEnrollment {
  bookingId: string;
  enrollmentId: string;
  providerId: string;
  providerName: string;
  industryName: string;
  expertiseLevelName: string;
  lifecycleStatus: string;
  scheduledAt: string;
  flagForClarification: boolean;
  reviewerNotes: string | null;
  createdAt: string;
}

export interface NewEnrollmentSubmission {
  bookingId: string;
  enrollmentId: string;
  providerId: string;
  providerName: string;
  industryName: string;
  expertiseLevelName: string;
  lifecycleStatus: string;
  scheduledAt: string;
  createdAt: string;
}

/**
 * Fetch reviewer's dashboard statistics
 */
export function useReviewerDashboardStats(reviewerId: string | undefined) {
  return useQuery({
    queryKey: ["reviewer-dashboard-stats", reviewerId],
    queryFn: async (): Promise<ReviewerDashboardStats> => {
      if (!reviewerId) {
        return {
          totalEnrollments: 0,
          newSubmissions: 0,
          actionRequired: 0,
          upcomingInterviews: 0,
        };
      }

      // Get all bookings for this reviewer
      const { data: bookingReviewers, error: brError } = await supabase
        .from("booking_reviewers")
        .select(`
          booking_id,
          status,
          interview_bookings!inner (
            id,
            enrollment_id,
            status,
            scheduled_at,
            created_at,
            flag_for_clarification,
            reviewer_notes
          )
        `)
        .eq("reviewer_id", reviewerId);

      if (brError) throw new Error(brError.message);

      logInfo("Dashboard stats: raw bookingReviewers fetched", {
        operation: "fetch_dashboard_stats",
        component: "useReviewerDashboardStats",
        reviewerId,
        totalBookings: bookingReviewers?.length || 0,
        bookings: bookingReviewers?.map((br) => ({
          bookingId: (br as any).interview_bookings?.id,
          enrollmentId: (br as any).interview_bookings?.enrollment_id,
          status: (br as any).interview_bookings?.status,
          scheduledAt: (br as any).interview_bookings?.scheduled_at,
          flagged: (br as any).interview_bookings?.flag_for_clarification,
        })),
      });

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Calculate stats
      const uniqueEnrollments = new Set<string>();
      let newSubmissions = 0;
      let actionRequired = 0;
      let upcomingInterviews = 0;

      bookingReviewers?.forEach((br) => {
        const booking = (br as any).interview_bookings;
        if (!booking) return;

        // Count unique enrollments
        if (booking.enrollment_id) {
          uniqueEnrollments.add(booking.enrollment_id);
        }

        // Count new submissions (created in last 7 days)
        const createdAt = new Date(booking.created_at);
        if (createdAt >= sevenDaysAgo) {
          newSubmissions++;
        }

        // Count action required (flagged or has notes)
        if (booking.flag_for_clarification || 
            (booking.reviewer_notes && booking.reviewer_notes.trim() !== '')) {
          actionRequired++;
        }

        // Count upcoming interviews
        const scheduledAt = new Date(booking.scheduled_at);
        if (scheduledAt >= now && ['scheduled', 'confirmed'].includes(booking.status)) {
          upcomingInterviews++;
        }
      });

      const stats = {
        totalEnrollments: uniqueEnrollments.size,
        newSubmissions,
        actionRequired,
        upcomingInterviews,
      };

      logInfo("Dashboard stats: calculated", {
        operation: "calculate_dashboard_stats",
        component: "useReviewerDashboardStats",
        reviewerId,
        currentTime: now.toISOString(),
        stats,
      });

      return stats;
    },
    enabled: !!reviewerId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch reviewer's upcoming interviews with full enrollment context
 */
export function useReviewerUpcomingInterviews(reviewerId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ["reviewer-upcoming-interviews", reviewerId, limit],
    queryFn: async (): Promise<UpcomingInterview[]> => {
      if (!reviewerId) return [];

      const now = new Date().toISOString();

      // Get booking reviewers for this reviewer with upcoming bookings
      const { data: bookingReviewers, error: brError } = await supabase
        .from("booking_reviewers")
        .select(`
          slot_id,
          interview_bookings!inner (
            id,
            enrollment_id,
            provider_id,
            scheduled_at,
            status
          ),
          interview_slots!inner (
            start_at,
            end_at
          )
        `)
        .eq("reviewer_id", reviewerId)
        .gte("interview_slots.start_at", now)
        .in("interview_bookings.status", ["scheduled", "confirmed"])
        .order("interview_slots(start_at)", { ascending: true })
        .limit(limit);

      if (brError) throw new Error(brError.message);

      logInfo("Upcoming interviews: raw query result", {
        operation: "fetch_upcoming_interviews",
        component: "useReviewerUpcomingInterviews",
        reviewerId,
        filterTime: now,
        resultCount: bookingReviewers?.length || 0,
        bookings: bookingReviewers?.map((br) => ({
          slotId: br.slot_id,
          bookingId: (br as any).interview_bookings?.id,
          enrollmentId: (br as any).interview_bookings?.enrollment_id,
          status: (br as any).interview_bookings?.status,
          scheduledAt: (br as any).interview_bookings?.scheduled_at,
          slotStartAt: (br as any).interview_slots?.start_at,
          slotEndAt: (br as any).interview_slots?.end_at,
        })),
      });

      if (!bookingReviewers || bookingReviewers.length === 0) {
        logWarning("Upcoming interviews: no results found", {
          operation: "fetch_upcoming_interviews",
          component: "useReviewerUpcomingInterviews",
          reviewerId,
        });
        return [];
      }

      // Get enrollment details for all bookings
      const enrollmentIds = bookingReviewers
        .map((br) => (br as any).interview_bookings?.enrollment_id)
        .filter(Boolean);

      const providerIds = bookingReviewers
        .map((br) => (br as any).interview_bookings?.provider_id)
        .filter(Boolean);

      // Fetch enrollments with industry/expertise
      const { data: enrollments, error: enrError } = await supabase
        .from("provider_industry_enrollments")
        .select(`
          id,
          lifecycle_status,
          industry_segments (id, name),
          expertise_levels (id, name)
        `)
        .in("id", enrollmentIds);

      if (enrError) throw new Error(enrError.message);

      // Fetch providers
      const { data: providers, error: provError } = await supabase
        .from("solution_providers")
        .select("id, first_name, last_name")
        .in("id", providerIds);

      if (provError) throw new Error(provError.message);

      // Build lookup maps
      const enrollmentMap = new Map(enrollments?.map((e) => [e.id, e]) || []);
      const providerMap = new Map(providers?.map((p) => [p.id, p]) || []);

      // Transform to UpcomingInterview[]
      const result = bookingReviewers.map((br) => {
        const booking = (br as any).interview_bookings;
        const slot = (br as any).interview_slots;
        const enrollment = enrollmentMap.get(booking.enrollment_id);
        const provider = providerMap.get(booking.provider_id);

        return {
          bookingId: booking.id,
          enrollmentId: booking.enrollment_id,
          providerId: booking.provider_id,
          providerName: provider 
            ? `${provider.first_name} ${provider.last_name}`.trim() 
            : 'Unknown Provider',
          industryName: (enrollment as any)?.industry_segments?.name || 'Unknown',
          expertiseLevelName: (enrollment as any)?.expertise_levels?.name || 'Unknown',
          lifecycleStatus: enrollment?.lifecycle_status || 'unknown',
          scheduledAt: booking.scheduled_at,
          startAt: slot.start_at,
          endAt: slot.end_at,
          bookingStatus: booking.status,
          slotId: br.slot_id,
        };
      });

      logInfo("Upcoming interviews: transformed", {
        operation: "transform_upcoming_interviews",
        component: "useReviewerUpcomingInterviews",
        reviewerId,
        interviews: result.map((i) => ({
          bookingId: i.bookingId,
          industry: i.industryName,
          provider: i.providerName,
          scheduledAt: i.scheduledAt,
          slotStartAt: i.startAt,
        })),
      });

      return result;
    },
    enabled: !!reviewerId,
    staleTime: 30000,
  });
}

/**
 * Fetch enrollments that require action (flagged for clarification or have notes)
 */
export function useActionRequiredEnrollments(reviewerId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ["reviewer-action-required", reviewerId, limit],
    queryFn: async (): Promise<ActionRequiredEnrollment[]> => {
      if (!reviewerId) return [];

      // Get bookings with clarification flags or notes
      const { data: bookingReviewers, error: brError } = await supabase
        .from("booking_reviewers")
        .select(`
          interview_bookings!inner (
            id,
            enrollment_id,
            provider_id,
            scheduled_at,
            created_at,
            flag_for_clarification,
            reviewer_notes
          )
        `)
        .eq("reviewer_id", reviewerId);

      if (brError) throw new Error(brError.message);

      // Filter for action required items
      const actionItems = bookingReviewers?.filter((br) => {
        const booking = (br as any).interview_bookings;
        return booking.flag_for_clarification || 
               (booking.reviewer_notes && booking.reviewer_notes.trim() !== '');
      }) || [];

      logInfo("Action required: filtered items", {
        operation: "fetch_action_required",
        component: "useActionRequiredEnrollments",
        reviewerId,
        totalBookings: bookingReviewers?.length || 0,
        actionItemsCount: actionItems.length,
        actionItems: actionItems.map((br) => ({
          bookingId: (br as any).interview_bookings?.id,
          flagged: (br as any).interview_bookings?.flag_for_clarification,
          hasNotes: !!(br as any).interview_bookings?.reviewer_notes,
        })),
      });

      if (actionItems.length === 0) return [];

      // Get enrollment and provider details
      const enrollmentIds = actionItems
        .map((br) => (br as any).interview_bookings?.enrollment_id)
        .filter(Boolean);

      const providerIds = actionItems
        .map((br) => (br as any).interview_bookings?.provider_id)
        .filter(Boolean);

      const { data: enrollments } = await supabase
        .from("provider_industry_enrollments")
        .select(`
          id,
          lifecycle_status,
          industry_segments (id, name),
          expertise_levels (id, name)
        `)
        .in("id", enrollmentIds);

      const { data: providers } = await supabase
        .from("solution_providers")
        .select("id, first_name, last_name")
        .in("id", providerIds);

      const enrollmentMap = new Map(enrollments?.map((e) => [e.id, e]) || []);
      const providerMap = new Map(providers?.map((p) => [p.id, p]) || []);

      return actionItems.slice(0, limit).map((br) => {
        const booking = (br as any).interview_bookings;
        const enrollment = enrollmentMap.get(booking.enrollment_id);
        const provider = providerMap.get(booking.provider_id);

        return {
          bookingId: booking.id,
          enrollmentId: booking.enrollment_id,
          providerId: booking.provider_id,
          providerName: provider 
            ? `${provider.first_name} ${provider.last_name}`.trim() 
            : 'Unknown Provider',
          industryName: (enrollment as any)?.industry_segments?.name || 'Unknown',
          expertiseLevelName: (enrollment as any)?.expertise_levels?.name || 'Unknown',
          lifecycleStatus: enrollment?.lifecycle_status || 'unknown',
          scheduledAt: booking.scheduled_at,
          flagForClarification: booking.flag_for_clarification || false,
          reviewerNotes: booking.reviewer_notes,
          createdAt: booking.created_at,
        };
      });
    },
    enabled: !!reviewerId,
    staleTime: 30000,
  });
}

/**
 * Fetch new enrollment submissions (last 7 days)
 */
export function useNewEnrollmentSubmissions(reviewerId: string | undefined, limit = 5) {
  return useQuery({
    queryKey: ["reviewer-new-submissions", reviewerId, limit],
    queryFn: async (): Promise<NewEnrollmentSubmission[]> => {
      if (!reviewerId) return [];

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Get recent bookings for this reviewer
      const { data: bookingReviewers, error: brError } = await supabase
        .from("booking_reviewers")
        .select(`
          interview_bookings!inner (
            id,
            enrollment_id,
            provider_id,
            scheduled_at,
            created_at
          )
        `)
        .eq("reviewer_id", reviewerId)
        .gte("interview_bookings.created_at", sevenDaysAgo)
        .order("interview_bookings(created_at)", { ascending: false })
        .limit(limit);

      if (brError) throw new Error(brError.message);

      logInfo("New submissions: fetched", {
        operation: "fetch_new_submissions",
        component: "useNewEnrollmentSubmissions",
        reviewerId,
        filterDate: sevenDaysAgo,
        resultCount: bookingReviewers?.length || 0,
      });

      if (!bookingReviewers || bookingReviewers.length === 0) return [];

      // Get enrollment and provider details
      const enrollmentIds = bookingReviewers
        .map((br) => (br as any).interview_bookings?.enrollment_id)
        .filter(Boolean);

      const providerIds = bookingReviewers
        .map((br) => (br as any).interview_bookings?.provider_id)
        .filter(Boolean);

      const { data: enrollments } = await supabase
        .from("provider_industry_enrollments")
        .select(`
          id,
          lifecycle_status,
          industry_segments (id, name),
          expertise_levels (id, name)
        `)
        .in("id", enrollmentIds);

      const { data: providers } = await supabase
        .from("solution_providers")
        .select("id, first_name, last_name")
        .in("id", providerIds);

      const enrollmentMap = new Map(enrollments?.map((e) => [e.id, e]) || []);
      const providerMap = new Map(providers?.map((p) => [p.id, p]) || []);

      return bookingReviewers.map((br) => {
        const booking = (br as any).interview_bookings;
        const enrollment = enrollmentMap.get(booking.enrollment_id);
        const provider = providerMap.get(booking.provider_id);

        return {
          bookingId: booking.id,
          enrollmentId: booking.enrollment_id,
          providerId: booking.provider_id,
          providerName: provider 
            ? `${provider.first_name} ${provider.last_name}`.trim() 
            : 'Unknown Provider',
          industryName: (enrollment as any)?.industry_segments?.name || 'Unknown',
          expertiseLevelName: (enrollment as any)?.expertise_levels?.name || 'Unknown',
          lifecycleStatus: enrollment?.lifecycle_status || 'unknown',
          scheduledAt: booking.scheduled_at,
          createdAt: booking.created_at,
        };
      });
    },
    enabled: !!reviewerId,
    staleTime: 30000,
  });
}
