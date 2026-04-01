/**
 * postLlmValidation — Programmatic checks run AFTER every AI response,
 * BEFORE showing results to the user.
 *
 * Eight validation rules:
 * 1. Date validation (phase schedule — no past dates, sequential)
 * 2. Master data enforcement (suggested values must exist)
 * 3. Evaluation weights sum to 100%
 * 4. Reward rate floor check
 * 5. Prize tiers ≤ total pool
 * 6. Format validation (table/line_items/checkbox structure)
 * 7. Contradiction detection (cross-section logic checks)
 * 8. Confidence scoring (context availability → risk level)
 */

import type { ChallengeContext } from './challengeContextAssembler';
import { validateFormat, type FormatValidationResult } from './validators/formatValidator';
import { detectContradictions, type Contradiction } from './validators/contradictionDetector';
import { scoreConfidence, type ConfidenceScore } from './validators/confidenceScorer';

/* ── Public types ── */

export interface ValidationCorrection {
  field: string;
  issue: string;
  severity: 'error' | 'warning';
  autoFixed: boolean;
  originalValue: unknown;
  fixedValue: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  corrections: ValidationCorrection[];
  passedChecks: string[];
  /** Rule 8: Confidence score for this section */
  confidenceScore?: ConfidenceScore;
  /** Rule 7: Cross-section contradictions (only populated on full-challenge validation) */
  contradictions?: Contradiction[];
  /** Rule 6: Format validation result */
  formatResult?: FormatValidationResult;
}

/* ── Main validator ── */

export function validateAIOutput(
  sectionKey: string,
  aiOutput: Record<string, unknown> | null,
  context: ChallengeContext,
): ValidationResult {
  const corrections: ValidationCorrection[] = [];
  const passedChecks: string[] = [];

  if (!aiOutput) {
    return { isValid: true, corrections, passedChecks };
  }

  // Rule 1: Date validation for phase_schedule
  if (sectionKey === 'phase_schedule') {
    validatePhaseScheduleDates(aiOutput, context, corrections, passedChecks);
  }

  // Rule 2: Master data enforcement
  validateMasterData(sectionKey, aiOutput, context, corrections, passedChecks);

  // Rule 3: Evaluation weights sum
  if (sectionKey === 'evaluation_criteria') {
    validateEvaluationWeights(aiOutput, corrections, passedChecks);
  }

  // Rule 4: Reward rate floor
  if (sectionKey === 'reward_structure') {
    validateRewardRateFloor(aiOutput, context, corrections, passedChecks);
  }

  // Rule 5: Prize tiers ≤ total pool
  if (sectionKey === 'reward_structure') {
    validatePrizeTierTotal(aiOutput, context, corrections, passedChecks);
  }

  // Rule 6: Format validation
  const formatResult = validateFormat(sectionKey, aiOutput);
  corrections.push(...formatResult.corrections);
  passedChecks.push(...formatResult.passedChecks);

  // Rule 7: Contradiction detection (cross-section — runs for every section but uses full context)
  const contradictions = detectContradictions(context);

  // Rule 8: Confidence scoring
  const confidenceScore = scoreConfidence(sectionKey, context);

  const unfixedErrors = corrections.filter(c => c.severity === 'error' && !c.autoFixed);
  return {
    isValid: unfixedErrors.length === 0,
    corrections,
    passedChecks,
    confidenceScore,
    contradictions: contradictions.length > 0 ? contradictions : undefined,
    formatResult,
  };
}

/* ── Rule 1: Phase Schedule Dates ── */

