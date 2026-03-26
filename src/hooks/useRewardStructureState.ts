/**
 * useRewardStructureState — State machine hook for the Reward Structure section.
 *
 * States:
 *   empty_no_source      → No upstream data, curator must create
 *   populated_from_source → Auto-filled from AM/CA/CR
 *   curator_editing       → Actively editing
 *   saved                 → Saved, read-only view
 *   reviewed              → AI reviewed
 *
 * New in redesign:
 *   - Per-field source tracking (FieldSource)
 *   - Fixed 5-checkbox non-monetary model (NonMonetarySelections)
 *   - Toggle-switch tier model (TierState)
 *   - isSubmitted lock
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  RewardData,
  RewardType,
  PrizeTier,
  MonetaryReward,
  NonMonetaryReward,
  NonMonetaryItem,
  PaymentMilestone,
  SourceRole,
} from '@/services/rewardStructureResolver';
import {
  resolveRewardSource,
  serializeRewardData,
} from '@/services/rewardStructureResolver';
import {
  validateRewardStructure,
  validateMonetaryTiers,
  validateNonMonetarySelections,
  type ValidationError,
} from '@/lib/rewardValidation';
import type { FieldSource } from '@/components/cogniblend/curation/rewards/SourceBadge';

/* ── Exported types ── */

export interface TierState {
  enabled: boolean;
  amount: number;
  amountSrc: FieldSource;
  aiSuggestion?: number;
}

export type NonMonetaryKey = 'certificate' | 'memento' | 'giftVouchers' | 'movieSponsorship' | 'others';

export interface NonMonetarySelection {
  selected: boolean;
  src: FieldSource;
  aiRecommended?: boolean;
}

export type NonMonetarySelections = Record<NonMonetaryKey, NonMonetarySelection>;

export const NM_KEYS: NonMonetaryKey[] = ['certificate', 'memento', 'giftVouchers', 'movieSponsorship', 'others'];

export const NM_LABELS: Record<NonMonetaryKey, string> = {
  certificate: 'Certificate',
  memento: 'Memento',
  giftVouchers: 'Gift Vouchers',
  movieSponsorship: 'Movie Sponsorship',
  others: 'Others',
};

export const NM_ICONS: Record<NonMonetaryKey, string> = {
  certificate: '📜',
  memento: '🏆',
  giftVouchers: '🎁',
  movieSponsorship: '🎬',
  others: '💡',
};

/* ── AM Payload interface ── */

export interface AMRewardPayload {
  monetary?: {
    totalPool?: number;
    tiers?: {
      platinum?: number;
      gold?: number;
      silver?: number;
    };
  };
  nonMonetary?: {
    certificate?: boolean;
    memento?: boolean;
    giftVouchers?: boolean;
    movieSponsorship?: boolean;
    others?: boolean;
  };
}

/* ── Default states ── */

function defaultTierState(src: FieldSource['src'] = 'curator'): Record<string, TierState> {
  return {
    platinum: { enabled: true, amount: 0, amountSrc: { src } },
    gold: { enabled: false, amount: 0, amountSrc: { src } },
    silver: { enabled: false, amount: 0, amountSrc: { src } },
  };
}

function defaultNMSelections(src: FieldSource['src'] = 'curator'): NonMonetarySelections {
  return {
    certificate: { selected: false, src: { src } },
    memento: { selected: false, src: { src } },
    giftVouchers: { selected: false, src: { src } },
    movieSponsorship: { selected: false, src: { src } },
    others: { selected: false, src: { src } },
  };
}

/* ── Convert legacy data to new models ── */

function legacyToTierState(monetary?: MonetaryReward, srcDefault: FieldSource['src'] = 'curator'): Record<string, TierState> {
  const state = defaultTierState(srcDefault);
  if (!monetary) return state;
  for (const tier of monetary.tiers) {
    if (tier.rank in state) {
      state[tier.rank] = {
        enabled: true,
        amount: tier.amount,
        amountSrc: { src: srcDefault },
      };
    }
  }
  return state;
}

