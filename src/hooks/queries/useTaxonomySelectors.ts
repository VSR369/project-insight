/**
 * useTaxonomySelectors — Fetches industry segments and proficiency areas
 * for the Solution Request categorisation section.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaxonomySegment {
  id: string;
  name: string;
  code: string;
}

export interface TaxonomySubDomain {
  id: string;
  name: string;
}

export function useIndustrySegmentOptions() {
  return useQuery({
    queryKey: ['taxonomy-industry-segments'],
    queryFn: async (): Promise<TaxonomySegment[]> => {
      const { data, error } = await supabase
        .from('industry_segments')
        .select('id, name, code')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as TaxonomySegment[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * @deprecated Use `useTaxonomyCascade` instead — this hook queried the wrong table.
 * Kept temporarily for backward compatibility.
 */
export function useSubDomainOptions() {
  return useQuery({
    queryKey: ['taxonomy-sub-domains-deprecated'],
    queryFn: async (): Promise<TaxonomySubDomain[]> => {
      const { data, error } = await supabase
        .from('sub_domains')
        .select('id, name')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw new Error(error.message);
      // Deduplicate by name
      const seen = new Map<string, TaxonomySubDomain>();
      for (const row of (data ?? [])) {
        if (!seen.has(row.name)) seen.set(row.name, row as TaxonomySubDomain);
      }
      return Array.from(seen.values());
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
