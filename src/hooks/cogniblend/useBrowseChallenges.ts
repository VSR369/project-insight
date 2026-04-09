/**
 * useBrowseChallenges — Fetches challenges for the Browse Challenges page.
 * Shows all non-deleted challenges with org info and industry data.
 * Applies solver_audience filtering for AGG challenges.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STANDARD } from '@/config/queryCache';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';

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

interface RawChallengeRow {
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
  operating_model: string | null;
  solver_audience: string | null;
  organization_id: string;
  seeker_organizations: { organization_name: string; trade_brand_name: string | null } | null;
  industry_segments: { name: string } | null;
}

function shouldIncludeChallenge(
  row: RawChallengeRow,
  solverOrgId: string | null | undefined,
): boolean {
  // MP or missing operating_model → no audience filter
  if (row.operating_model !== 'AGG') return true;

  const audience = row.solver_audience ?? 'ALL';
  if (audience === 'ALL') return true;

  if (audience === 'INTERNAL') {
    // Only show if solver belongs to same org
    return !!solverOrgId && solverOrgId === row.organization_id;
  }

  if (audience === 'EXTERNAL') {
    // Only show if solver does NOT belong to same org (or has no org)
    return !solverOrgId || solverOrgId !== row.organization_id;
  }

  return true;
}

export function useBrowseChallenges() {
  const { data: currentOrg } = useCurrentOrg();
  const solverOrgId = currentOrg?.organizationId ?? null;

  return useQuery({
    queryKey: ['browse-challenges', solverOrgId],
    queryFn: async (): Promise<BrowseChallengeItem[]> => {
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          id, title, problem_statement, hook, master_status, status,
          complexity_level, maturity_level, submission_deadline,
          currency_code, total_fee, created_at, published_at, visibility,
          operating_model, solver_audience, organization_id,
          seeker_organizations!challenges_organization_id_fkey (
            organization_name, trade_brand_name
          ),
          industry_segments (name)
        `)
        .eq('is_deleted', false)
        .eq('master_status', 'ACTIVE')
        .not('published_at', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      return (data || [])
        .filter((c: unknown) => shouldIncludeChallenge(c as RawChallengeRow, solverOrgId))
        .map((c: unknown) => {
          const row = c as RawChallengeRow;
          return {
            id: row.id,
            title: row.title,
            problem_statement: row.problem_statement,
            hook: row.hook,
            master_status: row.master_status,
            status: row.status,
            complexity_level: row.complexity_level,
            maturity_level: row.maturity_level,
            submission_deadline: row.submission_deadline,
            currency_code: row.currency_code,
            total_fee: row.total_fee ? Number(row.total_fee) : null,
            created_at: row.created_at,
            published_at: row.published_at,
            visibility: row.visibility,
            organization_name: row.seeker_organizations?.organization_name ?? null,
            trade_brand_name: row.seeker_organizations?.trade_brand_name ?? null,
            industry_name: row.industry_segments?.name ?? null,
          };
        });
    },
    ...CACHE_STANDARD,
  });
}
