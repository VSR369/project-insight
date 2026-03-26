/**
 * rewardValidation.ts — Pure validation utilities for the reward structure.
 *
 * Supports both legacy item-array model and new checkbox model.
 * Tier ordering, total pool matching, non-monetary validation, auto-balance.
 */

import type {
  RewardData,
  RewardType,
  PrizeTier,
  MonetaryReward,
  NonMonetaryReward,
} from '@/services/rewardStructureResolver';
import type { TierState, NonMonetarySelections } from '@/hooks/useRewardStructureState';

export interface ValidationError {
  field: string;
  message: string;
}

/* ── Monetary validation (new toggle-switch model) ── */

export function validateMonetaryTiers(
  tiers: Record<string, TierState>,
  totalPool?: number,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { platinum, gold, silver } = tiers;

  // Platinum is always required when monetary is active
  if (!platinum?.enabled) {
    errors.push({ field: 'platinum.enabled', message: 'Platinum tier is required for monetary rewards.' });
  } else if (platinum.amount <= 0) {
    errors.push({ field: 'platinum.amount', message: 'Platinum prize amount must be greater than 0.' });
  }

  if (gold?.enabled) {
    if (gold.amount <= 0) {
      errors.push({ field: 'gold.amount', message: 'Gold prize amount must be greater than 0.' });
    }
    if (platinum?.enabled && gold.amount >= platinum.amount) {
      errors.push({ field: 'gold.amount', message: 'Gold amount must be less than Platinum.' });
    }
  }

  // Silver cannot be active without Gold
  if (silver?.enabled && !gold?.enabled) {
    errors.push({ field: 'silver.enabled', message: 'Silver cannot be active without Gold.' });
  }

  if (silver?.enabled) {
    if (silver.amount <= 0) {
      errors.push({ field: 'silver.amount', message: 'Silver prize amount must be greater than 0.' });
    }
    if (gold?.enabled && silver.amount >= gold.amount) {
      errors.push({ field: 'silver.amount', message: 'Silver amount must be less than Gold.' });
    }
  }

  // Total pool validation
  if (totalPool != null && totalPool > 0) {
    const computed = Object.values(tiers)
      .filter((t) => t.enabled && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    if (computed !== totalPool) {
      const diff = computed - totalPool;
      const direction = diff > 0 ? 'over' : 'under';
      errors.push({
        field: 'totalPool',
        message: `Prize breakdown is ${Math.abs(diff)} ${direction} the total pool of ${totalPool}.`,
      });
    }
  }

  return errors;
}

/* ── Non-monetary validation (checkbox model) ── */

export function validateNonMonetarySelections(
  selections: NonMonetarySelections,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const hasAny = Object.values(selections).some((s) => s.selected);
  if (!hasAny) {
    errors.push({ field: 'nonMonetary', message: 'Select at least one non-monetary reward.' });
  }
  return errors;
}

/* ── Legacy monetary validation (for backward compat with PrizeTier[]) ── */

function validateMonetary(m: MonetaryReward): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!m.currency) {
    errors.push({ field: 'currency', message: 'Currency is required.' });
  }

  const platinum = m.tiers.find((t) => t.rank === 'platinum');
  const gold = m.tiers.find((t) => t.rank === 'gold');
  const silver = m.tiers.find((t) => t.rank === 'silver');

  if (!platinum || platinum.amount <= 0) {
    errors.push({ field: 'platinum.amount', message: 'Platinum prize amount must be greater than 0.' });
  }
  if (platinum && (!Number.isInteger(platinum.count) || platinum.count < 1)) {
    errors.push({ field: 'platinum.count', message: 'Platinum winner count must be at least 1.' });
  }

  if (gold) {
    if (gold.amount <= 0) {
      errors.push({ field: 'gold.amount', message: 'Gold prize amount must be greater than 0.' });
    }
    if (platinum && gold.amount >= platinum.amount) {
      errors.push({ field: 'gold.amount', message: 'Gold amount must be less than Platinum.' });
    }
    if (!Number.isInteger(gold.count) || gold.count < 1) {
      errors.push({ field: 'gold.count', message: 'Gold winner count must be at least 1.' });
    }
  }

  // Silver without Gold check
  if (silver && !gold) {
    errors.push({ field: 'silver.enabled', message: 'Silver cannot be active without Gold.' });
  }

  if (silver) {
    if (silver.amount <= 0) {
      errors.push({ field: 'silver.amount', message: 'Silver prize amount must be greater than 0.' });
    }
    if (gold && silver.amount >= gold.amount) {
      errors.push({ field: 'silver.amount', message: 'Silver amount must be less than Gold.' });
    }
    if (!Number.isInteger(silver.count) || silver.count < 1) {
      errors.push({ field: 'silver.count', message: 'Silver winner count must be at least 1.' });
    }
  }

  // Total pool validation
  if (m.totalPool != null && m.totalPool > 0) {
    const computed = computeTierTotal(m.tiers);
    if (computed !== m.totalPool) {
      const diff = computed - m.totalPool;
      const direction = diff > 0 ? 'over' : 'under';
      errors.push({
        field: 'totalPool',
        message: `Prize breakdown is ${Math.abs(diff)} ${direction} the total pool of ${m.totalPool}.`,
      });
    }
  }

  return errors;
}

