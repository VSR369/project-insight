/**
 * usePreviewEditability — Business rule evaluation for preview page.
 * Determines global read-only state and per-section editability.
 */

import { useMemo, useCallback } from 'react';
import { isFieldVisible } from '@/hooks/queries/useGovernanceFieldRules';
import type { FieldRulesMap } from '@/hooks/queries/useGovernanceFieldRules';
import type { ChallengeData } from '@/lib/cogniblend/curationTypes';

interface UsePreviewEditabilityParams {
  challenge: ChallengeData | null;
  fieldRules: FieldRulesMap | null;
}

export function usePreviewEditability({ challenge, fieldRules }: UsePreviewEditabilityParams) {
  const isGlobalReadOnly = useMemo(() => {
    if (!challenge) return true;
    const phase = challenge.current_phase ?? 0;
    if (phase > 2) return true;
    if (challenge.curation_lock_status === 'FROZEN') return true;
    const ms = (challenge as Record<string, unknown>).master_status as string | null;
    if (ms === 'ACTIVE' || ms === 'COMPLETED') return true;
    if (challenge.phase_status === 'CR_APPROVAL_PENDING') return true;
    return false;
  }, [challenge]);

  const canEditSection = useCallback((sectionKey: string): boolean => {
    if (isGlobalReadOnly) return false;
    if (sectionKey === 'legal_docs' || sectionKey === 'escrow_funding') return false;
    if (sectionKey === 'organization_context') return true;
    if (sectionKey === 'context_digest') return true;
    if (!isFieldVisible(fieldRules, sectionKey)) return false;
    return true;
  }, [isGlobalReadOnly, fieldRules]);

  return { isGlobalReadOnly, canEditSection };
}
