import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentProvider } from './useProvider';
import { useEnrollmentContext, useOptionalEnrollmentContext } from '@/contexts/EnrollmentContext';

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

/**
 * Fetch provider hierarchy data, scoped to the active enrollment for multi-industry support.
 * CRITICAL: Uses ENROLLMENT-scoped data (industry_segment_id, expertise_level_id)
 * and filters proficiency areas/specialities by enrollment_id.
 */
export function useProviderHierarchy(): ProviderHierarchy {
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const enrollmentContext = useOptionalEnrollmentContext();
  const activeEnrollment = enrollmentContext?.activeEnrollment ?? null;
  const activeEnrollmentId = enrollmentContext?.activeEnrollmentId ?? null;

  // CRITICAL: Use ENROLLMENT industry_segment_id, not provider
  const industrySegmentId = activeEnrollment?.industry_segment_id ?? provider?.industry_segment_id;
  
  // CRITICAL: Use ENROLLMENT expertise_level_id, not provider
  const expertiseLevelId = activeEnrollment?.expertise_level_id ?? provider?.expertise_level_id;

  // Fetch industry segment name
  const { data: industrySegment, isLoading: industryLoading } = useQuery({
    queryKey: ['hierarchy-industry', industrySegmentId],
    queryFn: async () => {
      if (!industrySegmentId) return null;
      const { data, error } = await supabase
        .from('industry_segments')
        .select('id, name')
        .eq('id', industrySegmentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!industrySegmentId,
    staleTime: 300000, // 5 minutes
  });

  // Fetch expertise level name
  const { data: expertiseLevel, isLoading: expertiseLoading } = useQuery({
    queryKey: ['hierarchy-expertise', expertiseLevelId],
    queryFn: async () => {
      if (!expertiseLevelId) return null;
      const { data, error } = await supabase
        .from('expertise_levels')
        .select('id, name')
        .eq('id', expertiseLevelId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!expertiseLevelId,
    staleTime: 300000,
  });

  // CRITICAL: Fetch proficiency areas filtered by ENROLLMENT ID
  const { data: proficiencyAreas, isLoading: areasLoading } = useQuery({
    queryKey: ['hierarchy-proficiency-areas', provider?.id, activeEnrollmentId],
    queryFn: async () => {
      if (!provider?.id) return [];
      
      let query = supabase
        .from('provider_proficiency_areas')
        .select(`
          proficiency_area_id,
          enrollment_id,
          proficiency_areas!inner(id, name)
        `)
        .eq('provider_id', provider.id);
      
      // Filter by enrollment_id if available for multi-industry isolation
      if (activeEnrollmentId) {
        query = query.eq('enrollment_id', activeEnrollmentId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((item: any) => ({
        id: item.proficiency_areas.id,
        name: item.proficiency_areas.name,
      }));
    },
    enabled: !!provider?.id,
    staleTime: 300000,
  });

  // CRITICAL: Fetch specialities filtered by ENROLLMENT ID
  const { data: specialitiesData, isLoading: specialitiesLoading } = useQuery({
    queryKey: ['hierarchy-specialities', provider?.id, activeEnrollmentId],
    queryFn: async () => {
      if (!provider?.id) return { specialities: [], subDomains: [] };
      
      let query = supabase
        .from('provider_specialities')
        .select(`
          speciality_id,
          enrollment_id,
          specialities!inner(
            id, 
            name,
            sub_domains!inner(id, name)
          )
        `)
        .eq('provider_id', provider.id);
      
      // Filter by enrollment_id if available for multi-industry isolation
      if (activeEnrollmentId) {
        query = query.eq('enrollment_id', activeEnrollmentId);
      }
      
      const { data, error } = await query;
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