function legacyToNMSelections(nonMonetary?: NonMonetaryReward, srcDefault: FieldSource['src'] = 'curator'): NonMonetarySelections {
  const selections = defaultNMSelections(srcDefault);
  if (!nonMonetary) return selections;

  // Map legacy items to fixed checkboxes by title matching
  const titleMap: Record<string, NonMonetaryKey> = {
    certificate: 'certificate',
    memento: 'memento',
    'gift vouchers': 'giftVouchers',
    'gift voucher': 'giftVouchers',
    'movie sponsorship': 'movieSponsorship',
    others: 'others',
    other: 'others',
  };

  for (const item of nonMonetary.items) {
    const normalized = item.title.toLowerCase().trim();
    const key = titleMap[normalized];
    if (key) {
      selections[key] = {
        selected: true,
        src: { src: item.isFromSource ? 'am' : item.isAISuggested ? 'ai' : srcDefault },
      };
    }
  }

  return selections;
}

/* ── Convert new models back to legacy for serialization ── */

function tierStateToTiers(tiers: Record<string, TierState>, currency: string): MonetaryReward {
  const prizeTiers: PrizeTier[] = [];
  for (const rank of ['platinum', 'gold', 'silver'] as const) {
    const t = tiers[rank];
    if (t?.enabled) {
      prizeTiers.push({
        rank,
        amount: t.amount,
        count: 1,
        label: rank === 'platinum' ? '1st Place' : rank === 'gold' ? '2nd Place' : '3rd Place',
      });
    }
  }
  return { currency, tiers: prizeTiers };
}

function nmSelectionsToItems(selections: NonMonetarySelections): NonMonetaryReward {
  const items: NonMonetaryItem[] = [];
  for (const key of NM_KEYS) {
    if (selections[key].selected) {
      items.push({
        id: crypto.randomUUID(),
        type: 'recognition',
        title: NM_LABELS[key],
        description: '',
        isFromSource: selections[key].src.src === 'am',
        isAISuggested: selections[key].src.src === 'ai',
      });
    }
  }
  return { items };
}

/* ── Section state types ── */

export type RewardSectionState =
  | 'empty_no_source'
  | 'populated_from_source'
  | 'curator_editing'
  | 'saved'
  | 'reviewed';

export interface UseRewardStructureStateReturn {
  sectionState: RewardSectionState;
  rewardData: RewardData;
  rewardType: RewardType;
  tierStates: Record<string, TierState>;
  nmSelections: NonMonetarySelections;
  currency: string;
  totalPool: number | undefined;
  errors: ValidationError[];
  isValid: boolean;
  isModified: boolean;
  isSubmitted: boolean;

  /* Actions */
  setRewardType: (type: RewardType) => void;
  setCurrency: (currency: string) => void;
  setTotalPool: (pool: number | undefined) => void;
  updateTier: (rank: string, patch: Partial<TierState>) => void;
  updateNMSelection: (key: NonMonetaryKey, selected: boolean) => void;
  setMonetary: (monetary: MonetaryReward) => void;
  setNonMonetary: (nonMonetary: NonMonetaryReward) => void;
  startEditing: () => void;
  cancelEditing: () => void;
  markSaved: () => void;
  markReviewed: () => void;
  markSubmitted: () => void;
  resetToSource: () => void;
  applyAISuggestions: (suggestions: Record<string, number>) => void;
  applyAINMSuggestions: (keys: NonMonetaryKey[]) => void;
  acceptAISuggestion: (rank: string) => void;
  acceptAINMSuggestion: (key: NonMonetaryKey) => void;
  getSerializedData: () => Record<string, any>;
}

