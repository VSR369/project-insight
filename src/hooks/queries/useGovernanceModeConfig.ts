/**
 * useGovernanceModeConfig — React Query hook for md_governance_mode_config.
 * Fetches governance behavior config for a given governance mode.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/errorHandler';
import type { GovernanceMode } from '@/lib/governanceMode';

const STALE_TIME = 5 * 60 * 1000;

export interface GovernanceModeConfigRow {
  governance_mode: string;
  legal_doc_mode: string;
  legal_doc_editable: boolean;
  legal_doc_creation_allowed: boolean;
  ai_legal_review_enabled: boolean;
  escrow_mode: string;
  curation_checklist_items: number;
  ai_curation_review_required: boolean;
  dual_curation_enabled: boolean;
  max_modification_cycles: number;
  dual_evaluation_required: boolean;
  blind_evaluation: boolean;
  dual_signoff_required: boolean;
  escrow_deposit_pct: number;
  display_name: string | null;
  description: string | null;
  is_active: boolean;
}

const SELECT_COLS = 'governance_mode, legal_doc_mode, legal_doc_editable, legal_doc_creation_allowed, ai_legal_review_enabled, escrow_mode, curation_checklist_items, ai_curation_review_required, dual_curation_enabled, max_modification_cycles, dual_evaluation_required, blind_evaluation, dual_signoff_required, escrow_deposit_pct, display_name, description, is_active';

const QUERY_KEY_PREFIX = 'governance-mode-config';

export function useGovernanceModeConfig(mode?: GovernanceMode | null) {
  return useQuery<GovernanceModeConfigRow | null>({
    queryKey: [QUERY_KEY_PREFIX, mode],
    queryFn: async () => {
      if (!mode) return null;

      const { data, error } = await supabase
        .from('md_governance_mode_config')
        .select(SELECT_COLS)
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
        .select(SELECT_COLS)
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
