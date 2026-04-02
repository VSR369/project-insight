/**
 * RewardStructureDisplay — Orchestrator for the Reward Structure section.
 * Handlers extracted to useRewardStructureHandlers.ts.
 * Render content delegated to RewardDisplayContent.tsx.
 */

import { useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import { parseJson } from '@/lib/cogniblend/jsonbUnwrap';
import type { Json } from '@/integrations/supabase/types';
import type { AMRewardPayload } from '@/hooks/useRewardStructureState';
import { useRewardStructureState } from '@/hooks/useRewardStructureState';
import { useChallengePrizeTiers, useCreatePrizeTier, useUpdatePrizeTier, useDeletePrizeTier } from '@/hooks/queries/useChallengePrizeTiers';
import { useChallengeIncentiveSelections, useAddIncentiveSelection, useRemoveIncentiveSelection, useUpdateIncentiveCommitment } from '@/hooks/queries/useChallengeIncentiveSelections';
import { useNonMonetaryIncentives } from '@/hooks/queries/useNonMonetaryIncentives';
import { useRewardStructureHandlers } from '@/hooks/useRewardStructureHandlers';
import { RewardDisplayContent } from './RewardDisplayContent';

export interface RewardStructureDisplayHandle {
  applyAIReviewResult: (data: any) => void;
}

interface RewardStructureDisplayProps {
  rewardStructure: Json | null;
  currencyCode?: string;
  challengeId: string;
  problemStatement?: string | null;
  operatingModel?: string | null;
  challengeTitle?: string;
  amPayload?: AMRewardPayload | null;
  maturityLevel?: string | null;
  complexityLevel?: string | null;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', AED: 'د.إ', SGD: 'S$', AUD: 'A$',
};

const RewardStructureDisplay = forwardRef<RewardStructureDisplayHandle, RewardStructureDisplayProps>(({
  rewardStructure, currencyCode, challengeId, problemStatement, operatingModel,
  challengeTitle, amPayload, maturityLevel, complexityLevel,
}, ref) => {
  // ── Data hooks ──
  const { data: prizeTiers = [] } = useChallengePrizeTiers(challengeId);
  const createPrizeTier = useCreatePrizeTier();
  const updatePrizeTierMut = useUpdatePrizeTier();
  const deletePrizeTierMut = useDeletePrizeTier();
  const { data: incentiveSelections = [] } = useChallengeIncentiveSelections(challengeId);
  const { data: allIncentives = [] } = useNonMonetaryIncentives();
  const addIncentiveSelectionMut = useAddIncentiveSelection();
  const removeIncentiveSelectionMut = useRemoveIncentiveSelection();
  const updateIncentiveCommitmentMut = useUpdateIncentiveCommitment();

  // ── State machine ──
  const raw = useMemo(() => parseJson<any>(rewardStructure), [rewardStructure]);
  const state = useRewardStructureState(raw, operatingModel);

  // ── Local UI state ──
  const [showBothBanner, setShowBothBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<'monetary' | 'non_monetary'>('monetary');

  // ── Extracted handlers ──
  const handlers = useRewardStructureHandlers({
    challengeId, currencyCode, state, prizeTiers,
    createPrizeTier, updatePrizeTierMut, deletePrizeTierMut,
    addIncentiveSelectionMut, removeIncentiveSelectionMut, updateIncentiveCommitmentMut,
  });

  useImperativeHandle(ref, () => ({
    applyAIReviewResult: handlers.handleApplyAIReviewResult,
  }), [handlers.handleApplyAIReviewResult]);

  // ── Computed values ──
  const { rewardType, tierStates, nmItems, currency, totalPool, errors, monetaryErrors, nmErrors,
    isValid, isModified, isSubmitted, isTypeLocked, sectionState, rewardData, acceptAISuggestion, acceptAINMSuggestion,
  } = state;

  const showMonetary = rewardType === 'monetary' || rewardType === 'both';
  const showNM = rewardType === 'non_monetary' || rewardType === 'both';
  const isEditing = sectionState === 'curator_editing' || (sectionState === 'empty_no_source' && !!rewardType);
  const currSym = CURRENCY_SYMBOLS[currency] ?? '$';
  const cashPool = useMemo(() => Object.values(tierStates).filter(t => t.enabled).reduce((sum, t) => sum + t.amount, 0), [tierStates]);
  const hasExistingData = useMemo(() => {
    const hasMonetary = Object.values(tierStates).some((t) => t.enabled && t.amount > 0);
    const hasNM = nmItems.some((item: any) => !item.isDefault || item.src.src !== 'curator');
    return hasMonetary || hasNM;
  }, [tierStates, nmItems]);

  return (
    <RewardDisplayContent
      sectionState={sectionState}
      rewardType={rewardType}
      rewardData={rewardData}
      tierStates={tierStates}
      nmItems={nmItems}
      currency={currency}
      totalPool={totalPool}
      errors={errors}
      monetaryErrors={monetaryErrors}
      nmErrors={nmErrors}
      isValid={isValid}
      isModified={isModified}
      isSubmitted={isSubmitted}
      isTypeLocked={isTypeLocked}
      isDirty={handlers.isDirty}
      saving={handlers.saving}
      hasAISuggestions={handlers.hasAISuggestions}
      aiRationale={handlers.aiRationale}
      showBothBanner={showBothBanner}
      activeTab={activeTab}
      hasExistingData={hasExistingData}
      currencyCode={currencyCode}
      showMonetary={showMonetary}
      showNM={showNM}
      isEditing={isEditing}
      cashPool={cashPool}
      currSym={currSym}
      prizeTiers={prizeTiers}
      incentiveSelections={incentiveSelections}
      allIncentives={allIncentives}
      maturityLevel={maturityLevel}
      complexityLevel={complexityLevel}
      onSetActiveTab={setActiveTab}
      onTypeSwitch={handlers.handleTypeSwitch}
      onTypeSwitchFromReadOnly={handlers.handleTypeSwitchFromReadOnly}
      onStartEditing={state.startEditing}
      onCancelEditing={state.cancelEditing}
      onResetToSource={state.resetToSource}
      onSave={handlers.handleSave}
      onLockRewardType={handlers.handleLockRewardType}
      onUpdateTier={handlers.handleUpdateTier}
      onCurrencyChange={handlers.handleCurrencyChange}
      onAcceptAISuggestion={acceptAISuggestion}
      onAcceptAllMonetaryAI={handlers.handleAcceptAllMonetaryAI}
      onAddNMItem={handlers.handleAddNMItem}
      onUpdateNMItem={handlers.handleUpdateNMItem}
      onDeleteNMItem={handlers.handleDeleteNMItem}
      onAcceptNMSuggestion={acceptAINMSuggestion}
      onAcceptAllNMAI={handlers.handleAcceptAllNMAI}
      onAddPrizeTier={handlers.handleAddPrizeTier}
      onUpdatePrizeTier={handlers.handleUpdatePrizeTier}
      onDeletePrizeTier={handlers.handleDeletePrizeTier}
      onReorderPrizeTier={handlers.handleReorderPrizeTier}
      onAddIncentive={handlers.handleAddIncentive}
      onRemoveIncentive={handlers.handleRemoveIncentive}
      onUpdateCommitment={handlers.handleUpdateCommitment}
    />
  );
});

RewardStructureDisplay.displayName = 'RewardStructureDisplay';

export default RewardStructureDisplay;
