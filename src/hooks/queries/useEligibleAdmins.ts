/**
 * Hook wrapper for get_eligible_admins_ranked RPC
 * Used in MOD-M-04: Supervisor Reassign Modal
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EligibleAdmin {
  admin_id: string;
  full_name: string;
  availability_status: string;
  total_score: number;
  l1_score: number;
  l2_score: number;
  l3_score: number;
  current_active: number;
  max_concurrent: number;
  assignment_priority: number;
  is_fully_loaded: boolean;
  workload_ratio: number;
}

interface UseEligibleAdminsParams {
  hqCountry: string;
  industrySegments: string[];
  orgType?: string;
  excludeAdminId?: string;
}

export function useEligibleAdmins(params: UseEligibleAdminsParams | undefined) {
  return useQuery({
    queryKey: ['eligible-admins', params],
    queryFn: async () => {
      if (!params) return [];

      const { data, error } = await supabase.rpc('get_eligible_admins_ranked', {
        p_hq_country: params.hqCountry,
        p_industry_segments: params.industrySegments,
        p_org_type: params.orgType,
        p_exclude_admin_id: params.excludeAdminId,
      });

      if (error) throw new Error(error.message);

      return ((data ?? []) as any[]).map(a => ({
        admin_id: a.admin_id,
        full_name: a.full_name,
        availability_status: a.availability_status,
        total_score: a.total_score ?? 0,
        l1_score: a.industry_score ?? 0,
        l2_score: a.country_score ?? 0,
        l3_score: a.org_type_score ?? 0,
        current_active: a.current_active ?? 0,
        max_concurrent: a.max_concurrent ?? 10,
        assignment_priority: a.assignment_priority ?? 5,
        is_fully_loaded: (a.current_active ?? 0) >= (a.max_concurrent ?? 10),
        workload_ratio: a.workload_ratio ?? 0,
      })) as EligibleAdmin[];
    },
    enabled: !!params,
    staleTime: 15_000,
  });
}
