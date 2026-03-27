/**
 * RewardStructureDisplay — Orchestrator for the Reward Structure section.
 *
 * Redesign v2:
 *   - 'both' reward type with tab navigation
 *   - Dynamic NM items (add/edit/delete)
 *   - Lock reward type action
 *   - AI review result acceptance
 */

import { useState, useCallback, useMemo, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { parseJson } from '@/lib/cogniblend/jsonbUnwrap';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Loader2, Pencil, AlertCircle, X, Info, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { Json } from '@/integrations/supabase/types';
import { useRewardStructureState, type AMRewardPayload } from '@/hooks/useRewardStructureState';
import { serializeRewardData } from '@/services/rewardStructureResolver';
import { requestAITierBreakup, requestAINonMonetarySuggestions } from '@/services/aiRewardBreakup';
import RewardTypeChooser from './rewards/RewardTypeChooser';
import RewardTypeToggle from './rewards/RewardTypeToggle';
import SourceBanner from './rewards/SourceBanner';
import MonetaryRewardEditor from './rewards/MonetaryRewardEditor';
import NonMonetaryRewardEditor from './rewards/NonMonetaryRewardEditor';

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
  
}

const RewardStructureDisplay = forwardRef<RewardStructureDisplayHandle, RewardStructureDisplayProps>(({
  rewardStructure,
  currencyCode,
  challengeId,
  problemStatement,
  operatingModel,
  challengeTitle,
  amPayload,
}, ref) => {
  const queryClient = useQueryClient();

  // ── State machine ──
  const raw = useMemo(() => parseJson<any>(rewardStructure), [rewardStructure]);
  const state = useRewardStructureState(raw, operatingModel);

  const {
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
    markSubmitted,
    lockRewardType,
    resetToSource,
    applyAISuggestions,
    applyAINMSuggestions,
    acceptAISuggestion,
    acceptAINMSuggestion,
    applyAIReviewResult,
    getSerializedData,
  } = state;

  // ── Track whether AI review has been done ──
  const [hasBeenReviewed, setHasBeenReviewed] = useState(false);

  // ── Expose AI review result handler to parent ──
  // Wraps the state hook's applyAIReviewResult to also trigger auto-save
  const handleApplyAIReviewResult = useCallback((data: any) => {
    applyAIReviewResult(data);
    setHasBeenReviewed(true);
    // Trigger auto-save so properly serialized data is persisted
    setPendingSave(true);
  }, [applyAIReviewResult]);

  useImperativeHandle(ref, () => ({
    applyAIReviewResult: handleApplyAIReviewResult,
  }), [handleApplyAIReviewResult]);

  // ── Local UI state ──
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [hasAISuggestions, setHasAISuggestions] = useState(false);
  const [aiRationale, setAiRationale] = useState<string>();
  const [showBothBanner, setShowBothBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<'monetary' | 'non_monetary'>('monetary');

  // ── Challenge context for AI ──
  const challengeContext = useMemo(() => ({
    title: challengeTitle ?? '',
    domain: 'General',
    type: 'Open Innovation',
  }), [challengeTitle]);

  // ── AMRewardPayload detection on mount ──
  useEffect(() => {
    if (!amPayload) return;
    // Skip if data was already loaded from DB — prevent overwriting saved/AI data with AM defaults
    if (sectionState === 'saved' || sectionState === 'populated_from_source') return;

    const hasMonetary = !!amPayload.monetary;
    const hasNonMonetary = amPayload.nonMonetary && Object.values(amPayload.nonMonetary).some(Boolean);

    if (hasMonetary && hasNonMonetary) {
      setShowBothBanner(true);
      setRewardType('both');
      if (amPayload.monetary?.tiers) {
        const tiers = amPayload.monetary.tiers;
        if (tiers.platinum) updateTier('platinum', { enabled: true, amount: tiers.platinum, amountSrc: { src: 'am' } });
        if (tiers.gold) updateTier('gold', { enabled: true, amount: tiers.gold, amountSrc: { src: 'am' } });
        if (tiers.silver) updateTier('silver', { enabled: true, amount: tiers.silver, amountSrc: { src: 'am' } });
      }
      return;
    }

    if (hasNonMonetary && !hasMonetary) {
      setRewardType('non_monetary');
      return;
    }

    if (hasMonetary && amPayload.monetary?.totalPool && !amPayload.monetary?.tiers) {
      setRewardType('monetary');
      setTotalPool(amPayload.monetary.totalPool);
      handleAutoTriggerAI(amPayload.monetary.totalPool);
      return;
    }

    if (hasMonetary && amPayload.monetary?.tiers) {
      setRewardType('monetary');
      const tiers = amPayload.monetary.tiers;
      if (tiers.platinum) updateTier('platinum', { enabled: true, amount: tiers.platinum, amountSrc: { src: 'am' } });
      if (tiers.gold) updateTier('gold', { enabled: true, amount: tiers.gold, amountSrc: { src: 'am' } });
      if (tiers.silver) updateTier('silver', { enabled: true, amount: tiers.silver, amountSrc: { src: 'am' } });
      if (amPayload.monetary.totalPool) setTotalPool(amPayload.monetary.totalPool);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAutoTriggerAI = useCallback(async (poolAmount: number) => {
    setAiLoading(true);
    try {
      const result = await requestAITierBreakup(poolAmount, currency, challengeContext);
      if (result) {
        const suggestions: Record<string, number> = {};
        for (const tier of result) {
          suggestions[tier.rank] = tier.amount;
        }
        applyAISuggestions(suggestions);
        setHasAISuggestions(true);
        setAiRationale('Based on challenge complexity and domain analysis');
      }
    } finally {
      setAiLoading(false);
    }
  }, [currency, challengeContext, applyAISuggestions]);

  // ── Save handler ──
  const handleSave = useCallback(async () => {
    if (!isValid) {
      toast.error(`Fix ${errors.length} validation error(s) before saving.`);
      return;
    }
    setSaving(true);
    try {
      const serialized = getSerializedData();
      const { error } = await supabase
        .from('challenges')
        .update({ reward_structure: serialized as unknown as Json })
        .eq('id', challengeId);

      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });
      toast.success('Reward structure saved successfully');
      markSaved();
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [isValid, errors, getSerializedData, challengeId, queryClient, markSaved]);

  // ── Lock reward type handler (single finalization action) ──
  const handleLockRewardType = useCallback(async () => {
    if (!isValid) {
      toast.error(`Fix ${errors.length} validation error(s) before locking.`);
      return;
    }
    lockRewardType();
    setSaving(true);
    try {
      const serialized = getSerializedData();
      const { error } = await supabase
        .from('challenges')
        .update({ reward_structure: serialized as unknown as Json })
        .eq('id', challengeId);

      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });
      toast.success(`Reward type locked as "${rewardType === 'both' ? 'Both' : rewardType === 'monetary' ? 'Monetary' : 'Non-Monetary'}". Irrelevant data cleared.`);
      markSubmitted();
      markSaved();
    } catch (err: any) {
      toast.error(`Failed to lock: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [isValid, errors, lockRewardType, getSerializedData, challengeId, queryClient, markSubmitted, markSaved, rewardType]);


  // ── Ref to always hold latest getSerializedData ──
  // Prevents stale closure in auto-save timeout
  const getSerializedDataRef = useRef(getSerializedData);
  useEffect(() => {
    getSerializedDataRef.current = getSerializedData;
  }, [getSerializedData]);

  // ── Auto-save effect ──
  // Uses ref + setTimeout to ensure React state batch (from applyAIReviewResult) has flushed
  // and the latest serializer is called, not a stale closure.
  useEffect(() => {
    if (!pendingSave || !rewardType) return;
    setPendingSave(false);
    const timer = setTimeout(async () => {
      try {
        const serialized = getSerializedDataRef.current();
        const { error } = await supabase
          .from('challenges')
          .update({ reward_structure: serialized as unknown as Json })
          .eq('id', challengeId);
        if (error) throw new Error(error.message);
        queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });
        markSaved();
      } catch (err: any) {
        toast.error(`Auto-save failed: ${err.message}`);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [pendingSave, rewardType, challengeId, queryClient, markSaved]);

  // ── AI handlers ──
  const handleAcceptAllMonetaryAI = useCallback(() => {
    for (const rank of ['platinum', 'gold', 'silver']) {
      if (tierStates[rank]?.aiSuggestion) {
        acceptAISuggestion(rank);
      }
    }
    setHasAISuggestions(false);
  }, [tierStates, acceptAISuggestion]);

  const handleAcceptAllNMAI = useCallback(() => {
    for (const item of nmItems) {
      if (item.aiRecommended) {
        acceptAINMSuggestion(item.id);
      }
    }
  }, [nmItems, acceptAINMSuggestion]);


  // ── Has existing data check ──
  const hasExistingData = useMemo(() => {
    const hasMonetary = Object.values(tierStates).some((t) => t.enabled && t.amount > 0);
    const hasNM = nmItems.some((item) => !item.isDefault || item.src.src !== 'curator');
    return hasMonetary || hasNM;
  }, [tierStates, nmItems]);

  // ── Type switch handler ──
  const handleTypeSwitch = useCallback((type: import('@/services/rewardStructureResolver').RewardType) => {
    setRewardType(type);
  }, [setRewardType]);

  // ── Type switch from read-only states ──
  const handleTypeSwitchFromReadOnly = useCallback((type: import('@/services/rewardStructureResolver').RewardType) => {
    startEditing();
    setRewardType(type);
  }, [startEditing, setRewardType]);

  // ── Determine what to show ──
  const showMonetary = rewardType === 'monetary' || rewardType === 'both';
  const showNM = rewardType === 'non_monetary' || rewardType === 'both';
  const isEditing = sectionState === 'curator_editing' || (sectionState === 'empty_no_source' && !!rewardType);

  // ── Render monetary editor ──
  const renderMonetaryEditor = (disabled: boolean, showErrors: boolean) => (
    <MonetaryRewardEditor
      tierStates={tierStates}
      currency={currency}
      totalPool={totalPool}
      errors={showErrors ? monetaryErrors : []}
      disabled={disabled}
      onUpdateTier={disabled ? () => {} : updateTier}
      onCurrencyChange={disabled ? () => {} : setCurrency}
      onAcceptAISuggestion={disabled ? () => {} : acceptAISuggestion}
      onAcceptAllAI={disabled ? undefined : handleAcceptAllMonetaryAI}
      hasAISuggestions={hasAISuggestions}
      aiRationale={aiRationale}
    />
  );

  // ── Render NM editor ──
  const renderNMEditor = (disabled: boolean, showErrors: boolean) => (
    <NonMonetaryRewardEditor
      items={nmItems}
      errors={showErrors ? nmErrors : []}
      disabled={disabled}
      onAddItem={disabled ? () => {} : addNMItem}
      onUpdateItem={disabled ? () => {} : updateNMItem}
      onDeleteItem={disabled ? () => {} : deleteNMItem}
      onAcceptAISuggestion={disabled ? undefined : (id) => acceptAINMSuggestion(id)}
      onAcceptAllAI={disabled ? undefined : handleAcceptAllNMAI}
    />
  );

  // ── Render both-mode tab content ──
  const renderBothTabs = (disabled: boolean, showErrors: boolean) => (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
      <TabsList className="mb-3">
        <TabsTrigger value="monetary" className="text-xs gap-1">
          💰 Monetary
          {monetaryErrors.length > 0 && showErrors && (
            <span className="ml-1 bg-destructive text-destructive-foreground rounded-full text-[9px] px-1.5">{monetaryErrors.length}</span>
          )}
        </TabsTrigger>
        <TabsTrigger value="non_monetary" className="text-xs gap-1">
          🏆 Non-Monetary
          {nmErrors.length > 0 && showErrors && (
            <span className="ml-1 bg-destructive text-destructive-foreground rounded-full text-[9px] px-1.5">{nmErrors.length}</span>
          )}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="monetary">
        {renderMonetaryEditor(disabled, showErrors)}
      </TabsContent>
      <TabsContent value="non_monetary">
        {renderNMEditor(disabled, showErrors)}
      </TabsContent>
    </Tabs>
  );

  // ── Content based on reward type ──
  const renderContent = (disabled: boolean, showErrors: boolean) => {
    if (rewardType === 'both') return renderBothTabs(disabled, showErrors);
    if (showMonetary) return renderMonetaryEditor(disabled, showErrors);
    if (showNM) return renderNMEditor(disabled, showErrors);
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Both-types banner */}
      {showBothBanner && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <Info className="h-3 w-3 text-blue-500 shrink-0" />
          <span className="text-[12px] text-blue-700">
            AM defined both reward types. Review each tab independently before submitting.
          </span>
        </div>
      )}

      {/* ── Empty state: Type Chooser Wizard ── */}
      {sectionState === 'empty_no_source' && !rewardType && (
        <RewardTypeChooser onSelect={setRewardType} />
      )}

      {/* ── Populated from source: read view + banner ── */}
      {sectionState === 'populated_from_source' && (
        <>
          <SourceBanner
            sourceRole={rewardData.sourceRole}
            sourceDate={rewardData.sourceDate}
            isModified={isModified}
            onEdit={startEditing}
            onReset={resetToSource}
          />
          <RewardTypeToggle
            currentType={rewardType}
            hasExistingData={hasExistingData}
            isLocked={isTypeLocked}
            onSwitch={handleTypeSwitchFromReadOnly}
          />
          {renderContent(true, false)}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>
        </>
      )}

      {/* ── Curator editing ── */}
      {isEditing && (
        <>
          <RewardTypeToggle
            currentType={rewardType}
            hasExistingData={!!hasExistingData}
            disabled={isSubmitted}
            isLocked={isTypeLocked}
            onSwitch={handleTypeSwitch}
          />

          {rewardData.isAutoPopulated && (
            <SourceBanner
              sourceRole={rewardData.sourceRole}
              sourceDate={rewardData.sourceDate}
              isModified={isModified}
              onEdit={() => {}}
              onReset={resetToSource}
            />
          )}

          {renderContent(isSubmitted, true)}

          {/* Validation summary bar */}
          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
              <span className="text-[12px] text-destructive">
                Fix {errors.length} issue(s) before saving
              </span>
            </div>
          )}

          {/* Save/Cancel/Lock/Submit footer */}
          {!isSubmitted && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={cancelEditing} className="gap-1.5">
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              {!isTypeLocked && rewardType && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLockRewardType}
                  disabled={saving}
                  className="gap-1.5"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Lock Reward Type
                </Button>
              )}
              {/* Show Save when: individual type, or "both" with modifications */}
              {(rewardType !== 'both' || isModified) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSave}
                  disabled={saving || !isValid}
                  className="gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Saved state: read view + edit button ── */}
      {sectionState === 'saved' && !isEditing && (
        <>
          <RewardTypeToggle
            currentType={rewardType}
            hasExistingData={hasExistingData}
            disabled={isSubmitted}
            isLocked={isTypeLocked}
            onSwitch={handleTypeSwitchFromReadOnly}
          />
          {renderContent(true, false)}
          {!isSubmitted && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Reviewed state ── */}
      {sectionState === 'reviewed' && (
        <>
          <RewardTypeToggle
            currentType={rewardType}
            hasExistingData={hasExistingData}
            disabled={isSubmitted}
            isLocked={isTypeLocked}
            onSwitch={handleTypeSwitchFromReadOnly}
          />
          {renderContent(true, false)}
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-[12px] font-semibold text-green-700">
              ✓ Reviewed
            </span>
          </div>
        </>
      )}
    </div>
  );
});

RewardStructureDisplay.displayName = 'RewardStructureDisplay';

export default RewardStructureDisplay;