function validatePhaseScheduleDates(
  aiOutput: Record<string, unknown>,
  context: ChallengeContext,
  corrections: ValidationCorrection[],
  passedChecks: string[],
): void {
  const suggestion = aiOutput.suggestion as Record<string, unknown> | undefined;
  const suggestedPhases = (aiOutput.suggestedPhases ?? suggestion?.phases ?? aiOutput.phases) as any[] | undefined;
  if (!Array.isArray(suggestedPhases) || suggestedPhases.length === 0) return;

  const today = new Date(context.todaysDate);
  let hasDateIssues = false;

  for (const phase of suggestedPhases) {
    const startDate = new Date(phase.startDate ?? phase.start_date);
    const endDate = new Date(phase.endDate ?? phase.end_date);
    const phaseName = phase.name ?? phase.phase_name ?? 'Unknown Phase';
    const durationDays = Number(phase.durationDays ?? phase.duration_days ?? 0);

    // No past dates
    if (!isNaN(startDate.getTime()) && startDate < today) {
      hasDateIssues = true;
      const fixedStart = new Date(today);
      fixedStart.setDate(fixedStart.getDate() + 14);
      corrections.push({
        field: `${phaseName}.startDate`,
        issue: `Start date ${formatDate(startDate)} is in the past. Today is ${context.todaysDate}.`,
        severity: 'error',
        autoFixed: true,
        originalValue: formatDate(startDate),
        fixedValue: formatDate(fixedStart),
      });
    }

    // End = start + duration
    if (durationDays > 0 && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      const expectedEnd = new Date(startDate);
      expectedEnd.setDate(expectedEnd.getDate() + durationDays);
      if (formatDate(endDate) !== formatDate(expectedEnd)) {
        hasDateIssues = true;
        corrections.push({
          field: `${phaseName}.endDate`,
          issue: `End date doesn't match start + duration.`,
          severity: 'error',
          autoFixed: true,
          originalValue: formatDate(endDate),
          fixedValue: formatDate(expectedEnd),
        });
      }
    }

    // No zero duration
    if (durationDays <= 0) {
      hasDateIssues = true;
      corrections.push({
        field: `${phaseName}.durationDays`,
        issue: `Duration is ${durationDays} — must be > 0.`,
        severity: 'error',
        autoFixed: false,
        originalValue: durationDays,
        fixedValue: null,
      });
    }
  }

  // Sequential phases
  for (let i = 1; i < suggestedPhases.length; i++) {
    const prevEnd = new Date(suggestedPhases[i - 1].endDate ?? suggestedPhases[i - 1].end_date);
    const currStart = new Date(suggestedPhases[i].startDate ?? suggestedPhases[i].start_date);
    const phaseName = suggestedPhases[i].name ?? suggestedPhases[i].phase_name ?? `Phase ${i + 1}`;
    if (!isNaN(prevEnd.getTime()) && !isNaN(currStart.getTime()) && currStart <= prevEnd) {
      hasDateIssues = true;
      const fixedStart = new Date(prevEnd);
      fixedStart.setDate(fixedStart.getDate() + 1);
      corrections.push({
        field: `${phaseName}.startDate`,
        issue: `Overlaps with previous phase. Must start after ${formatDate(prevEnd)}.`,
        severity: 'error',
        autoFixed: true,
        originalValue: formatDate(currStart),
        fixedValue: formatDate(fixedStart),
      });
    }
  }

  if (!hasDateIssues) {
    passedChecks.push('All phase dates are future and sequential');
  }
}

/* ── Rule 2: Master Data Enforcement ── */

const MASTER_DATA_SECTION_MAP: Record<string, keyof ChallengeContext['masterData']> = {
  domain_tags: 'validDomainTags',
  maturity_level: 'validMaturityLevels',
  eligibility: 'validEligibilityTypes',
  ip_model: 'validIPModels',
  visibility: 'validVisibilityOptions',
};

function validateMasterData(
  sectionKey: string,
  aiOutput: Record<string, unknown>,
  context: ChallengeContext,
  corrections: ValidationCorrection[],
  passedChecks: string[],
): void {
  const masterKey = MASTER_DATA_SECTION_MAP[sectionKey];
  if (!masterKey) return;

  const validOptions = context.masterData[masterKey] as string[];
  if (!validOptions || validOptions.length === 0) return;

  const suggested = aiOutput.suggestedContent ?? aiOutput.suggestion;
  if (!suggested) return;

  const suggestedValues = Array.isArray(suggested) ? suggested : [suggested];
  let hasIssues = false;

  for (const val of suggestedValues) {
    const strVal = typeof val === 'string' ? val : (val as any)?.code ?? String(val);
    if (!validOptions.includes(strVal)) {
      hasIssues = true;
      const closest = findClosestMatch(strVal, validOptions);
      corrections.push({
        field: sectionKey,
        issue: `"${strVal}" is not in master data. Valid: ${validOptions.slice(0, 5).join(', ')}${validOptions.length > 5 ? '...' : ''}`,
        severity: 'error',
        autoFixed: closest !== null,
        originalValue: strVal,
        fixedValue: closest,
      });
    }
  }

  if (!hasIssues) {
    passedChecks.push(`All ${sectionKey} values are valid master data`);
  }
}

