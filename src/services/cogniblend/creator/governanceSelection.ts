import { getAvailableGovernanceModes, resolveGovernanceMode, type GovernanceMode } from '@/lib/governanceMode';

export const GOVERNANCE_LABELS: Record<GovernanceMode, string> = {
  QUICK: 'Express', STRUCTURED: 'Structured', CONTROLLED: 'High-Rigor',
};

const MODE_ORDER: GovernanceMode[] = ['QUICK', 'STRUCTURED', 'CONTROLLED'];

/** OR-3: Marketplace never offers Express; subscription access remains authoritative. */
export function creationGovernanceModes(tierCode: string | null, model: string): GovernanceMode[] {
  return getAvailableGovernanceModes(tierCode).filter((mode) => model === 'AGG' || mode !== 'QUICK');
}

/** Keep a permitted selection; otherwise use the org profile, raised to the available minimum. */
export function creationGovernanceDefault(
  tierCode: string | null, model: string, profile: string | null, selection?: GovernanceMode,
): GovernanceMode | null {
  const available = creationGovernanceModes(tierCode, model);
  if (selection && available.includes(selection)) return selection;
  const preferred = resolveGovernanceMode(profile);
  if (available.includes(preferred)) return preferred;
  return available.find((mode) => MODE_ORDER.indexOf(mode) >= MODE_ORDER.indexOf(preferred))
    ?? available[available.length - 1] ?? null;
}

/** BR-CHL-M01: after submission, the Curator can only raise rigor in Curation. */
export function higherGovernanceModes(current: GovernanceMode, available: GovernanceMode[]): GovernanceMode[] {
  return available.filter((mode) => MODE_ORDER.indexOf(mode) > MODE_ORDER.indexOf(current));
}