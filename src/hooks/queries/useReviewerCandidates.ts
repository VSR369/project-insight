import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleQueryError } from "@/lib/errorHandler";
import type { Enums } from "@/integrations/supabase/types";

type LifecycleStatus = Enums<"lifecycle_status">;

// Filter types for the candidates list
export interface CandidateFilters {
  statuses?: LifecycleStatus[];
  categoryIds?: string[];
  countryIds?: string[];
  expertiseLevelIds?: string[];
  proficiencyAreaIds?: string[];
  specialityIds?: string[];
  minAssessmentScore?: number;
  maxAssessmentScore?: number;
  minInterviewScore?: number;
  maxInterviewScore?: number;
  interviewDateFrom?: string;
  interviewDateTo?: string;
  searchQuery?: string;
}

// Enriched candidate data for display
export interface ReviewerCandidate {
  enrollmentId: string;
  providerId: string;
  providerName: string;
  countryCode: string | null;
  countryName: string | null;
  industrySegmentId: string;
  industryName: string;
  expertiseLevelId: string | null;
  expertiseLevelName: string | null;
  participationModeId: string | null;
  participationModeName: string | null;
  participationModeCode: string | null;
  lifecycleStatus: string;
  lifecycleRank: number;
  // Interview details
  interviewBookingId: string | null;
  interviewScheduledAt: string | null;
  interviewStatus: string | null;
  // Counts and scores (enriched separately)
  proofPointsTotal: number;
  proofPointsVerified: number;
  proofPointsHigh: number;
  proofPointsMedium: number;
  proofPointsLow: number;
  proofPointsNeedsRevision: number;
  assessmentScore: number | null;
  assessmentPassed: boolean | null;
  assessmentQuestionsAnswered: number | null;
  interviewScore: number | null;
  interviewOutcome: string | null;
  // Proficiency areas for display
  proficiencyAreas: string[];
  // Flags
  flagForClarification: boolean;
  reviewerNotes: string | null;
}

/**
 * Fetches the base list of candidates assigned to the reviewer
 */