/* ── Legacy non-monetary validation ── */

function validateNonMonetary(nm: NonMonetaryReward): ValidationError[] {
  const errors: ValidationError[] = [];

  if (nm.items.length === 0) {
    errors.push({ field: 'items', message: 'At least one reward item is required.' });
  }

  nm.items.forEach((item, i) => {
    if (!item.title.trim()) {
      errors.push({ field: `items[${i}].title`, message: `Reward item #${i + 1} must have a title.` });
    }
    if (!item.type) {
      errors.push({ field: `items[${i}].type`, message: `Reward item #${i + 1} must have a type.` });
    }
  });

  return errors;
}

/* ── Main validator (legacy RewardData interface) ── */

export function validateRewardStructure(state: RewardData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!state.type) {
    errors.push({ field: 'type', message: 'Reward type must be selected.' });
    return errors;
  }

  // Mutual exclusivity
  const hasBoth =
    state.monetary &&
    state.monetary.tiers.length > 0 &&
    state.nonMonetary &&
    state.nonMonetary.items.length > 0;
  if (hasBoth) {
    errors.push({ field: 'mutual_exclusivity', message: 'Cannot have both monetary and non-monetary rewards.' });
  }

  if (state.type === 'monetary' && state.monetary) {
    errors.push(...validateMonetary(state.monetary));
  }

  if (state.type === 'non_monetary' && state.nonMonetary) {
    errors.push(...validateNonMonetary(state.nonMonetary));
  }

  return errors;
}

/* ── Compute total ── */

export function computeTierTotal(tiers: PrizeTier[]): number {
  return tiers
    .filter((t) => t.rank !== 'honorable_mention')
    .reduce((sum, t) => sum + t.amount * t.count, 0);
}

/* ── Auto-balance ── */

/**
 * Proportionally redistribute tier amounts to match the target total pool.
 * Rounds to nearest `roundUnit` (500 for <50k, 1000 for >=50k).
 * Distributes rounding remainder to platinum.
 */
export function autoBalance(
  tiers: PrizeTier[],
  targetTotal: number,
): PrizeTier[] {
  const prizeTiers = tiers.filter((t) => t.rank !== 'honorable_mention');
  const currentTotal = prizeTiers.reduce((s, t) => s + t.amount * t.count, 0);

  if (currentTotal === 0 || targetTotal <= 0) return tiers;

  const roundUnit = targetTotal >= 50000 ? 1000 : 500;
  const ratio = targetTotal / currentTotal;

  const balanced = tiers.map((t) => {
    if (t.rank === 'honorable_mention') return { ...t };
    const newAmount = Math.round((t.amount * ratio) / roundUnit) * roundUnit;
    return { ...t, amount: Math.max(newAmount, roundUnit) };
  });

  // Fix rounding error by adjusting platinum
  const newTotal = balanced
    .filter((t) => t.rank !== 'honorable_mention')
    .reduce((s, t) => s + t.amount * t.count, 0);
  const diff = targetTotal - newTotal;
  const platIdx = balanced.findIndex((t) => t.rank === 'platinum');
  if (platIdx >= 0 && balanced[platIdx].count > 0) {
    balanced[platIdx] = {
      ...balanced[platIdx],
      amount: balanced[platIdx].amount + Math.round(diff / balanced[platIdx].count / roundUnit) * roundUnit,
    };
  }

  return balanced;
}

/* ── Pool status ── */

export type PoolStatus = 'match' | 'under' | 'over' | 'no_pool';

export function getPoolStatus(
  tiers: PrizeTier[],
  totalPool?: number,
): { status: PoolStatus; computed: number; diff: number } {
  const computed = computeTierTotal(tiers);
  if (totalPool == null || totalPool <= 0) {
    return { status: 'no_pool', computed, diff: 0 };
  }
  if (computed === totalPool) return { status: 'match', computed, diff: 0 };
  if (computed < totalPool) return { status: 'under', computed, diff: totalPool - computed };
  return { status: 'over', computed, diff: computed - totalPool };
}
