/**
 * React Query hooks for MOD-03: Verification Dashboard
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch current admin's assigned verifications (My Assignments tab)
 */
export function useMyAssignments() {
  return useQuery({
    queryKey: ['verifications', 'my-assignments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get admin profile id
      const { data: profile } = await supabase
        .from('platform_admin_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return [];

      const { data, error } = await supabase
        .from('platform_admin_verifications')
        .select(`
          id, organization_id, assigned_admin_id, assignment_method,
          status, sla_start_at, sla_paused_duration_hours,
          sla_duration_seconds, sla_breached, sla_breach_tier,
          reassignment_count, is_current, created_at,
          seeker_organizations!inner (
            id, organization_name, country_id,
            countries!seeker_organizations_country_id_fkey ( name, code )
          )
        `)
        .eq('assigned_admin_id', profile.id)
        .eq('is_current', true)
        .in('status', ['Under_Verification', 'Pending_Assignment'])
        .order('sla_start_at', { ascending: true });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Fetch open queue entries (Open Queue tab)
 */
export function useOpenQueue() {
  return useQuery({
    queryKey: ['verifications', 'open-queue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('open_queue_entries')
        .select(`
          id, verification_id, entered_at, is_critical, is_pinned,
          sla_deadline, escalation_count, fallback_reason, claimed_by,
          platform_admin_verifications:verification_id (
            id, organization_id, status, sla_start_at, sla_paused_duration_hours,
            sla_duration_seconds, sla_breached, sla_breach_tier,
            seeker_organizations!inner (
              id, organization_name, country_id,
              countries!seeker_organizations_country_id_fkey ( name, code )
            )
          )
        `)
        .is('claimed_by', null)
        .order('is_pinned', { ascending: false })
        .order('is_critical', { ascending: false })
        .order('sla_deadline', { ascending: true, nullsFirst: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Fetch single verification with check results and assignment history.
 * Also determines the view state (1=edit, 2=readonly, 3=blocked).
 */
export function useVerificationDetail(verificationId: string | undefined) {
  return useQuery({
    queryKey: ['verifications', 'detail', verificationId],
    enabled: !!verificationId,
    queryFn: async () => {
      if (!verificationId) throw new Error('No verification ID');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get admin profile
      const { data: profile } = await supabase
        .from('platform_admin_profiles')
        .select('id, admin_tier, is_supervisor')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch verification
      const { data: verification, error: vErr } = await supabase
        .from('platform_admin_verifications')
        .select(`
          *,
          seeker_organizations!inner (
            id, organization_name, country_id, organization_type_id,
            website, registration_number, industry_segment_ids,
            verification_status, lifecycle_status,
            countries!seeker_organizations_country_id_fkey ( name, code )
          )
        `)
        .eq('id', verificationId)
        .single();

      if (vErr) throw new Error(vErr.message);

      // Fetch check results
      const { data: checks, error: cErr } = await supabase
        .from('verification_check_results')
        .select('*')
        .eq('verification_id', verificationId)
        .order('check_id');

      if (cErr) throw new Error(cErr.message);

      // Fetch assignment history
      const { data: history, error: hErr } = await supabase
        .from('verification_assignment_log')
        .select('*')
        .eq('verification_id', verificationId)
        .order('created_at', { ascending: false });

      if (hErr) throw new Error(hErr.message);

      // Fetch current assignment details
      const { data: currentAssignment } = await supabase
        .from('verification_assignments')
        .select('id, assigned_at, assignment_method')
        .eq('verification_id', verificationId)
        .eq('is_current', true)
        .maybeSingle();

      // Determine state
      let viewState: 1 | 2 | 3 = 3;
      if (profile && verification.assigned_admin_id === profile.id) {
        viewState = 1; // EDIT
      } else if (profile && (profile.is_supervisor || profile.admin_tier === 'supervisor')) {
        viewState = 2; // READ-ONLY
      }

      // Get assigned admin name if not self
      let assignedAdminName: string | null = null;
      if (verification.assigned_admin_id && viewState !== 1) {
        const { data: assignedAdmin } = await supabase
          .from('platform_admin_profiles')
          .select('full_name')
          .eq('id', verification.assigned_admin_id)
          .single();
        assignedAdminName = assignedAdmin?.full_name ?? null;
      }

      return {
        verification,
        checks: checks ?? [],
        history: history ?? [],
        currentAssignment,
        viewState,
        assignedAdminName,
        currentAdminProfileId: profile?.id ?? null,
      };
    },
    staleTime: 15 * 1000,
  });
}
