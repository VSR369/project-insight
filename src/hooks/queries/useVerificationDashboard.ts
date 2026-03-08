/**
 * React Query hooks for MOD-03: Verification Dashboard
 * GAP-3: Industry tags fetching
 * GAP-6: Org type fetching
 * GAP-18: Explicit column selections (no SELECT *)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Helper: fetch industry tags for a set of org IDs */
async function fetchIndustryTags(orgIds: string[]): Promise<Record<string, string[]>> {
  if (orgIds.length === 0) return {};
  const { data } = await supabase
    .from('seeker_org_industries')
    .select('organization_id, industry_id, industry_segments:industry_id(name)')
    .in('organization_id', orgIds);

  const map: Record<string, string[]> = {};
  for (const row of data ?? []) {
    const orgId = row.organization_id;
    const name = (row as any).industry_segments?.name;
    if (!name) continue;
    if (!map[orgId]) map[orgId] = [];
    map[orgId].push(name);
  }
  return map;
}

/** Helper: fetch org type names for a set of type IDs */
async function fetchOrgTypeMap(typeIds: string[]): Promise<Record<string, string>> {
  if (typeIds.length === 0) return {};
  const { data } = await supabase
    .from('organization_types')
    .select('id, name')
    .in('id', typeIds);
  return Object.fromEntries((data ?? []).map(t => [t.id, t.name]));
}

/**
 * Fetch current admin's assigned verifications (My Assignments tab)
 */
