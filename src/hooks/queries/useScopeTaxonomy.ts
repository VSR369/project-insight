/**
 * useScopeTaxonomy — Hooks for cascading scope pickers
 * Proficiency Areas (by industry segment), Sub-domains, Specialities
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const CACHE = { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000, refetchOnWindowFocus: false as const };

/** Fetch proficiency areas for given industry segment IDs (all expertise levels) */
export function useProficiencyAreasBySegments(industrySegmentIds: string[]) {
  return useQuery({
    queryKey: ['proficiency_areas_by_segments', industrySegmentIds],
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
      // Deduplicate by name — same area appears once per expertise level
      const seen = new Map<string, typeof data[0]>();
      for (const row of data) {
        if (!seen.has(row.name)) seen.set(row.name, row);
      }
      return Array.from(seen.values());
    },
    enabled: industrySegmentIds.length > 0,
    ...CACHE,
  });
}

/** Fetch sub-domains for given proficiency area IDs (deduplicated by name) */
export function useSubDomainsByAreas(proficiencyAreaIds: string[]) {
  return useQuery({
    queryKey: ['sub_domains_by_areas', proficiencyAreaIds],
    queryFn: async () => {
      if (proficiencyAreaIds.length === 0) return [];
      const { data, error } = await supabase
        .from('sub_domains')
        .select('id, name, proficiency_area_id')
        .in('proficiency_area_id', proficiencyAreaIds)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      // Deduplicate by name — same sub-domain may appear under multiple proficiency areas
      const seen = new Map<string, typeof data[0]>();
      for (const row of data) {
        if (!seen.has(row.name)) seen.set(row.name, row);
      }
      return Array.from(seen.values());
    },
    enabled: proficiencyAreaIds.length > 0,
    ...CACHE,
  });
}

/** Fetch specialities for given sub-domain IDs */
export function useSpecialitiesBySubDomains(subDomainIds: string[]) {
  return useQuery({
    queryKey: ['specialities_by_sub_domains', subDomainIds],
    queryFn: async () => {
      if (subDomainIds.length === 0) return [];
      const { data, error } = await supabase
        .from('specialities')
        .select('id, name, sub_domain_id')
        .in('sub_domain_id', subDomainIds)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: subDomainIds.length > 0,
    ...CACHE,
  });
}

/** Fetch ALL proficiency areas (no industry filter) — used when "All Industries" is toggled */
export function useAllProficiencyAreas(enabled: boolean) {
  return useQuery({
    queryKey: ['proficiency_areas_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proficiency_areas')
        .select('id, name, industry_segment_id')
        .eq('is_active', true)
        .not('name', 'like', '__SMOKE_TEST_%')
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      // Deduplicate by name
      const seen = new Map<string, typeof data[0]>();
      for (const row of data) {
        if (!seen.has(row.name)) seen.set(row.name, row);
      }
      return Array.from(seen.values());
    },
    enabled,
    ...CACHE,
  });
}

/** Fetch ALL specialities (no sub-domain filter) */
export function useAllSpecialities(enabled: boolean) {
  return useQuery({
    queryKey: ['specialities_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specialities')
        .select('id, name, sub_domain_id')
        .eq('is_active', true)
        .not('name', 'like', '__SMOKE_TEST_%')
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      // Deduplicate by name
      const seen = new Map<string, typeof data[0]>();
      for (const row of data) {
        if (!seen.has(row.name)) seen.set(row.name, row);
      }
      return Array.from(seen.values());
    },
    enabled,
    ...CACHE,
  });
}
