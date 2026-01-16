import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentProvider } from './useProvider';

export interface HierarchyLevel {
  id: string;
  name: string;
}

export interface ProviderHierarchy {
  industrySegment: HierarchyLevel | null;
  expertiseLevel: HierarchyLevel | null;
  proficiencyAreas: HierarchyLevel[];
  subDomains: HierarchyLevel[];
  specialities: HierarchyLevel[];
  isLoading: boolean;
}

export function useProviderHierarchy(): ProviderHierarchy {
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();

  // Fetch industry segment name
  const { data: industrySegment, isLoading: industryLoading } = useQuery({
    queryKey: ['hierarchy-industry', provider?.industry_segment_id],
    queryFn: async () => {
      if (!provider?.industry_segment_id) return null;
      const { data, error } = await supabase
        .from('industry_segments')
        .select('id, name')
        .eq('id', provider.industry_segment_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!provider?.industry_segment_id,
    staleTime: 300000, // 5 minutes
  });

  // Fetch expertise level name
  const { data: expertiseLevel, isLoading: expertiseLoading } = useQuery({
    queryKey: ['hierarchy-expertise', provider?.expertise_level_id],
    queryFn: async () => {
      if (!provider?.expertise_level_id) return null;
      const { data, error } = await supabase
        .from('expertise_levels')
        .select('id, name')
        .eq('id', provider.expertise_level_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!provider?.expertise_level_id,
    staleTime: 300000,
  });

  // Fetch proficiency areas with names
  const { data: proficiencyAreas, isLoading: areasLoading } = useQuery({
    queryKey: ['hierarchy-proficiency-areas', provider?.id],
    queryFn: async () => {
      if (!provider?.id) return [];
      const { data, error } = await supabase
        .from('provider_proficiency_areas')
        .select(`
          proficiency_area_id,
          proficiency_areas!inner(id, name)
        `)
        .eq('provider_id', provider.id);
      if (error) throw error;
      return (data || []).map((item: any) => ({
        id: item.proficiency_areas.id,
        name: item.proficiency_areas.name,
      }));
    },
    enabled: !!provider?.id,
    staleTime: 300000,
  });

  // Fetch specialities with sub-domain names
  const { data: specialitiesData, isLoading: specialitiesLoading } = useQuery({
    queryKey: ['hierarchy-specialities', provider?.id],
    queryFn: async () => {
      if (!provider?.id) return { specialities: [], subDomains: [] };
      const { data, error } = await supabase
        .from('provider_specialities')
        .select(`
          speciality_id,
          specialities!inner(
            id, 
            name,
            sub_domains!inner(id, name)
          )
        `)
        .eq('provider_id', provider.id);
      if (error) throw error;
      
      const specialities: HierarchyLevel[] = [];
      const subDomainsMap = new Map<string, HierarchyLevel>();
      
      (data || []).forEach((item: any) => {
        specialities.push({
          id: item.specialities.id,
          name: item.specialities.name,
        });
        const subDomain = item.specialities.sub_domains;
        if (subDomain && !subDomainsMap.has(subDomain.id)) {
          subDomainsMap.set(subDomain.id, {
            id: subDomain.id,
            name: subDomain.name,
          });
        }
      });
      
      return {
        specialities,
        subDomains: Array.from(subDomainsMap.values()),
      };
    },
    enabled: !!provider?.id,
    staleTime: 300000,
  });

  const isLoading = providerLoading || industryLoading || expertiseLoading || areasLoading || specialitiesLoading;

  return {
    industrySegment: industrySegment || null,
    expertiseLevel: expertiseLevel || null,
    proficiencyAreas: proficiencyAreas || [],
    subDomains: specialitiesData?.subDomains || [],
    specialities: specialitiesData?.specialities || [],
    isLoading,
  };
}
