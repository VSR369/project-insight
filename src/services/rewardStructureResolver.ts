/**
 * rewardStructureResolver.ts — Resolves upstream reward data source
 * based on challenge model (MP/AGG) and embedded source metadata.
 *
 * DATA SOURCE HIERARCHY:
 *   Marketplace: AM → CA → Curator
 *   Aggregator:  CR → Curator
 */

export type ChallengeModel = 'marketplace' | 'aggregator';
export type SourceRole = 'CR' | 'CURATOR';

/** Legacy source roles that map to CR for backward compatibility */
const LEGACY_SOURCE_ROLES: Record<string, SourceRole> = {
  AM: 'CR',
  CA: 'CR',
};
export type RewardType = 'monetary' | 'non_monetary' | 'both' | null;

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
  /** Original AM/CR budget range (before curator tier breakup) */
  budgetMin?: number;
  budgetMax?: number;
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

export interface UpstreamSource {
  role: SourceRole;
  date?: string;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
}

export interface RewardData {
  type: RewardType;
  monetary?: MonetaryReward;
  nonMonetary?: NonMonetaryReward;
  sourceRole: SourceRole;
  sourceDate?: string;
  isAutoPopulated: boolean;
  isEditable: boolean;
  isTypeLocked?: boolean;
  /** Original upstream data for reset functionality */
  originalData?: RewardData;
  /** Immutable upstream source attribution — survives curator saves */
  upstreamSource?: UpstreamSource;
}

/* ── Role display names ── */

const ROLE_DISPLAY_NAMES: Record<SourceRole, string> = {
  CR: 'Challenge Creator',
  CURATOR: 'Curator',
};

/** Display names for legacy roles (backward compat for existing data) */
const LEGACY_ROLE_DISPLAY: Record<string, string> = {
  AM: 'Challenge Creator',
  CA: 'Challenge Creator',
};

