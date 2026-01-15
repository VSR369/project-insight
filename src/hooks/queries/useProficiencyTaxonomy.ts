import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useProficiencyAreas(industrySegmentId?: string, expertiseLevelId?: string) {
  return useQuery({
    queryKey: ['proficiency_areas', industrySegmentId, expertiseLevelId],
    queryFn: async () => {
      if (!industrySegmentId || !expertiseLevelId) return [];
      
      const { data, error } = await supabase
        .from('proficiency_areas')
        .select('id, name, description')
        .eq('industry_segment_id', industrySegmentId)
        .eq('expertise_level_id', expertiseLevelId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!industrySegmentId && !!expertiseLevelId,
  });
}

export function useSubDomains(proficiencyAreaId?: string) {
  return useQuery({
    queryKey: ['sub_domains', proficiencyAreaId],
    queryFn: async () => {
      if (!proficiencyAreaId) return [];
      
      const { data, error } = await supabase
        .from('sub_domains')
        .select('id, name, description')
        .eq('proficiency_area_id', proficiencyAreaId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!proficiencyAreaId,
  });
}

export function useSpecialities(subDomainId?: string) {
  return useQuery({
    queryKey: ['specialities', subDomainId],
    queryFn: async () => {
      if (!subDomainId) return [];
      
      const { data, error } = await supabase
        .from('specialities')
        .select('id, name, description')
        .eq('sub_domain_id', subDomainId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!subDomainId,
  });
}

// Fetch full taxonomy tree for an industry segment + expertise level combination
export function useProficiencyTaxonomy(industrySegmentId?: string, expertiseLevelId?: string) {
  return useQuery({
    queryKey: ['proficiency_taxonomy', industrySegmentId, expertiseLevelId],
    queryFn: async () => {
      if (!industrySegmentId || !expertiseLevelId) return [];
      
      // Fetch proficiency areas with nested sub_domains and specialities
      const { data: areas, error: areasError } = await supabase
        .from('proficiency_areas')
        .select('id, name, description')
        .eq('industry_segment_id', industrySegmentId)
        .eq('expertise_level_id', expertiseLevelId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (areasError) throw areasError;
      if (!areas?.length) return [];

      // Fetch all sub_domains for these areas
      const areaIds = areas.map(a => a.id);
      const { data: subDomains, error: subDomainsError } = await supabase
        .from('sub_domains')
        .select('id, name, description, proficiency_area_id')
        .in('proficiency_area_id', areaIds)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (subDomainsError) throw subDomainsError;

      // Fetch all specialities for these sub_domains
      const subDomainIds = subDomains?.map(sd => sd.id) || [];
      const { data: specialities, error: specialitiesError } = await supabase
        .from('specialities')
        .select('id, name, description, sub_domain_id')
        .in('sub_domain_id', subDomainIds)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (specialitiesError) throw specialitiesError;

      // Build the tree structure
      return areas.map(area => ({
        ...area,
        subDomains: (subDomains || [])
          .filter(sd => sd.proficiency_area_id === area.id)
          .map(sd => ({
            ...sd,
            specialities: (specialities || []).filter(sp => sp.sub_domain_id === sd.id),
          })),
      }));
    },
    enabled: !!industrySegmentId && !!expertiseLevelId,
    staleTime: 300000, // 5 minutes - taxonomy doesn't change often
  });
}