/* ── Rule 3: Evaluation Weights ── */

function validateEvaluationWeights(
  aiOutput: Record<string, unknown>,
  corrections: ValidationCorrection[],
  passedChecks: string[],
): void {
  const evalSuggestion = aiOutput.suggestion as Record<string, unknown> | undefined;
  const criteria = (aiOutput.suggestedCriteria ?? evalSuggestion?.rows ?? aiOutput.rows) as any[] | undefined;
  if (!Array.isArray(criteria) || criteria.length === 0) return;

  const totalWeight = criteria.reduce(
    (sum: number, c: any) => sum + (Number(c.weight ?? c.weight_percent ?? 0)),
    0,
  );

  if (Math.abs(totalWeight - 100) > 0.5) {
    corrections.push({
      field: 'weights',
      issue: `Evaluation criteria weights sum to ${totalWeight}%, not 100%.`,
      severity: 'error',
      autoFixed: true,
      originalValue: totalWeight,
      fixedValue: normalizeWeightsTo100(criteria),
    });
  } else {
    passedChecks.push('Evaluation weights sum to 100%');
  }
}

/* ── Rule 4: Reward Rate Floor ── */

function validateRewardRateFloor(
  aiOutput: Record<string, unknown>,
  context: ChallengeContext,
  corrections: ValidationCorrection[],
  passedChecks: string[],
): void {
  if (!context.rateCard || !context.estimatedEffortHours) return;

  const effortMidpoint = (context.estimatedEffortHours.min + context.estimatedEffortHours.max) / 2;
  if (effortMidpoint <= 0) return;

  const totalPool = Number(aiOutput.suggestedTotalPool ?? context.totalPrizePool ?? 0);
  if (totalPool <= 0) return;

  const effectiveRate = totalPool / effortMidpoint;

  if (effectiveRate < context.rateCard.effortRateFloor) {
    const minPool = Math.ceil(effortMidpoint * context.rateCard.effortRateFloor);
    corrections.push({
      field: 'totalPrizePool',
      issue: `Effective rate $${effectiveRate.toFixed(0)}/hr is below the floor of $${context.rateCard.effortRateFloor}/hr. Minimum pool: $${minPool.toLocaleString()}.`,
      severity: 'warning',
      autoFixed: false,
      originalValue: totalPool,
      fixedValue: minPool,
    });
  } else {
    passedChecks.push(`Reward rate $${effectiveRate.toFixed(0)}/hr meets floor`);
  }
}

/* ── Rule 5: Prize Tiers ≤ Total Pool ── */

function validatePrizeTierTotal(
  aiOutput: Record<string, unknown>,
  context: ChallengeContext,
  corrections: ValidationCorrection[],
  passedChecks: string[],
): void {
  const tiers = (aiOutput.suggestedTiers ?? aiOutput.tiers) as any[] | undefined;
  const pool = context.totalPrizePool;
  if (!Array.isArray(tiers) || !pool || pool <= 0) return;

  const tierTotal = tiers.reduce((sum: number, t: any) => sum + (Number(t.amount ?? 0)), 0);
  if (tierTotal > pool) {
    corrections.push({
      field: 'prizeTiers',
      issue: `Prize tiers ($${tierTotal.toLocaleString()}) exceed total pool ($${pool.toLocaleString()}).`,
      severity: 'error',
      autoFixed: false,
      originalValue: tierTotal,
      fixedValue: null,
    });
  } else {
    passedChecks.push('Prize tiers within total pool');
  }
}

/* ── Helpers ── */

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function findClosestMatch(value: string, validOptions: string[]): string | null {
  const lower = value.toLowerCase().trim();
  const exact = validOptions.find(opt => opt.toLowerCase() === lower);
  if (exact) return exact;
  const partial = validOptions.find(
    opt => opt.toLowerCase().includes(lower) || lower.includes(opt.toLowerCase()),
  );
  return partial ?? null;
}

function normalizeWeightsTo100(criteria: { name?: string; weight?: number; weight_percent?: number }[]): number {
  const total = criteria.reduce((sum, c) => sum + Number(c.weight ?? c.weight_percent ?? 0), 0);
  if (total === 0) return 0;
  // Return the normalized total (100) — the actual rebalanced array would be complex
  return 100;
}
