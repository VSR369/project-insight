/**
 * useTaxonomyCascade — Reusable hook for the full taxonomy cascade:
 * Industry Segments → Proficiency Areas → Sub-domains → Specialities
 *
 * Fetches across ALL expertise levels for the given industry segments,
 * deduplicates by name at every level, and collects all underlying IDs
 * so child queries work correctly even after dedup.
 *
 * Usage:
 *   const cascade = useTaxonomyCascade(selectedIndustryIds);
 *   // cascade.proficiencyAreas — deduplicated list
 *   // cascade.getSubDomains(selectedProfAreaIds) — filtered & deduplicated
 *   // cascade.getSpecialities(selectedSubDomainIds) — filtered & deduplicated
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const CACHE = { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000, refetchOnWindowFocus: false as const };

export interface TaxonomyItem {
  id: string;
  name: string;
  /** All row IDs that share this name (for child queries) */
  allIds: string[];
}

// ─── Internal: deduplicate rows by name, collecting all IDs ───

function deduplicateByName<T extends { id: string; name: string }>(rows: T[]): TaxonomyItem[] {
  const map = new Map<string, TaxonomyItem>();
  for (const row of rows) {
    const existing = map.get(row.name);
    if (existing) {
      existing.allIds.push(row.id);
    } else {
      map.set(row.name, { id: row.id, name: row.name, allIds: [row.id] });
    }
  }
  return Array.from(map.values());
}

// ─── Proficiency Areas (all expertise levels for given segments) ───

function useProficiencyAreasForCascade(industrySegmentIds: string[]) {
  return useQuery({
    queryKey: ['taxonomy_cascade_prof_areas', industrySegmentIds],
    queryFn: async () => {
      if (industrySegmentIds.length === 0) return [];
      const { data, error } = await supabase
        .from('proficiency_areas')
        .select('id, name, industry_segment_id')
        .in('industry_segment_id', industrySegmentIds)
        .eq('is_active', true)
        .not('name', 'like', '__SMOKE_TEST_%')
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: industrySegmentIds.length > 0,
    ...CACHE,
  });
}

// ─── Sub-domains (for given proficiency area IDs) ───

function useSubDomainsForCascade(proficiencyAreaIds: string[]) {
  return useQuery({
    queryKey: ['taxonomy_cascade_sub_domains', proficiencyAreaIds],
    queryFn: async () => {
      if (proficiencyAreaIds.length === 0) return [];
      const { data, error } = await supabase
        .from('sub_domains')
        .select('id, name, proficiency_area_id')
        .in('proficiency_area_id', proficiencyAreaIds)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: proficiencyAreaIds.length > 0,
    ...CACHE,
  });
}

// ─── Specialities (for given sub-domain IDs) ───

function useSpecialitiesForCascade(subDomainIds: string[]) {
  return useQuery({
    queryKey: ['taxonomy_cascade_specialities', subDomainIds],
    queryFn: async () => {
      if (subDomainIds.length === 0) return [];
      const { data, error } = await supabase
        .from('specialities')
        .select('id, name, sub_domain_id')
        .in('sub_domain_id', subDomainIds)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: subDomainIds.length > 0,
    ...CACHE,
  });
}

// ─── Main hook ───

export function useTaxonomyCascade(industrySegmentIds: string[]) {
  // 1. Fetch all proficiency areas (across all expertise levels)
  const { data: rawProfAreas = [], isLoading: loadingProfAreas } = useProficiencyAreasForCascade(industrySegmentIds);

  // Deduplicate proficiency areas by name
  const proficiencyAreas = useMemo(() => deduplicateByName(rawProfAreas), [rawProfAreas]);

  // Collect ALL proficiency area IDs (not just deduplicated first-seen)
  const allProfAreaIds = useMemo(() => rawProfAreas.map(r => r.id), [rawProfAreas]);

  // 2. Fetch all sub-domains for ALL proficiency area IDs
  const { data: rawSubDomains = [], isLoading: loadingSubDomains } = useSubDomainsForCascade(allProfAreaIds);

  // Deduplicate sub-domains by name
  const subDomains = useMemo(() => deduplicateByName(rawSubDomains), [rawSubDomains]);

  // Collect ALL sub-domain IDs
  const allSubDomainIds = useMemo(() => rawSubDomains.map(r => r.id), [rawSubDomains]);

  // 3. Fetch all specialities for ALL sub-domain IDs
  const { data: rawSpecialities = [], isLoading: loadingSpecialities } = useSpecialitiesForCascade(allSubDomainIds);

  // Deduplicate specialities by name
  const specialities = useMemo(() => deduplicateByName(rawSpecialities), [rawSpecialities]);

  /**
   * Get sub-domains filtered by selected proficiency area IDs.
   * Expands deduplicated IDs to find matching sub-domains.
   */
  const getSubDomainsByProfAreas = useMemo(() => {
    return (selectedProfAreaIds: string[]): TaxonomyItem[] => {
      if (selectedProfAreaIds.length === 0) return subDomains; // show all
      // Expand selected IDs through dedup map to get all underlying IDs
      const expandedIds = new Set<string>();
      for (const item of proficiencyAreas) {
        if (selectedProfAreaIds.includes(item.id) || item.allIds.some(id => selectedProfAreaIds.includes(id))) {
          item.allIds.forEach(id => expandedIds.add(id));
        }
      }
      // Filter raw sub-domains by expanded proficiency area IDs, then dedup
      const filtered = rawSubDomains.filter(sd => expandedIds.has(sd.proficiency_area_id));
      return deduplicateByName(filtered);
    };
  }, [subDomains, proficiencyAreas, rawSubDomains]);

  /**
   * Get specialities filtered by selected sub-domain IDs.
   * Expands deduplicated IDs to find matching specialities.
   */
  const getSpecialitiesBySubDomains = useMemo(() => {
    return (selectedSubDomainIds: string[]): TaxonomyItem[] => {
      if (selectedSubDomainIds.length === 0) return specialities; // show all
      // Expand selected IDs through dedup map
      const expandedIds = new Set<string>();
      for (const item of subDomains) {
        if (selectedSubDomainIds.includes(item.id) || item.allIds.some(id => selectedSubDomainIds.includes(id))) {
          item.allIds.forEach(id => expandedIds.add(id));
        }
      }
      const filtered = rawSpecialities.filter(sp => expandedIds.has(sp.sub_domain_id));
      return deduplicateByName(filtered);
    };
  }, [specialities, subDomains, rawSpecialities]);

  return {
    proficiencyAreas,
    subDomains,
    specialities,
    getSubDomainsByProfAreas,
    getSpecialitiesBySubDomains,
    isLoading: loadingProfAreas || loadingSubDomains || loadingSpecialities,
  };
}
