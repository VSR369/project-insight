/**
 * useBrowseChallenges — Fetches challenges for the Browse Challenges page.
 * Shows all non-deleted challenges with org info and industry data.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STANDARD } from '@/config/queryCache';

export interface BrowseChallengeItem {
  id: string;
  title: string;
  problem_statement: string | null;
  hook: string | null;
  master_status: string | null;
  status: string;
  complexity_level: string | null;
  maturity_level: string | null;
  submission_deadline: string | null;
  currency_code: string | null;
  total_fee: number | null;
  created_at: string;
  published_at: string | null;
  visibility: string | null;
  organization_name: string | null;
  trade_brand_name: string | null;
  industry_name: string | null;
}

export function useBrowseChallenges() {
  return useQuery({
    queryKey: ['browse-challenges'],
    queryFn: async (): Promise<BrowseChallengeItem[]> => {
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          id, title, problem_statement, hook, master_status, status,
          complexity_level, maturity_level, submission_deadline,
          currency_code, total_fee, created_at, published_at, visibility,
          seeker_organizations!challenges_organization_id_fkey (
            organization_name, trade_brand_name
          ),
          industry_segments (name)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      return (data || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        problem_statement: c.problem_statement,
        hook: c.hook,
        master_status: c.master_status,
        status: c.status,
        complexity_level: c.complexity_level,
        maturity_level: c.maturity_level,
        submission_deadline: c.submission_deadline,
        currency_code: c.currency_code,
        total_fee: c.total_fee ? Number(c.total_fee) : null,
        created_at: c.created_at,
        published_at: c.published_at,
        visibility: c.visibility,
        organization_name: c.seeker_organizations?.organization_name ?? null,
        trade_brand_name: c.seeker_organizations?.trade_brand_name ?? null,
        industry_name: c.industry_segments?.name ?? null,
      }));
    },
    ...CACHE_STANDARD,
  });
}
