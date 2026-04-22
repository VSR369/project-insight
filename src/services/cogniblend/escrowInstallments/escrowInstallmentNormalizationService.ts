import { migrateRawReward } from '@/services/rewardStructureResolver';
import type { NormalizedEscrowInstallment, RewardMilestoneInput } from './escrowInstallmentTypes';

const DEFAULT_LABEL = 'Full Escrow Deposit';
const DEFAULT_TRIGGER = 'Before publication';

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function toMilestones(rawMilestones: RewardMilestoneInput[] | undefined): RewardMilestoneInput[] {
  if (!Array.isArray(rawMilestones) || rawMilestones.length === 0) {
    return [{ name: DEFAULT_LABEL, pct: 100, trigger: DEFAULT_TRIGGER }];
  }
  return rawMilestones;
}

export function getRewardTotal(rewardStructure: unknown): number {
  const migrated = migrateRawReward(rewardStructure);
  const totalPool = migrated.monetary?.totalPool ?? 0;
  if (totalPool > 0) return totalPool;
  return (migrated.monetary?.tiers ?? []).reduce((sum, tier) => sum + (tier.amount * tier.count), 0);
}

export function getEscrowCurrency(rewardStructure: unknown, fallbackCurrency?: string | null): string {
  const migrated = migrateRawReward(rewardStructure);
  return migrated.monetary?.currency ?? fallbackCurrency ?? 'USD';
}

export function normalizeEscrowInstallments(
  rewardStructure: unknown,
  fallbackCurrency?: string | null,
): NormalizedEscrowInstallment[] {
  const migrated = migrateRawReward(rewardStructure);
  const rewardTotal = getRewardTotal(rewardStructure);
  const currency = getEscrowCurrency(rewardStructure, fallbackCurrency);
  const milestones = toMilestones(migrated.monetary?.payment_milestones as RewardMilestoneInput[] | undefined);

  return milestones.map((milestone, index) => {
    const pct = Number(milestone.pct ?? 0);
    return {
      installmentNumber: index + 1,
      scheduleLabel: milestone.name?.trim() || `Installment ${index + 1}`,
      triggerEvent: milestone.trigger?.trim() || DEFAULT_TRIGGER,
      scheduledPct: pct,
      scheduledAmount: roundCurrency(rewardTotal * (pct / 100)),
      currency,
    };
  });
}