/**
 * useRewardStructureState — State machine hook for the Reward Structure section.
 *
 * Redesign v2:
 *   - 'both' reward type support
 *   - Dynamic non-monetary items (add/edit/delete)
 *   - Lock reward type action
 *   - applyAIReviewResult for full AI acceptance
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
  validateNonMonetaryItems,
  type ValidationError,
} from '@/lib/rewardValidation';
import type { FieldSource } from '@/components/cogniblend/curation/rewards/SourceBadge';
import type { NonMonetaryItemData } from '@/components/cogniblend/curation/rewards/NonMonetaryItemCard';

/* ── Exported types ── */

export interface TierState {
  enabled: boolean;
  amount: number;
  amountSrc: FieldSource;
  aiSuggestion?: number;
}

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

/* ── Default NM items ── */

const DEFAULT_NM_ITEMS: { title: string }[] = [
  { title: 'Certificate' },
  { title: 'Memento' },
  { title: 'Gift Vouchers' },
  { title: 'Movie Sponsorship' },
  { title: 'Others' },
];

/* ── Default states ── */

function defaultTierState(src: FieldSource['src'] = 'curator'): Record<string, TierState> {
  return {
    platinum: { enabled: true, amount: 0, amountSrc: { src } },
    gold: { enabled: false, amount: 0, amountSrc: { src } },
    silver: { enabled: false, amount: 0, amountSrc: { src } },
  };
}

