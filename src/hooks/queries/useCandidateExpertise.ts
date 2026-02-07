import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleMutationError } from "@/lib/errorHandler";
import { toast } from "sonner";

// Tree node types
interface SpecialityNode {
  id: string;
  name: string;
}

interface SubDomainNode {
  id: string;
  name: string;
  specialities: SpecialityNode[];
}

interface ProficiencyAreaNode {
  id: string;
  name: string;
  subDomains: SubDomainNode[];
}

export interface CandidateExpertise {
  // Industry segment info
  industrySegmentId: string | null;
  industrySegmentName: string | null;
  industrySegmentCode: string | null;

  // Expertise level info
  expertiseLevelId: string | null;
  expertiseLevelName: string | null;
  expertiseLevelDescription: string | null;
  levelNumber: number | null;
  minYears: number | null;
  maxYears: number | null;

  // Review status
  reviewStatus: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  flagForClarification: string | null;
  reviewerNotes: string | null;

  // Filtered proficiency tree (only provider's selections)
  proficiencyTree: ProficiencyAreaNode[];
  
  // Counts
  totalAreas: number;
  totalSubDomains: number;
  totalSpecialities: number;
}

/**
 * Fetches the provider's expertise data for a given enrollment.
 * Builds a tree using the CORRECT data model:
 * - Industry Segment & Expertise Level from enrollment
 * - Proficiency Areas from provider_proficiency_areas
 * - Sub-domains: ALL under selected proficiency areas
 * - Specialities: filtered by level_speciality_map
 */
