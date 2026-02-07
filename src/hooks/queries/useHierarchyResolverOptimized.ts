import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Optimized types with only columns needed for hierarchy resolution
interface IndustrySegmentLookup {
  id: string;
  name: string;
  code: string;
  display_order: number | null;
  is_active: boolean;
}

interface ExpertiseLevelLookup {
  id: string;
  name: string;
  level_number: number;
  is_active: boolean;
}

interface ProficiencyAreaLookup {
  id: string;
  name: string;
  industry_segment_id: string;
  expertise_level_id: string;
  display_order: number | null;
  is_active: boolean;
}

interface SubDomainLookup {
  id: string;
  name: string;
  proficiency_area_id: string;
  display_order: number | null;
  is_active: boolean;
}

interface SpecialityLookup {
  id: string;
  name: string;
  sub_domain_id: string;
  display_order: number | null;
  is_active: boolean;
}

export interface HierarchyData {
  industrySegments: IndustrySegmentLookup[];
  expertiseLevels: ExpertiseLevelLookup[];
  proficiencyAreas: ProficiencyAreaLookup[];
  subDomains: SubDomainLookup[];
  specialities: SpecialityLookup[];
}

export interface ResolvedHierarchy {
  specialityId: string | null;
  errors: string[];
  resolvedPath: {
    industrySegment?: IndustrySegmentLookup;
    expertiseLevel?: ExpertiseLevelLookup;
    proficiencyArea?: ProficiencyAreaLookup;
    subDomain?: SubDomainLookup;
    speciality?: SpecialityLookup;
  };
}

/**
 * Pre-built lookup maps for O(1) hierarchy resolution
 * This is critical for parsing 11,000+ rows efficiently
 */
export interface HierarchyLookupMaps {
  industryMap: Map<string, IndustrySegmentLookup>;
  levelMap: Map<string, ExpertiseLevelLookup>;
  // Composite key: `${industryId}|${levelId}|${normalizedName}`
  areaMap: Map<string, ProficiencyAreaLookup>;
  // Composite key: `${areaId}|${normalizedName}`
  subDomainMap: Map<string, SubDomainLookup>;
  // Composite key: `${subDomainId}|${normalizedName}`
  specialityMap: Map<string, SpecialityLookup>;
}

const normalize = (s: string): string => s.trim().toLowerCase();

/**
 * Build pre-computed lookup maps for O(1) resolution during import
 */
export function buildLookupMaps(data: HierarchyData): HierarchyLookupMaps {
  const industryMap = new Map<string, IndustrySegmentLookup>();
  const levelMap = new Map<string, ExpertiseLevelLookup>();
  const areaMap = new Map<string, ProficiencyAreaLookup>();
  const subDomainMap = new Map<string, SubDomainLookup>();
  const specialityMap = new Map<string, SpecialityLookup>();

  // Industry segments by normalized name
  for (const seg of data.industrySegments) {
    industryMap.set(normalize(seg.name), seg);
  }

  // Expertise levels by normalized name
  for (const level of data.expertiseLevels) {
    levelMap.set(normalize(level.name), level);
  }

  // Proficiency areas by composite key
  for (const area of data.proficiencyAreas) {
    const key = `${area.industry_segment_id}|${area.expertise_level_id}|${normalize(area.name)}`;
    areaMap.set(key, area);
  }

  // Sub-domains by composite key
  for (const sd of data.subDomains) {
    const key = `${sd.proficiency_area_id}|${normalize(sd.name)}`;
    subDomainMap.set(key, sd);
  }

  // Specialities by composite key
  for (const spec of data.specialities) {
    const key = `${spec.sub_domain_id}|${normalize(spec.name)}`;
    specialityMap.set(key, spec);
  }

  return { industryMap, levelMap, areaMap, subDomainMap, specialityMap };
}

/**
 * Fast O(1) hierarchy resolution using pre-built lookup maps
 */
