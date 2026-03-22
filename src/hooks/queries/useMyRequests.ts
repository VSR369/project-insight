/**
 * useMyRequests — Shared cursor-based infinite query for solution requests.
 * Used by both SolutionRequestsListPage and the CogniDashboard ActionItemsWidget.
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';

const PAGE_SIZE = 20;

export interface RequestRow {
  id: string;
  title: string;
  master_status: string;
  operating_model: string | null;
  current_phase: number | null;
  phase_status: string | null;
  created_at: string;
  updated_at: string | null;
  urgency: string;
  architect_name: string | null;
}

export interface PageResult {
  rows: RequestRow[];
  nextCursor: string | null;
}

export function useMyRequests(statusFilter: string, searchTerm: string) {
  const { data: currentOrg } = useCurrentOrg();
  const orgId = currentOrg?.organizationId;

  return useInfiniteQuery<PageResult>({
    queryKey: ['my-requests', orgId, statusFilter, searchTerm],
    queryFn: async ({ pageParam }): Promise<PageResult> => {
      if (!orgId) return { rows: [], nextCursor: null };

      let query = supabase
        .from('challenges')
        .select('id, title, master_status, current_phase, phase_status, created_at, updated_at, eligibility, operating_model')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE + 1);

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('master_status', statusFilter);
      }

      if (searchTerm.trim()) {
        query = query.ilike('title', `%${searchTerm.trim()}%`);
      }

      if (pageParam) {
        query = query.lt('created_at', pageParam as string);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      const items = data ?? [];
      const hasMore = items.length > PAGE_SIZE;
      const pageItems = hasMore ? items.slice(0, PAGE_SIZE) : items;
      const nextCursor = hasMore ? pageItems[pageItems.length - 1]?.created_at : null;

      // Fetch architect names
      const challengeIds = pageItems.map((c: any) => c.id);
      let architectMap: Record<string, string> = {};

      if (challengeIds.length > 0) {
        const { data: roles } = await supabase
          .from('user_challenge_roles')
          .select('challenge_id, user_id')
          .in('challenge_id', challengeIds)
          .eq('role_code', 'CR')
          .eq('is_active', true)
          .limit(200);

        if (roles && roles.length > 0) {
          const userIds = [...new Set(roles.map((r: any) => r.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', userIds);

          const profileMap: Record<string, string> = {};
          (profiles ?? []).forEach((p: any) => {
            const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
            profileMap[p.id] = fullName || p.email || 'Unknown';
          });

          roles.forEach((r: any) => {
            architectMap[r.challenge_id] = profileMap[r.user_id] || 'Assigned';
          });
        }
      }

      const rows: RequestRow[] = pageItems.map((c: any) => {
        let urgency = 'standard';
        try {
          const elig = typeof c.eligibility === 'string' ? JSON.parse(c.eligibility) : c.eligibility;
          if (elig?.urgency) urgency = elig.urgency;
        } catch {
          // ignore
        }

        return {
          id: c.id,
          title: c.title,
          master_status: c.master_status ?? 'DRAFT',
          operating_model: c.operating_model ?? null,
          current_phase: c.current_phase,
          created_at: c.created_at,
          urgency,
          architect_name: architectMap[c.id] ?? null,
        };
      });

      return { rows, nextCursor };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!orgId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