export function useCandidateExpertise(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: ["candidate-expertise", enrollmentId],
    queryFn: async (): Promise<CandidateExpertise> => {
      if (!enrollmentId) throw new Error("Enrollment ID required");

      // Step 1: Fetch enrollment with industry segment and expertise level
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("provider_industry_enrollments")
        .select(`
          expertise_level_id,
          industry_segment_id,
          industry_segments (
            id,
            name,
            code
          ),
          expertise_levels (
            id,
            name,
            description,
            level_number,
            min_years,
            max_years
          )
        `)
        .eq("id", enrollmentId)
        .single();

      if (enrollmentError) throw enrollmentError;

      // Separate fetch for review columns (until types are updated)
      const { data: reviewData } = await supabase
        .from("provider_industry_enrollments")
        .select("expertise_review_status, expertise_reviewed_by, expertise_reviewed_at, expertise_flag_for_clarification, expertise_reviewer_notes")
        .eq("id", enrollmentId)
        .single() as { data: any; error: any };

      const industrySegment = (enrollment as any).industry_segments;
      const expertiseLevel = (enrollment as any).expertise_levels;
      const expertiseLevelId = enrollment?.expertise_level_id;

      // Step 2: Fetch provider's selected proficiency areas
      const { data: providerAreas, error: areasError } = await supabase
        .from("provider_proficiency_areas")
        .select("proficiency_area_id")
        .eq("enrollment_id", enrollmentId);

      if (areasError) throw areasError;

      const selectedAreaIds = providerAreas?.map(pa => pa.proficiency_area_id) || [];

      // If no areas selected, return empty tree
      if (selectedAreaIds.length === 0) {
        return {
          industrySegmentId: enrollment?.industry_segment_id ?? null,
          industrySegmentName: industrySegment?.name ?? null,
          industrySegmentCode: industrySegment?.code ?? null,
          expertiseLevelId: expertiseLevelId ?? null,
          expertiseLevelName: expertiseLevel?.name ?? null,
          expertiseLevelDescription: expertiseLevel?.description ?? null,
          levelNumber: expertiseLevel?.level_number ?? null,
          minYears: expertiseLevel?.min_years ?? null,
          maxYears: expertiseLevel?.max_years ?? null,
          reviewStatus: reviewData?.expertise_review_status ?? "pending",
          reviewedBy: reviewData?.expertise_reviewed_by ?? null,
          reviewedAt: reviewData?.expertise_reviewed_at ?? null,
          flagForClarification: reviewData?.expertise_flag_for_clarification ?? null,
          reviewerNotes: reviewData?.expertise_reviewer_notes ?? null,
          proficiencyTree: [],
          totalAreas: 0,
          totalSubDomains: 0,
          totalSpecialities: 0,
        };
      }

      // Step 3: Fetch proficiency areas with names
      const { data: areas, error: areaDetailsError } = await supabase
        .from("proficiency_areas")
        .select("id, name, description")
        .in("id", selectedAreaIds)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (areaDetailsError) throw areaDetailsError;

      // Step 4: Fetch ALL sub-domains under selected proficiency areas
      const { data: subDomains, error: subDomainsError } = await supabase
        .from("sub_domains")
        .select("id, name, description, proficiency_area_id")
        .in("proficiency_area_id", selectedAreaIds)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (subDomainsError) throw subDomainsError;

      // Step 5: Fetch level_speciality_map for filtering
      let mappedSpecialityIds = new Set<string>();
      if (expertiseLevelId) {
        const { data: levelMappings, error: mappingError } = await supabase
          .from("level_speciality_map")
          .select("speciality_id")
          .eq("expertise_level_id", expertiseLevelId);

        if (mappingError) throw mappingError;
        mappedSpecialityIds = new Set(levelMappings?.map(m => m.speciality_id) || []);
      }

      // Step 6: Fetch specialities under sub-domains
      const subDomainIds = subDomains?.map(sd => sd.id) || [];
      let specialities: Array<{ id: string; name: string; sub_domain_id: string }> = [];

      if (subDomainIds.length > 0) {
        const { data: allSpecialities, error: specialitiesError } = await supabase
          .from("specialities")
          .select("id, name, description, sub_domain_id")
          .in("sub_domain_id", subDomainIds)
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (specialitiesError) throw specialitiesError;

        // Filter by level mapping if mappings exist, otherwise show all
        if (mappedSpecialityIds.size > 0) {
          specialities = (allSpecialities || []).filter(sp => mappedSpecialityIds.has(sp.id));
        } else {
          specialities = allSpecialities || [];
        }
      }

      // Step 7: Build tree structure
      const proficiencyTree: ProficiencyAreaNode[] = (areas || []).map(area => ({
        id: area.id,
        name: area.name,
        subDomains: (subDomains || [])
          .filter(sd => sd.proficiency_area_id === area.id)
          .map(sd => ({
            id: sd.id,
            name: sd.name,
            specialities: specialities
              .filter(sp => sp.sub_domain_id === sd.id)
              .map(sp => ({ id: sp.id, name: sp.name })),
          })),
      }));

      const totalSubDomains = proficiencyTree.reduce((acc, a) => acc + a.subDomains.length, 0);
      const totalSpecialities = proficiencyTree.reduce(
        (acc, a) => acc + a.subDomains.reduce((acc2, sd) => acc2 + sd.specialities.length, 0),
        0
      );

      return {
        industrySegmentId: enrollment?.industry_segment_id ?? null,
        industrySegmentName: industrySegment?.name ?? null,
        industrySegmentCode: industrySegment?.code ?? null,
        expertiseLevelId: expertiseLevelId ?? null,
        expertiseLevelName: expertiseLevel?.name ?? null,
        expertiseLevelDescription: expertiseLevel?.description ?? null,
        levelNumber: expertiseLevel?.level_number ?? null,
        minYears: expertiseLevel?.min_years ?? null,
        maxYears: expertiseLevel?.max_years ?? null,
        reviewStatus: reviewData?.expertise_review_status ?? "pending",
        reviewedBy: reviewData?.expertise_reviewed_by ?? null,
        reviewedAt: reviewData?.expertise_reviewed_at ?? null,
        flagForClarification: reviewData?.expertise_flag_for_clarification ?? null,
        reviewerNotes: reviewData?.expertise_reviewer_notes ?? null,
        proficiencyTree,
        totalAreas: proficiencyTree.length,
        totalSubDomains,
        totalSpecialities,
      };
    },
    enabled: !!enrollmentId,
  });
}

interface UpdateExpertiseReviewInput {
  enrollmentId: string;
  flagForClarification?: string;
  reviewerNotes?: string;
}

/**
 * Mutation to update expertise review notes/flags
 */
export function useUpdateExpertiseReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enrollmentId, flagForClarification, reviewerNotes }: UpdateExpertiseReviewInput) => {
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (flagForClarification !== undefined) {
        updates.expertise_flag_for_clarification = flagForClarification || null;
        if (flagForClarification && flagForClarification.trim().length > 0) {
          updates.expertise_review_status = "needs_clarification";
        }
      }

      if (reviewerNotes !== undefined) {
        updates.expertise_reviewer_notes = reviewerNotes || null;
      }

      const { error } = await supabase
        .from("provider_industry_enrollments")
        .update(updates)
        .eq("id", enrollmentId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidate-expertise", variables.enrollmentId] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "update_expertise_review" });
    },
  });
}

interface VerifyExpertiseInput {
  enrollmentId: string;
}

/**
 * Mutation to verify expertise (mark as verified)
 */
export function useVerifyExpertise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enrollmentId }: VerifyExpertiseInput) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("provider_industry_enrollments")
        .update({
          expertise_review_status: "verified",
          expertise_reviewed_by: user?.id ?? null,
          expertise_reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", enrollmentId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["candidate-expertise", variables.enrollmentId] });
      toast.success("Expertise verified successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "verify_expertise" });
    },
  });
}
