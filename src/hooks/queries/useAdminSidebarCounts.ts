/**
 * Consolidated sidebar badge counts — single query replaces 3 separate HEAD requests
 * PERFORMANCE: Fires once with Promise.all, cached for 5 minutes
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminSidebarCounts {
  pendingReviewers: number;
  pendingSeekers: number;
  pendingReassignments: number;
}

export function useAdminSidebarCounts() {
  return useQuery({
    queryKey: ['admin-sidebar-counts'],
    queryFn: async (): Promise<AdminSidebarCounts> => {
      const [reviewerRes, seekerRes, reassignmentRes] = await Promise.all([
        supabase
          .from('panel_reviewers')
          .select('*', { count: 'exact', head: true })
          .eq('enrollment_source', 'self_signup')
          .eq('approval_status', 'pending'),
        supabase
          .from('seeker_organizations')
          .select('id', { count: 'exact', head: true })
          .eq('verification_status', 'payment_submitted')
          .eq('is_deleted', false),
        supabase
          .from('reassignment_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'PENDING'),
      ]);

      return {
        pendingReviewers: reviewerRes.count ?? 0,
        pendingSeekers: seekerRes.count ?? 0,
        pendingReassignments: reassignmentRes.count ?? 0,
      };
    },
    staleTime: 300_000,   // 5 minutes — informational badges
    gcTime: 600_000,
  });
}
