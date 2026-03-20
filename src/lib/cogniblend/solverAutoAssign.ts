/**
 * solverAutoAssign.ts
 *
 * Deterministic solver type assignment based on challenge signals.
 * Used both for auto-repair of existing challenges and as a fallback
 * when AI returns empty/invalid solver arrays.
 *
 * Hierarchy (narrowest → broadest): IO < CE < OC < DR < OPEN
 */

const BREADTH_ORDER = ['IO', 'CE', 'OC', 'DR', 'OPEN'] as const;

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

  // Rule 1: IP-sensitive or advanced maturity
  if (['IP-EA', 'IP-EL'].includes(ip) || ['PILOT', 'PROTOTYPE'].includes(maturity)) {
    return { eligibleCode: 'CE', visibleCode: 'DR' };
  }

  // Rule 2: Domain-expert / PoC
  if (maturity === 'POC') {
    return { eligibleCode: 'DR', visibleCode: 'OPEN' };
  }

  // Rule 3: Open innovation / ideation
  if (maturity === 'BLUEPRINT' && ['IP-NONE', 'IP-NEL', ''].includes(ip)) {
    return { eligibleCode: 'OPEN', visibleCode: 'OPEN' };
  }

  // Rule 4: Default
  return { eligibleCode: 'DR', visibleCode: 'OPEN' };
}

/**
 * Validate that visible is broader than eligible. Auto-correct if not.
 */
export function enforceHierarchy(eligible: string, visible: string): SolverAssignment {
  const eligibleRank = BREADTH_ORDER.indexOf(eligible as any);
  const visibleRank = BREADTH_ORDER.indexOf(visible as any);

  if (eligibleRank < 0) return { eligibleCode: 'DR', visibleCode: 'OPEN' };
  if (visibleRank < 0) return { eligibleCode: eligible, visibleCode: 'OPEN' };

  if (eligible === 'OPEN' && visible === 'OPEN') {
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