export function getRoleDisplayName(role: string): string {
  if (role in ROLE_DISPLAY_NAMES) return ROLE_DISPLAY_NAMES[role as SourceRole];
  return LEGACY_ROLE_DISPLAY[role] ?? role;
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
 *  - { type: 'monetary', tiers: [...] } full round-trip format
 *  - { type: 'non_monetary', items: [...] }
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

  // Helper: parse monetary tiers from raw data
  const parseTiers = (): { tiers: PrizeTier[]; totalFromFlat: number; monetary: MonetaryReward } => {
    const platinumAmt = Number(raw.platinum) || 0;
    const goldAmt = Number(raw.gold) || 0;
    const silverAmt = Number(raw.silver) || 0;
    const totalFromFlat = platinumAmt + goldAmt + silverAmt;

    let tiers: PrizeTier[] = [];
    if (Array.isArray(raw.tiers) && raw.tiers.length > 0) {
      tiers = raw.tiers.map((t: any) => ({
        rank: t.rank,
        amount: Number(t.amount) || 0,
        count: Number(t.count) || 1,
        label: t.label,
      }));
    } else {
      if (platinumAmt > 0) tiers.push({ rank: 'platinum', amount: platinumAmt, count: 1, label: '1st Place' });
      if (goldAmt > 0) tiers.push({ rank: 'gold', amount: goldAmt, count: 1, label: '2nd Place' });
      if (silverAmt > 0) tiers.push({ rank: 'silver', amount: silverAmt, count: 1, label: '3rd Place' });
    }

    const milestones: PaymentMilestone[] = raw.payment_milestones ?? raw.payment_schedule ?? [];

    return {
      tiers,
      totalFromFlat,
      monetary: {
        currency: raw.currency ?? 'USD',
        totalPool: raw.totalPool ?? (totalFromFlat || (Number(raw.amount) || undefined)),
        tiers,
        payment_milestones: milestones,
        payment_mode: raw.payment_mode,
      },
    };
  };

  // Helper: parse non-monetary items from raw data
  const parseNMItems = (): NonMonetaryItem[] => {
    const items: NonMonetaryItem[] = [];

    if (raw.tiered_perks) {
      const perks = raw.tiered_perks;
      const allPerks = new Set<string>();
      for (const tier of ['platinum', 'gold', 'silver'] as const) {
        if (Array.isArray(perks[tier])) {
          for (const perk of perks[tier]) {
            if (typeof perk === 'string' && !allPerks.has(perk)) {
              allPerks.add(perk);
              items.push({ id: crypto.randomUUID(), type: 'recognition', title: perk, description: '', isFromSource: true });
            }
          }
        }
      }
    }

    if (Array.isArray(raw.non_monetary_perks)) {
      for (const perk of raw.non_monetary_perks) {
        if (typeof perk === 'string') {
          items.push({ id: crypto.randomUUID(), type: 'recognition', title: perk, description: '', isFromSource: true });
        }
      }
    }

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

    return items;
  };

  // ── Both path: monetary + non-monetary combined ──
  if (explicitType === 'both') {
    const { monetary } = parseTiers();
    const nmItems = parseNMItems();
    return {
      type: 'both',
      monetary,
      nonMonetary: { items: nmItems },
    };
  }

  // Budget range path: AM/CR provided budget_min/budget_max but no tier breakup yet
  const budgetMin = Number(raw.budget_min) || 0;
  const budgetMax = Number(raw.budget_max) || 0;
  if ((budgetMin > 0 || budgetMax > 0) && !explicitType) {
    return {
      type: 'monetary',
      monetary: {
        currency: raw.currency ?? 'USD',
        totalPool: budgetMax || budgetMin,
        tiers: [],
        budgetMin,
        budgetMax,
      },
    };
  }

  // Monetary path (default if any monetary fields exist)
  const platinumAmt = Number(raw.platinum) || 0;
  const goldAmt = Number(raw.gold) || 0;
  const silverAmt = Number(raw.silver) || 0;
  const totalFromFlat = platinumAmt + goldAmt + silverAmt;

  const hasTierAmounts =
    totalFromFlat > 0 ||
    (raw.amount != null && raw.amount > 0);

  if (explicitType === 'monetary' || hasTierAmounts) {
    let tiers: PrizeTier[] = [];

    // Prefer serialized tiers array for lossless round-trip
    if (Array.isArray(raw.tiers) && raw.tiers.length > 0) {
      tiers = raw.tiers.map((t: any) => ({
        rank: t.rank,
        amount: Number(t.amount) || 0,
        count: Number(t.count) || 1,
        label: t.label,
      }));
    } else {
      // Fallback: reconstruct from flat keys
      if (platinumAmt > 0) {
        tiers.push({ rank: 'platinum', amount: platinumAmt, count: 1, label: '1st Place' });
      }
      if (goldAmt > 0) {
        tiers.push({ rank: 'gold', amount: goldAmt, count: 1, label: '2nd Place' });
      }
      if (silverAmt > 0) {
        tiers.push({ rank: 'silver', amount: silverAmt, count: 1, label: '3rd Place' });
      }
    }

    const milestones: PaymentMilestone[] =
      raw.payment_milestones ?? raw.payment_schedule ?? [];

    return {
      type: 'monetary',
      monetary: {
        currency: raw.currency ?? 'USD',
        totalPool: raw.totalPool ?? (totalFromFlat || (Number(raw.amount) || undefined)),
        tiers,
        payment_milestones: milestones,
        payment_mode: raw.payment_mode,
      },
    };
  }

  return { type: null };
}

/* ── Source resolver ── */

