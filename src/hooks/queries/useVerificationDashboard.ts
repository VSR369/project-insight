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
          reassignment_count, is_current, created_at
        `)
        .eq('assigned_admin_id', profile.id)
        .eq('is_current', true)
        .in('status', ['Under_Verification', 'Pending_Assignment'])
        .order('sla_start_at', { ascending: true });

      if (error) throw new Error(error.message);

      // Fetch org details separately to avoid deep type recursion
      const orgIds = [...new Set((data ?? []).map(d => d.organization_id))];
      if (orgIds.length === 0) return [];

      const { data: orgs } = await supabase
        .from('seeker_organizations')
        .select('id, organization_name, country_id')
        .in('id', orgIds);

      const countryIds = [...new Set((orgs ?? []).map(o => o.country_id).filter(Boolean))];
      const { data: countries } = countryIds.length > 0
        ? await supabase.from('countries').select('id, name, code').in('id', countryIds)
        : { data: [] };

      const countryMap = Object.fromEntries((countries ?? []).map(c => [c.id, c]));
      const orgMap = Object.fromEntries((orgs ?? []).map(o => [o.id, {
        ...o,
        country: o.country_id ? countryMap[o.country_id] ?? null : null,
      }]));

      return (data ?? []).map(v => ({
        ...v,
        organization: orgMap[v.organization_id] ?? null,
      }));
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
          sla_deadline, escalation_count, fallback_reason, claimed_by
        `)
        .is('claimed_by', null)
        .order('is_pinned', { ascending: false })
        .order('is_critical', { ascending: false })
        .order('sla_deadline', { ascending: true, nullsFirst: false });

      if (error) throw new Error(error.message);
      if (!data || data.length === 0) return [];

      // Fetch verification details
      const verIds = data.map(d => d.verification_id);
      const { data: verifications } = await supabase
        .from('platform_admin_verifications')
        .select('id, organization_id, status, sla_start_at, sla_paused_duration_hours, sla_duration_seconds, sla_breached, sla_breach_tier')
        .in('id', verIds);

      const orgIds = [...new Set((verifications ?? []).map(v => v.organization_id))];
      const { data: orgs } = orgIds.length > 0
        ? await supabase.from('seeker_organizations').select('id, organization_name, country_id').in('id', orgIds)
        : { data: [] };

      const countryIds = [...new Set((orgs ?? []).map(o => o.country_id).filter(Boolean))];
      const { data: countries } = countryIds.length > 0
        ? await supabase.from('countries').select('id, name, code').in('id', countryIds)
        : { data: [] };

      const countryMap = Object.fromEntries((countries ?? []).map(c => [c.id, c]));
      const orgMap = Object.fromEntries((orgs ?? []).map(o => [o.id, {
        ...o,
        country: o.country_id ? countryMap[o.country_id] ?? null : null,
      }]));
      const verMap = Object.fromEntries((verifications ?? []).map(v => [v.id, {
        ...v,
        organization: orgMap[v.organization_id] ?? null,
      }]));

      return data.map(entry => ({
        ...entry,
        verification: verMap[entry.verification_id] ?? null,
      }));
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
        .select('*')
        .eq('id', verificationId)
        .single();

      if (vErr) throw new Error(vErr.message);

      // Fetch org details separately
      const { data: org } = await supabase
        .from('seeker_organizations')
        .select('id, organization_name, country_id, organization_type_id, website, registration_number, industry_segment_ids, verification_status, lifecycle_status')
        .eq('id', verification.organization_id)
        .single();

      let country = null;
      if (org?.country_id) {
        const { data: c } = await supabase.from('countries').select('name, code').eq('id', org.country_id).single();
        country = c;
      }

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
        viewState = 1;
      } else if (profile && (profile.is_supervisor || profile.admin_tier === 'supervisor')) {
        viewState = 2;
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
        verification: { ...verification, organization: org ? { ...org, country } : null },
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
