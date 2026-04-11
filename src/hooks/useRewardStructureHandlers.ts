/**
 * useRewardStructureHandlers — Extracted callbacks from RewardStructureDisplay.
 * Pure handler logic for save, lock, AI accept, prize tiers, and incentives.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import type { TierState } from '@/hooks/useRewardStructureState';
import { getCurationFormStore } from '@/store/curationFormStore';

interface UseRewardStructureHandlersArgs {
  challengeId: string;
  currencyCode?: string;
  state: {
    rewardType: any;
    tierStates: Record<string, TierState>;
    nmItems: any[];
    currency: string;
    totalPool: number;
    errors: any[];
    isValid: boolean;
    isModified: boolean;
    sectionState: string;
    getSerializedData: () => any;
    updateTier: (rank: string, patch: Partial<TierState>) => void;
    setCurrency: (c: string) => void;
    addNMItem: (t: string) => void;
    updateNMItem: (id: string, t: string) => void;
    deleteNMItem: (id: string) => void;
    startEditing: () => void;
    cancelEditing: () => void;
    markSaved: () => void;
    markSubmitted: () => void;
    lockRewardType: () => void;
    resetToSource: () => void;
    acceptAISuggestion: (rank: string) => void;
    acceptAINMSuggestion: (id: string) => void;
    applyAIReviewResult: (data: any) => void;
    setRewardType: (t: any) => void;
  };
  prizeTiers: any[];
  createPrizeTier: any;
  updatePrizeTierMut: any;
  deletePrizeTierMut: any;
  addIncentiveSelectionMut: any;
  removeIncentiveSelectionMut: any;
  updateIncentiveCommitmentMut: any;
}

export function useRewardStructureHandlers({
  challengeId, currencyCode, state, prizeTiers,
  createPrizeTier, updatePrizeTierMut, deletePrizeTierMut,
  addIncentiveSelectionMut, removeIncentiveSelectionMut, updateIncentiveCommitmentMut,
}: UseRewardStructureHandlersArgs) {
  const queryClient = useQueryClient();
  const {
    rewardType, tierStates, nmItems, currency, totalPool, errors, isValid,
    getSerializedData, updateTier, setCurrency, addNMItem, updateNMItem, deleteNMItem,
    startEditing, cancelEditing, markSaved, markSubmitted, lockRewardType,
    resetToSource, acceptAISuggestion, acceptAINMSuggestion, applyAIReviewResult, setRewardType,
  } = state;

  // Sync currency from challenge-level currencyCode prop
  const prevCurrencyCode = useRef(currencyCode);
  useEffect(() => {
    if (currencyCode && currencyCode !== prevCurrencyCode.current && currencyCode !== currency) {
      setCurrency(currencyCode);
    }
    prevCurrencyCode.current = currencyCode;
  }, [currencyCode, currency, setCurrency]);

  const [saving, setSaving] = useState(false);
  const [hasAISuggestions, setHasAISuggestions] = useState(false);
  const [aiRationale, setAiRationale] = useState<string>();
  const [hasBeenReviewed, setHasBeenReviewed] = useState(false);

  const savedSnapshotRef = useRef<string>(JSON.stringify(getSerializedData()));
  const storeRef = useRef(getCurationFormStore(challengeId));
  const getSerializedDataRef = useRef(getSerializedData);
  useEffect(() => { getSerializedDataRef.current = getSerializedData; }, [getSerializedData]);

  const isDirty = useMemo(() => {
    return JSON.stringify(getSerializedData()) !== savedSnapshotRef.current;
  }, [getSerializedData, rewardType, tierStates, nmItems, currency, totalPool]);

  // Store sync
  const syncToStore = useCallback(() => {
    if (!rewardType) return;
    storeRef.current.getState().setSectionData('reward_structure', getSerializedDataRef.current());
  }, [rewardType]);

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!rewardType) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(syncToStore, 150);
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [rewardType, tierStates, nmItems, currency, totalPool, syncToStore]);

  useEffect(() => {
    const flush = () => {
      if (syncTimerRef.current) { clearTimeout(syncTimerRef.current); syncTimerRef.current = null; }
      if (rewardType) syncToStore();
    };
    const handleVis = () => { if (document.hidden) flush(); };
    document.addEventListener('visibilitychange', handleVis);
    return () => { document.removeEventListener('visibilitychange', handleVis); flush(); };
  }, [rewardType, syncToStore]);

  // AI review result handler
  const handleApplyAIReviewResult = useCallback(async (data: any) => {
    applyAIReviewResult(data);
    setHasBeenReviewed(true);
    setTimeout(async () => {
      try {
        const serialized = getSerializedDataRef.current();
        if (!serialized || !serialized.type) return;
        storeRef.current.getState().setSectionData('reward_structure', serialized);
        const { error } = await supabase.from('challenges').update({ reward_structure: serialized as unknown as Json }).eq('id', challengeId);
        if (error) { toast.error('AI suggestion applied but save failed.'); return; }
        queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });
        savedSnapshotRef.current = JSON.stringify(serialized);
        markSaved();
        toast.success('Reward structure updated with AI suggestion');
      } catch (err: any) { toast.error(`Auto-save failed: ${err.message}`); }
    }, 300);
  }, [applyAIReviewResult, challengeId, queryClient, markSaved]);

  const handleSave = useCallback(async () => {
    if (!isValid) { toast.error(`Fix ${errors.length} validation error(s) before saving.`); return; }
    setSaving(true);
    try {
      const serialized = getSerializedDataRef.current();
      storeRef.current.getState().setSectionData('reward_structure', serialized);
      const { error } = await supabase.from('challenges').update({ reward_structure: serialized as unknown as Json }).eq('id', challengeId);
      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });
      toast.success('Reward structure saved successfully');
      savedSnapshotRef.current = JSON.stringify(serialized);
      markSaved();
    } catch (err: any) { toast.error(`Failed to save: ${err.message}`); }
    finally { setSaving(false); }
  }, [isValid, errors, challengeId, queryClient, markSaved, getSerializedData]);

  const handleLockRewardType = useCallback(async () => {
    if (!isValid) { toast.error(`Fix ${errors.length} validation error(s) before locking.`); return; }
    lockRewardType();
    setSaving(true);
    try {
      const serialized = getSerializedDataRef.current();
      storeRef.current.getState().setSectionData('reward_structure', serialized);
      const { error } = await supabase.from('challenges').update({ reward_structure: serialized as unknown as Json }).eq('id', challengeId);
      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });
      toast.success(`Reward type locked as "${rewardType === 'both' ? 'Both' : rewardType === 'monetary' ? 'Monetary' : 'Non-Monetary'}".`);
      savedSnapshotRef.current = JSON.stringify(serialized);
      markSubmitted();
      markSaved();
    } catch (err: any) { toast.error(`Failed to lock: ${err.message}`); }
    finally { setSaving(false); }
  }, [isValid, errors, lockRewardType, challengeId, queryClient, markSubmitted, markSaved, rewardType]);

  const handleAcceptAllMonetaryAI = useCallback(() => {
    for (const rank of ['platinum', 'gold', 'silver']) {
      if (tierStates[rank]?.aiSuggestion) acceptAISuggestion(rank);
    }
    setHasAISuggestions(false);
  }, [tierStates, acceptAISuggestion]);

  const handleAcceptAllNMAI = useCallback(() => {
    for (const item of nmItems) { if (item.aiRecommended) acceptAINMSuggestion(item.id); }
  }, [nmItems, acceptAINMSuggestion]);

  const handleUpdateTier = useCallback((rank: string, patch: Partial<TierState>) => updateTier(rank, patch), [updateTier]);
  const handleCurrencyChange = useCallback((cur: string) => setCurrency(cur), [setCurrency]);
  const handleAddNMItem = useCallback((title: string) => addNMItem(title), [addNMItem]);
  const handleUpdateNMItem = useCallback((id: string, title: string) => updateNMItem(id, title), [updateNMItem]);
  const handleDeleteNMItem = useCallback((id: string) => deleteNMItem(id), [deleteNMItem]);
  const handleTypeSwitch = useCallback((type: any) => setRewardType(type), [setRewardType]);
  const handleTypeSwitchFromReadOnly = useCallback((type: any) => { startEditing(); setRewardType(type); }, [startEditing, setRewardType]);

  // Prize tier handlers
  const handleAddPrizeTier = useCallback(() => {
    const nextRank = prizeTiers.length > 0 ? Math.max(...prizeTiers.map((t: any) => t.rank)) + 1 : 1;
    createPrizeTier.mutate({ challenge_id: challengeId, tier_name: `Tier ${nextRank}`, rank: nextRank, percentage_of_pool: 0, fixed_amount: null, max_winners: 1, description: null, created_by_role: 'curator', is_default: false });
  }, [prizeTiers, challengeId, createPrizeTier]);

  const handleUpdatePrizeTier = useCallback((id: string, updates: any) => updatePrizeTierMut.mutate({ id, challengeId, ...updates }), [updatePrizeTierMut, challengeId]);
  const handleDeletePrizeTier = useCallback((id: string) => deletePrizeTierMut.mutate({ id, challengeId }), [deletePrizeTierMut, challengeId]);

  const handleReorderPrizeTier = useCallback((id: string, direction: 'up' | 'down') => {
    const sorted = [...prizeTiers].sort((a: any, b: any) => a.rank - b.rank);
    const idx = sorted.findIndex((t: any) => t.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    updatePrizeTierMut.mutate({ id: sorted[idx].id, challengeId, rank: sorted[swapIdx].rank });
    updatePrizeTierMut.mutate({ id: sorted[swapIdx].id, challengeId, rank: sorted[idx].rank });
  }, [prizeTiers, updatePrizeTierMut, challengeId]);

  const handleAddIncentive = useCallback((incentiveId: string) => addIncentiveSelectionMut.mutate({ challenge_id: challengeId, incentive_id: incentiveId }), [addIncentiveSelectionMut, challengeId]);
  const handleRemoveIncentive = useCallback((selectionId: string) => removeIncentiveSelectionMut.mutate({ id: selectionId, challengeId }), [removeIncentiveSelectionMut, challengeId]);
  const handleUpdateCommitment = useCallback((selectionId: string, commitment: string) => updateIncentiveCommitmentMut.mutate({ id: selectionId, challengeId, seeker_commitment: commitment }), [updateIncentiveCommitmentMut, challengeId]);

  const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', INR: '₹', AED: 'د.إ', SGD: 'S$', AUD: 'A$',
  };
  const currSym = CURRENCY_SYMBOLS[currency] ?? '$';

  const handleApplyAITiers = useCallback(() => {
    if (!totalPool) return;
    const platinum = Math.round(totalPool * 0.50);
    const gold = Math.round(totalPool * 0.30);
    const silver = totalPool - platinum - gold;
    updateTier('platinum', { enabled: true, amount: platinum, source: 'AI' as const });
    updateTier('gold', { enabled: true, amount: gold, source: 'AI' as const });
    updateTier('silver', { enabled: true, amount: silver, source: 'AI' as const });
    toast.success(`AI split applied: ${currSym}${platinum.toLocaleString()} / ${currSym}${gold.toLocaleString()} / ${currSym}${silver.toLocaleString()}`);
  }, [totalPool, updateTier, currSym]);

  return {
    saving, isDirty, hasAISuggestions, aiRationale, hasBeenReviewed,
    handleApplyAIReviewResult, handleSave, handleLockRewardType,
    handleAcceptAllMonetaryAI, handleAcceptAllNMAI,
    handleUpdateTier, handleCurrencyChange,
    handleAddNMItem, handleUpdateNMItem, handleDeleteNMItem,
    handleTypeSwitch, handleTypeSwitchFromReadOnly,
    handleAddPrizeTier, handleUpdatePrizeTier, handleDeletePrizeTier, handleReorderPrizeTier,
    handleAddIncentive, handleRemoveIncentive, handleUpdateCommitment,
    handleApplyAITiers,
  };
}
