import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleMutationError, logWarning } from "@/lib/errorHandler";
import { toast } from "sonner";
import type { RelevanceRating } from "@/services/proofPointsScoreService";

// Types for proof points review
export interface ProofPointLink {
  id: string;
  url: string;
  title: string | null;
}

export interface ProofPointFile {
  id: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  storagePath: string;
}

export interface SpecialityTag {
  id: string;
  specialityId: string;
  specialityName: string;
  subDomainName?: string;
  proficiencyAreaName?: string;
}

export interface ProofPointForReview {
  id: string;
  title: string;
  description: string;
  type: string;
  category: 'general' | 'specialty_specific';
  createdAt: string;
  updatedAt: string | null;
  
  // Supporting evidence
  links: ProofPointLink[];
  files: ProofPointFile[];
  specialityTags: SpecialityTag[];
  
  // Hierarchy path for specialty-linked items
  hierarchyPath?: string;
  
  // Review data (nullable = not yet rated)
  reviewRelevanceRating: RelevanceRating | null;
  reviewScoreRating: number | null;
  reviewComments: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface CandidateProofPointsData {
  // Provider context
  providerName: string;
  industrySegmentName: string;
  expertiseLevelName: string | null;
  
  // Enrollment-level review status
  reviewStatus: 'pending' | 'in_progress' | 'completed';
  reviewedBy: string | null;
  reviewedAt: string | null;
  finalScore: number | null;
  reviewerNotes: string | null;
  
  // Interview submission status
  isInterviewSubmitted: boolean;
  
  // Proof points
  proofPoints: ProofPointForReview[];
  
  // Summary stats
  totalCount: number;
  ratedCount: number;
  allRated: boolean;
}

export interface UpdateProofPointRatingParams {
  proofPointId: string;
  relevanceRating?: RelevanceRating | null;
  scoreRating?: number | null;
  comments?: string | null;
}

export interface ConfirmProofPointsReviewParams {
  enrollmentId: string;
  finalScore: number;
  reviewerNotes?: string;
}

/**
 * Fetch all proof points for a candidate with review data
 */
export function useCandidateProofPoints(enrollmentId: string) {
  return useQuery({
    queryKey: ['candidate-proof-points', enrollmentId],
    queryFn: async (): Promise<CandidateProofPointsData> => {
      // Fetch enrollment with provider context
      // Note: new columns (proof_points_review_*) will be accessed via 'as any' cast
      // since they're not yet in generated types
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('provider_industry_enrollments')
        .select(`
          id,
          provider_id,
          industry_segments:industry_segment_id(name),
          expertise_levels:expertise_level_id(name),
          solution_providers:provider_id(first_name, last_name)
        `)
        .eq('id', enrollmentId)
        .single();

      if (enrollmentError) throw new Error(enrollmentError.message);
      if (!enrollment) throw new Error('Enrollment not found');

      // Check if interview has been submitted for this enrollment
      const { data: bookingData } = await supabase
        .from('interview_bookings')
        .select('interview_submitted_at')
        .eq('enrollment_id', enrollmentId)
        .not('status', 'eq', 'cancelled')
        .maybeSingle();

      const isInterviewSubmitted = !!bookingData?.interview_submitted_at;

      // Fetch proof points for this enrollment
      const { data: proofPoints, error: ppError } = await supabase
        .from('proof_points')
        .select('*')
        .eq('enrollment_id', enrollmentId)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false });

      if (ppError) throw new Error(ppError.message);

      const proofPointIds = (proofPoints || []).map(pp => pp.id);

      // Fetch links, files, and tags in parallel
      const [linksResult, filesResult, tagsResult] = await Promise.all([
        proofPointIds.length > 0
          ? supabase
              .from('proof_point_links')
              .select('*')
              .in('proof_point_id', proofPointIds)
          : { data: [], error: null },
        proofPointIds.length > 0
          ? supabase
              .from('proof_point_files')
              .select('*')
              .in('proof_point_id', proofPointIds)
          : { data: [], error: null },
        proofPointIds.length > 0
          ? supabase
              .from('proof_point_speciality_tags')
              .select(`
                id,
                proof_point_id,
                speciality_id,
                specialities:speciality_id(
                  name,
                  sub_domains:sub_domain_id(
                    name,
                    proficiency_areas:proficiency_area_id(name)
                  )
                )
              `)
              .in('proof_point_id', proofPointIds)
          : { data: [], error: null },
      ]);

      // Group links, files, tags by proof point ID
      const linksMap = new Map<string, ProofPointLink[]>();
      const filesMap = new Map<string, ProofPointFile[]>();
      const tagsMap = new Map<string, SpecialityTag[]>();

      for (const link of linksResult.data || []) {
        const existing = linksMap.get(link.proof_point_id) || [];
        existing.push({
          id: link.id,
          url: link.url,
          title: link.title,
        });
        linksMap.set(link.proof_point_id, existing);
      }

      for (const file of filesResult.data || []) {
        const existing = filesMap.get(file.proof_point_id) || [];
        existing.push({
          id: file.id,
          fileName: file.file_name,
          fileSize: file.file_size,
          mimeType: file.mime_type,
          storagePath: file.storage_path,
        });
        filesMap.set(file.proof_point_id, existing);
      }

      for (const tag of tagsResult.data || []) {
        const existing = tagsMap.get(tag.proof_point_id) || [];
        const speciality = tag.specialities as any;
        const subDomain = speciality?.sub_domains as any;
        const profArea = subDomain?.proficiency_areas as any;
        
        existing.push({
          id: tag.id,
          specialityId: tag.speciality_id,
          specialityName: speciality?.name || 'Unknown',
          subDomainName: subDomain?.name,
          proficiencyAreaName: profArea?.name,
        });
        tagsMap.set(tag.proof_point_id, existing);
      }

      // Build proof points for review
      const formattedProofPoints: ProofPointForReview[] = (proofPoints || []).map(pp => {
        const tags = tagsMap.get(pp.id) || [];
        const hierarchyPaths = tags
          .filter(t => t.proficiencyAreaName)
          .map(t => `${t.proficiencyAreaName} > ${t.subDomainName} > ${t.specialityName}`);
        
        // Cast to access new columns (workaround until types regenerated)
        const ppAny = pp as any;
        
        return {
          id: pp.id,
          title: pp.title,
          description: pp.description,
          type: pp.type,
          category: pp.category as 'general' | 'specialty_specific',
          createdAt: pp.created_at,
          updatedAt: pp.updated_at,
          links: linksMap.get(pp.id) || [],
          files: filesMap.get(pp.id) || [],
          specialityTags: tags,
          hierarchyPath: hierarchyPaths.length > 0 ? hierarchyPaths[0] : undefined,
          reviewRelevanceRating: ppAny.review_relevance_rating || null,
          reviewScoreRating: ppAny.review_score_rating ?? null,
          reviewComments: ppAny.review_comments || null,
          reviewedBy: ppAny.reviewed_by || null,
          reviewedAt: ppAny.reviewed_at || null,
        };
      });

      // Sort: specialty_specific with tags first, then specialty_specific without tags, then general
      formattedProofPoints.sort((a, b) => {
        const aIsSpecialty = a.category === 'specialty_specific';
        const bIsSpecialty = b.category === 'specialty_specific';
        const aHasTags = a.specialityTags.length > 0;
        const bHasTags = b.specialityTags.length > 0;

        if (aIsSpecialty && aHasTags && !(bIsSpecialty && bHasTags)) return -1;
        if (bIsSpecialty && bHasTags && !(aIsSpecialty && aHasTags)) return 1;
        if (aIsSpecialty && !aHasTags && !bIsSpecialty) return -1;
        if (bIsSpecialty && !bHasTags && !aIsSpecialty) return 1;
        
        return new Date(b.updatedAt || b.createdAt).getTime() - 
               new Date(a.updatedAt || a.createdAt).getTime();
      });

      const ratedCount = formattedProofPoints.filter(
        pp => pp.reviewRelevanceRating !== null && pp.reviewScoreRating !== null
      ).length;

      const enrollmentAny = enrollment as any;
      const provider = enrollmentAny.solution_providers;
      const industry = enrollmentAny.industry_segments;
      const expertise = enrollmentAny.expertise_levels;

      return {
        providerName: `${provider?.first_name || ''} ${provider?.last_name || ''}`.trim() || 'Unknown',
        industrySegmentName: industry?.name || 'Unknown',
        expertiseLevelName: expertise?.name || null,
        reviewStatus: enrollmentAny.proof_points_review_status || 'pending',
        reviewedBy: enrollmentAny.proof_points_reviewed_by || null,
        reviewedAt: enrollmentAny.proof_points_reviewed_at || null,
        finalScore: enrollmentAny.proof_points_final_score || null,
        reviewerNotes: enrollmentAny.proof_points_reviewer_notes || null,
        isInterviewSubmitted,
        proofPoints: formattedProofPoints,
        totalCount: formattedProofPoints.length,
        ratedCount,
        allRated: ratedCount === formattedProofPoints.length && formattedProofPoints.length > 0,
      };
    },
    enabled: !!enrollmentId,
  });
}

