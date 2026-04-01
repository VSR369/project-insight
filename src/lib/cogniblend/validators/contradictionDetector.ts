/**
 * Contradiction Detector — Rule 7: Cross-section logic checks.
 *
 * 6 checks:
 * 1. Budget vs Deliverables count mismatch
 * 2. Maturity vs Deliverable type alignment
 * 3. Timeline vs Phase count mismatch
 * 4. Scope vs Deliverables traceability gap
 * 5. Multi-domain budget split warning
 * 6. Budget vs Expertise level alignment
 */

import type { ChallengeContext } from '../challengeContextAssembler';

export interface Contradiction {
  check: string;
  severity: 'error' | 'warning';
  message: string;
  sections: string[];
}

export function detectContradictions(
  context: ChallengeContext,
): Contradiction[] {
  const contradictions: Contradiction[] = [];
  const sections = context.sections ?? {};

  // 1. Budget vs Deliverables count
  checkBudgetDeliverables(context, sections, contradictions);

  // 2. Maturity vs Deliverable type
  checkMaturityDeliverables(context, sections, contradictions);

  // 3. Timeline vs Phase count
  checkTimelinePhases(sections, contradictions);

  // 4. Scope vs Deliverables trace
  checkScopeDeliverables(sections, contradictions);

  // 5. Multi-domain budget split
  checkMultiDomainBudget(context, contradictions);

  // 6. Budget vs Expertise
  checkBudgetExpertise(context, contradictions);

  return contradictions;
}

function parseJsonSafe(val: unknown): unknown[] | null {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
  }
  return null;
}

function checkBudgetDeliverables(
  context: ChallengeContext,
  sections: Record<string, unknown>,
  contradictions: Contradiction[],
): void {
  const pool = context.totalPrizePool ?? 0;
  if (pool <= 0) return;

  const deliverables = parseJsonSafe(sections.deliverables);
  if (!deliverables || deliverables.length === 0) return;

  const perDeliverable = pool / deliverables.length;
  if (deliverables.length > 10 && perDeliverable < 500) {
    contradictions.push({
      check: 'budget_deliverables',
      severity: 'warning',
      message: `${deliverables.length} deliverables with $${pool.toLocaleString()} budget — only $${Math.round(perDeliverable)}/deliverable. Consider reducing scope or increasing budget.`,
      sections: ['reward_structure', 'deliverables'],
    });
  }
}

function checkMaturityDeliverables(
  context: ChallengeContext,
  sections: Record<string, unknown>,
  contradictions: Contradiction[],
): void {
  const maturity = (context.maturityLevel ?? '').toLowerCase();
  if (!maturity) return;

  const deliverables = parseJsonSafe(sections.deliverables);
  if (!deliverables) return;

  const deliverableStr = JSON.stringify(deliverables).toLowerCase();

  if (maturity === 'blueprint' && (deliverableStr.includes('working prototype') || deliverableStr.includes('production code'))) {
    contradictions.push({
      check: 'maturity_deliverables',
      severity: 'warning',
      message: 'Maturity is Blueprint but deliverables mention prototype/production code. Blueprint expects conceptual designs.',
      sections: ['maturity_level', 'deliverables'],
    });
  }
}

function checkTimelinePhases(
  sections: Record<string, unknown>,
  contradictions: Contradiction[],
): void {
  const phases = parseJsonSafe(sections.phase_schedule);
  if (!phases || phases.length === 0) return;

  const totalDays = phases.reduce((sum: number, p: any) => {
    return sum + (Number(p.duration_days ?? p.durationDays ?? 0));
  }, 0);

  if (phases.length > 6 && totalDays < 30) {
    contradictions.push({
      check: 'timeline_phases',
      severity: 'warning',
      message: `${phases.length} phases in only ${totalDays} days — phases may be too granular.`,
      sections: ['phase_schedule'],
    });
  }
}

function checkScopeDeliverables(
  sections: Record<string, unknown>,
  contradictions: Contradiction[],
): void {
  const scope = typeof sections.scope === 'string' ? sections.scope : '';
  const deliverables = parseJsonSafe(sections.deliverables);
  if (!scope || !deliverables || deliverables.length === 0) return;

  const scopeLower = scope.toLowerCase();
  const unmapped = deliverables.filter((d: any) => {
    const name = (typeof d === 'string' ? d : d?.name ?? d?.title ?? '').toLowerCase();
    return name.length > 3 && !scopeLower.includes(name.slice(0, Math.min(name.length, 20)));
  });

  if (unmapped.length > deliverables.length * 0.5 && unmapped.length >= 3) {
    contradictions.push({
      check: 'scope_deliverables',
      severity: 'warning',
      message: `${unmapped.length} of ${deliverables.length} deliverables have no clear mention in Scope. Traceability gap detected.`,
      sections: ['scope', 'deliverables'],
    });
  }
}

function checkMultiDomainBudget(
  context: ChallengeContext,
  contradictions: Contradiction[],
): void {
  const pool = context.totalPrizePool ?? 0;
  const domains = context.domainTags ?? [];
  if (domains.length <= 3 || pool <= 0) return;

  const perDomain = pool / domains.length;
  if (perDomain < 2000) {
    contradictions.push({
      check: 'multi_domain_budget',
      severity: 'warning',
      message: `${domains.length} domain tags with $${pool.toLocaleString()} budget. Multi-domain challenges typically need higher budgets.`,
      sections: ['domain_tags', 'reward_structure'],
    });
  }
}

function checkBudgetExpertise(
  context: ChallengeContext,
  contradictions: Contradiction[],
): void {
  const pool = context.totalPrizePool ?? 0;
  if (pool <= 0) return;

  const effort = context.estimatedEffortHours;
  if (!effort) return;

  const midpoint = (effort.min + effort.max) / 2;
  if (midpoint <= 0) return;

  const effectiveRate = pool / midpoint;
  if (effectiveRate < 20) {
    contradictions.push({
      check: 'budget_expertise',
      severity: 'warning',
      message: `Effective rate ~$${Math.round(effectiveRate)}/hr may not attract qualified experts. Consider increasing the prize pool.`,
      sections: ['reward_structure', 'solver_expertise'],
    });
  }
}