export function useReviewerCandidates(
  reviewerId: string | undefined,
  filters: CandidateFilters = {},
  limit = 20,
  offset = 0
) {
  return useQuery({
    queryKey: ["reviewer-candidates", reviewerId, filters, limit, offset],
    queryFn: async () => {
      if (!reviewerId) return { candidates: [], total: 0 };

      // Step 1: Get all enrollments assigned to this reviewer via booking_reviewers
      const { data: assignments, error: assignmentError } = await supabase
        .from("booking_reviewers")
        .select(`
          booking_id,
          interview_bookings!inner (
            id,
            enrollment_id,
            provider_id,
            scheduled_at,
            status,
            flag_for_clarification,
            reviewer_notes
          )
        `)
        .eq("reviewer_id", reviewerId)
        .neq("status", "cancelled");

      if (assignmentError) {
        handleQueryError(assignmentError, { operation: "fetch_reviewer_assignments" });
        throw assignmentError;
      }

      if (!assignments?.length) {
        return { candidates: [], total: 0 };
      }

      // Get unique enrollment IDs
      const enrollmentIds = [...new Set(
        assignments
          .map(a => (a.interview_bookings as any)?.enrollment_id)
          .filter(Boolean)
      )];

      if (!enrollmentIds.length) {
        return { candidates: [], total: 0 };
      }

      // Step 2: Fetch enrollment details with filters
      let query = supabase
        .from("provider_industry_enrollments")
        .select(`
          id,
          provider_id,
          lifecycle_status,
          lifecycle_rank,
          industry_segment_id,
          expertise_level_id,
          participation_mode_id,
          solution_providers!inner (
            id,
            first_name,
            last_name,
            country_id,
            countries (code, name)
          ),
          industry_segments (id, name),
          expertise_levels (id, name),
          participation_modes (id, name, code)
        `)
        .in("id", enrollmentIds);

      // Apply filters
      if (filters.statuses?.length) {
        query = query.in("lifecycle_status", filters.statuses);
      }

      if (filters.expertiseLevelIds?.length) {
        query = query.in("expertise_level_id", filters.expertiseLevelIds);
      }

      if (filters.categoryIds?.length) {
        query = query.in("participation_mode_id", filters.categoryIds);
      }

      const { data: enrollments, error: enrollmentError } = await query;

      if (enrollmentError) {
        handleQueryError(enrollmentError, { operation: "fetch_enrollment_details" });
        throw enrollmentError;
      }

      if (!enrollments?.length) {
        return { candidates: [], total: 0 };
      }

      // Apply country filter (post-query since it's nested)
      let filteredEnrollments = enrollments;
      if (filters.countryIds?.length) {
        filteredEnrollments = enrollments.filter(e => {
          const countryId = (e.solution_providers as any)?.country_id;
          return countryId && filters.countryIds!.includes(countryId);
        });
      }

      // Apply search filter
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        filteredEnrollments = filteredEnrollments.filter(e => {
          const provider = e.solution_providers as any;
          const fullName = `${provider?.first_name || ""} ${provider?.last_name || ""}`.toLowerCase();
          const industry = (e.industry_segments as any)?.name?.toLowerCase() || "";
          return fullName.includes(searchLower) || industry.includes(searchLower);
        });
      }

      // Step 3: Enrich with proof points, assessments, and interview data
      const enrollmentIdList = filteredEnrollments.map(e => e.id);

      // Get proof points counts
      const { data: proofPointsData } = await supabase
        .from("proof_points")
        .select("enrollment_id, id")
        .in("enrollment_id", enrollmentIdList)
        .eq("is_deleted", false);

      const proofPointCounts: Record<string, number> = {};
      proofPointsData?.forEach(pp => {
        proofPointCounts[pp.enrollment_id!] = (proofPointCounts[pp.enrollment_id!] || 0) + 1;
      });

      // Get proof point reviews for verification status (new table - use manual types)
      const proofPointIds = proofPointsData?.map(pp => pp.id) || [];
      
      // Type for the new proof_point_reviews table (not yet in generated types)
      interface ProofPointReview {
        proof_point_id: string;
        verification_status: string;
        evidence_strength: string | null;
      }
      
      let reviewsData: ProofPointReview[] = [];
      if (proofPointIds.length > 0) {
        const { data } = await supabase
          .from("proof_point_reviews" as any)
          .select("proof_point_id, verification_status, evidence_strength")
          .in("proof_point_id", proofPointIds)
          .eq("reviewer_id", reviewerId);
        reviewsData = (data as unknown as ProofPointReview[] | null) || [];
      }

      // Build proof point stats by enrollment
      const proofPointStats: Record<string, {
        verified: number;
        high: number;
        medium: number;
        low: number;
        needsRevision: number;
      }> = {};

      reviewsData.forEach(review => {
        const pp = proofPointsData?.find(p => p.id === review.proof_point_id);
        if (!pp?.enrollment_id) return;

        if (!proofPointStats[pp.enrollment_id]) {
          proofPointStats[pp.enrollment_id] = { verified: 0, high: 0, medium: 0, low: 0, needsRevision: 0 };
        }

        if (review.verification_status === "verified") {
          proofPointStats[pp.enrollment_id].verified++;
        }
        if (review.verification_status === "needs_revision") {
          proofPointStats[pp.enrollment_id].needsRevision++;
        }
        if (review.evidence_strength === "high") {
          proofPointStats[pp.enrollment_id].high++;
        } else if (review.evidence_strength === "medium") {
          proofPointStats[pp.enrollment_id].medium++;
        } else if (review.evidence_strength === "low") {
          proofPointStats[pp.enrollment_id].low++;
        }
      });

      // Get assessment attempts
      const { data: assessmentsData } = await supabase
        .from("assessment_attempts")
        .select("enrollment_id, score_percentage, is_passed, answered_questions")
        .in("enrollment_id", enrollmentIdList)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false });

      const assessmentsByEnrollment: Record<string, {
        score: number | null;
        passed: boolean | null;
        questionsAnswered: number | null;
      }> = {};

      assessmentsData?.forEach(att => {
        if (!att.enrollment_id || assessmentsByEnrollment[att.enrollment_id]) return;
        assessmentsByEnrollment[att.enrollment_id] = {
          score: att.score_percentage ? Number(att.score_percentage) : null,
          passed: att.is_passed,
          questionsAnswered: att.answered_questions,
        };
      });

      // Get interview evaluations (new table - use manual types)
      interface InterviewEvaluation {
        booking_id: string;
        overall_score: number | null;
        outcome: string | null;
      }

      const bookingIds = assignments
        .filter(a => enrollmentIdList.includes((a.interview_bookings as any)?.enrollment_id))
        .map(a => a.booking_id);

      let evaluationsData: InterviewEvaluation[] = [];
      if (bookingIds.length > 0) {
        const { data } = await supabase
          .from("interview_evaluations" as any)
          .select("booking_id, overall_score, outcome")
          .in("booking_id", bookingIds)
          .eq("reviewer_id", reviewerId);
        evaluationsData = (data as unknown as InterviewEvaluation[] | null) || [];
      }

      const evaluationsByBooking: Record<string, { score: number | null; outcome: string | null }> = {};
      evaluationsData.forEach(ev => {
        evaluationsByBooking[ev.booking_id] = {
          score: ev.overall_score ? Number(ev.overall_score) : null,
          outcome: ev.outcome,
        };
      });

      // Get proficiency areas for each enrollment
      const { data: profAreasData } = await supabase
        .from("provider_proficiency_areas")
        .select(`
          enrollment_id,
          proficiency_areas (name)
        `)
        .in("enrollment_id", enrollmentIdList);

      const profAreasByEnrollment: Record<string, string[]> = {};
      profAreasData?.forEach(pa => {
        if (!pa.enrollment_id) return;
        if (!profAreasByEnrollment[pa.enrollment_id]) {
          profAreasByEnrollment[pa.enrollment_id] = [];
        }
        const areaName = (pa.proficiency_areas as any)?.name;
        if (areaName && !profAreasByEnrollment[pa.enrollment_id].includes(areaName)) {
          profAreasByEnrollment[pa.enrollment_id].push(areaName);
        }
      });

      // Build interview lookup by enrollment
      const interviewByEnrollment: Record<string, {
        bookingId: string;
        scheduledAt: string | null;
        status: string;
        flagForClarification: boolean;
        reviewerNotes: string | null;
      }> = {};

      assignments.forEach(a => {
        const booking = a.interview_bookings as any;
        if (booking?.enrollment_id) {
          interviewByEnrollment[booking.enrollment_id] = {
            bookingId: booking.id,
            scheduledAt: booking.scheduled_at,
            status: booking.status,
            flagForClarification: booking.flag_for_clarification || false,
            reviewerNotes: booking.reviewer_notes,
          };
        }
      });

      // Apply assessment score filter
      if (filters.minAssessmentScore !== undefined || filters.maxAssessmentScore !== undefined) {
        filteredEnrollments = filteredEnrollments.filter(e => {
          const assessment = assessmentsByEnrollment[e.id];
          if (!assessment?.score) return false;
          if (filters.minAssessmentScore !== undefined && assessment.score < filters.minAssessmentScore) return false;
          if (filters.maxAssessmentScore !== undefined && assessment.score > filters.maxAssessmentScore) return false;
          return true;
        });
      }

      // Apply interview date filter
      if (filters.interviewDateFrom || filters.interviewDateTo) {
        filteredEnrollments = filteredEnrollments.filter(e => {
          const interview = interviewByEnrollment[e.id];
          if (!interview?.scheduledAt) return false;
          const scheduledDate = new Date(interview.scheduledAt);
          if (filters.interviewDateFrom && scheduledDate < new Date(filters.interviewDateFrom)) return false;
          if (filters.interviewDateTo && scheduledDate > new Date(filters.interviewDateTo)) return false;
          return true;
        });
      }

      const total = filteredEnrollments.length;

      // Apply pagination
      const paginatedEnrollments = filteredEnrollments.slice(offset, offset + limit);

      // Transform to ReviewerCandidate format
      const candidates: ReviewerCandidate[] = paginatedEnrollments.map(e => {
        const provider = e.solution_providers as any;
        const country = provider?.countries as any;
        const industry = e.industry_segments as any;
        const expertise = e.expertise_levels as any;
        const mode = e.participation_modes as any;
        const interview = interviewByEnrollment[e.id];
        const assessment = assessmentsByEnrollment[e.id];
        const ppStats = proofPointStats[e.id] || { verified: 0, high: 0, medium: 0, low: 0, needsRevision: 0 };
        const evaluation = interview ? evaluationsByBooking[interview.bookingId] : null;

        return {
          enrollmentId: e.id,
          providerId: e.provider_id,
          providerName: `${provider?.first_name || ""} ${provider?.last_name || ""}`.trim() || "Unknown",
          countryCode: country?.code || null,
          countryName: country?.name || null,
          industrySegmentId: e.industry_segment_id,
          industryName: industry?.name || "Unknown",
          expertiseLevelId: e.expertise_level_id,
          expertiseLevelName: expertise?.name || null,
          participationModeId: e.participation_mode_id,
          participationModeName: mode?.name || null,
          participationModeCode: mode?.code || null,
          lifecycleStatus: e.lifecycle_status,
          lifecycleRank: e.lifecycle_rank,
          interviewBookingId: interview?.bookingId || null,
          interviewScheduledAt: interview?.scheduledAt || null,
          interviewStatus: interview?.status || null,
          proofPointsTotal: proofPointCounts[e.id] || 0,
          proofPointsVerified: ppStats.verified,
          proofPointsHigh: ppStats.high,
          proofPointsMedium: ppStats.medium,
          proofPointsLow: ppStats.low,
          proofPointsNeedsRevision: ppStats.needsRevision,
          assessmentScore: assessment?.score ?? null,
          assessmentPassed: assessment?.passed ?? null,
          assessmentQuestionsAnswered: assessment?.questionsAnswered ?? null,
          interviewScore: evaluation?.score ?? null,
          interviewOutcome: evaluation?.outcome ?? null,
          proficiencyAreas: profAreasByEnrollment[e.id] || [],
          flagForClarification: interview?.flagForClarification || false,
          reviewerNotes: interview?.reviewerNotes || null,
        };
      });

      return { candidates, total };
    },
    enabled: !!reviewerId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Fetches filter options for the candidates page
 */
export function useCandidateFilterOptions() {
  return useQuery({
    queryKey: ["candidate-filter-options"],
    queryFn: async () => {
      const [
        { data: countries },
        { data: expertiseLevels },
        { data: participationModes },
      ] = await Promise.all([
        supabase
          .from("countries")
          .select("id, name, code")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("expertise_levels")
          .select("id, name, level_number")
          .eq("is_active", true)
          .order("level_number"),
        supabase
          .from("participation_modes")
          .select("id, name, code")
          .eq("is_active", true)
          .order("display_order"),
      ]);

      return {
        countries: countries || [],
        expertiseLevels: expertiseLevels || [],
        participationModes: participationModes || [],
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