// Legacy: MARKETPLACE_PRIORITY removed — source is always CR or CURATOR

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

  // Check for explicit source_role metadata — resolve legacy AM/CA to CR
  const rawRole = (raw.source_role as string)?.toUpperCase();
  const embeddedRole: SourceRole | undefined = rawRole
    ? (LEGACY_SOURCE_ROLES[rawRole] ?? rawRole) as SourceRole
    : undefined;
  const sourceDate = raw.source_date as string | undefined;
  const migrated = migrateRawReward(raw);

  // Extract immutable upstream_source if present
  const rawUpstream = raw.upstream_source as any;
  const upstreamSource: UpstreamSource | undefined = rawUpstream && typeof rawUpstream === 'object'
    ? {
        role: ((r) => (LEGACY_SOURCE_ROLES[r] ?? r) as SourceRole)((rawUpstream.role as string)?.toUpperCase()),
        date: rawUpstream.date ?? rawUpstream.source_date,
        budgetMin: Number(rawUpstream.budget_min) || undefined,
        budgetMax: Number(rawUpstream.budget_max) || undefined,
        currency: rawUpstream.currency,
      }
    : undefined;

  const hasContent =
    migrated.type !== null &&
    ((migrated.monetary && (migrated.monetary.tiers.length > 0 || (migrated.monetary.totalPool ?? 0) > 0)) ||
      (migrated.nonMonetary && migrated.nonMonetary.items.length > 0));

  // Read isTypeLocked from persisted data (supports both old and new key)
  const isTypeLocked = raw?._typeLocked === true || raw?.isTypeLocked === true;

  // Curator-saved data: NOT auto-populated — it's the curator's own work
  if (embeddedRole === 'CURATOR' && hasContent) {
    return {
      ...migrated,
      sourceRole: 'CURATOR',
      sourceDate,
      isAutoPopulated: false,
      isEditable: true,
      isTypeLocked,
      upstreamSource,
    };
  }

  // Explicit upstream role (AM/CR/CA) with content
  if (embeddedRole && hasContent) {
    return {
      ...migrated,
      sourceRole: embeddedRole,
      sourceDate,
      isAutoPopulated: true,
      isEditable: true,
      upstreamSource: upstreamSource ?? {
        role: embeddedRole,
        date: sourceDate,
        budgetMin: Number(raw.budget_min) || undefined,
        budgetMax: Number(raw.budget_max) || undefined,
        currency: raw.currency,
      },
      originalData: {
        ...migrated,
        sourceRole: embeddedRole,
        sourceDate,
        isAutoPopulated: true,
        isEditable: true,
      },
    };
  }

  // No explicit source_role — never infer, default to CURATOR with no banner
  if (hasContent) {
    return {
      ...migrated,
      sourceRole: 'CURATOR',
      isAutoPopulated: false,
      isEditable: true,
      upstreamSource,
    };
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
 * Persists full tiers array + totalPool for lossless round-trip,
 * plus flat keys (platinum/gold/silver) for backward compatibility.
 */
export function serializeRewardData(data: RewardData): Record<string, any> {
  const base: Record<string, any> = {
    source_role: data.sourceRole,
    source_date: data.sourceDate ?? new Date().toISOString(),
  };

  // Preserve immutable upstream_source across saves
  if (data.upstreamSource) {
    base.upstream_source = {
      role: data.upstreamSource.role,
      date: data.upstreamSource.date,
      budget_min: data.upstreamSource.budgetMin,
      budget_max: data.upstreamSource.budgetMax,
      currency: data.upstreamSource.currency,
    };
  }

  if (data.isTypeLocked) {
    base._typeLocked = true;
  }

  const serializeMonetary = (m: MonetaryReward) => {
    const tierMap: Record<string, number> = {};
    for (const t of m.tiers) {
      tierMap[t.rank] = t.amount;
    }
    return {
      currency: m.currency,
      totalPool: m.totalPool,
      platinum: tierMap.platinum ?? 0,
      gold: tierMap.gold ?? 0,
      silver: tierMap.silver ?? 0,
      tiers: m.tiers,
      num_rewarded: String(m.tiers.filter((t) => t.amount > 0 && t.rank !== 'honorable_mention').length),
      payment_mode: m.payment_mode ?? 'escrow',
      payment_milestones: m.payment_milestones ?? [],
    };
  };

  if (data.type === 'both' && data.monetary && data.nonMonetary) {
    return {
      ...base,
      type: 'both',
      ...serializeMonetary(data.monetary),
      items: data.nonMonetary.items,
    };
  }

  if ((data.type === 'monetary' || data.type === 'both') && data.monetary) {
    return {
      ...base,
      type: data.type,
      ...serializeMonetary(data.monetary),
    };
  }

  if ((data.type === 'non_monetary' || data.type === 'both') && data.nonMonetary) {
    return {
      ...base,
      type: data.type,
      items: data.nonMonetary.items,
    };
  }

  return { ...base, type: null };
}
