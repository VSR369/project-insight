/**
 * rewardStructureResolver.ts — Resolves upstream reward data source
 * based on challenge model (MP/AGG) and embedded source metadata.
 *
 * DATA SOURCE HIERARCHY:
 *   Marketplace: AM → CA → Curator
 *   Aggregator:  CR → Curator
 */

export type ChallengeModel = 'marketplace' | 'aggregator';
export type SourceRole = 'AM' | 'CA' | 'CR' | 'CURATOR';
export type RewardType = 'monetary' | 'non_monetary' | null;

export interface PrizeTier {
  rank: 'platinum' | 'gold' | 'silver' | 'honorable_mention';
  amount: number;
  count: number;
  label?: string;
}

export interface MonetaryReward {
  currency: string;
  totalPool?: number;
  tiers: PrizeTier[];
  payment_milestones?: PaymentMilestone[];
  payment_mode?: string;
}

export interface PaymentMilestone {
  name: string;
  pct: number;
  trigger?: string;
}

export type NonMonetaryType =
  | 'recognition'
  | 'opportunity'
  | 'resource'
  | 'publication'
  | 'access'
  | 'other';

export interface NonMonetaryItem {
  id: string;
  type: NonMonetaryType;
  title: string;
  description: string;
  isAISuggested?: boolean;
  isFromSource?: boolean;
}

export interface NonMonetaryReward {
  items: NonMonetaryItem[];
}

export interface RewardData {
  type: RewardType;
  monetary?: MonetaryReward;
  nonMonetary?: NonMonetaryReward;
  sourceRole: SourceRole;
  sourceDate?: string;
  isAutoPopulated: boolean;
  isEditable: boolean;
  /** Original upstream data for reset functionality */
  originalData?: RewardData;
}

/* ── Role display names ── */

const ROLE_DISPLAY_NAMES: Record<SourceRole, string> = {
  AM: 'Account Manager',
  CA: 'Challenge Architect',
  CR: 'Challenge Creator',
  CURATOR: 'Curator',
};

export function getRoleDisplayName(role: SourceRole): string {
  return ROLE_DISPLAY_NAMES[role];
}

/* ── Model normalizer ── */

export function normalizeChallengeModel(
  operatingModel?: string | null,
): ChallengeModel {
  if (!operatingModel) return 'marketplace';
  const normalized = operatingModel.toUpperCase();
  if (normalized === 'AGG' || normalized === 'AGGREGATOR') return 'aggregator';
  return 'marketplace';
}

/* ── Legacy data migration ── */

/**
 * Migrate legacy flat reward_structure JSONB into normalized RewardData.
 * Supports:
 *  - { platinum: N, gold: N, silver: N } flat amounts
 *  - { type: 'monetary', ... } or { type: 'non_monetary', ... }
 *  - { tiered_perks: { platinum: [...], ... } }
 *  - { payment_milestones: [...] }
 */
export function migrateRawReward(raw: any): {
  type: RewardType;
  monetary?: MonetaryReward;
  nonMonetary?: NonMonetaryReward;
} {
  if (!raw || typeof raw !== 'object') {
    return { type: null };
  }

  const explicitType = raw.type as string | undefined;

  // Non-monetary path
  if (explicitType === 'non_monetary') {
    const items: NonMonetaryItem[] = [];

    // Migrate tiered_perks into flat NonMonetaryItem list
    if (raw.tiered_perks) {
      const perks = raw.tiered_perks;
      const allPerks = new Set<string>();
      for (const tier of ['platinum', 'gold', 'silver'] as const) {
        if (Array.isArray(perks[tier])) {
          for (const perk of perks[tier]) {
            if (typeof perk === 'string' && !allPerks.has(perk)) {
              allPerks.add(perk);
              items.push({
                id: crypto.randomUUID(),
                type: 'recognition',
                title: perk,
                description: '',
                isFromSource: true,
              });
            }
          }
        }
      }
    }

    // Also handle flat non_monetary_perks array
    if (Array.isArray(raw.non_monetary_perks)) {
      for (const perk of raw.non_monetary_perks) {
        if (typeof perk === 'string') {
          items.push({
            id: crypto.randomUUID(),
            type: 'recognition',
            title: perk,
            description: '',
            isFromSource: true,
          });
        }
      }
    }

    // Handle serialized items array (from serializeRewardData)
    if (Array.isArray(raw.items)) {
      for (const item of raw.items) {
        if (item && typeof item === 'object' && item.title) {
          items.push({
            id: item.id ?? crypto.randomUUID(),
            type: item.type ?? 'other',
            title: item.title,
            description: item.description ?? '',
            isAISuggested: !!item.isAISuggested,
            isFromSource: !!item.isFromSource,
          });
        }
      }
    }

    return {
      type: 'non_monetary',
      nonMonetary: { items },
    };
  }

  // Monetary path (default if any monetary fields exist)
  const hasTierAmounts =
    (raw.platinum != null && raw.platinum > 0) ||
    (raw.gold != null && raw.gold > 0) ||
    (raw.amount != null && raw.amount > 0);

  if (explicitType === 'monetary' || hasTierAmounts) {
    const platinumAmt = Number(raw.platinum) || 0;
    const goldAmt = Number(raw.gold) || 0;
    const silverAmt = Number(raw.silver) || 0;
    const totalFromFlat = platinumAmt + goldAmt + silverAmt;

    const tiers: PrizeTier[] = [];
    if (platinumAmt > 0) {
      tiers.push({ rank: 'platinum', amount: platinumAmt, count: 1, label: '1st Place' });
    }
    if (goldAmt > 0) {
      tiers.push({ rank: 'gold', amount: goldAmt, count: 1, label: '2nd Place' });
    }
    if (silverAmt > 0) {
      tiers.push({ rank: 'silver', amount: silverAmt, count: 1, label: '3rd Place' });
    }

    const milestones: PaymentMilestone[] =
      raw.payment_milestones ?? raw.payment_schedule ?? [];

    return {
      type: 'monetary',
      monetary: {
        currency: raw.currency ?? 'USD',
        totalPool: totalFromFlat || (Number(raw.amount) || undefined),
        tiers,
        payment_milestones: milestones,
        payment_mode: raw.payment_mode,
      },
    };
  }

  return { type: null };
}

