/**
 * solverAutoAssign.ts
 *
 * Deterministic solver type assignment based on challenge signals.
 * Used both for auto-repair of existing challenges and as a fallback
 * when AI returns empty/invalid solver arrays.
 *
 * Hierarchy (narrowest → broadest):
 * certified_expert < certified_competent < certified_basic < expert_invitee < registered < signed_in < open_community < hybrid
 */

const BREADTH_ORDER = [
  'certified_expert',
  'certified_competent',
  'certified_basic',
  'expert_invitee',
  'registered',
  'signed_in',
  'open_community',
  'hybrid',
] as const;

export interface SolverAssignment {
  eligibleCode: string;
  visibleCode: string;
}

/**
 * Compute deterministic solver eligible + visible codes from challenge signals.
 */
export function computeSolverAssignment(signals: {
  maturityLevel?: string | null;
  ipModel?: string | null;
}): SolverAssignment {
  const maturity = (signals.maturityLevel ?? '').toUpperCase();
  const ip = (signals.ipModel ?? '').toUpperCase();

  // Rule 1: IP-sensitive or advanced maturity → tightest eligible, moderate visible
  if (['IP-EA', 'IP-EL'].includes(ip) || ['PILOT', 'PROTOTYPE'].includes(maturity)) {
    return { eligibleCode: 'certified_expert', visibleCode: 'registered' };
  }

  // Rule 2: Domain-expert / PoC
  if (maturity === 'POC') {
    return { eligibleCode: 'registered', visibleCode: 'open_community' };
  }

  // Rule 3: Open innovation / ideation
  if (maturity === 'BLUEPRINT' && ['IP-NONE', 'IP-NEL', ''].includes(ip)) {
    return { eligibleCode: 'open_community', visibleCode: 'open_community' };
  }

  // Rule 4: Default
  return { eligibleCode: 'registered', visibleCode: 'open_community' };
}

/**
 * Validate that visible is broader than eligible. Auto-correct if not.
 */
export function enforceHierarchy(eligible: string, visible: string): SolverAssignment {
  const eligibleRank = BREADTH_ORDER.indexOf(eligible as any);
  const visibleRank = BREADTH_ORDER.indexOf(visible as any);

  if (eligibleRank < 0) return { eligibleCode: 'registered', visibleCode: 'open_community' };
  if (visibleRank < 0) return { eligibleCode: eligible, visibleCode: 'open_community' };

  // Both same code is allowed if both are open_community or hybrid
  if (eligible === visible && (eligible === 'open_community' || eligible === 'hybrid')) {
    return { eligibleCode: eligible, visibleCode: visible };
  }

  if (visibleRank <= eligibleRank) {
    const nextBroader = Math.min(eligibleRank + 1, BREADTH_ORDER.length - 1);
    return { eligibleCode: eligible, visibleCode: BREADTH_ORDER[nextBroader] };
  }

  return { eligibleCode: eligible, visibleCode: visible };
}

/**
 * Check if solver arrays need auto-repair (empty, malformed, or missing codes).
 */
export function needsSolverRepair(
  solverEligibilityTypes: unknown,
  solverVisibilityTypes: unknown,
): boolean {
  const hasEligible = Array.isArray(solverEligibilityTypes) &&
    solverEligibilityTypes.length > 0 &&
    solverEligibilityTypes.every((t: any) => t?.code);

  const hasVisible = Array.isArray(solverVisibilityTypes) &&
    solverVisibilityTypes.length > 0 &&
    solverVisibilityTypes.every((t: any) => t?.code);

  return !hasEligible || !hasVisible;
}
