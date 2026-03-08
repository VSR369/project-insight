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
  current_active_verifications: number;
  max_concurrent_verifications: number;
  assignment_priority: number;
  is_fully_loaded: boolean;
}

export function useEligibleAdmins(verificationId: string | undefined) {
  return useQuery({
    queryKey: ['eligible-admins', verificationId],
    queryFn: async () => {
      if (!verificationId) return [];

      const { data, error } = await supabase.rpc('get_eligible_admins_ranked', {
        p_verification_id: verificationId,
      });

      if (error) throw new Error(error.message);

      return ((data ?? []) as any[]).map(a => ({
        admin_id: a.admin_id,
        full_name: a.full_name,
        availability_status: a.availability_status,
        total_score: a.total_score ?? 0,
        l1_score: a.l1_score ?? 0,
        l2_score: a.l2_score ?? 0,
        l3_score: a.l3_score ?? 0,
        current_active_verifications: a.current_active_verifications ?? 0,
        max_concurrent_verifications: a.max_concurrent_verifications ?? 10,
        assignment_priority: a.assignment_priority ?? 5,
        is_fully_loaded: (a.current_active_verifications ?? 0) >= (a.max_concurrent_verifications ?? 10),
      })) as EligibleAdmin[];
    },
    enabled: !!verificationId,
    staleTime: 15_000,
  });
}
