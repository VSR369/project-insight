/**
 * useRewardStructureState — State machine hook for the Reward Structure section.
 *
 * States:
 *   empty_no_source      → No upstream data, curator must create
 *   populated_from_source → Auto-filled from AM/CA/CR
 *   curator_editing       → Actively editing
 *   saved                 → Saved, read-only view
 *   reviewed              → AI reviewed
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
import { validateRewardStructure, type ValidationError } from '@/lib/rewardValidation';

export type RewardSectionState =
  | 'empty_no_source'
  | 'populated_from_source'
  | 'curator_editing'
  | 'saved'
  | 'reviewed';

export interface UseRewardStructureStateReturn {
  /** Current section state */
  sectionState: RewardSectionState;
  /** Full reward data */
  rewardData: RewardData;
  /** Validation errors (recomputed on every change) */
  errors: ValidationError[];
  /** Whether the form is valid for saving */
  isValid: boolean;
  /** Whether data has been modified from the original source */
  isModified: boolean;

  /* ── Actions ── */
  setRewardType: (type: RewardType) => void;
  setMonetary: (monetary: MonetaryReward) => void;
  setNonMonetary: (nonMonetary: NonMonetaryReward) => void;
  startEditing: () => void;
  cancelEditing: () => void;
  markSaved: () => void;
  markReviewed: () => void;
  resetToSource: () => void;
  /** Serialize current state for DB save */
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

  // Determine initial section state
  const initialState = useMemo((): RewardSectionState => {
    if (!resolved.type && !resolved.isAutoPopulated) return 'empty_no_source';
    if (resolved.isAutoPopulated) return 'populated_from_source';
    return 'saved';
  }, [resolved]);

  const [sectionState, setSectionState] = useState<RewardSectionState>(initialState);
  const [rewardData, setRewardData] = useState<RewardData>(resolved);
  const [originalData] = useState<RewardData>(resolved);

  // ── Validation ──
  const errors = useMemo(() => {
    if (sectionState === 'empty_no_source') return [];
    return validateRewardStructure(rewardData);
  }, [rewardData, sectionState]);

  const isValid = errors.length === 0 && rewardData.type !== null;

  // ── Modified detection ──
  const isModified = useMemo(() => {
    if (!originalData.isAutoPopulated) return false;
    return JSON.stringify(rewardData.monetary) !== JSON.stringify(originalData.monetary) ||
      JSON.stringify(rewardData.nonMonetary) !== JSON.stringify(originalData.nonMonetary) ||
      rewardData.type !== originalData.type;
  }, [rewardData, originalData]);

  // ── Actions ──

  const setRewardType = useCallback((type: RewardType) => {
    setRewardData((prev) => {
      // Enforce mutual exclusivity: clear the other type
      const updated: RewardData = {
        ...prev,
        type,
        monetary: type === 'monetary' ? prev.monetary : undefined,
        nonMonetary: type === 'non_monetary' ? prev.nonMonetary : undefined,
      };
      return updated;
    });
    setSectionState('curator_editing');
  }, []);

  const setMonetary = useCallback((monetary: MonetaryReward) => {
    setRewardData((prev) => ({
      ...prev,
      type: 'monetary',
      monetary,
      nonMonetary: undefined, // enforce exclusivity
    }));
  }, []);

  const setNonMonetary = useCallback((nonMonetary: NonMonetaryReward) => {
    setRewardData((prev) => ({
      ...prev,
      type: 'non_monetary',
      nonMonetary,
      monetary: undefined, // enforce exclusivity
    }));
  }, []);

  const startEditing = useCallback(() => {
    setSectionState('curator_editing');
  }, []);

  const cancelEditing = useCallback(() => {
    // Revert to original data
    setRewardData(originalData);
    setSectionState(
      originalData.isAutoPopulated
        ? 'populated_from_source'
        : originalData.type
          ? 'saved'
          : 'empty_no_source',
    );
  }, [originalData]);

  const markSaved = useCallback(() => {
    setSectionState('saved');
  }, []);

  const markReviewed = useCallback(() => {
    setSectionState('reviewed');
  }, []);

  const resetToSource = useCallback(() => {
    if (originalData.isAutoPopulated) {
      setRewardData(originalData);
      setSectionState('populated_from_source');
    }
  }, [originalData]);

  const getSerializedData = useCallback(() => {
    // Assert mutual exclusivity before serialize
    if (rewardData.monetary && rewardData.nonMonetary) {
      console.error('Both reward types populated — invalid state');
    }
    return serializeRewardData(rewardData);
  }, [rewardData]);

  return {
    sectionState,
    rewardData,
    errors,
    isValid,
    isModified,
    setRewardType,
    setMonetary,
    setNonMonetary,
    startEditing,
    cancelEditing,
    markSaved,
    markReviewed,
    resetToSource,
    getSerializedData,
  };
}
