/**
 * useGeoContextForOrg — Resolves jurisdiction + governing-law strings for an
 * organization's HQ country.
 *
 * Mirrors the SELECT inside `assemble_cpa`:
 *   SELECT region_name, array_to_string(data_privacy_laws, ', ')
 *   FROM geography_context gc
 *   JOIN countries co ON gc.country_codes @> ARRAY[co.code]
 *   WHERE co.id = <org.hq_country_id>
 *
 * Falls back to the server's defaults when no row matches.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/errorHandler';
import {
  DEFAULT_JURISDICTION,
  DEFAULT_GOVERNING_LAW,
} from '@/constants/legalPreview.constants';

export interface GeoContextForOrg {
  jurisdiction: string;
  governing_law: string;
}

export function useGeoContextForOrg(organizationId: string | null | undefined) {
  return useQuery<GeoContextForOrg>({
    queryKey: ['geo_context_for_org', organizationId],
    queryFn: async (): Promise<GeoContextForOrg> => {
      const fallback: GeoContextForOrg = {
        jurisdiction: DEFAULT_JURISDICTION,
        governing_law: DEFAULT_GOVERNING_LAW,
      };
      if (!organizationId) return fallback;

      // 1) HQ country code for the org
      const { data: org, error: orgErr } = await supabase
        .from('seeker_organizations')
        .select('hq_country_id, countries:hq_country_id(code)')
        .eq('id', organizationId)
        .maybeSingle();

      if (orgErr) {
        handleQueryError(orgErr, { operation: 'fetch_org_hq_for_geo' });
        return fallback;
      }

      const code = (org?.countries as { code?: string } | null)?.code;
      if (!code) return fallback;

      // 2) Geography context row whose country_codes contains that code
      const { data: geo, error: geoErr } = await supabase
        .from('geography_context')
        .select('region_name, data_privacy_laws')
        .contains('country_codes', [code])
        .limit(1)
        .maybeSingle();

      if (geoErr) {
        handleQueryError(geoErr, { operation: 'fetch_geography_context' });
        return fallback;
      }
      if (!geo) return fallback;

      const laws = Array.isArray(geo.data_privacy_laws)
        ? (geo.data_privacy_laws as string[]).join(', ')
        : '';

      return {
        jurisdiction: geo.region_name?.trim() || DEFAULT_JURISDICTION,
        governing_law: laws.trim() || DEFAULT_GOVERNING_LAW,
      };
    },
    enabled: !!organizationId,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
