/**
 * useSolverLegalGate — Phase-triggered Tier 2 legal acceptance gate.
 * Checks if the solver has pending Tier 2 legal docs for the current
 * solution phase and blocks progression until all are accepted.
 *
 * BR-LGL-007: Tier 2 docs are CONFIGURED during challenge creation but
 * PRESENTED to solver AFTER shortlisting (phase >= 9), not before abstract
 * submission (old phase >= 7 trigger).
 *
 * R-04: Governance-aware — skips Enterprise-only doc types for QUICK mode.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STANDARD } from '@/config/queryCache';
import { resolveGovernanceMode, isQuickMode } from '@/lib/governanceMode';
import { CACHE_STANDARD } from '@/config/queryCache';

/* ─── Enterprise-only doc types (BRD BR-LGL-001-A Tier 2 matrix) ─── */

const ENTERPRISE_ONLY_DOC_TYPES = [
  'ESCROW_TERMS',
  'IP_ASSIGNMENT_DEED',
  'PERFORMANCE_BOND',
  'ENTERPRISE_EVALUATION_TERMS',
] as const;

/* ─── Types ──────────────────────────────────────────────── */

export interface PendingLegalDoc {
  template_id: string;
  document_type: string;
  document_name: string;
  description: string | null;
  trigger_phase: number;
  default_template_url: string | null;
}

export interface SolverLegalGateResult {
  /** True if all phase-required Tier 2 docs have been accepted */
  cleared: boolean;
  /** Docs pending acceptance for the current phase */
  pendingDocs: PendingLegalDoc[];
  /** Loading state */
  isLoading: boolean;
}

/* ─── Hook ───────────────────────────────────────────────── */

export function useSolverLegalGate(
  challengeId: string | undefined,
  userId: string | undefined,
  currentPhase: number | undefined,
  governanceProfile: string | undefined,
): SolverLegalGateResult {
  const { data, isLoading } = useQuery({
    queryKey: ['solver-legal-gate', challengeId, userId, currentPhase, governanceProfile],
    queryFn: async (): Promise<{ cleared: boolean; pendingDocs: PendingLegalDoc[] }> => {
      if (!challengeId || !userId || !currentPhase) {
        return { cleared: true, pendingDocs: [] };
      }

      // 1. Get Tier 2 templates that trigger at or before this phase
      const { data: templates, error: tplErr } = await supabase
        .from('legal_document_templates' as any)
        .select('template_id, document_type, document_name, description, trigger_phase, default_template_url')
        .eq('tier', 'TIER_2')
        .eq('is_active', true)
        .not('trigger_phase', 'is', null)
        .lte('trigger_phase', currentPhase);

      if (tplErr) throw new Error(tplErr.message);
      if (!templates || templates.length === 0) {
        return { cleared: true, pendingDocs: [] };
      }

      // R-04: Filter out Enterprise-only docs for QUICK governance mode
      const mode = resolveGovernanceMode(governanceProfile);
      const filteredTemplates = isQuickMode(mode)
        ? (templates as any[]).filter(
            (t) => !ENTERPRISE_ONLY_DOC_TYPES.includes(t.document_type as any)
          )
        : (templates as any[]);

      if (filteredTemplates.length === 0) {
        return { cleared: true, pendingDocs: [] };
      }

      // 2. Get docs this solver has already accepted for this challenge
      const { data: accepted, error: accErr } = await supabase
        .from('legal_acceptance_ledger')
        .select('document_type')
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
        .eq('tier', 'TIER_2');

      if (accErr) throw new Error(accErr.message);

      const acceptedTypes = new Set((accepted ?? []).map((a: any) => a.document_type));

      // 3. Filter to unaccepted docs
      const pending = filteredTemplates
        .filter((t) => !acceptedTypes.has(t.document_type))
        .map((t) => ({
          template_id: t.template_id,
          document_type: t.document_type,
          document_name: t.document_name,
          description: t.description,
          trigger_phase: t.trigger_phase,
          default_template_url: t.default_template_url,
        }));

      return {
        cleared: pending.length === 0,
        pendingDocs: pending,
      };
    },
    enabled: !!challengeId && !!userId && !!currentPhase && currentPhase >= 9,
    ...CACHE_STANDARD,
  });

  return {
    cleared: data?.cleared ?? true,
    pendingDocs: data?.pendingDocs ?? [],
    isLoading,
  };
}
