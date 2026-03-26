/**
 * RewardStructureDisplay — Orchestrator for the redesigned Reward Structure section.
 *
 * State machine:
 *   empty_no_source       → RewardTypeChooser wizard
 *   populated_from_source → Read view + SourceBanner + Edit button
 *   curator_editing       → Editable form + Save/Cancel footer
 *   saved                 → Read view + Edit button
 *   reviewed              → Read view + reviewed footer
 *
 * Redesign features:
 *   - AMRewardPayload detection with 4 source state scenarios
 *   - isSubmitted full lock (type toggle + all inputs)
 *   - Per-field source tracking (AM/AI/Curator)
 *   - Inline AI suggestions (Flow A) + Review with AI (Flow B)
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { parseJson } from '@/lib/cogniblend/jsonbUnwrap';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Loader2, Pencil, AlertCircle, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Json } from '@/integrations/supabase/types';
import { useRewardStructureState, type AMRewardPayload, type NonMonetaryKey, NM_KEYS } from '@/hooks/useRewardStructureState';
import { serializeRewardData } from '@/services/rewardStructureResolver';
import { requestAITierBreakup, requestAINonMonetarySuggestions } from '@/services/aiRewardBreakup';
import RewardTypeChooser from './rewards/RewardTypeChooser';
import RewardTypeToggle from './rewards/RewardTypeToggle';
import SourceBanner from './rewards/SourceBanner';
import MonetaryRewardEditor from './rewards/MonetaryRewardEditor';
import NonMonetaryRewardEditor from './rewards/NonMonetaryRewardEditor';

interface RewardStructureDisplayProps {
  rewardStructure: Json | null;
  currencyCode?: string;
  challengeId: string;
  problemStatement?: string | null;
  operatingModel?: string | null;
  challengeTitle?: string;
  amPayload?: AMRewardPayload | null;
  onReviewWithAI?: (sectionKey: string) => void;
}

export default function RewardStructureDisplay({
  rewardStructure,
  currencyCode,
  challengeId,
  problemStatement,
  operatingModel,
  challengeTitle,
  amPayload,
  onReviewWithAI,
}: RewardStructureDisplayProps) {
  const queryClient = useQueryClient();

  // ── State machine ──
  const raw = useMemo(() => parseJson<any>(rewardStructure), [rewardStructure]);
  const state = useRewardStructureState(raw, operatingModel);

  const {
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
    markSubmitted,
    resetToSource,
    applyAISuggestions,
    applyAINMSuggestions,
    acceptAISuggestion,
    acceptAINMSuggestion,
    getSerializedData,
  } = state;

  // ── Local UI state ──
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [hasAISuggestions, setHasAISuggestions] = useState(false);
  const [aiRationale, setAiRationale] = useState<string>();
  const [showBothBanner, setShowBothBanner] = useState(false);

  // ── Challenge context for AI ──
  const challengeContext = useMemo(() => ({
    title: challengeTitle ?? '',
    domain: 'General',
    type: 'Open Innovation',
  }), [challengeTitle]);

  // ── AMRewardPayload detection on mount ──
  useEffect(() => {
    if (!amPayload) return;

    const hasMonetary = !!amPayload.monetary;
    const hasNonMonetary = amPayload.nonMonetary && Object.values(amPayload.nonMonetary).some(Boolean);

    // Scenario 4: Both present
    if (hasMonetary && hasNonMonetary) {
      setShowBothBanner(true);
      setRewardType('monetary'); // default to monetary tab
      // Populate monetary tiers from AM
      if (amPayload.monetary?.tiers) {
        const tiers = amPayload.monetary.tiers;
        if (tiers.platinum) updateTier('platinum', { enabled: true, amount: tiers.platinum, amountSrc: { src: 'am' } });
        if (tiers.gold) updateTier('gold', { enabled: true, amount: tiers.gold, amountSrc: { src: 'am' } });
        if (tiers.silver) updateTier('silver', { enabled: true, amount: tiers.silver, amountSrc: { src: 'am' } });
      }
      // Populate NM from AM
      if (amPayload.nonMonetary) {
        for (const [key, value] of Object.entries(amPayload.nonMonetary)) {
          if (value && NM_KEYS.includes(key as NonMonetaryKey)) {
            updateNMSelection(key as NonMonetaryKey, true);
          }
        }
      }
      return;
    }

    // Scenario 3: Non-monetary only
    if (hasNonMonetary && !hasMonetary) {
      setRewardType('non_monetary');
      if (amPayload.nonMonetary) {
        for (const [key, value] of Object.entries(amPayload.nonMonetary)) {
          if (value && NM_KEYS.includes(key as NonMonetaryKey)) {
            updateNMSelection(key as NonMonetaryKey, true);
          }
        }
      }
      return;
    }

    // Scenario 2: Monetary pool only (no tiers) — auto-trigger AI
    if (hasMonetary && amPayload.monetary?.totalPool && !amPayload.monetary?.tiers) {
      setRewardType('monetary');
      setTotalPool(amPayload.monetary.totalPool);
      // Auto-trigger AI for tier split
      handleAutoTriggerAI(amPayload.monetary.totalPool);
      return;
    }

    // Scenario 2b: Monetary with tiers
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

  // ── Auto-trigger AI for empty payload ──
  useEffect(() => {
    const shouldAutoTrigger = !amPayload && sectionState === 'empty_no_source';
    if (shouldAutoTrigger) {
      // Will trigger when user selects a type via the chooser
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

  // ── Submit handler ──
  const handleSubmit = useCallback(async () => {
    if (!isValid) {
      toast.error(`Fix ${errors.length} validation error(s) before submitting.`);
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
      toast.success('Reward structure submitted and locked.');
      markSubmitted();
      markSaved();
    } catch (err: any) {
      toast.error(`Failed to submit: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [isValid, errors, getSerializedData, challengeId, queryClient, markSubmitted, markSaved]);

  // ── Auto-save effect for AI-generated data ──
  useEffect(() => {
    if (!pendingSave || !rewardType) return;
    setPendingSave(false);
    const doSave = async () => {
      try {
        const serialized = getSerializedData();
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
    };
    doSave();
  }, [pendingSave, rewardType, getSerializedData, challengeId, queryClient, markSaved]);

  // ── AI handlers (Flow A: inline) ──
  const handleAcceptAllMonetaryAI = useCallback(() => {
    for (const rank of ['platinum', 'gold', 'silver']) {
      if (tierStates[rank]?.aiSuggestion) {
        acceptAISuggestion(rank);
      }
    }
    setHasAISuggestions(false);
  }, [tierStates, acceptAISuggestion]);

  const handleAcceptAllNMAI = useCallback(() => {
    for (const key of NM_KEYS) {
      if (nmSelections[key]?.aiRecommended) {
        acceptAINMSuggestion(key);
      }
    }
  }, [nmSelections, acceptAINMSuggestion]);

  // ── Flow B: Review with AI (delegates to parent's handler) ──
  const handleReviewMonetary = useCallback(() => {
    onReviewWithAI?.('reward_structure_monetary');
  }, [onReviewWithAI]);

  const handleReviewNonMonetary = useCallback(() => {
    onReviewWithAI?.('reward_structure_non_monetary');
  }, [onReviewWithAI]);

  // ── Has existing data check for toggle ──
  const hasExistingData = useMemo(() => {
    if (rewardType === 'monetary') {
      return Object.values(tierStates).some((t) => t.enabled && t.amount > 0);
    }
    if (rewardType === 'non_monetary') {
      return Object.values(nmSelections).some((s) => s.selected);
    }
    return false;
  }, [rewardType, tierStates, nmSelections]);

  // ── Type switch handler with auto-save ──
  const handleTypeSwitch = useCallback((type: import('@/services/rewardStructureResolver').RewardType) => {
    const hadData = !!hasExistingData;
    setRewardType(type);
    if (hadData) {
      setPendingSave(true);
    }
  }, [setRewardType, hasExistingData]);

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════

  const isEditing = sectionState === 'curator_editing' || (sectionState === 'empty_no_source' && !!rewardType);

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
            hasExistingData={false}
            disabled
            onSwitch={() => {}}
          />
          {rewardType === 'monetary' && (
            <MonetaryRewardEditor
              tierStates={tierStates}
              currency={currency}
              totalPool={totalPool}
              errors={[]}
              disabled
              onUpdateTier={() => {}}
              onCurrencyChange={() => {}}
              onAcceptAISuggestion={() => {}}
            />
          )}
          {rewardType === 'non_monetary' && (
            <NonMonetaryRewardEditor
              selections={nmSelections}
              errors={[]}
              disabled
              onToggle={() => {}}
              onAcceptAISuggestion={() => {}}
            />
          )}
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
            onSwitch={handleTypeSwitch}
          />

          {/* Source banner during editing if auto-populated */}
          {rewardData.isAutoPopulated && (
            <SourceBanner
              sourceRole={rewardData.sourceRole}
              sourceDate={rewardData.sourceDate}
              isModified={isModified}
              onEdit={() => {}}
              onReset={resetToSource}
            />
          )}

          {rewardType === 'monetary' && (
            <MonetaryRewardEditor
              tierStates={tierStates}
              currency={currency}
              totalPool={totalPool}
              errors={errors}
              disabled={isSubmitted}
              onUpdateTier={updateTier}
              onCurrencyChange={setCurrency}
              onAcceptAISuggestion={acceptAISuggestion}
              onAcceptAllAI={handleAcceptAllMonetaryAI}
              onReviewWithAI={onReviewWithAI ? handleReviewMonetary : undefined}
              aiLoading={aiLoading}
              hasAISuggestions={hasAISuggestions}
              aiRationale={aiRationale}
            />
          )}

          {rewardType === 'non_monetary' && (
            <NonMonetaryRewardEditor
              selections={nmSelections}
              errors={errors}
              disabled={isSubmitted}
              onToggle={updateNMSelection}
              onAcceptAISuggestion={acceptAINMSuggestion}
              onAcceptAllAI={handleAcceptAllNMAI}
              onReviewWithAI={onReviewWithAI ? handleReviewNonMonetary : undefined}
              aiLoading={aiLoading}
            />
          )}

          {/* Validation summary bar */}
          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
              <span className="text-[12px] text-destructive">
                Fix {errors.length} issue(s) before saving
              </span>
            </div>
          )}

          {/* Save/Cancel/Submit footer */}
          {!isSubmitted && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={cancelEditing} className="gap-1.5">
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
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
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={saving || !isValid}
                className="gap-1.5"
              >
                Submit & Lock
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Saved state: read view + edit button ── */}
      {sectionState === 'saved' && !isEditing && (
        <>
          <RewardTypeToggle
            currentType={rewardType}
            hasExistingData={false}
            disabled={isSubmitted}
            onSwitch={() => {}}
          />
          {rewardType === 'monetary' && (
            <MonetaryRewardEditor
              tierStates={tierStates}
              currency={currency}
              totalPool={totalPool}
              errors={[]}
              disabled
              onUpdateTier={() => {}}
              onCurrencyChange={() => {}}
              onAcceptAISuggestion={() => {}}
            />
          )}
          {rewardType === 'non_monetary' && (
            <NonMonetaryRewardEditor
              selections={nmSelections}
              errors={[]}
              disabled
              onToggle={() => {}}
              onAcceptAISuggestion={() => {}}
            />
          )}
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
            hasExistingData={false}
            disabled={isSubmitted}
            onSwitch={() => {}}
          />
          {rewardType === 'monetary' && (
            <MonetaryRewardEditor
              tierStates={tierStates}
              currency={currency}
              totalPool={totalPool}
              errors={[]}
              disabled
              onUpdateTier={() => {}}
              onCurrencyChange={() => {}}
              onAcceptAISuggestion={() => {}}
            />
          )}
          {rewardType === 'non_monetary' && (
            <NonMonetaryRewardEditor
              selections={nmSelections}
              errors={[]}
              disabled
              onToggle={() => {}}
              onAcceptAISuggestion={() => {}}
            />
          )}
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-[12px] font-semibold text-green-700">
              ✓ Reviewed
            </span>
          </div>
        </>
      )}
    </div>
  );
}