export function useMyAssignments() {
  return useQuery({
    queryKey: ['verifications', 'my-assignments'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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

      const orgIds = [...new Set((data ?? []).map(d => d.organization_id))];
      if (orgIds.length === 0) return [];

      const { data: orgs } = await supabase
        .from('seeker_organizations')
        .select('id, organization_name, hq_country_id, organization_type_id')
        .in('id', orgIds);

      const countryIds = [...new Set((orgs ?? []).map(o => o.hq_country_id).filter(Boolean))] as string[];
      const { data: countries } = countryIds.length > 0
        ? await supabase.from('countries').select('id, name, code').in('id', countryIds)
        : { data: [] as { id: string; name: string; code: string }[] };

      // GAP-6: Org type resolution
      const typeIds = [...new Set((orgs ?? []).map(o => o.organization_type_id).filter(Boolean))] as string[];
      const orgTypeMap = await fetchOrgTypeMap(typeIds);

      // GAP-3: Industry tags
      const industryMap = await fetchIndustryTags(orgIds);

      const countryMap = Object.fromEntries((countries ?? []).map(c => [c.id, c]));
      const orgMap = Object.fromEntries((orgs ?? []).map(o => [o.id, {
        id: o.id,
        organization_name: o.organization_name,
        hq_country_id: o.hq_country_id,
        country: o.hq_country_id ? countryMap[o.hq_country_id] ?? null : null,
        org_type: o.organization_type_id ? orgTypeMap[o.organization_type_id] ?? null : null,
        industry_tags: industryMap[o.id] ?? [],
      }]));

      return (data ?? []).map(v => ({
        ...v,
        organization: orgMap[v.organization_id] ?? null,
      }));
    },
    staleTime: 30_000,
    gcTime: 300_000,
    refetchInterval: 60_000,
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

      const verIds = data.map(d => d.verification_id);
      const { data: verifications } = await supabase
        .from('platform_admin_verifications')
        .select('id, organization_id, status, sla_start_at, sla_paused_duration_hours, sla_duration_seconds, sla_breached, sla_breach_tier')
        .in('id', verIds);

      const orgIds = [...new Set((verifications ?? []).map(v => v.organization_id))];
      const { data: orgs } = orgIds.length > 0
        ? await supabase.from('seeker_organizations').select('id, organization_name, hq_country_id, organization_type_id').in('id', orgIds)
        : { data: [] as { id: string; organization_name: string; hq_country_id: string | null; organization_type_id: string | null }[] };

      const countryIds = [...new Set((orgs ?? []).map(o => o.hq_country_id).filter(Boolean))] as string[];
      const { data: countries } = countryIds.length > 0
        ? await supabase.from('countries').select('id, name, code').in('id', countryIds)
        : { data: [] as { id: string; name: string; code: string }[] };

      // GAP-6: Org type resolution
      const typeIds = [...new Set((orgs ?? []).map(o => o.organization_type_id).filter(Boolean))] as string[];
      const orgTypeMap = await fetchOrgTypeMap(typeIds);

      // GAP-3: Industry tags
      const industryMap = await fetchIndustryTags(orgIds);

      const countryMap = Object.fromEntries((countries ?? []).map(c => [c.id, c]));
      const orgMap = Object.fromEntries((orgs ?? []).map(o => [o.id, {
        id: o.id,
        organization_name: o.organization_name,
        hq_country_id: o.hq_country_id,
        country: o.hq_country_id ? countryMap[o.hq_country_id] ?? null : null,
        org_type: o.organization_type_id ? orgTypeMap[o.organization_type_id] ?? null : null,
        industry_tags: industryMap[o.id] ?? [],
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
    staleTime: 15_000,
    gcTime: 300_000,
  });
}

/**
 * Fetch single verification with check results and assignment history.
 * GAP-18: Explicit column selections
 */
export function useVerificationDetail(verificationId: string | undefined) {
  return useQuery({
    queryKey: ['verifications', 'detail', verificationId],
    enabled: !!verificationId,
    queryFn: async () => {
      if (!verificationId) throw new Error('No verification ID');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('platform_admin_profiles')
        .select('id, admin_tier, is_supervisor')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: verification, error: vErr } = await supabase
        .from('platform_admin_verifications')
        .select(`
          id, organization_id, assigned_admin_id, assignment_method,
          status, sla_start_at, sla_paused_duration_hours,
          sla_duration_seconds, sla_breached, sla_breach_tier,
          reassignment_count, is_current, created_at, updated_at,
          completed_at, completed_by_admin_id
        `)
        .eq('id', verificationId)
        .single();

      if (vErr) throw new Error(vErr.message);

      const { data: org } = await supabase
        .from('seeker_organizations')
        .select('id, organization_name, hq_country_id, organization_type_id, website_url, registration_number, verification_status')
        .eq('id', verification.organization_id)
        .single();

      let country: { name: string; code: string } | null = null;
      if (org?.hq_country_id) {
        const { data: c } = await supabase.from('countries').select('name, code').eq('id', org.hq_country_id).single();
        country = c;
      }

      // GAP-C: Fetch industry segments for org
      let industrySegmentIds: string[] = [];
      let industryNames: string[] = [];
      if (verification.organization_id) {
        const { data: orgIndustries } = await supabase
          .from('seeker_org_industries')
          .select('industry_id')
          .eq('organization_id', verification.organization_id);
        
        industrySegmentIds = (orgIndustries ?? []).map(oi => oi.industry_id);
        
        if (industrySegmentIds.length > 0) {
          const { data: segments } = await supabase
            .from('industry_segments')
            .select('id, name')
            .in('id', industrySegmentIds);
          industryNames = (segments ?? []).map(s => s.name);
        }
      }

      const { data: checks } = await supabase
        .from('verification_check_results')
        .select('id, verification_id, check_id, result, notes, updated_by, updated_at, created_at')
        .eq('verification_id', verificationId)
        .order('check_id');

      const { data: history } = await supabase
        .from('verification_assignment_log')
        .select('id, verification_id, event_type, from_admin_id, to_admin_id, reason, initiator, scoring_snapshot, created_at')
        .eq('verification_id', verificationId)
        .order('created_at', { ascending: false });

      const { data: currentAssignment } = await supabase
        .from('verification_assignments')
        .select('id, assigned_at, assignment_method')
        .eq('verification_id', verificationId)
        .eq('is_current', true)
        .maybeSingle();

      let viewState: 1 | 2 | 3 = 3;
      if (profile && verification.assigned_admin_id === profile.id) {
        viewState = 1;
      } else if (profile && (profile.is_supervisor || profile.admin_tier === 'supervisor')) {
        viewState = 2;
      }

      let assignedAdminName: string | null = null;
      if (verification.assigned_admin_id && viewState !== 1) {
        const { data: assignedAdmin } = await supabase
          .from('platform_admin_profiles')
          .select('full_name')
          .eq('id', verification.assigned_admin_id)
          .single();
        assignedAdminName = assignedAdmin?.full_name ?? null;
      }

      // GAP-F: Fetch supervisor's own workload for isFullyLoaded
      let isFullyLoaded = false;
      if (profile) {
        const { data: selfProfile } = await supabase
          .from('platform_admin_profiles')
          .select('current_active_verifications, max_concurrent_verifications')
          .eq('id', profile.id)
          .single();
        if (selfProfile) {
          isFullyLoaded = selfProfile.current_active_verifications >= selfProfile.max_concurrent_verifications;
        }
      }

      return {
        verification: {
          ...verification,
          organization: org ? { ...org, country } : null,
          industrySegmentIds,
          industryNames,
        },
        checks: checks ?? [],
        history: history ?? [],
        currentAssignment,
        viewState,
        assignedAdminName,
        currentAdminProfileId: profile?.id ?? null,
        isFullyLoaded,
      };
    },
    staleTime: 15 * 1000,
  });
}
