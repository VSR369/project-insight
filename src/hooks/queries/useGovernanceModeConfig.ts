/**
 * useGovernanceModeConfig — React Query hook for md_governance_mode_config.
 * Fetches governance behavior config (legal, escrow, curation, evaluation, award)
 * for a given governance mode.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/errorHandler';
import type { GovernanceMode } from '@/lib/governanceMode';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes — reference data

export interface GovernanceModeConfigRow {
  governance_mode: string;
  legal_doc_mode: string;
  escrow_mode: string;
  curation_mode: string;
  evaluation_mode: string;
  award_mode: string;
  role_separation: string;
  description: string | null;
  is_active: boolean;
}

const QUERY_KEY_PREFIX = 'governance-mode-config';

export function useGovernanceModeConfig(mode?: GovernanceMode | null) {
  return useQuery<GovernanceModeConfigRow | null>({
    queryKey: [QUERY_KEY_PREFIX, mode],
    queryFn: async () => {
      if (!mode) return null;

      const { data, error } = await supabase
        .from('md_governance_mode_config')
        .select('governance_mode, legal_doc_mode, escrow_mode, curation_mode, evaluation_mode, award_mode, role_separation, description, is_active')
        .eq('governance_mode', mode)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        handleQueryError(error, { operation: 'fetch_governance_mode_config' });
        return null;
      }

      return data as GovernanceModeConfigRow | null;
    },
    enabled: !!mode,
    staleTime: STALE_TIME,
  });
}

export function useAllGovernanceModeConfigs() {
  return useQuery<GovernanceModeConfigRow[]>({
    queryKey: [QUERY_KEY_PREFIX, 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_governance_mode_config')
        .select('governance_mode, legal_doc_mode, escrow_mode, curation_mode, evaluation_mode, award_mode, role_separation, description, is_active')
        .eq('is_active', true)
        .order('governance_mode');

      if (error) {
        handleQueryError(error, { operation: 'fetch_all_governance_mode_configs' });
        return [];
      }

      return (data ?? []) as GovernanceModeConfigRow[];
    },
    staleTime: STALE_TIME,
  });
}