function defaultNMItems(src: FieldSource['src'] = 'curator'): NonMonetaryItemData[] {
  return DEFAULT_NM_ITEMS.map((item) => ({
    id: crypto.randomUUID(),
    title: item.title,
    src: { src },
    isDefault: true,
  }));
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

function legacyToNMItems(nonMonetary?: NonMonetaryReward, srcDefault: FieldSource['src'] = 'curator'): NonMonetaryItemData[] {
  if (!nonMonetary || nonMonetary.items.length === 0) return [];

  return nonMonetary.items.map((item) => ({
    id: item.id ?? crypto.randomUUID(),
    title: item.title,
    src: { src: item.isFromSource ? 'am' : item.isAISuggested ? 'ai' : srcDefault },
    isDefault: DEFAULT_NM_ITEMS.some((d) => d.title.toLowerCase() === item.title.toLowerCase()),
  }));
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

function nmItemsToLegacy(items: NonMonetaryItemData[]): NonMonetaryReward {
  return {
    items: items.map((item) => ({
      id: item.id,
      type: 'recognition' as const,
      title: item.title,
      description: '',
      isFromSource: item.src.src === 'am',
      isAISuggested: item.src.src === 'ai',
    })),
  };
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
  nmItems: NonMonetaryItemData[];
  currency: string;
  totalPool: number | undefined;
  errors: ValidationError[];
  monetaryErrors: ValidationError[];
  nmErrors: ValidationError[];
  isValid: boolean;
  isModified: boolean;
  isSubmitted: boolean;
  isTypeLocked: boolean;

  /* Actions */
  setRewardType: (type: RewardType) => void;
  setCurrency: (currency: string) => void;
  setTotalPool: (pool: number | undefined) => void;
  updateTier: (rank: string, patch: Partial<TierState>) => void;
  addNMItem: (title: string) => void;
  updateNMItem: (id: string, title: string) => void;
  deleteNMItem: (id: string) => void;
  setMonetary: (monetary: MonetaryReward) => void;
  setNonMonetary: (nonMonetary: NonMonetaryReward) => void;
  startEditing: () => void;
  cancelEditing: () => void;
  markSaved: () => void;
  markReviewed: () => void;
  markSubmitted: () => void;
  lockRewardType: () => void;
  resetToSource: () => void;
  applyAISuggestions: (suggestions: Record<string, number>) => void;
  applyAINMSuggestions: (items: { title: string }[]) => void;
  acceptAISuggestion: (rank: string) => void;
  acceptAINMSuggestion: (id: string) => void;
  applyAIReviewResult: (data: { monetary?: { tiers?: Record<string, number>; currency?: string }; nonMonetary?: { items?: string[] }; type?: string }) => void;
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

  // ── New tier/NM item models ──
  const [tierStates, setTierStates] = useState<Record<string, TierState>>(
    () => legacyToTierState(resolved.monetary, initialSrc),
  );
  const [nmItems, setNMItems] = useState<NonMonetaryItemData[]>(
    () => {
      const legacy = legacyToNMItems(resolved.nonMonetary, initialSrc);
      return legacy.length > 0 ? legacy : [];
    },
  );
  const [currency, setCurrencyState] = useState(resolved.monetary?.currency ?? 'USD');
  const [totalPool, setTotalPoolState] = useState<number | undefined>(resolved.monetary?.totalPool);
  const [rewardType, setRewardTypeState] = useState<RewardType>(resolved.type);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isTypeLocked, setIsTypeLocked] = useState(false);

  // ── Validation ──
  const monetaryErrors = useMemo(() => {
    if (!rewardType || (rewardType !== 'monetary' && rewardType !== 'both')) return [];
    return validateMonetaryTiers(tierStates, totalPool);
  }, [rewardType, tierStates, totalPool]);

  const nmErrors = useMemo(() => {
    if (!rewardType || (rewardType !== 'non_monetary' && rewardType !== 'both')) return [];
    return validateNonMonetaryItems(nmItems);
  }, [rewardType, nmItems]);

  const errors = useMemo(() => {
    if (sectionState === 'empty_no_source' || !rewardType) return [];
    return [...monetaryErrors, ...nmErrors];
  }, [sectionState, rewardType, monetaryErrors, nmErrors]);

  const isValid = errors.length === 0 && rewardType !== null;

  // ── Modified detection ──
  const isModified = useMemo(() => {
    if (!originalData.isAutoPopulated) return false;
    return JSON.stringify(tierStates) !== JSON.stringify(legacyToTierState(originalData.monetary, initialSrc)) ||
      JSON.stringify(nmItems) !== JSON.stringify(legacyToNMItems(originalData.nonMonetary, initialSrc)) ||
      rewardType !== originalData.type;
  }, [tierStates, nmItems, rewardType, originalData, initialSrc]);

  // ── Actions ──

  const setRewardType = useCallback((type: RewardType) => {
    if (isSubmitted || isTypeLocked) return;
    setRewardTypeState(type);
    setSectionState('curator_editing');
    // Populate default NM items if switching to non_monetary or both and list is empty
    if ((type === 'non_monetary' || type === 'both') && nmItems.length === 0) {
      setNMItems(defaultNMItems('curator'));
    }
  }, [isSubmitted, isTypeLocked, nmItems.length]);

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
      if ('amount' in patch && current.amountSrc.src !== 'curator') {
        updated.amountSrc = { ...current.amountSrc, modified: true };
      }
      const next = { ...prev, [rank]: updated };
      if (rank === 'gold' && patch.enabled === false) {
        next.silver = { ...next.silver, enabled: false };
      }
      return next;
    });
  }, [isSubmitted]);

  // ── NM Item actions ──

  const addNMItem = useCallback((title: string) => {
    if (isSubmitted) return;
    setNMItems((prev) => [...prev, {
      id: crypto.randomUUID(),
      title,
      src: { src: 'curator' },
      isDefault: false,
    }]);
  }, [isSubmitted]);

  const updateNMItem = useCallback((id: string, title: string) => {
    if (isSubmitted) return;
    setNMItems((prev) => prev.map((item) =>
      item.id === id
        ? { ...item, title, src: item.src.src !== 'curator' ? { ...item.src, modified: true } : item.src }
        : item,
    ));
  }, [isSubmitted]);

  const deleteNMItem = useCallback((id: string) => {
    if (isSubmitted) return;
    setNMItems((prev) => prev.filter((item) => item.id !== id));
  }, [isSubmitted]);

  // Legacy setters for backward compat
  const setMonetary = useCallback((monetary: MonetaryReward) => {
    setRewardData((prev) => ({ ...prev, type: 'monetary', monetary, nonMonetary: undefined }));
    setRewardTypeState('monetary');
    setTierStates(legacyToTierState(monetary, 'curator'));
    setCurrencyState(monetary.currency);
    setTotalPoolState(monetary.totalPool);
  }, []);

  const setNonMonetary = useCallback((nonMonetary: NonMonetaryReward) => {
    setRewardData((prev) => ({ ...prev, type: 'non_monetary', nonMonetary, monetary: undefined }));
    setRewardTypeState('non_monetary');
    setNMItems(legacyToNMItems(nonMonetary, 'curator'));
  }, []);

  const startEditing = useCallback(() => {
    setSectionState('curator_editing');
  }, []);

  const cancelEditing = useCallback(() => {
    setRewardData(originalData);
    setTierStates(legacyToTierState(originalData.monetary, initialSrc));
    setNMItems(legacyToNMItems(originalData.nonMonetary, initialSrc));
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

  const lockRewardType = useCallback(() => {
    setIsTypeLocked(true);
    // Clean up data not relevant to locked type
    if (rewardType === 'monetary') {
      setNMItems([]);
    } else if (rewardType === 'non_monetary') {
      setTierStates(defaultTierState('curator'));
      setTotalPoolState(undefined);
    }
    // 'both' keeps everything
  }, [rewardType]);

  const resetToSource = useCallback(() => {
    if (originalData.isAutoPopulated) {
      setRewardData(originalData);
      setTierStates(legacyToTierState(originalData.monetary, initialSrc));
      setNMItems(legacyToNMItems(originalData.nonMonetary, initialSrc));
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

  const applyAINMSuggestions = useCallback((suggestedItems: { title: string }[]) => {
    setNMItems((prev) => {
      const existing = new Set(prev.map((i) => i.title.toLowerCase()));
      const newItems = suggestedItems
        .filter((s) => !existing.has(s.title.toLowerCase()))
        .map((s) => ({
          id: crypto.randomUUID(),
          title: s.title,
          src: { src: 'ai' as const },
          isDefault: false,
          aiRecommended: true,
        }));
      return [...prev, ...newItems];
    });
  }, []);

  const acceptAINMSuggestion = useCallback((id: string) => {
    setNMItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, aiRecommended: false, src: { src: 'ai' } } : item,
    ));
  }, []);

  // ── Apply full AI review result (from CurationAIReviewInline acceptance) ──
  const applyAIReviewResult = useCallback((data: {
    monetary?: { tiers?: Record<string, number>; currency?: string };
    nonMonetary?: { items?: string[] };
    type?: string;
  }) => {
    if (data.monetary?.tiers) {
      setTierStates((prev) => {
        const next = { ...prev };
        for (const [rank, amount] of Object.entries(data.monetary!.tiers!)) {
          if (rank in next) {
            next[rank] = { enabled: true, amount, amountSrc: { src: 'ai' } };
          }
        }
        return next;
      });
      if (data.monetary.currency) setCurrencyState(data.monetary.currency);
    }

    if (data.nonMonetary?.items) {
      const aiItems: NonMonetaryItemData[] = data.nonMonetary.items.map((title) => ({
        id: crypto.randomUUID(),
        title,
        src: { src: 'ai' as const },
        isDefault: false,
      }));
      setNMItems(aiItems);
    }

    if (data.type === 'both' || data.type === 'monetary' || data.type === 'non_monetary') {
      setRewardTypeState(data.type as RewardType);
    }

    setSectionState('curator_editing');
  }, []);

  const getSerializedData = useCallback(() => {
    const includeMonetary = rewardType === 'monetary' || rewardType === 'both';
    const includeNM = rewardType === 'non_monetary' || rewardType === 'both';

    const monetary = includeMonetary ? tierStateToTiers(tierStates, currency) : undefined;
    const nonMonetary = includeNM ? nmItemsToLegacy(nmItems) : undefined;

    const data: RewardData = {
      type: rewardType,
      monetary: monetary ? { ...monetary, totalPool } : undefined,
      nonMonetary,
      sourceRole: 'CURATOR',
      isAutoPopulated: false,
      isEditable: true,
    };

    const serialized = serializeRewardData(data);

    // Also persist field sources for round-trip
    serialized.fieldSources = {
      tiers: tierStates,
      nmItems,
    };

    return serialized;
  }, [rewardType, tierStates, nmItems, currency, totalPool]);

  return {
    sectionState,
    rewardData,
    rewardType,
    tierStates,
    nmItems,
    currency,
    totalPool,
    errors,
    monetaryErrors,
    nmErrors,
    isValid,
    isModified,
    isSubmitted,
    isTypeLocked,
    setRewardType,
    setCurrency,
    setTotalPool,
    updateTier,
    addNMItem,
    updateNMItem,
    deleteNMItem,
    setMonetary,
    setNonMonetary,
    startEditing,
    cancelEditing,
    markSaved,
    markReviewed,
    markSubmitted,
    lockRewardType,
    resetToSource,
    applyAISuggestions,
    applyAINMSuggestions,
    acceptAISuggestion,
    acceptAINMSuggestion,
    applyAIReviewResult,
    getSerializedData,
  };
}
