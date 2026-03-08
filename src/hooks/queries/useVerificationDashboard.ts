/**
 * React Query hooks for MOD-03: Verification Dashboard
 * PERFORMANCE: Parallelized queries, cached admin profile
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentAdminProfile } from './useCurrentAdminProfile';

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

/** Helper: resolve orgs with country, type, and industry in parallel */
async function resolveOrgDetails(orgIds: string[]) {
  if (orgIds.length === 0) return new Map<string, any>();

  const { data: orgs } = await supabase
    .from('seeker_organizations')
    .select('id, organization_name, hq_country_id, organization_type_id')
    .in('id', orgIds);

  const countryIds = [...new Set((orgs ?? []).map(o => o.hq_country_id).filter(Boolean))] as string[];
  const typeIds = [...new Set((orgs ?? []).map(o => o.organization_type_id).filter(Boolean))] as string[];

  // Parallel: countries + org types + industry tags
  const [countriesRes, orgTypeMap, industryMap] = await Promise.all([
    countryIds.length > 0
      ? supabase.from('countries').select('id, name, code').in('id', countryIds)
      : Promise.resolve({ data: [] as { id: string; name: string; code: string }[] }),
    fetchOrgTypeMap(typeIds),
    fetchIndustryTags(orgIds),
  ]);

  const countryMap = Object.fromEntries((countriesRes.data ?? []).map(c => [c.id, c]));
  return new Map((orgs ?? []).map(o => [o.id, {
    id: o.id,
    organization_name: o.organization_name,
    hq_country_id: o.hq_country_id,
    country: o.hq_country_id ? countryMap[o.hq_country_id] ?? null : null,
    org_type: o.organization_type_id ? orgTypeMap[o.organization_type_id] ?? null : null,
    industry_tags: industryMap[o.id] ?? [],
  }]));
}

/**
 * Fetch current admin's assigned verifications (My Assignments tab)
 * Uses cached admin profile to eliminate redundant auth lookups
 */
export function useMyAssignments() {
  const { data: profile } = useCurrentAdminProfile();

  return useQuery({
    queryKey: ['verifications', 'my-assignments', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_admin_verifications')
        .select(`
          id, organization_id, assigned_admin_id, assignment_method,
          status, sla_start_at, sla_paused_duration_hours,
          sla_duration_seconds, sla_breached, sla_breach_tier,
          reassignment_count, is_current, created_at
        `)
        .eq('assigned_admin_id', profile!.id)
        .eq('is_current', true)
        .in('status', ['Under_Verification', 'Pending_Assignment'])
        .order('sla_start_at', { ascending: true });

      if (error) throw new Error(error.message);
      if (!data || data.length === 0) return [];

      const orgIds = [...new Set(data.map(d => d.organization_id))];
      const orgMap = await resolveOrgDetails(orgIds);

      return data.map(v => ({
        ...v,
        organization: orgMap.get(v.organization_id) ?? null,
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
      const orgMap = await resolveOrgDetails(orgIds);

      const verMap = Object.fromEntries((verifications ?? []).map(v => [v.id, {
        ...v,
        organization: orgMap.get(v.organization_id) ?? null,
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
 * PERFORMANCE: Parallelized all independent queries via Promise.all
 */
export function useVerificationDetail(verificationId: string | undefined) {
  const { data: profile } = useCurrentAdminProfile();

  return useQuery({
    queryKey: ['verifications', 'detail', verificationId],
    enabled: !!verificationId && profile !== undefined,
    queryFn: async () => {
      if (!verificationId) throw new Error('No verification ID');

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

      // ALL independent queries in parallel
      const [orgRes, checksRes, historyRes, assignmentRes] = await Promise.all([
        supabase
          .from('seeker_organizations')
          .select('id, organization_name, hq_country_id, organization_type_id, website_url, registration_number, verification_status')
          .eq('id', verification.organization_id)
          .single(),
        supabase
          .from('verification_check_results')
          .select('id, verification_id, check_id, result, notes, updated_by, updated_at, created_at')
          .eq('verification_id', verificationId)
          .order('check_id'),
        supabase
          .from('verification_assignment_log')
          .select('id, verification_id, event_type, from_admin_id, to_admin_id, reason, initiator, scoring_snapshot, created_at')
          .eq('verification_id', verificationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('verification_assignments')
          .select('id, assigned_at, assignment_method')
          .eq('verification_id', verificationId)
          .eq('is_current', true)
          .maybeSingle(),
      ]);

      const org = orgRes.data;

      // Second parallel batch: country, industries, assigned admin name
      const [countryRes, orgIndustriesRes, assignedAdminRes] = await Promise.all([
        org?.hq_country_id
          ? supabase.from('countries').select('name, code').eq('id', org.hq_country_id).single()
          : Promise.resolve({ data: null }),
        supabase
          .from('seeker_org_industries')
          .select('industry_id')
          .eq('organization_id', verification.organization_id),
        verification.assigned_admin_id && profile && verification.assigned_admin_id !== profile.id
          ? supabase.from('platform_admin_profiles').select('full_name').eq('id', verification.assigned_admin_id).single()
          : Promise.resolve({ data: null }),
      ]);

      const country = countryRes.data;
      const industrySegmentIds = (orgIndustriesRes.data ?? []).map(oi => oi.industry_id);
      let industryNames: string[] = [];
      if (industrySegmentIds.length > 0) {
        const { data: segments } = await supabase
          .from('industry_segments')
          .select('id, name')
          .in('id', industrySegmentIds);
        industryNames = (segments ?? []).map(s => s.name);
      }

      let viewState: 1 | 2 | 3 = 3;
      if (profile && verification.assigned_admin_id === profile.id) {
        viewState = 1;
      } else if (profile && (profile.is_supervisor || profile.admin_tier === 'supervisor')) {
        viewState = 2;
      }

      const isFullyLoaded = profile
        ? profile.current_active_verifications >= profile.max_concurrent_verifications
        : false;

      return {
        verification: {
          ...verification,
          organization: org ? { ...org, country } : null,
          industrySegmentIds,
          industryNames,
        },
        checks: checksRes.data ?? [],
        history: historyRes.data ?? [],
        currentAssignment: assignmentRes.data,
        viewState,
        assignedAdminName: assignedAdminRes.data?.full_name ?? null,
        currentAdminProfileId: profile?.id ?? null,
        isFullyLoaded,
      };
    },
    staleTime: 15_000,
    gcTime: 300_000,
  });
}
