/**
 * useCpaGateContext — Composite hook that builds the interpolation context
 * for `CpaEnrollmentGate`. Fetches challenge + org, reuses geo-context hook,
 * and returns ready-to-interpolate `CpaPreviewVariables`.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGeoContextForOrg } from '@/hooks/queries/useGeoContextForOrg';
import { handleQueryError } from '@/lib/errorHandler';
import {
  buildCpaPreviewInput,
  type TemplateContextChallenge,
  type TemplateContextOrg,
} from '@/services/legal/templateContextBuilder';
import {
  buildPreviewVariables,
  type CpaPreviewVariables,
} from '@/services/legal/cpaPreviewInterpolator';
import { ROLE_LABELS } from '@/constants/legalPreview.constants';
import { CACHE_FREQUENT } from '@/config/queryCache';

const CHALLENGE_COLUMNS =
  'id, title, problem_statement, scope, ip_model, governance_mode_override, currency_code, submission_deadline, evaluation_method, evaluator_count, solver_audience, operating_model, reward_structure, organization_id, industry_segment_id';

const ORG_COLUMNS =
  'organization_name, legal_entity_name, preferred_currency, operating_model, hq_country_id';

interface CpaGateContextResult {
  variables: CpaPreviewVariables | null;
  isLoading: boolean;
}

export function useCpaGateContext(challengeId: string | undefined): CpaGateContextResult {
  const { user } = useAuth();

  const { data: challenge, isLoading: challengeLoading } = useQuery({
    queryKey: ['cpa-gate-challenge', challengeId],
    queryFn: async (): Promise<(TemplateContextChallenge & { organization_id: string | null; industry_segment_id: string | null }) | null> => {
      if (!challengeId) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('challenges') as any)
        .select(CHALLENGE_COLUMNS)
        .eq('id', challengeId)
        .maybeSingle();
      if (error) {
        handleQueryError(error, { operation: 'fetch_challenge_for_cpa_gate' });
        return null;
      }
      return (data ?? null) as (TemplateContextChallenge & { organization_id: string | null; industry_segment_id: string | null }) | null;
    },
    enabled: !!challengeId,
    ...CACHE_FREQUENT,
  });

  const orgId = challenge?.organization_id ?? null;
  const industrySegmentId = challenge?.industry_segment_id ?? null;

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['cpa-gate-org', orgId],
    queryFn: async (): Promise<(TemplateContextOrg & { hq_country_id: string | null }) | null> => {
      if (!orgId) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('seeker_organizations') as any)
        .select(ORG_COLUMNS)
        .eq('id', orgId)
        .maybeSingle();
      if (error) {
        handleQueryError(error, { operation: 'fetch_org_for_cpa_gate' });
        return null;
      }
      return (data ?? null) as (TemplateContextOrg & { hq_country_id: string | null }) | null;
    },
    enabled: !!orgId,
    ...CACHE_FREQUENT,
  });

  const { data: geo, isLoading: geoLoading } = useGeoContextForOrg(orgId ?? undefined);

  const { data: industrySegment, isLoading: industryLoading } = useQuery({
    queryKey: ['cpa-gate-industry-name', industrySegmentId],
    queryFn: async (): Promise<string | null> => {
      if (!industrySegmentId) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('industry_segments') as any)
        .select('name')
        .eq('id', industrySegmentId)
        .maybeSingle();
      if (error) {
        handleQueryError(error, { operation: 'fetch_industry_segment_for_cpa_gate' });
        return null;
      }
      const row = data as { name?: string | null } | null;
      return row?.name ?? null;
    },
    enabled: !!industrySegmentId,
    ...CACHE_FREQUENT,
  });

  const variables = useMemo<CpaPreviewVariables | null>(() => {
    if (!challenge) return null;
    const input = buildCpaPreviewInput({
      challenge,
      org,
      jurisdiction: geo?.jurisdiction ?? null,
      governingLaw: geo?.governing_law ?? null,
      industrySegmentName: industrySegment ?? null,
      user: user
        ? {
            full_name:
              (user.user_metadata?.full_name as string | undefined) ??
              user.email?.split('@')[0] ??
              null,
            email: user.email ?? null,
          }
        : null,
      roleLabelOverride: ROLE_LABELS.solver,
      acceptanceDate: new Date().toISOString().slice(0, 10),
    });
    return buildPreviewVariables(input);
  }, [challenge, org, geo, industrySegment, user]);

  return {
    variables,
    isLoading: challengeLoading || orgLoading || geoLoading || industryLoading,
  };
}
