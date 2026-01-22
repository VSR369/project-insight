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
 * Fetches the provider's expertise data for a given enrollment
 * Builds a tree of only the provider's selected proficiency items
 */
export function useCandidateExpertise(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: ["candidate-expertise", enrollmentId],
    queryFn: async (): Promise<CandidateExpertise> => {
      if (!enrollmentId) throw new Error("Enrollment ID required");

      // Fetch enrollment with expertise level details
      // Note: Using 'as any' for new columns until types are regenerated
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("provider_industry_enrollments")
        .select(`
          expertise_level_id,
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

      // Separate fetch for new review columns (until types are updated)
      const { data: reviewData } = await supabase
        .from("provider_industry_enrollments")
        .select("*")
        .eq("id", enrollmentId)
        .single() as { data: any; error: any };

      if (enrollmentError) throw enrollmentError;

      // Fetch provider's selected proficiency areas
      const { data: providerAreas, error: areasError } = await supabase
        .from("provider_proficiency_areas")
        .select(`
          proficiency_area_id,
          proficiency_areas (
            id,
            name
          )
        `)
        .eq("enrollment_id", enrollmentId);

      if (areasError) throw areasError;

      // Fetch provider's selected specialities with full hierarchy
      const { data: providerSpecialities, error: specError } = await supabase
        .from("provider_specialities")
        .select(`
          speciality_id,
          specialities (
            id,
            name,
            sub_domain_id,
            sub_domains (
              id,
              name,
              proficiency_area_id
            )
          )
        `)
        .eq("enrollment_id", enrollmentId);

      if (specError) throw specError;

      // Build tree structure
      const areaMap = new Map<string, ProficiencyAreaNode>();

      // Add proficiency areas
      (providerAreas || []).forEach((pa: any) => {
        const area = pa.proficiency_areas;
        if (area && !areaMap.has(area.id)) {
          areaMap.set(area.id, {
            id: area.id,
            name: area.name,
            subDomains: [],
          });
        }
      });

      // Add specialities and their sub-domains
      const subDomainMap = new Map<string, SubDomainNode>();

      (providerSpecialities || []).forEach((ps: any) => {
        const spec = ps.specialities;
        if (!spec || !spec.sub_domains) return;

        const subDomain = spec.sub_domains;
        const areaId = subDomain.proficiency_area_id;

        // Ensure area exists
        if (!areaMap.has(areaId)) {
          // This shouldn't happen in well-formed data, but handle gracefully
          return;
        }

        // Add or get sub-domain
        if (!subDomainMap.has(subDomain.id)) {
          subDomainMap.set(subDomain.id, {
            id: subDomain.id,
            name: subDomain.name,
            specialities: [],
          });
        }

        // Add speciality to sub-domain
        const sdNode = subDomainMap.get(subDomain.id)!;
        if (!sdNode.specialities.find((s) => s.id === spec.id)) {
          sdNode.specialities.push({
            id: spec.id,
            name: spec.name,
          });
        }
      });

      // Link sub-domains to areas
      subDomainMap.forEach((subDomain) => {
        // Find which area this sub-domain belongs to
        const specWithThisSubDomain = (providerSpecialities || []).find(
          (ps: any) => ps.specialities?.sub_domains?.id === subDomain.id
        );
        if (specWithThisSubDomain) {
          const areaId = specWithThisSubDomain.specialities?.sub_domains?.proficiency_area_id;
          const area = areaMap.get(areaId);
          if (area && !area.subDomains.find((sd) => sd.id === subDomain.id)) {
            area.subDomains.push(subDomain);
          }
        }
      });

      const proficiencyTree = Array.from(areaMap.values());
      const totalSubDomains = proficiencyTree.reduce((acc, a) => acc + a.subDomains.length, 0);
      const totalSpecialities = proficiencyTree.reduce(
        (acc, a) => acc + a.subDomains.reduce((acc2, sd) => acc2 + sd.specialities.length, 0),
        0
      );

      const expertiseLevel = (enrollment as any).expertise_levels;

      return {
        expertiseLevelId: enrollment?.expertise_level_id ?? null,
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
        // If flagging, set status to needs_clarification
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
