/**
 * Final Result Data Hook
 * 
 * Aggregates all data needed for the Final Result tab:
 * - Lifecycle stage statuses
 * - Score summaries
 * - Composite score calculation
 * - Certification outcome
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  type StageStatus,
  type CertificationOutcome,
  calculateCompositeScore,
  getCertificationOutcome,
} from '@/constants/certification.constants';
import { LIFECYCLE_RANKS } from '@/constants/lifecycle.constants';

export interface FinalResultData {
  // Provider context
  providerName: string;
  enrollmentId: string;
  industryName: string;
  expertiseLevelName: string;

  // Lifecycle info
  lifecycleStatus: string;
  lifecycleRank: number;

  // Lifecycle Stage Statuses
  stages: {
    providerDetails: StageStatus;
    organizationInfo: StageStatus;
    expertiseLevel: StageStatus;
    proofPoints: StageStatus;
    knowledgeAssessment: StageStatus;
    interviewSlot: StageStatus;
    certificationStatus: StageStatus;
  };

  // Stage descriptions for display
  stageDescriptions: {
    providerDetails: string;
    organizationInfo: string;
    expertiseLevel: string;
    proofPoints: string;
    knowledgeAssessment: string;
    interviewSlot: string;
    certificationStatus: string;
  };

  // Score Summary
  scores: {
    proofPointsScore: number | null;
    proofPointsMax: number;
    assessmentScore: number | null;
    assessmentMax: number | null;
    assessmentPercentage: number | null;
    interviewScore: number | null;
    interviewMax: number;
  };

  // Composite Score
  compositeScore: number | null;
  isCompositeComplete: boolean;

  // Certification Outcome
  certificationOutcome: CertificationOutcome | null;

  // Certification details (from DB)
  certificationLevel: string | null;
  starRating: number | null;
  certifiedAt: string | null;

  // Flags
  requiresOrgInfo: boolean;
  isInterviewSubmitted: boolean;
}

export function useFinalResultData(enrollmentId?: string) {
  return useQuery({
    queryKey: ['final-result-data', enrollmentId],
    queryFn: async (): Promise<FinalResultData> => {
      if (!enrollmentId) throw new Error('Enrollment ID is required');

      // Fetch enrollment with related data
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('provider_industry_enrollments')
        .select(`
          id,
          provider_id,
          lifecycle_status,
          lifecycle_rank,
          participation_mode_id,
          proof_points_review_status,
          proof_points_final_score,
          composite_score,
          certification_level,
          star_rating,
          certified_at,
          industry_segment:industry_segments(id, name),
          expertise_level:expertise_levels(id, name),
          participation_mode:participation_modes(id, code, requires_org_info),
          provider:solution_providers(id, first_name, last_name)
        `)
        .eq('id', enrollmentId)
        .single();

      if (enrollmentError) throw new Error(enrollmentError.message);
      if (!enrollment) throw new Error('Enrollment not found');

      // Fetch proof points count
      const { count: proofPointsCount } = await supabase
        .from('proof_points')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', enrollment.provider_id)
        .eq('is_deleted', false);

      // Fetch latest assessment attempt
      const { data: latestAttempt } = await supabase
        .from('assessment_attempts')
        .select('id, submitted_at, is_passed, score_percentage, total_questions, answered_questions')
        .eq('enrollment_id', enrollmentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch interview booking
      const { data: interviewBooking } = await supabase
        .from('interview_bookings')
        .select('id, status, interview_score_out_of_10, interview_submitted_at')
        .eq('enrollment_id', enrollmentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Extract data
      const provider = enrollment.provider as { first_name: string | null; last_name: string | null } | null;
      const providerName = provider
        ? `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || 'Unknown Provider'
        : 'Unknown Provider';

      const industrySegment = enrollment.industry_segment as { name: string } | null;
      const expertiseLevel = enrollment.expertise_level as { name: string } | null;
      const participationMode = enrollment.participation_mode as { code: string; requires_org_info: boolean } | null;

      const requiresOrgInfo = participationMode?.requires_org_info ?? false;
      const lifecycleRank = enrollment.lifecycle_rank ?? 0;
      const lifecycleStatus = enrollment.lifecycle_status;

      // Determine stage statuses
      const stages = deriveStageStatuses(
        lifecycleRank,
        lifecycleStatus,
        requiresOrgInfo,
        enrollment.proof_points_review_status,
        proofPointsCount ?? 0,
        latestAttempt,
        interviewBooking
      );

      // Derive stage descriptions
      const stageDescriptions = deriveStageDescriptions(
        requiresOrgInfo,
        enrollment.proof_points_review_status,
        proofPointsCount ?? 0,
        latestAttempt,
        interviewBooking,
        lifecycleStatus
      );

      // Extract scores - prefer DB stored composite if available
      const proofPointsScore = enrollment.proof_points_final_score ?? null;
      const assessmentScore = latestAttempt?.answered_questions ?? null;
      const assessmentMax = latestAttempt?.total_questions ?? null;
      const assessmentPercentage = latestAttempt?.score_percentage ?? null;
      const interviewScore = interviewBooking?.interview_score_out_of_10 ?? null;
      const isInterviewSubmitted = !!interviewBooking?.interview_submitted_at;

      // Use DB composite score if available, otherwise calculate
      let compositeScore: number | null = enrollment.composite_score ?? null;
      let isCompositeComplete = compositeScore !== null;
      
      if (!compositeScore) {
        const calculated = calculateCompositeScore(
          proofPointsScore,
          assessmentPercentage,
          interviewScore
        );
        compositeScore = calculated.score;
        isCompositeComplete = calculated.isComplete;
      }

      // Derive certification outcome
      const certificationOutcome = compositeScore !== null
        ? getCertificationOutcome(compositeScore)
        : null;

      return {
        providerName,
        enrollmentId,
        industryName: industrySegment?.name ?? 'Unknown Industry',
        expertiseLevelName: expertiseLevel?.name ?? 'Unknown Level',
        lifecycleStatus,
        lifecycleRank,
        stages,
        stageDescriptions,
        scores: {
          proofPointsScore,
          proofPointsMax: 10,
          assessmentScore,
          assessmentMax,
          assessmentPercentage,
          interviewScore,
          interviewMax: 10,
        },
        compositeScore,
        isCompositeComplete,
        certificationOutcome,
        certificationLevel: enrollment.certification_level ?? null,
        starRating: enrollment.star_rating ?? null,
        certifiedAt: enrollment.certified_at ?? null,
        requiresOrgInfo,
        isInterviewSubmitted,
      };
    },
    enabled: !!enrollmentId,
    staleTime: 30000,
  });
}

function deriveStageStatuses(
  lifecycleRank: number,
  lifecycleStatus: string | null,
  requiresOrgInfo: boolean,
  proofPointsReviewStatus: string | null,
  proofPointsCount: number,
  latestAttempt: { submitted_at: string | null; is_passed: boolean | null } | null,
  interviewBooking: { status: string | null; interview_submitted_at: string | null } | null
): FinalResultData['stages'] {
  // 1. Provider Details - Always completed
  const providerDetails: StageStatus = 'completed';

  // 2. Organization Info
  const organizationInfo: StageStatus = 'completed'; // Always completed (not applicable shows in description)

  // 3. Expertise Level
  const expertiseLevel: StageStatus = lifecycleRank >= LIFECYCLE_RANKS.expertise_selected
    ? 'completed'
    : 'in_progress';

  // 4. Proof Points
  let proofPoints: StageStatus = 'not_started';
  if (proofPointsReviewStatus === 'completed') {
    proofPoints = 'completed';
  } else if (proofPointsReviewStatus === 'in_progress' || proofPointsCount > 0) {
    proofPoints = 'in_progress';
  }

  // 5. Knowledge Assessment
  let knowledgeAssessment: StageStatus = 'not_started';
  if (latestAttempt) {
    if (latestAttempt.submitted_at && latestAttempt.is_passed !== null) {
      knowledgeAssessment = 'completed';
    } else {
      knowledgeAssessment = 'in_progress';
    }
  }

  // 6. Interview Slot
  let interviewSlot: StageStatus = 'not_started';
  if (interviewBooking) {
    const status = interviewBooking.status?.toLowerCase();
    if (interviewBooking.interview_submitted_at || status === 'confirmed' || status === 'completed') {
      interviewSlot = 'completed';
    } else if (status === 'scheduled' || status === 'booked') {
      interviewSlot = 'in_progress';
    }
  }

  // 7. Certification Status - Always completed on Final Results view (read-only summary)
  const certificationStatus: StageStatus = 'completed';

  return {
    providerDetails,
    organizationInfo,
    expertiseLevel,
    proofPoints,
    knowledgeAssessment,
    interviewSlot,
    certificationStatus,
  };
}

function deriveStageDescriptions(
  requiresOrgInfo: boolean,
  proofPointsReviewStatus: string | null,
  proofPointsCount: number,
  latestAttempt: { score_percentage: number | null; total_questions: number | null; answered_questions: number | null; is_passed: boolean | null } | null,
  interviewBooking: { status: string | null; interview_submitted_at: string | null } | null,
  lifecycleStatus: string | null
): FinalResultData['stageDescriptions'] {
  // Provider Details
  const providerDetails = 'Provider information verified';

  // Organization Info
  const organizationInfo = requiresOrgInfo
    ? 'Organization details verified'
    : 'Not Applicable';

  // Expertise Level
  const expertiseLevel = 'Expertise level confirmed';

  // Proof Points
  let proofPoints = 'No proof points submitted';
  if (proofPointsReviewStatus === 'completed') {
    proofPoints = 'Review completed';
  } else if (proofPointsCount > 0) {
    proofPoints = `${proofPointsCount} proof point${proofPointsCount !== 1 ? 's' : ''} submitted`;
  }

  // Knowledge Assessment
  let knowledgeAssessment = 'Assessment not started';
  if (latestAttempt) {
    if (latestAttempt.score_percentage !== null) {
      const passed = latestAttempt.is_passed ? 'Passed' : 'Failed';
      knowledgeAssessment = `${latestAttempt.answered_questions ?? 0}/${latestAttempt.total_questions ?? 0} (${passed})`;
    } else {
      knowledgeAssessment = 'Assessment in progress';
    }
  }

  // Interview Slot
  let interviewSlot = 'Not scheduled';
  if (interviewBooking) {
    const status = interviewBooking.status?.toLowerCase();
    if (interviewBooking.interview_submitted_at) {
      interviewSlot = 'Interview completed';
    } else if (status === 'scheduled' || status === 'booked') {
      interviewSlot = 'Scheduled';
    } else if (status === 'cancelled') {
      interviewSlot = 'Cancelled';
    } else if (status === 'confirmed') {
      interviewSlot = 'Confirmed';
    }
  }

  // Certification Status
  let certificationStatus = 'Pending evaluation';
  if (lifecycleStatus === 'certified') {
    certificationStatus = 'Certified';
  } else if (lifecycleStatus === 'interview_unsuccessful') {
    certificationStatus = 'Interview Unsuccessful';
  } else if (interviewBooking?.interview_submitted_at) {
    certificationStatus = 'Awaiting final decision';
  }

  return {
    providerDetails,
    organizationInfo,
    expertiseLevel,
    proofPoints,
    knowledgeAssessment,
    interviewSlot,
    certificationStatus,
  };
}