export function resolveHierarchyFast(
  maps: HierarchyLookupMaps,
  industrySegmentName: string,
  expertiseLevelName: string,
  proficiencyAreaName: string,
  subDomainName: string,
  specialityName: string
): ResolvedHierarchy {
  const errors: string[] = [];
  const resolvedPath: ResolvedHierarchy["resolvedPath"] = {};

  // Step 1: Industry segment - O(1)
  const industrySegment = maps.industryMap.get(normalize(industrySegmentName));
  if (!industrySegment) {
    errors.push(`Industry segment "${industrySegmentName}" not found`);
    return { specialityId: null, errors, resolvedPath };
  }
  resolvedPath.industrySegment = industrySegment;

  // Step 2: Expertise level - O(1)
  const expertiseLevel = maps.levelMap.get(normalize(expertiseLevelName));
  if (!expertiseLevel) {
    errors.push(`Expertise level "${expertiseLevelName}" not found`);
    return { specialityId: null, errors, resolvedPath };
  }
  resolvedPath.expertiseLevel = expertiseLevel;

  // Step 3: Proficiency area - O(1) with composite key
  const areaKey = `${industrySegment.id}|${expertiseLevel.id}|${normalize(proficiencyAreaName)}`;
  const proficiencyArea = maps.areaMap.get(areaKey);
  if (!proficiencyArea) {
    errors.push(
      `Proficiency area "${proficiencyAreaName}" not found for "${industrySegmentName}" at expertise level "${expertiseLevelName}". Verify this area exists in the taxonomy.`
    );
    return { specialityId: null, errors, resolvedPath };
  }
  resolvedPath.proficiencyArea = proficiencyArea;

  // Step 4: Sub-domain - O(1) with composite key
  const sdKey = `${proficiencyArea.id}|${normalize(subDomainName)}`;
  const subDomain = maps.subDomainMap.get(sdKey);
  if (!subDomain) {
    errors.push(
      `Sub-domain "${subDomainName}" not found under proficiency area "${proficiencyAreaName}" for "${expertiseLevelName}". Check sub-domain spelling.`
    );
    return { specialityId: null, errors, resolvedPath };
  }
  resolvedPath.subDomain = subDomain;

  // Step 5: Speciality - O(1) with composite key
  const specKey = `${subDomain.id}|${normalize(specialityName)}`;
  const speciality = maps.specialityMap.get(specKey);
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
 * Hook to fetch all hierarchy data for resolution during import
 */
export function useHierarchyData() {
  return useQuery({
    queryKey: ["hierarchy_data_all"],
    queryFn: async (): Promise<HierarchyData> => {
      // Fetch all data in parallel with specific columns for performance
      const [
        { data: industrySegments, error: isError },
        { data: expertiseLevels, error: elError },
        { data: proficiencyAreas, error: paError },
        { data: subDomains, error: sdError },
        { data: specialities, error: spError },
      ] = await Promise.all([
        supabase
          .from("industry_segments")
          .select("id, name, code, display_order, is_active")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("expertise_levels")
          .select("id, name, level_number, is_active")
          .eq("is_active", true)
          .order("level_number", { ascending: true }),
        supabase
          .from("proficiency_areas")
          .select("id, name, industry_segment_id, expertise_level_id, display_order, is_active")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("sub_domains")
          .select("id, name, proficiency_area_id, display_order, is_active")
          .eq("is_active", true)
          .order("display_order", { ascending: true }),
        supabase
          .from("specialities")
          .select("id, name, sub_domain_id, display_order, is_active")
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
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });
}

/**
 * Hook that provides pre-built lookup maps for fast resolution
 * Use this in the import dialog for O(1) hierarchy resolution
 */
export function useHierarchyLookupMaps() {
  const { data: hierarchyData, isLoading, error } = useHierarchyData();

  const lookupMaps = useMemo(() => {
    if (!hierarchyData) return null;
    return buildLookupMaps(hierarchyData);
  }, [hierarchyData]);

  return {
    lookupMaps,
    hierarchyData,
    isLoading,
    error,
  };
}

/**
 * Hook to fetch questions with full hierarchy data for export
 * Uses pagination to bypass PostgREST default row limit
 */
export function useQuestionsWithHierarchy(specialityId?: string) {
  return useQuery({
    queryKey: ["questions_with_hierarchy", specialityId],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      const MAX_PAGES = 50; // safety cap (50k rows)
      const allQuestions: any[] = [];

      for (let page = 0; page < MAX_PAGES; page++) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

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
          .order("created_at", { ascending: false })
          .range(from, to);

        if (specialityId) {
          query = query.eq("speciality_id", specialityId);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        const pageRows = data ?? [];
        allQuestions.push(...pageRows);

        // Last page reached when we get fewer rows than requested
        if (pageRows.length < PAGE_SIZE) break;
      }

      return allQuestions;
    },
    enabled: true,
  });
}

// Re-export legacy function for backward compatibility
export function resolveHierarchy(
  hierarchyData: HierarchyData,
  industrySegmentName: string,
  expertiseLevelName: string,
  proficiencyAreaName: string,
  subDomainName: string,
  specialityName: string
): ResolvedHierarchy {
  // Build maps on-the-fly for legacy usage (less efficient but backward compatible)
  const maps = buildLookupMaps(hierarchyData);
  return resolveHierarchyFast(
    maps,
    industrySegmentName,
    expertiseLevelName,
    proficiencyAreaName,
    subDomainName,
    specialityName
  );
}
