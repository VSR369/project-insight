/**
 * useFullTaxonomyTree — Fetches the full expertise taxonomy tree for an industry segment.
 * Extracted from SolverExpertiseSection.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STABLE } from '@/config/queryCache';

export interface TaxonomyLevel {
  id: string;
  name: string;
  level_number: number;
  description: string | null;
  proficiencyAreas: TaxonomyProfArea[];
}

export interface TaxonomyProfArea {
  id: string;
  name: string;
  description: string | null;
  expertise_level_id: string;
  subDomains: TaxonomySubDomain[];
}

export interface TaxonomySubDomain {
  id: string;
  name: string;
  description: string | null;
  proficiency_area_id: string;
  specialities: TaxonomySpeciality[];
}

export interface TaxonomySpeciality {
  id: string;
  name: string;
  description: string | null;
  sub_domain_id: string;
}

export function useFullTaxonomyTree(industrySegmentId?: string) {
  const { data: expertiseLevels, isLoading: elLoading } = useQuery({
    queryKey: ["expertise-levels-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expertise_levels")
        .select("id, name, level_number, description")
        .eq("is_active", true)
        .not("name", "like", "__SMOKE_TEST_%")
        .order("level_number");
      if (error) return [];
      return data ?? [];
    },
    ...CACHE_STABLE,
  });

  const { data: proficiencyAreas, isLoading: paLoading } = useQuery({
    queryKey: ["taxonomy-prof-areas", industrySegmentId],
    queryFn: async () => {
      if (!industrySegmentId) return [];
      const { data, error } = await supabase
        .from("proficiency_areas")
        .select("id, name, description, expertise_level_id")
        .eq("industry_segment_id", industrySegmentId)
        .eq("is_active", true)
        .not("name", "like", "__SMOKE_TEST_%")
        .order("display_order");
      if (error) return [];
      return data ?? [];
    },
    enabled: !!industrySegmentId,
    ...CACHE_STABLE,
  });

  const paIds = useMemo(() => (proficiencyAreas ?? []).map(p => p.id), [proficiencyAreas]);
  const { data: subDomains, isLoading: sdLoading } = useQuery({
    queryKey: ["taxonomy-sub-domains", paIds],
    queryFn: async () => {
      if (paIds.length === 0) return [];
      const results = [];
      for (let i = 0; i < paIds.length; i += 50) {
        const batch = paIds.slice(i, i + 50);
        const { data } = await supabase
          .from("sub_domains")
          .select("id, name, description, proficiency_area_id")
          .in("proficiency_area_id", batch)
          .eq("is_active", true)
          .order("display_order");
        if (data) results.push(...data);
      }
      return results;
    },
    enabled: paIds.length > 0,
    ...CACHE_STABLE,
  });

  const sdIds = useMemo(() => (subDomains ?? []).map(s => s.id), [subDomains]);
  const { data: specialities, isLoading: spLoading } = useQuery({
    queryKey: ["taxonomy-specialities", sdIds],
    queryFn: async () => {
      if (sdIds.length === 0) return [];
      const results = [];
      for (let i = 0; i < sdIds.length; i += 50) {
        const batch = sdIds.slice(i, i + 50);
        const { data } = await supabase
          .from("specialities")
          .select("id, name, description, sub_domain_id")
          .in("sub_domain_id", batch)
          .eq("is_active", true)
          .order("display_order");
        if (data) results.push(...data);
      }
      return results;
    },
    enabled: sdIds.length > 0,
    ...CACHE_STABLE,
  });

  const tree = useMemo<TaxonomyLevel[]>(() => {
    if (!expertiseLevels || !proficiencyAreas) return [];
    return expertiseLevels.map(el => ({
      ...el,
      proficiencyAreas: proficiencyAreas
        .filter(pa => pa.expertise_level_id === el.id)
        .map(pa => ({
          ...pa,
          subDomains: (subDomains ?? [])
            .filter(sd => sd.proficiency_area_id === pa.id)
            .map(sd => ({
              ...sd,
              specialities: (specialities ?? [])
                .filter(sp => sp.sub_domain_id === sd.id),
            })),
        })),
    }));
  }, [expertiseLevels, proficiencyAreas, subDomains, specialities]);

  return { tree, expertiseLevels: expertiseLevels ?? [], isLoading: elLoading || paLoading || sdLoading || spLoading };
}
