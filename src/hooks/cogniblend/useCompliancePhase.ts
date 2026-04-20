/**
 * useCompliancePhase — Resolves the canonical compliance phase number
 * from md_lifecycle_phase_config for a given governance mode.
 *
 * Replaces the hard-coded `current_phase === 2` Submit gate with a
 * config-driven check.  Uses raw PostgREST since the table isn't yet
 * surfaced in generated types.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CompliancePhaseRow {
  phase_number: number;
  phase_name: string;
}

async function fetchCompliancePhase(mode: string): Promise<number | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/md_lifecycle_phase_config` +
    `?governance_mode=eq.${mode}` +
    `&phase_type=in.(parallel_compliance,compliance,legal_review)` +
    `&is_active=eq.true&order=phase_number.asc&select=phase_number,phase_name&limit=1`;

  const res = await fetch(url, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${token ?? apiKey}`,
    },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as CompliancePhaseRow[];
  return rows[0]?.phase_number ?? null;
}

/**
 * Returns the compliance phase number for the given governance mode,
 * or a sensible default while loading / when config is missing.
 */
export function useCompliancePhase(mode: string | null | undefined) {
  const safeMode = (mode ?? 'STRUCTURED').toUpperCase();
  const query = useQuery({
    queryKey: ['compliance-phase', safeMode],
    queryFn: () => fetchCompliancePhase(safeMode),
    staleTime: 10 * 60_000,
    enabled: !!mode,
  });

  // Defaults: STRUCTURED/CONTROLLED/QUICK all use phase 3 today.
  const fallback = 3;
  return {
    compliancePhase: query.data ?? fallback,
    isLoading: query.isLoading,
  };
}