/* ── Source resolver ── */

const MARKETPLACE_PRIORITY: SourceRole[] = ['AM', 'CA'];

/**
 * Resolve the reward data source from the challenge's reward_structure JSONB.
 * The source_role is expected to be embedded in the JSON when set by an upstream role.
 */
export function resolveRewardSource(
  rewardStructureRaw: any,
  operatingModel?: string | null,
): RewardData {
  const model = normalizeChallengeModel(operatingModel);
  const raw =
    typeof rewardStructureRaw === 'string'
      ? (() => {
          try {
            return JSON.parse(rewardStructureRaw);
          } catch {
            return null;
          }
        })()
      : rewardStructureRaw;

  if (!raw || typeof raw !== 'object') {
    return {
      type: null,
      sourceRole: 'CURATOR',
      isAutoPopulated: false,
      isEditable: true,
    };
  }

  // Check for explicit source_role metadata embedded in the JSON
  const embeddedRole = (raw.source_role as string)?.toUpperCase() as SourceRole | undefined;
  const sourceDate = raw.source_date as string | undefined;
  const migrated = migrateRawReward(raw);

  const hasContent =
    migrated.type !== null &&
    ((migrated.monetary && migrated.monetary.tiers.length > 0) ||
      (migrated.nonMonetary && migrated.nonMonetary.items.length > 0));

  if (embeddedRole && hasContent) {
    return {
      ...migrated,
      sourceRole: embeddedRole,
      sourceDate,
      isAutoPopulated: true,
      isEditable: true,
      originalData: {
        ...migrated,
        sourceRole: embeddedRole,
        sourceDate,
        isAutoPopulated: true,
        isEditable: true,
      },
    };
  }

  // Infer source based on model hierarchy
  if (hasContent) {
    if (model === 'marketplace') {
      // Assume upstream came from AM or CA; default to AM for marketplace
      const inferredRole: SourceRole = 'AM';
      return {
        ...migrated,
        sourceRole: inferredRole,
        sourceDate,
        isAutoPopulated: true,
        isEditable: true,
        originalData: {
          ...migrated,
          sourceRole: inferredRole,
          sourceDate,
          isAutoPopulated: true,
          isEditable: true,
        },
      };
    }

    if (model === 'aggregator') {
      return {
        ...migrated,
        sourceRole: 'CR',
        sourceDate,
        isAutoPopulated: true,
        isEditable: true,
        originalData: {
          ...migrated,
          sourceRole: 'CR',
          sourceDate,
          isAutoPopulated: true,
          isEditable: true,
        },
      };
    }
  }

  // No upstream data — curator creates from scratch
  return {
    type: null,
    sourceRole: 'CURATOR',
    isAutoPopulated: false,
    isEditable: true,
  };
}

/* ── Serializer for DB save ── */

/**
 * Serialize RewardData back to the JSONB format stored in challenges.reward_structure.
 */
export function serializeRewardData(data: RewardData): Record<string, any> {
  const base: Record<string, any> = {
    source_role: data.sourceRole,
    source_date: data.sourceDate ?? new Date().toISOString(),
  };

  if (data.type === 'monetary' && data.monetary) {
    const m = data.monetary;
    const tierMap: Record<string, number> = {};
    for (const t of m.tiers) {
      tierMap[t.rank] = t.amount;
    }
    return {
      ...base,
      type: 'monetary',
      currency: m.currency,
      platinum: tierMap.platinum ?? 0,
      gold: tierMap.gold ?? 0,
      silver: tierMap.silver ?? 0,
      num_rewarded: String(m.tiers.filter((t) => t.amount > 0 && t.rank !== 'honorable_mention').length),
      payment_mode: m.payment_mode ?? 'escrow',
      payment_milestones: m.payment_milestones ?? [],
    };
  }

  if (data.type === 'non_monetary' && data.nonMonetary) {
    return {
      ...base,
      type: 'non_monetary',
      items: data.nonMonetary.items,
    };
  }

  return { ...base, type: null };
}
