import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Speciality {
  id: string;
  name: string;
  description: string | null;
}

interface SubDomain {
  id: string;
  name: string;
  description: string | null;
  specialities: Speciality[];
}

interface ProficiencyArea {
  id: string;
  name: string;
  description: string | null;
  subDomains: SubDomain[];
}

/**
 * Fetches the taxonomy tree filtered to only show the provider's SELECTED proficiency areas
 * from the Expertise Selection tab, not ALL available areas.
 * 
 * Additionally filters specialities by level_speciality_map to only show specialities
 * explicitly mapped to the provider's expertise level.
 * 
 * This is used in Proof Points → Speciality Mapping to show only relevant options.
 */
export function useProviderSelectedTaxonomy(enrollmentId?: string) {
  return useQuery({
    queryKey: ['provider_selected_taxonomy', enrollmentId],
    queryFn: async (): Promise<ProficiencyArea[]> => {
      if (!enrollmentId) return [];

      // Step 1: Fetch the enrollment to get expertise_level_id
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('provider_industry_enrollments')
        .select('expertise_level_id')
        .eq('id', enrollmentId)
        .single();

      if (enrollmentError) throw enrollmentError;
      if (!enrollment?.expertise_level_id) return [];

      const expertiseLevelId = enrollment.expertise_level_id;

      // Step 2: Fetch provider's selected proficiency areas for this enrollment
      const { data: selectedAreas, error: selectedError } = await supabase
        .from('provider_proficiency_areas')
        .select('proficiency_area_id')
        .eq('enrollment_id', enrollmentId);

      if (selectedError) throw selectedError;
      if (!selectedAreas?.length) return [];

      const selectedAreaIds = selectedAreas.map(sa => sa.proficiency_area_id);

      // Step 3: Fetch the proficiency areas with their details
      const { data: areas, error: areasError } = await supabase
        .from('proficiency_areas')
        .select('id, name, description')
        .in('id', selectedAreaIds)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (areasError) throw areasError;
      if (!areas?.length) return [];

      // Step 4: Fetch all sub_domains for selected areas
      const { data: subDomains, error: subDomainsError } = await supabase
        .from('sub_domains')
        .select('id, name, description, proficiency_area_id')
        .in('proficiency_area_id', selectedAreaIds)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (subDomainsError) throw subDomainsError;

      // Step 5: Fetch speciality IDs mapped to this expertise level
      const { data: levelMappings, error: mappingError } = await supabase
        .from('level_speciality_map')
        .select('speciality_id')
        .eq('expertise_level_id', expertiseLevelId);

      if (mappingError) throw mappingError;

      const mappedSpecialityIds = new Set(levelMappings?.map(m => m.speciality_id) || []);

      // Step 6: Fetch all specialities for these sub_domains, filtered by level mapping
      const subDomainIds = subDomains?.map(sd => sd.id) || [];
      let specialities: Array<{ id: string; name: string; description: string | null; sub_domain_id: string }> = [];
      
      if (subDomainIds.length > 0) {
        const { data: specData, error: specialitiesError } = await supabase
          .from('specialities')
          .select('id, name, description, sub_domain_id')
          .in('sub_domain_id', subDomainIds)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (specialitiesError) throw specialitiesError;
        
        // Filter to only include specialities mapped to this expertise level
        // If no mappings exist for this level, show all specialities (graceful fallback)
        if (mappedSpecialityIds.size > 0) {
          specialities = (specData || []).filter(sp => mappedSpecialityIds.has(sp.id));
        } else {
          specialities = specData || [];
        }
      }

      // Step 7: Build the tree structure
      return areas.map(area => ({
        ...area,
        subDomains: (subDomains || [])
          .filter(sd => sd.proficiency_area_id === area.id)
          .map(sd => ({
            id: sd.id,
            name: sd.name,
            description: sd.description,
            specialities: specialities.filter(sp => sp.sub_domain_id === sd.id),
          })),
      }));
    },
    enabled: !!enrollmentId,
    staleTime: 5 * 60 * 1000, // 5 minutes - provider selections don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false, // Prevents refetch on copy-paste interactions
    refetchOnMount: false, // Data already cached from first load
    refetchOnReconnect: false, // Prevent network reconnect refetch
  });
}