/**
 * Update a single proof point rating
 */
export function useUpdateProofPointRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateProofPointRatingParams) => {
      const { proofPointId, relevanceRating, scoreRating, comments } = params;

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (relevanceRating !== undefined) {
        updateData.review_relevance_rating = relevanceRating;
      }
      if (scoreRating !== undefined) {
        updateData.review_score_rating = scoreRating;
      }
      if (comments !== undefined) {
        updateData.review_comments = comments;
      }

      // Set reviewed_by and reviewed_at when both ratings are provided
      if (relevanceRating && scoreRating !== null && scoreRating !== undefined) {
        updateData.reviewed_by = userId;
        updateData.reviewed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('proof_points')
        .update(updateData)
        .eq('id', proofPointId);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_, params) => {
      // Optimistically update the cache
      queryClient.invalidateQueries({ 
        queryKey: ['candidate-proof-points'],
        refetchType: 'none' 
      });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_proof_point_rating' });
    },
  });
}

/**
 * Save draft (batch update all ratings without lifecycle change)
 */
export function useSaveProofPointsReviewDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { 
      enrollmentId: string; 
      ratings: Array<{ proofPointId: string; relevanceRating: RelevanceRating | null; scoreRating: number | null; comments: string | null }>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      // Update enrollment status to in_progress
      const { error: enrollmentError } = await supabase
        .from('provider_industry_enrollments')
        .update({
          proof_points_review_status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.enrollmentId);

      if (enrollmentError) throw new Error(enrollmentError.message);

      // Batch update proof points
      for (const rating of params.ratings) {
        if (rating.relevanceRating !== null || rating.scoreRating !== null || rating.comments !== null) {
          const updateData: Record<string, any> = {
            updated_at: new Date().toISOString(),
          };
          
          if (rating.relevanceRating !== null) {
            updateData.review_relevance_rating = rating.relevanceRating;
          }
          if (rating.scoreRating !== null) {
            updateData.review_score_rating = rating.scoreRating;
          }
          if (rating.comments !== null) {
            updateData.review_comments = rating.comments;
          }
          if (rating.relevanceRating && rating.scoreRating !== null) {
            updateData.reviewed_by = userId;
            updateData.reviewed_at = new Date().toISOString();
          }

          const { error } = await supabase
            .from('proof_points')
            .update(updateData)
            .eq('id', rating.proofPointId);

          if (error) {
            logWarning(`Failed to update proof point ${rating.proofPointId}`, { 
              operation: 'save_draft_rating' 
            });
          }
        }
      }
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['candidate-proof-points', params.enrollmentId] });
      toast.success('Scores saved');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'save_proof_points_draft' });
    },
  });
}

/**
 * Confirm proof points review (validates all rated, computes score, updates lifecycle)
 */
export function useConfirmProofPointsReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ConfirmProofPointsReviewParams) => {
      const { enrollmentId, finalScore, reviewerNotes } = params;

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      // Update enrollment with final score and completed status
      const { error } = await supabase
        .from('provider_industry_enrollments')
        .update({
          proof_points_review_status: 'completed',
          proof_points_reviewed_by: userId,
          proof_points_reviewed_at: new Date().toISOString(),
          proof_points_final_score: finalScore,
          proof_points_reviewer_notes: reviewerNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['candidate-proof-points', params.enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['candidate-detail'] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-candidates'] });
      toast.success('Proof Points review completed');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'confirm_proof_points_review' });
    },
  });
}
