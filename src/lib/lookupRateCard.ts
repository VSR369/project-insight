/**
 * lookupRateCard — Pure function to find the active rate card
 * for a given organization type × maturity level pair.
 */

import type { RateCard } from '@/hooks/queries/useRateCards';

export function lookupRateCard(
  rateCards: RateCard[],
  orgTypeId: string,
  maturityLevel: string,
): RateCard | null {
  return rateCards.find(
    (r) =>
      r.organization_type_id === orgTypeId &&
      r.maturity_level === maturityLevel &&
      r.is_active,
  ) ?? null;
}
