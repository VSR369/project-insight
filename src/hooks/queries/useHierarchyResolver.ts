import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

// Types
type IndustrySegment = Tables<"industry_segments">;
type ExpertiseLevel = Tables<"expertise_levels">;
type ProficiencyArea = Tables<"proficiency_areas">;
type SubDomain = Tables<"sub_domains">;
type Speciality = Tables<"specialities">;

export interface HierarchyData {
  industrySegments: IndustrySegment[];
  expertiseLevels: ExpertiseLevel[];
  proficiencyAreas: ProficiencyArea[];
  subDomains: SubDomain[];
  specialities: Speciality[];
}

export interface ResolvedHierarchy {
  specialityId: string | null;
  errors: string[];
  resolvedPath: {
    industrySegment?: IndustrySegment;
    expertiseLevel?: ExpertiseLevel;
    proficiencyArea?: ProficiencyArea;
    subDomain?: SubDomain;
    speciality?: Speciality;
  };
}

/**
 * Hook to fetch all hierarchy data for resolution during import
 */
export function useHierarchyData() {
  return useQuery({
    queryKey: ["hierarchy_data_all"],
    queryFn: async (): Promise<HierarchyData> => {
      // Fetch all data in parallel
      const [
        { data: industrySegments, error: isError },
        { data: expertiseLevels, error: elError },
        { data: proficiencyAreas, error: paError },
        { data: subDomains, error: sdError },
        { data: specialities, error: spError },
      ] = await Promise.all([
        supabase
          .from("industry_segments")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("expertise_levels")
          .select("*")
          .eq("is_active", true)
          .order("level_number", { ascending: true }),
        supabase
          .from("proficiency_areas")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("sub_domains")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("specialities")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
      ]);

      if (isError) throw new Error(`Failed to fetch industry segments: ${isError.message}`);
      if (elError) throw new Error(`Failed to fetch expertise levels: ${elError.message}`);
      if (paError) throw new Error(`Failed to fetch proficiency areas: ${paError.message}`);
      if (sdError) throw new Error(`Failed to fetch sub-domains: ${sdError.message}`);
      if (spError) throw new Error(`Failed to fetch specialities: ${spError.message}`);

      return {
        industrySegments: industrySegments || [],
        expertiseLevels: expertiseLevels || [],
        proficiencyAreas: proficiencyAreas || [],
        subDomains: subDomains || [],
        specialities: specialities || [],
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Resolves hierarchy path from names to IDs
 */
export function resolveHierarchy(
  hierarchyData: HierarchyData,
  industrySegmentName: string,
  expertiseLevelName: string,
  proficiencyAreaName: string,
  subDomainName: string,
  specialityName: string
): ResolvedHierarchy {
  const errors: string[] = [];
  const resolvedPath: ResolvedHierarchy["resolvedPath"] = {};

  // Normalize names for comparison
  const normalize = (s: string) => s.trim().toLowerCase();

  // Step 1: Find industry segment
  const industrySegment = hierarchyData.industrySegments.find(
    (is) => normalize(is.name) === normalize(industrySegmentName)
  );
  if (!industrySegment) {
    errors.push(`Industry segment "${industrySegmentName}" not found`);
    return { specialityId: null, errors, resolvedPath };
  }
  resolvedPath.industrySegment = industrySegment;

  // Step 2: Find expertise level
  const expertiseLevel = hierarchyData.expertiseLevels.find(
    (el) => normalize(el.name) === normalize(expertiseLevelName)
  );
  if (!expertiseLevel) {
    errors.push(`Expertise level "${expertiseLevelName}" not found`);
    return { specialityId: null, errors, resolvedPath };
  }
  resolvedPath.expertiseLevel = expertiseLevel;

  // Step 3: Find proficiency area (must match industry + expertise + name)
  const proficiencyArea = hierarchyData.proficiencyAreas.find(
    (pa) =>
      pa.industry_segment_id === industrySegment.id &&
      pa.expertise_level_id === expertiseLevel.id &&
      normalize(pa.name) === normalize(proficiencyAreaName)
  );
  if (!proficiencyArea) {
    errors.push(
      `Proficiency area "${proficiencyAreaName}" not found for "${industrySegmentName}" at expertise level "${expertiseLevelName}". Verify this area exists in the taxonomy.`
    );
    return { specialityId: null, errors, resolvedPath };
  }
  resolvedPath.proficiencyArea = proficiencyArea;

  // Step 4: Find sub-domain (must match proficiency area + name)
  const subDomain = hierarchyData.subDomains.find(
    (sd) =>
      sd.proficiency_area_id === proficiencyArea.id &&
      normalize(sd.name) === normalize(subDomainName)
  );
  if (!subDomain) {
    errors.push(
      `Sub-domain "${subDomainName}" not found under proficiency area "${proficiencyAreaName}" for "${expertiseLevelName}". Check sub-domain spelling.`
    );
    return { specialityId: null, errors, resolvedPath };
  }
  resolvedPath.subDomain = subDomain;

  // Step 5: Find speciality (must match sub-domain + name)
  const speciality = hierarchyData.specialities.find(
    (sp) =>
      sp.sub_domain_id === subDomain.id &&
      normalize(sp.name) === normalize(specialityName)
  );
  if (!speciality) {
    errors.push(
      `Speciality "${specialityName}" not found under sub-domain "${subDomainName}" for "${expertiseLevelName}". Verify speciality exists for this level.`
    );
    return { specialityId: null, errors, resolvedPath };
  }
  resolvedPath.speciality = speciality;

  return {
    specialityId: speciality.id,
    errors: [],
    resolvedPath,
  };
}

/**
 * Hook to fetch questions with full hierarchy data for export
 */
export function useQuestionsWithHierarchy(specialityId?: string) {
  return useQuery({
    queryKey: ["questions_with_hierarchy", specialityId],
    queryFn: async () => {
      let query = supabase
        .from("question_bank")
        .select(`
          *,
          specialities!inner (
            id,
            name,
            sub_domains!inner (
              id,
              name,
              proficiency_areas!inner (
                id,
                name,
                industry_segments!inner (id, name),
                expertise_levels!inner (id, name, level_number)
              )
            )
          ),
          question_capability_tags (
            id,
            capability_tag_id,
            capability_tags (id, name)
          )
        `)
        .order("created_at", { ascending: false });

      if (specialityId) {
        query = query.eq("speciality_id", specialityId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: true,
  });
}
