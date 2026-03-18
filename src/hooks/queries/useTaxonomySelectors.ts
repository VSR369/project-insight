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

export function useSubDomainOptions() {
  return useQuery({
    queryKey: ['taxonomy-sub-domains'],
    queryFn: async (): Promise<TaxonomySubDomain[]> => {
      const { data, error } = await supabase
        .from('proficiency_areas')
        .select('id, name')
        .eq('is_active', true)
        .not('name', 'like', '__SMOKE_TEST_%')
        .order('display_order', { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as TaxonomySubDomain[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