export function useRewardStructureState(
  rewardStructureRaw: any,
  operatingModel?: string | null,
): UseRewardStructureStateReturn {
  // Resolve initial data from raw JSONB
  const resolved = useMemo(
    () => resolveRewardSource(rewardStructureRaw, operatingModel),
    [rewardStructureRaw, operatingModel],
  );

  // Determine initial source type for badges
  const initialSrc: FieldSource['src'] = resolved.isAutoPopulated
    ? (resolved.sourceRole === 'AM' ? 'am' : 'curator')
    : 'curator';

  // Determine initial section state
  const initialState = useMemo((): RewardSectionState => {
    if (!resolved.type && !resolved.isAutoPopulated) return 'empty_no_source';
    if (resolved.isAutoPopulated) return 'populated_from_source';
    return 'saved';
  }, [resolved]);

  const [sectionState, setSectionState] = useState<RewardSectionState>(initialState);
  const [rewardData, setRewardData] = useState<RewardData>(resolved);
  const [originalData] = useState<RewardData>(resolved);

  // ── New tier/checkbox models ──
  const [tierStates, setTierStates] = useState<Record<string, TierState>>(
    () => legacyToTierState(resolved.monetary, initialSrc),
  );
  const [nmSelections, setNMSelections] = useState<NonMonetarySelections>(
    () => legacyToNMSelections(resolved.nonMonetary, initialSrc),
  );
  const [currency, setCurrencyState] = useState(resolved.monetary?.currency ?? 'USD');
  const [totalPool, setTotalPoolState] = useState<number | undefined>(resolved.monetary?.totalPool);
  const [rewardType, setRewardTypeState] = useState<RewardType>(resolved.type);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // ── Validation ──
  const errors = useMemo(() => {
    if (sectionState === 'empty_no_source' || !rewardType) return [];
    if (rewardType === 'monetary') {
      return validateMonetaryTiers(tierStates, totalPool);
    }
    if (rewardType === 'non_monetary') {
      return validateNonMonetarySelections(nmSelections);
    }
    return [];
  }, [rewardType, tierStates, nmSelections, totalPool, sectionState]);

  const isValid = errors.length === 0 && rewardType !== null;

  // ── Modified detection ──
  const isModified = useMemo(() => {
    if (!originalData.isAutoPopulated) return false;
    // Simple check: compare serialized
    return JSON.stringify(tierStates) !== JSON.stringify(legacyToTierState(originalData.monetary, initialSrc)) ||
      JSON.stringify(nmSelections) !== JSON.stringify(legacyToNMSelections(originalData.nonMonetary, initialSrc)) ||
      rewardType !== originalData.type;
  }, [tierStates, nmSelections, rewardType, originalData, initialSrc]);

  // ── Sync rewardData from new models ──
  const syncRewardData = useCallback((type: RewardType, tiers: Record<string, TierState>, nm: NonMonetarySelections, curr: string) => {
    const monetary = type === 'monetary' ? tierStateToTiers(tiers, curr) : undefined;
    const nonMonetary = type === 'non_monetary' ? nmSelectionsToItems(nm) : undefined;
    setRewardData((prev) => ({
      ...prev,
      type,
      monetary: monetary ? { ...monetary, totalPool: totalPool } : undefined,
      nonMonetary,
    }));
  }, [totalPool]);

  // ── Actions ──

  const setRewardType = useCallback((type: RewardType) => {
    if (isSubmitted) return;
    setRewardTypeState(type);
    setSectionState('curator_editing');
    syncRewardData(type, tierStates, nmSelections, currency);
  }, [isSubmitted, tierStates, nmSelections, currency, syncRewardData]);

  const setCurrency = useCallback((c: string) => {
    if (isSubmitted) return;
    setCurrencyState(c);
  }, [isSubmitted]);

  const setTotalPool = useCallback((pool: number | undefined) => {
    if (isSubmitted) return;
    setTotalPoolState(pool);
  }, [isSubmitted]);

  const updateTier = useCallback((rank: string, patch: Partial<TierState>) => {
    if (isSubmitted) return;
    setTierStates((prev) => {
      const current = prev[rank];
      const updated = { ...current, ...patch };
      // Track source modification
      if ('amount' in patch && current.amountSrc.src !== 'curator') {
        updated.amountSrc = { ...current.amountSrc, modified: true };
      }
      const next = { ...prev, [rank]: updated };
      // If disabling Gold, also disable Silver
      if (rank === 'gold' && patch.enabled === false) {
        next.silver = { ...next.silver, enabled: false };
      }
      return next;
    });
  }, [isSubmitted]);

  const updateNMSelection = useCallback((key: NonMonetaryKey, selected: boolean) => {
    if (isSubmitted) return;
    setNMSelections((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        selected,
        src: { src: 'curator' },
      },
    }));
  }, [isSubmitted]);

  // Legacy setters for backward compat
  const setMonetary = useCallback((monetary: MonetaryReward) => {
    setRewardData((prev) => ({
      ...prev,
      type: 'monetary',
      monetary,
      nonMonetary: undefined,
    }));
    setRewardTypeState('monetary');
    // Sync to new model
    const newTiers = legacyToTierState(monetary, 'curator');
    setTierStates(newTiers);
    setCurrencyState(monetary.currency);
    setTotalPoolState(monetary.totalPool);
  }, []);

  const setNonMonetary = useCallback((nonMonetary: NonMonetaryReward) => {
    setRewardData((prev) => ({
      ...prev,
      type: 'non_monetary',
      nonMonetary,
      monetary: undefined,
    }));
    setRewardTypeState('non_monetary');
    setNMSelections(legacyToNMSelections(nonMonetary, 'curator'));
  }, []);

  const startEditing = useCallback(() => {
    setSectionState('curator_editing');
  }, []);

  const cancelEditing = useCallback(() => {
    setRewardData(originalData);
    setTierStates(legacyToTierState(originalData.monetary, initialSrc));
    setNMSelections(legacyToNMSelections(originalData.nonMonetary, initialSrc));
    setRewardTypeState(originalData.type);
    setCurrencyState(originalData.monetary?.currency ?? 'USD');
    setTotalPoolState(originalData.monetary?.totalPool);
    setSectionState(
      originalData.isAutoPopulated
        ? 'populated_from_source'
        : originalData.type
          ? 'saved'
          : 'empty_no_source',
    );
  }, [originalData, initialSrc]);

  const markSaved = useCallback(() => {
    setSectionState('saved');
  }, []);

  const markReviewed = useCallback(() => {
    setSectionState('reviewed');
  }, []);

  const markSubmitted = useCallback(() => {
    setIsSubmitted(true);
  }, []);

  const resetToSource = useCallback(() => {
    if (originalData.isAutoPopulated) {
      setRewardData(originalData);
      setTierStates(legacyToTierState(originalData.monetary, initialSrc));
      setNMSelections(legacyToNMSelections(originalData.nonMonetary, initialSrc));
      setRewardTypeState(originalData.type);
      setSectionState('populated_from_source');
    }
  }, [originalData, initialSrc]);

  // ── AI suggestion actions ──

  const applyAISuggestions = useCallback((suggestions: Record<string, number>) => {
    setTierStates((prev) => {
      const next = { ...prev };
      for (const [rank, amount] of Object.entries(suggestions)) {
        if (rank in next) {
          next[rank] = { ...next[rank], aiSuggestion: amount };
        }
      }
      return next;
    });
  }, []);

  const acceptAISuggestion = useCallback((rank: string) => {
    setTierStates((prev) => {
      const tier = prev[rank];
      if (!tier?.aiSuggestion) return prev;
      return {
        ...prev,
        [rank]: {
          ...tier,
          enabled: true,
          amount: tier.aiSuggestion,
          amountSrc: { src: 'ai' },
          aiSuggestion: undefined,
        },
      };
    });
  }, []);

  const applyAINMSuggestions = useCallback((keys: NonMonetaryKey[]) => {
    setNMSelections((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        if (key in next) {
          next[key] = { ...next[key], aiRecommended: true };
        }
      }
      return next;
    });
  }, []);

  const acceptAINMSuggestion = useCallback((key: NonMonetaryKey) => {
    setNMSelections((prev) => ({
      ...prev,
      [key]: {
        selected: true,
        src: { src: 'ai' },
        aiRecommended: false,
      },
    }));
  }, []);

  const getSerializedData = useCallback(() => {
    // Build from new models
    const monetary = rewardType === 'monetary' ? tierStateToTiers(tierStates, currency) : undefined;
    const nonMonetary = rewardType === 'non_monetary' ? nmSelectionsToItems(nmSelections) : undefined;

    const data: RewardData = {
      type: rewardType,
      monetary: monetary ? { ...monetary, totalPool } : undefined,
      nonMonetary,
      sourceRole: 'CURATOR',
      isAutoPopulated: false,
      isEditable: true,
    };

    const serialized = serializeRewardData(data);

    // Also persist field sources and NM selections for round-trip
    serialized.fieldSources = {
      tiers: tierStates,
      nmSelections,
    };

    return serialized;
  }, [rewardType, tierStates, nmSelections, currency, totalPool]);

  return {
    sectionState,
    rewardData,
    rewardType,
    tierStates,
    nmSelections,
    currency,
    totalPool,
    errors,
    isValid,
    isModified,
    isSubmitted,
    setRewardType,
    setCurrency,
    setTotalPool,
    updateTier,
    updateNMSelection,
    setMonetary,
    setNonMonetary,
    startEditing,
    cancelEditing,
    markSaved,
    markReviewed,
    markSubmitted,
    resetToSource,
    applyAISuggestions,
    applyAINMSuggestions,
    acceptAISuggestion,
    acceptAINMSuggestion,
    getSerializedData,
  };
}
